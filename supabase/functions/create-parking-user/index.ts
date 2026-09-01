import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type"};
const headers={"Content-Type":"application/json",...corsHeaders};
const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
const allowedRoles=["admin","cashier","operator","viewer"] as const;
const allowedPermissions=["dashboard.view","stays.view","stays.create","stays.checkout","payments.view","payments.create","shifts.view","shifts.manage","cash_cuts.view","reports.view","reports.export","staff.view","staff.manage","settings.view","rates.manage","lots.manage","devices.manage"];
function generatePassword(){const chars="ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";const bytes=crypto.getRandomValues(new Uint8Array(14));return Array.from(bytes,b=>chars[b%chars.length]).join("")}

Deno.serve(async req=>{
  if(req.method==="OPTIONS")return new Response(null,{headers:corsHeaders});
  if(req.method!=="POST")return reply({error:"Método no permitido"},405);
  const authHeader=req.headers.get("Authorization");
  if(!authHeader)return reply({error:"Falta autenticación"},401);
  const url=Deno.env.get("SUPABASE_URL")!,anon=Deno.env.get("SUPABASE_ANON_KEY")!,service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const userClient=createClient(url,anon,{global:{headers:{Authorization:authHeader}}});
  const admin=createClient(url,service);
  const {data:auth,error:authError}=await userClient.auth.getUser();
  if(authError||!auth.user)return reply({error:"Sesión inválida"},401);
  let body:{full_name?:string;email?:string;role?:typeof allowedRoles[number];lot_ids?:string[];permission_codes?:string[]};
  try{body=await req.json()}catch{return reply({error:"JSON inválido"},400)}
  const fullName=body.full_name?.trim(),email=body.email?.trim().toLowerCase(),lotIds=body.lot_ids??[],role=body.role,permissionCodes=[...new Set(body.permission_codes??[])];
  if(!fullName||!email||!role||!allowedRoles.includes(role)||!lotIds.length)return reply({error:"Completa nombre, correo, rol y sucursal"},400);
  if(permissionCodes.some(code=>!allowedPermissions.includes(code)))return reply({error:"La selección contiene permisos no válidos"},400);
  const {data:lots,error:lotError}=await admin.from("parking_lots").select("id,business_id").in("id",lotIds).eq("active",true);
  if(lotError||!lots?.length||lots.length!==new Set(lotIds).size)return reply({error:"Una o más sucursales no son válidas"},400);
  const businessId=String(lots[0].business_id);
  if(lots.some(l=>String(l.business_id)!==businessId))return reply({error:"Las sucursales deben pertenecer a la misma empresa"},400);
  const {data:requester}=await admin.from("parking_memberships").select("role,active,lot_ids,permission_codes").eq("business_id",businessId).eq("user_id",auth.user.id).maybeSingle();
  if(!requester?.active||!["owner","admin"].includes(requester.role))return reply({error:"No tienes permiso para crear usuarios"},403);
  if(requester.role==="admin"&&requester.permission_codes!==null&&!requester.permission_codes.includes("staff.manage"))return reply({error:"No tienes permiso para administrar personal"},403);
  if(requester.role==="admin"&&role==="admin")return reply({error:"Un administrador solo puede crear cajeros, operadores o usuarios de consulta"},403);
  if(requester.role==="admin"&&lotIds.some(id=>!(requester.lot_ids??[]).includes(id)))return reply({error:"Solo puedes asignar tus propias sucursales"},403);
  const password=generatePassword();
  const {data:created,error:createError}=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{full_name:fullName,business_id:businessId}});
  if(createError||!created.user){const message=createError?.message??"No se pudo crear el usuario";return reply({error:message.toLowerCase().includes("already")?"Ya existe una cuenta con ese correo.":message},400)}
  const {data:roleRow}=await admin.from("parking_roles").select("id").eq("business_id",businessId).eq("key",role).eq("active",true).maybeSingle();
  const {data:membership,error:membershipError}=await admin.from("parking_memberships").insert({business_id:businessId,user_id:created.user.id,full_name:fullName,role,role_id:roleRow?.id??null,lot_ids:lotIds,permission_codes:permissionCodes,active:true}).select("id").single();
  if(membershipError||!membership){await admin.auth.admin.deleteUser(created.user.id);return reply({error:membershipError?.message??"No se pudo asignar el acceso"},400)}
  const {error:assignmentError}=await admin.from("parking_membership_lots").insert(lotIds.map(lot_id=>({membership_id:membership.id,lot_id})));
  if(assignmentError){await admin.from("parking_memberships").delete().eq("id",membership.id);await admin.auth.admin.deleteUser(created.user.id);return reply({error:assignmentError.message},400)}
  await admin.from("profiles").update({full_name:fullName,must_change_password:true}).eq("id",created.user.id);
  return reply({user:{id:membership.id,user_id:created.user.id,full_name:fullName,email,role,lot_ids:lotIds,permission_codes:permissionCodes,temporary_password:password}});
});
