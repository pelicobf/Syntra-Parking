"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { calculateFee, displayPlate, makeStay } from "@/app/lib/parking";
import { supabase } from "@/app/lib/supabase";
import type { ParkingLot, ParkingStay, Payment, Profile, RatePlan, Shift } from "@/app/types/parking";

const now = Date.now();
const fallbackStays: ParkingStay[] = [
  ["PXJ-482-A","Nissan","Versa","Gris",22],["JTY-901-B","Mazda","CX-30","Rojo",68],["LWS-113-C","Chevrolet","Aveo","Blanco",113],["UNR-772-A","Volkswagen","Jetta","Negro",171],
].map(([plate,make,model,color,mins],i)=>({id:`stay-${i}`,folio:`P-00084${i}`,lotId:"centro",plate:String(plate),make:String(make),model:String(model),color:String(color),enteredAt:new Date(now-Number(mins)*60000).toISOString(),status:i===1?"pending_payment":"active",qrToken:`https://parkflow.app/t/${i}-demo-token`,barcodeValue:`75000000084${i}`}));
const fallbackLots: ParkingLot[]=[{id:"centro",businessId:"syntra",name:"Estacionamiento Centro",code:"CTR",capacity:120,active:true},{id:"norte",businessId:"syntra",name:"Estacionamiento Norte",code:"NTE",capacity:80,active:true}];
const fallbackProfile:Profile={id:"demo",fullName:"Marco Ruiz",role:"admin",allowedLotIds:["centro","norte"]};
const fallbackRate:RatePlan={id:"general",lotId:"centro",name:"Tarifa general",fractionMinutes:15,price:8,graceMinutes:5,dailyMax:240,lostTicketFee:180};
const fallbackShift:Shift={id:"shift-1",lotId:"centro",openedAt:new Date(now-6*3600000).toISOString(),openedBy:"Marco Ruiz",openingCash:500,status:"open"};
type EntryInput={plate:string;make?:string;model?:string;color?:string};
type RemoteContext={businessId:string;userId:string}|null;
export type StaffRecord={id:string;fullName:string;email:string;role:string;lotIds:string[];status:"active"|"invited"};

export function useParkingStore(){
  const [lots,setLots]=useState(fallbackLots),[lotId,setLotId]=useState("centro"),[profile,setProfile]=useState(fallbackProfile);
  const [stays,setStays]=useState(fallbackStays),[payments,setPayments]=useState<Payment[]>([]),[rate,setRate]=useState(fallbackRate),[shift,setShift]=useState(fallbackShift);
  const [source,setSource]=useState<"loading"|"supabase"|"fallback">("loading"),[syncError,setSyncError]=useState("");
  const [authState,setAuthState]=useState<"checking"|"authenticated"|"unauthenticated"|"demo">("checking"),[staff,setStaff]=useState<StaffRecord[]>([]);
  const remote=useRef<RemoteContext>(null);

  useEffect(()=>{void loadRemote();},[]);
  async function loadRemote(){
    if(!supabase){setSource("fallback");setAuthState("unauthenticated");return;}
    try{
      const {data:{user}}=await supabase.auth.getUser();
      if(!user){setSource("fallback");setAuthState("unauthenticated");setSyncError("Inicia sesión para sincronizar con Supabase");return;}
      const {data:platformAdmin}=await supabase.from("platform_super_admins").select("user_id").eq("user_id",user.id).maybeSingle();
      const {data:membership,error:membershipError}=platformAdmin?{data:null,error:null}:await supabase.from("parking_memberships").select("business_id,full_name,role,lot_ids").eq("user_id",user.id).eq("active",true).maybeSingle();
      if(platformAdmin){const {data:allLots,error}=await supabase.from("parking_lots").select("id,business_id,name,code,capacity,active").eq("active",true).order("name");if(error)throw error;const mapped:ParkingLot[]=(allLots??[]).map(r=>({id:String(r.id),businessId:String(r.business_id),name:String(r.name),code:String(r.code),capacity:Number(r.capacity),active:Boolean(r.active)}));setLots(mapped);setLotId(mapped[0]?.id??"");setProfile({id:user.id,fullName:String(user.user_metadata?.full_name||user.email||"Super administrador"),role:"super_admin",allowedLotIds:mapped.map(l=>l.id)});remote.current={businessId:mapped[0]?.businessId??"",userId:user.id};setStays([]);setPayments([]);setStaff([]);setSource("supabase");setAuthState("authenticated");setSyncError("");return;}
      if(membershipError||!membership)throw membershipError??new Error("Sin membresía activa");
      const businessId=String(membership.business_id); remote.current={businessId,userId:user.id};
      const [{data:lotRows,error:lotError},{data:rateRows},{data:stayRows,error:stayError},{data:paymentRows},{data:shiftRows}]=await Promise.all([
        supabase.from("parking_lots").select("id,business_id,name,code,capacity,active").eq("business_id",businessId).eq("active",true).order("name"),
        supabase.from("parking_rate_plans").select("*").eq("business_id",businessId).eq("active",true),
        supabase.from("parking_stays").select("id,folio,lot_id,entered_at,exited_at,status,qr_token,barcode_value,amount_due,parking_vehicles(plate,make,model,color)").eq("business_id",businessId).in("status",["active","pending_payment"]).order("entered_at",{ascending:false}),
        supabase.from("parking_payments").select("id,stay_id,amount,method,paid_at").eq("business_id",businessId).is("voided_at",null).order("paid_at",{ascending:false}).limit(200),
        supabase.from("parking_shifts").select("id,lot_id,opened_at,opening_cash,closed_at").eq("business_id",businessId).is("closed_at",null).order("opened_at",{ascending:false}).limit(1),
      ]);
      if(lotError||stayError||!lotRows?.length)throw lotError??stayError??new Error("No hay sucursales configuradas");
      const mappedLots:ParkingLot[]=lotRows.map(r=>({id:String(r.id),businessId:String(r.business_id),name:String(r.name),code:String(r.code),capacity:Number(r.capacity),active:Boolean(r.active)}));
      const allowed=(membership.lot_ids as string[]|null)?.filter(id=>mappedLots.some(l=>l.id===id))??mappedLots.map(l=>l.id);
      const selected=allowed[0]??mappedLots[0].id;
      const mappedStays:ParkingStay[]=(stayRows??[]).map((r:any)=>{const v=Array.isArray(r.parking_vehicles)?r.parking_vehicles[0]:r.parking_vehicles;return{id:String(r.id),folio:`P-${String(r.folio).padStart(6,"0")}`,lotId:String(r.lot_id),plate:String(v?.plate??"SIN PLACA"),make:String(v?.make??"Sin identificar"),model:String(v?.model??"Vehículo"),color:String(v?.color??"—"),enteredAt:String(r.entered_at),exitedAt:r.exited_at?String(r.exited_at):undefined,status:r.status,qrToken:String(r.qr_token),barcodeValue:String(r.barcode_value??r.folio),amountDue:r.amount_due==null?undefined:Number(r.amount_due)}});
      const mappedPayments:Payment[]=(paymentRows??[]).map((r:any)=>({id:String(r.id),stayId:String(r.stay_id),amount:Number(r.amount),method:r.method,paidAt:String(r.paid_at)}));
      const firstRate=(rateRows??[]).find((r:any)=>String(r.lot_id)===selected)??rateRows?.[0];
      setLots(mappedLots);setLotId(selected);setProfile({id:user.id,fullName:String(membership.full_name||user.email||"Usuario"),role:membership.role,allowedLotIds:allowed});setStays(mappedStays);setPayments(mappedPayments);
      if(["owner","admin"].includes(String(membership.role))){const {data:memberRows}=await supabase.from("parking_memberships").select("id,user_id,full_name,role,lot_ids,active").eq("business_id",businessId).order("full_name");setStaff((memberRows??[]).map((m:any)=>({id:String(m.id),fullName:String(m.full_name),email:"Usuario registrado",role:String(m.role),lotIds:(m.lot_ids??[]).map(String),status:m.active?"active":"invited"})));}
      if(firstRate)setRate(mapRate(firstRate));
      if(shiftRows?.[0])setShift({id:String(shiftRows[0].id),lotId:String(shiftRows[0].lot_id),openedAt:String(shiftRows[0].opened_at),openedBy:String(membership.full_name||"Usuario"),openingCash:Number(shiftRows[0].opening_cash),status:"open"});
      setSource("supabase");setAuthState("authenticated");setSyncError("");
    }catch(error){console.warn("ParkFlow fallback:",error);remote.current=null;setSource("fallback");setAuthState("unauthenticated");setSyncError(error instanceof Error?error.message:"No fue posible consultar Supabase");}
  }

  const active=useMemo(()=>stays.filter(s=>s.lotId===lotId&&(s.status==="active"||s.status==="pending_payment")),[stays,lotId]);
  const lot=lots.find(l=>l.id===lotId)??lots[0]??fallbackLots[0];
  const currentRate=rate.lotId===lotId?rate:{...rate,lotId};
  async function registerEntry(input:EntryInput|string){
    const value=typeof input==="string"?{plate:input}:input; const plate=displayPlate(value.plate);
    if(remote.current&&supabase){
      const ctx=remote.current;
      const {data:vehicle,error:vehicleError}=await supabase.from("parking_vehicles").upsert({business_id:ctx.businessId,plate,state_code:"",make:value.make||null,model:value.model||null,color:value.color||null},{onConflict:"business_id,plate,state_code"}).select("id").single();
      if(vehicleError)throw vehicleError;
      const {data:row,error}=await supabase.from("parking_stays").insert({business_id:ctx.businessId,lot_id:lotId,vehicle_id:vehicle.id,rate_plan_id:currentRate.id,shift_id:shift.id.startsWith("shift-")?null:shift.id,created_by:ctx.userId}).select("id,folio,lot_id,entered_at,status,qr_token,barcode_value").single();
      if(error)throw error;
      const stay:ParkingStay={id:String(row.id),folio:`P-${String(row.folio).padStart(6,"0")}`,lotId:String(row.lot_id),plate,make:value.make||"Sin identificar",model:value.model||"Vehículo",color:value.color||"—",enteredAt:String(row.entered_at),status:row.status,qrToken:String(row.qr_token),barcodeValue:String(row.barcode_value??row.folio)};
      setStays(v=>[stay,...v]);return stay;
    }
    const stay={...makeStay(plate,lotId,stays.length),make:value.make||"Sin identificar",model:value.model||"Vehículo",color:value.color||"—"};setStays(v=>[stay,...v]);return stay;
  }
  async function charge(stay:ParkingStay,method:Payment["method"]){
    const amount=calculateFee(stay.enteredAt,currentRate);const paidAt=new Date().toISOString();
    if(remote.current&&supabase){const ctx=remote.current;const {data:payment,error}=await supabase.from("parking_payments").insert({business_id:ctx.businessId,lot_id:stay.lotId,stay_id:stay.id,shift_id:shift.id.startsWith("shift-")?null:shift.id,method,amount,received_by:ctx.userId}).select("id,paid_at").single();if(error)throw error;const {error:updateError}=await supabase.from("parking_stays").update({status:"paid",exited_at:paidAt,amount_due:amount,closed_by:ctx.userId}).eq("id",stay.id);if(updateError)throw updateError;setPayments(v=>[{id:String(payment.id),stayId:stay.id,amount,method,paidAt:String(payment.paid_at)},...v]);}
    else setPayments(v=>[{id:crypto.randomUUID(),stayId:stay.id,amount,method,paidAt},...v]);
    setStays(v=>v.map(s=>s.id===stay.id?{...s,status:"paid",exitedAt:paidAt,amountDue:amount}:s));return amount;
  }
  async function saveRate(next:RatePlan){setRate(next);if(remote.current&&supabase){const {error}=await supabase.from("parking_rate_plans").update({fraction_minutes:next.fractionMinutes,price_per_fraction:next.price,grace_minutes:next.graceMinutes,daily_max:next.dailyMax,lost_ticket_fee:next.lostTicketFee}).eq("id",next.id);if(error)throw error;}}
  async function signIn(email:string,password:string){if(!supabase)throw new Error("Faltan las credenciales públicas de Supabase");const {error}=await supabase.auth.signInWithPassword({email,password});if(error)throw error;setSource("loading");setAuthState("checking");await loadRemote();}
  async function signUp(email:string,password:string,fullName:string){if(!supabase)throw new Error("Faltan las credenciales públicas de Supabase");const {error}=await supabase.auth.signUp({email,password,options:{data:{full_name:fullName}}});if(error)throw error;setSource("loading");setAuthState("checking");await loadRemote();}
  async function registerBusiness(input:{name:string;slug:string;lotName:string;lotCode:string;capacity:number;ownerName:string;ownerEmail:string;ownerPassword:string}){if(!supabase)throw new Error("Faltan las credenciales públicas de Supabase");const {data,error}=await supabase.functions.invoke("create-parking-business",{body:{business_name:input.name,slug:input.slug,lot_name:input.lotName,lot_code:input.lotCode,capacity:input.capacity,owner_name:input.ownerName,owner_email:input.ownerEmail,owner_password:input.ownerPassword}});if(error)throw new Error((data as {error?:string}|null)?.error||error.message);if((data as {error?:string}|null)?.error)throw new Error((data as {error:string}).error);const {error:loginError}=await supabase.auth.signInWithPassword({email:input.ownerEmail,password:input.ownerPassword});if(loginError)throw loginError;setSource("loading");setAuthState("checking");await loadRemote();return data;}
  async function signOut(){if(supabase)await supabase.auth.signOut();remote.current=null;setLots(fallbackLots);setLotId("centro");setProfile(fallbackProfile);setStays(fallbackStays);setPayments([]);setRate(fallbackRate);setShift(fallbackShift);setStaff([]);setSource("fallback");setAuthState("unauthenticated");setSyncError("Sesión cerrada");}
  function continueDemo(){setSource("fallback");setAuthState("demo");setSyncError("Modo demostración");}
  async function inviteStaff(input:{fullName:string;email:string;role:string;lotIds:string[]}){if(remote.current&&supabase){const {data,error}=await supabase.rpc("invite_parking_user",{p_email:input.email,p_full_name:input.fullName,p_role:input.role,p_lot_ids:input.lotIds});if(error)throw error;const row:StaffRecord={id:String(data),...input,status:"invited"};setStaff(v=>[row,...v]);return row;}const row:StaffRecord={id:crypto.randomUUID(),...input,status:"invited"};setStaff(v=>[row,...v]);return row;}
  async function createBusiness(input:{name:string;slug:string;lotName:string;lotCode:string;capacity:number;ownerName?:string;ownerEmail?:string;ownerPassword?:string}){if(profile.role!=="super_admin")throw new Error("Solo el super administrador puede crear negocios");if(!supabase)throw new Error("Supabase no está configurado");if(!input.ownerName?.trim()||!input.ownerEmail?.trim())throw new Error("Completa los datos del propietario");if(!input.ownerPassword||input.ownerPassword.length<8)throw new Error("La contraseña debe tener al menos 8 caracteres");const {data,error}=await supabase.functions.invoke("create-parking-business",{body:{business_name:input.name,slug:input.slug,lot_name:input.lotName,lot_code:input.lotCode,capacity:input.capacity,owner_name:input.ownerName,owner_email:input.ownerEmail,owner_password:input.ownerPassword}});if(error)throw new Error((data as {error?:string}|null)?.error||error.message);if((data as {error?:string}|null)?.error)throw new Error((data as {error:string}).error);await loadRemote();return data;}
  const canManageStaff=["super_admin","owner","admin"].includes(profile.role);
  return{profile,lots,lotId,setLotId,lot,stays,active,payments,rate:currentRate,setRate,saveRate,shift,setShift,registerEntry,charge,calculate:(stay:ParkingStay)=>calculateFee(stay.enteredAt,currentRate),source,syncError,reload:loadRemote,authState,signIn,signUp,registerBusiness,signOut,continueDemo,staff,inviteStaff,createBusiness,canManageStaff};
}
function mapRate(r:any):RatePlan{return{id:String(r.id),lotId:String(r.lot_id),name:String(r.name),fractionMinutes:Number(r.fraction_minutes) as 15|30|45|60,price:Number(r.price_per_fraction),graceMinutes:Number(r.grace_minutes),dailyMax:r.daily_max==null?null:Number(r.daily_max),lostTicketFee:Number(r.lost_ticket_fee)}}
