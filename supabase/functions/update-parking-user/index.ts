import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type"};
const headers={"Content-Type":"application/json",...corsHeaders};
const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
const allowedRoles=["admin","cashier","operator","viewer"] as const;

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
  let body:{membership_id?:string;full_name?:string;email?:string;role?:typeof allowedRoles[number];lot_ids?:string[];active?:boolean;new_password?:string};
  try{body=await req.json()}catch{return reply({error:"JSON inválido"},400)}
  const membershipId=body.membership_id,fullName=body.full_name?.trim(),email=body.email?.trim().toLowerCase(),role=body.role,lotIds=body.lot_ids??[];
  if(!membershipId||!fullName||!role||!allowedRoles.includes(role)||!lotIds.length)return reply({error:"Completa nombre, rol y sucursal"},400);
  if(body.new_password&&body.new_password.length<8)return reply({error:"La nueva contraseña debe tener al menos 8 caracteres"},400);
  const {data:target,error:targetError}=await admin.from("parking_memberships").select("id,user_id,business_id,role").eq("id",membershipId).maybeSingle();
  if(targetError||!target)return reply({error:"El usuario no existe"},404);
  if(target.role==="owner")return reply({error:"La cuenta del propietario no puede modificarse desde Personal"},403);
  const {data:requester}=await admin.from("parking_memberships").select("role,active,lot_ids").eq("business_id",target.business_id).eq("user_id",auth.user.id).maybeSingle();
  if(!requester?.active||!["owner","admin"].includes(requester.role))return reply({error:"No tienes permiso para editar usuarios"},403);
  if(requester.role==="admin"&&(target.role==="admin"||role==="admin"))return reply({error:"Un administrador no puede editar administradores"},403);
  const {data:lots,error:lotError}=await admin.from("parking_lots").select("id,business_id").in("id",lotIds).eq("active",true);
  if(lotError||!lots?.length||lots.length!==new Set(lotIds).size||lots.some(l=>String(l.business_id)!==String(target.business_id)))return reply({error:"Una o más sucursales no son válidas"},400);
  if(requester.role==="admin"&&lotIds.some(id=>!(requester.lot_ids??[]).includes(id)))return reply({error:"Solo puedes asignar tus propias sucursales"},403);
  const {data:roleRow}=await admin.from("parking_roles").select("id").eq("business_id",target.business_id).eq("key",role).eq("active",true).maybeSingle();
  const {error:updateError}=await admin.from("parking_memberships").update({full_name:fullName,role,role_id:roleRow?.id??null,lot_ids:lotIds,active:body.active??true}).eq("id",membershipId);
  if(updateError)return reply({error:updateError.message},400);
  const {error:deleteError}=await admin.from("parking_membership_lots").delete().eq("membership_id",membershipId);
  if(deleteError)return reply({error:deleteError.message},400);
  const {error:assignmentError}=await admin.from("parking_membership_lots").insert(lotIds.map(lot_id=>({membership_id:membershipId,lot_id})));
  if(assignmentError)return reply({error:assignmentError.message},400);
  const authChanges:{email?:string;password?:string;user_metadata:{full_name:string}}={user_metadata:{full_name:fullName}};
  if(email)authChanges.email=email;
  if(body.new_password)authChanges.password=body.new_password;
  const {data:updated,error:userError}=await admin.auth.admin.updateUserById(target.user_id,authChanges);
  if(userError)return reply({error:userError.message},400);
  await admin.from("profiles").update({full_name:fullName,active:body.active??true}).eq("id",target.user_id);
  return reply({user:{id:membershipId,full_name:fullName,email:updated.user.email??email??"",role,lot_ids:lotIds,active:body.active??true}});
});
