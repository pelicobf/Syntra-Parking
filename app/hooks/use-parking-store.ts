"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { calculateFee, displayPlate, makeStay } from "@/app/lib/parking";
import { supabase } from "@/app/lib/supabase";
import type { CashCut, CashRegister, ParkingLot, ParkingStay, Payment, Profile, RatePlan, Shift, VehicleType } from "@/app/types/parking";

const now = Date.now();
const fallbackStays: ParkingStay[] = [
  ["PXJ-482-A","Nissan","Versa","Gris",22],["JTY-901-B","Mazda","CX-30","Rojo",68],["LWS-113-C","Chevrolet","Aveo","Blanco",113],["UNR-772-A","Volkswagen","Jetta","Negro",171],
].map(([plate,make,model,color,mins],i)=>({id:`stay-${i}`,folio:`P-00084${i}`,lotId:"centro",plate:String(plate),make:String(make),model:String(model),color:String(color),vehicleTypeId:i===2?"truck":i===3?"suv":"car",enteredAt:new Date(now-Number(mins)*60000).toISOString(),status:i===1?"pending_payment":"active",qrToken:`https://parkflow.app/t/${i}-demo-token`,barcodeValue:`75000000084${i}`}));
const fallbackLots: ParkingLot[]=[{id:"centro",businessId:"syntra",name:"Estacionamiento Centro",code:"CTR",capacity:120,active:true},{id:"norte",businessId:"syntra",name:"Estacionamiento Norte",code:"NTE",capacity:80,active:true}];
const fallbackProfile:Profile={id:"demo",fullName:"Marco Ruiz",role:"admin",allowedLotIds:["centro","norte"]};
const fallbackRate:RatePlan={id:"general",lotId:"centro",name:"Tarifa general",pricingMode:"fraction",flatPrice:null,fractionMinutes:15,price:8,graceMinutes:5,dailyMax:240,lostTicketFee:180};
const fallbackVehicleTypes:VehicleType[]=[{id:"car",businessId:"syntra",name:"Carro",key:"car",description:"Automóvil o sedán",active:true},{id:"suv",businessId:"syntra",name:"Camioneta",key:"suv",description:"SUV, pickup o vehículo familiar",active:true},{id:"truck",businessId:"syntra",name:"Camión",key:"truck",description:"Camión o vehículo de carga",active:true}];
const fallbackRates:RatePlan[]=fallbackVehicleTypes.map((type,index)=>({...fallbackRate,id:`rate-${type.id}`,vehicleTypeId:type.id,name:`Tarifa ${type.name.toLowerCase()}`,price:[8,12,18][index]}));
const fallbackShift:Shift={id:"shift-1",lotId:"centro",openedAt:new Date(now-6*3600000).toISOString(),openedBy:"Marco Ruiz",openingCash:500,status:"open"};
const fallbackRegisters:CashRegister[]=[{id:"register-main",businessId:"syntra",lotId:"centro",name:"Caja principal",code:"MAIN",active:true}];
type EntryInput={plate:string;make?:string;model?:string;color?:string;vehicleTypeId?:string};
type RemoteContext={businessId:string;userId:string}|null;
export type StaffRecord={id:string;fullName:string;email:string;role:string;lotIds:string[];status:"active"|"inactive"|"invited"};
export type CreatedStaffRecord=StaffRecord&{temporaryPassword:string};

export function useParkingStore(){
  const [lots,setLots]=useState(fallbackLots),[lotId,setLotId]=useState("centro"),[profile,setProfile]=useState(fallbackProfile);
  const [businessName,setBusinessName]=useState("Empresa");
  const [stays,setStays]=useState(fallbackStays),[payments,setPayments]=useState<Payment[]>([]),[rate,setRate]=useState(fallbackRates[0]),[rates,setRates]=useState<RatePlan[]>(fallbackRates),[vehicleTypes,setVehicleTypes]=useState<VehicleType[]>(fallbackVehicleTypes),[shift,setShift]=useState(fallbackShift),[cashRegisters,setCashRegisters]=useState<CashRegister[]>(fallbackRegisters),[cashCuts,setCashCuts]=useState<CashCut[]>([]);
  const [source,setSource]=useState<"loading"|"supabase"|"fallback">("loading"),[syncError,setSyncError]=useState("");
  const [authState,setAuthState]=useState<"checking"|"authenticated"|"unauthenticated"|"demo">("checking"),[staff,setStaff]=useState<StaffRecord[]>([]);
  const remote=useRef<RemoteContext>(null);

  useEffect(()=>{void loadRemote();},[]);
  useEffect(()=>{if(source==="supabase"&&remote.current&&lotId)void refreshShiftForLot(lotId);},[lotId,source]);
  function closedShift(forLotId:string):Shift{return{id:"",lotId:forLotId,cashRegisterId:undefined,openedAt:"",openedBy:"",openingCash:0,status:"closed"}}
  async function refreshShiftForLot(forLotId:string){
    if(!supabase||!remote.current)return;
    const {data,error}=await supabase.from("parking_shifts").select("id,lot_id,cash_register_id,opened_at,opening_cash,closed_at").eq("business_id",remote.current.businessId).eq("lot_id",forLotId).is("closed_at",null).order("opened_at",{ascending:false}).limit(1).maybeSingle();
    if(error){setSyncError(error.message);return}
    setShift(data?{id:String(data.id),lotId:String(data.lot_id),cashRegisterId:data.cash_register_id?String(data.cash_register_id):undefined,openedAt:String(data.opened_at),openedBy:profile.fullName||"Usuario",openingCash:Number(data.opening_cash),status:"open"}:closedShift(forLotId));
  }
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
      const [{data:lotRows,error:lotError},{data:rateRows},{data:stayRows,error:stayError},{data:paymentRows},{data:shiftRows},{data:businessRow},{data:registerRows},{data:cutRows},{data:directoryRows},{data:vehicleTypeRows}]=await Promise.all([
        supabase.from("parking_lots").select("id,business_id,name,code,capacity,active").eq("business_id",businessId).eq("active",true).order("name"),
        supabase.from("parking_rate_plans").select("*").eq("business_id",businessId).eq("active",true),
        supabase.from("parking_stays").select("id,folio,lot_id,vehicle_type_id,entered_at,exited_at,status,qr_token,barcode_value,amount_due,parking_vehicles(plate,make,model,color)").eq("business_id",businessId).in("status",["active","pending_payment","paid"]).order("entered_at",{ascending:false}).limit(500),
        supabase.from("parking_payments").select("id,stay_id,shift_id,amount,method,paid_at").eq("business_id",businessId).is("voided_at",null).order("paid_at",{ascending:false}).limit(200),
        supabase.from("parking_shifts").select("id,lot_id,cash_register_id,opened_at,opening_cash,closed_at").eq("business_id",businessId).is("closed_at",null).order("opened_at",{ascending:false}).limit(1),
        supabase.from("parking_businesses").select("name").eq("id",businessId).maybeSingle(),
        supabase.from("parking_cash_registers").select("id,business_id,lot_id,name,code,active").eq("business_id",businessId).eq("active",true).order("name"),
        supabase.from("parking_shifts").select("id,lot_id,cash_register_id,opened_at,closed_at,opened_by,closed_by,opening_cash,expected_cash,counted_cash,notes").eq("business_id",businessId).not("closed_at","is",null).order("closed_at",{ascending:false}).limit(500),
        supabase.from("parking_memberships").select("user_id,full_name").eq("business_id",businessId),
        supabase.from("parking_vehicle_types").select("id,business_id,name,key,description,active").eq("business_id",businessId).eq("active",true).order("name"),
      ]);
      if(lotError||stayError||!lotRows?.length)throw lotError??stayError??new Error("No hay sucursales configuradas");
      const mappedLots:ParkingLot[]=lotRows.map(r=>({id:String(r.id),businessId:String(r.business_id),name:String(r.name),code:String(r.code),capacity:Number(r.capacity),active:Boolean(r.active)}));
      const allowed=(membership.lot_ids as string[]|null)?.filter(id=>mappedLots.some(l=>l.id===id))??mappedLots.map(l=>l.id);
      const selected=allowed[0]??mappedLots[0].id;
      const mappedStays:ParkingStay[]=(stayRows??[]).map((r:any)=>{const v=Array.isArray(r.parking_vehicles)?r.parking_vehicles[0]:r.parking_vehicles;return{id:String(r.id),folio:`P-${String(r.folio).padStart(6,"0")}`,lotId:String(r.lot_id),plate:String(v?.plate??"SIN PLACA"),make:String(v?.make??"Sin identificar"),model:String(v?.model??"Vehículo"),color:String(v?.color??"—"),vehicleTypeId:r.vehicle_type_id?String(r.vehicle_type_id):undefined,enteredAt:String(r.entered_at),exitedAt:r.exited_at?String(r.exited_at):undefined,status:r.status,qrToken:String(r.qr_token),barcodeValue:String(r.barcode_value??r.folio),amountDue:r.amount_due==null?undefined:Number(r.amount_due)}});
      const mappedPayments:Payment[]=(paymentRows??[]).map((r:any)=>({id:String(r.id),stayId:String(r.stay_id),shiftId:r.shift_id?String(r.shift_id):undefined,amount:Number(r.amount),method:r.method,paidAt:String(r.paid_at)}));
      const firstRate=(rateRows??[]).find((r:any)=>String(r.lot_id)===selected)??rateRows?.[0];
      const userNames=new Map((directoryRows??[]).map((r:any)=>[String(r.user_id),String(r.full_name)]));
      const mappedVehicleTypes:VehicleType[]=(vehicleTypeRows??[]).map((r:any)=>({id:String(r.id),businessId:String(r.business_id),name:String(r.name),key:String(r.key),description:r.description?String(r.description):undefined,active:Boolean(r.active)}));const mappedRates:RatePlan[]=(rateRows??[]).map(mapRate);
      setLots(mappedLots);setLotId(selected);setBusinessName(String(businessRow?.name||user.user_metadata?.business_name||"Empresa"));setProfile({id:user.id,fullName:String(membership.full_name||user.email||"Usuario"),role:membership.role,allowedLotIds:allowed});setStays(mappedStays);setPayments(mappedPayments);setVehicleTypes(mappedVehicleTypes);setRates(mappedRates);setCashRegisters((registerRows??[]).map((r:any)=>({id:String(r.id),businessId:String(r.business_id),lotId:String(r.lot_id),name:String(r.name),code:String(r.code),active:Boolean(r.active)})));setCashCuts((cutRows??[]).map((r:any)=>({id:String(r.id),lotId:String(r.lot_id),cashRegisterId:r.cash_register_id?String(r.cash_register_id):undefined,openedAt:String(r.opened_at),closedAt:String(r.closed_at),openedBy:userNames.get(String(r.opened_by))??"Usuario",closedBy:userNames.get(String(r.closed_by))??"Usuario",openingCash:Number(r.opening_cash),expectedCash:Number(r.expected_cash??0),countedCash:Number(r.counted_cash??0),notes:r.notes?String(r.notes):undefined})));
      if(["owner","admin"].includes(String(membership.role))){const {data:memberRows}=await supabase.from("parking_memberships").select("id,user_id,full_name,role,lot_ids,active").eq("business_id",businessId).order("full_name");setStaff((memberRows??[]).map((m:any)=>({id:String(m.id),fullName:String(m.full_name),email:"Usuario registrado",role:String(m.role),lotIds:(m.lot_ids??[]).map(String),status:m.active?"active":"invited"})));}
      if(firstRate)setRate(mapRate(firstRate));
      if(shiftRows?.[0]&&String(shiftRows[0].lot_id)===selected)setShift({id:String(shiftRows[0].id),lotId:String(shiftRows[0].lot_id),cashRegisterId:shiftRows[0].cash_register_id?String(shiftRows[0].cash_register_id):undefined,openedAt:String(shiftRows[0].opened_at),openedBy:String(membership.full_name||"Usuario"),openingCash:Number(shiftRows[0].opening_cash),status:"open"});else setShift(closedShift(selected));
      setSource("supabase");setAuthState("authenticated");setSyncError("");
    }catch(error){console.warn("ParkFlow fallback:",error);remote.current=null;setSource("fallback");setAuthState("unauthenticated");setSyncError(error instanceof Error?error.message:"No fue posible consultar Supabase");}
  }

  const active=useMemo(()=>stays.filter(s=>s.lotId===lotId&&(s.status==="active"||s.status==="pending_payment")),[stays,lotId]);
  const lot=lots.find(l=>l.id===lotId)??lots[0]??fallbackLots[0];
  const currentRate=rate.lotId===lotId?rate:{...rate,lotId};
  function rateForVehicleType(vehicleTypeId?:string){return rates.find(r=>r.lotId===lotId&&r.vehicleTypeId===vehicleTypeId)??rates.find(r=>r.lotId===lotId)??currentRate}
  async function registerEntry(input:EntryInput|string){
    const value=typeof input==="string"?{plate:input}:input; const plate=displayPlate(value.plate);const selectedTypeId=value.vehicleTypeId??vehicleTypes[0]?.id;const selectedRate=rateForVehicleType(selectedTypeId);
    if(remote.current&&supabase){
      const ctx=remote.current;
      const {data:vehicle,error:vehicleError}=await supabase.from("parking_vehicles").upsert({business_id:ctx.businessId,plate,state_code:"",make:value.make||null,model:value.model||null,color:value.color||null,vehicle_type_id:selectedTypeId||null},{onConflict:"business_id,plate,state_code"}).select("id").single();
      if(vehicleError)throw vehicleError;
      const {data:row,error}=await supabase.from("parking_stays").insert({business_id:ctx.businessId,lot_id:lotId,vehicle_id:vehicle.id,vehicle_type_id:selectedTypeId||null,rate_plan_id:selectedRate.id,shift_id:shift.id.startsWith("shift-")?null:shift.id,created_by:ctx.userId}).select("id,folio,lot_id,vehicle_type_id,entered_at,status,qr_token,barcode_value").single();
      if(error)throw error;
      const stay:ParkingStay={id:String(row.id),folio:`P-${String(row.folio).padStart(6,"0")}`,lotId:String(row.lot_id),plate,make:value.make||"Sin identificar",model:value.model||"Vehículo",color:value.color||"—",vehicleTypeId:row.vehicle_type_id?String(row.vehicle_type_id):selectedTypeId,enteredAt:String(row.entered_at),status:row.status,qrToken:String(row.qr_token),barcodeValue:String(row.barcode_value??row.folio)};
      setStays(v=>[stay,...v]);return stay;
    }
    const stay={...makeStay(plate,lotId,stays.length),make:value.make||"Sin identificar",model:value.model||"Vehículo",color:value.color||"—",vehicleTypeId:selectedTypeId};setStays(v=>[stay,...v]);return stay;
  }
  async function charge(stay:ParkingStay,method:Payment["method"]){
    if(shift.status!=="open"||shift.lotId!==stay.lotId)throw new Error("No hay una caja abierta en esta sucursal. Abre un turno antes de cobrar.");
    const amount=calculateFee(stay.enteredAt,rateForVehicleType(stay.vehicleTypeId));const paidAt=new Date().toISOString();
    if(remote.current&&supabase){const ctx=remote.current;if(!shift.id)throw new Error("La caja abierta no es válida. Actualiza la pantalla e inténtalo nuevamente.");const {data:payment,error}=await supabase.from("parking_payments").insert({business_id:ctx.businessId,lot_id:stay.lotId,stay_id:stay.id,shift_id:shift.id,method,amount,received_by:ctx.userId}).select("id,paid_at").single();if(error)throw error;const {error:updateError}=await supabase.from("parking_stays").update({status:"paid",exited_at:paidAt,amount_due:amount,closed_by:ctx.userId}).eq("id",stay.id);if(updateError)throw updateError;setPayments(v=>[{id:String(payment.id),stayId:stay.id,shiftId:shift.id,amount,method,paidAt:String(payment.paid_at)},...v]);}
    else setPayments(v=>[{id:crypto.randomUUID(),stayId:stay.id,shiftId:shift.id,amount,method,paidAt},...v]);
    setStays(v=>v.map(s=>s.id===stay.id?{...s,status:"paid",exitedAt:paidAt,amountDue:amount}:s));return amount;
  }
  async function openShift(input:{registerId?:string;registerName:string;openingCash:number}){
    if(shift.status==="open"&&shift.lotId===lotId)throw new Error("Ya existe una caja abierta en esta sucursal");
    const openedAt=new Date().toISOString();
    if(remote.current&&supabase){
      const ctx=remote.current;
      const normalizedName=input.registerName.trim();
      let {data:register,error:registerError}=input.registerId?await supabase.from("parking_cash_registers").select("id").eq("id",input.registerId).eq("business_id",ctx.businessId).eq("lot_id",lotId).eq("active",true).maybeSingle():await supabase.from("parking_cash_registers").select("id").eq("business_id",ctx.businessId).eq("lot_id",lotId).eq("active",true).ilike("name",normalizedName).limit(1).maybeSingle();
      if(registerError)throw registerError;
      if(!register){const baseCode=normalizedName.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toUpperCase().replace(/[^A-Z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,10)||"CAJA";const code=`${baseCode}-${crypto.randomUUID().slice(0,4).toUpperCase()}`;const inserted=await supabase.from("parking_cash_registers").insert({business_id:ctx.businessId,lot_id:lotId,name:normalizedName,code,active:true}).select("id").single();if(inserted.error)throw inserted.error;register=inserted.data}
      const {data,error}=await supabase.from("parking_shifts").insert({business_id:ctx.businessId,lot_id:lotId,cash_register_id:register.id,opened_by:ctx.userId,opening_cash:input.openingCash}).select("id,opened_at").single();
      if(error)throw error;
      const next:Shift={id:String(data.id),lotId,cashRegisterId:String(register.id),openedAt:String(data.opened_at),openedBy:profile.fullName,openingCash:input.openingCash,status:"open"};setShift(next);return next;
    }
    const next:Shift={id:crypto.randomUUID(),lotId,cashRegisterId:input.registerId??cashRegisters.find(r=>r.lotId===lotId)?.id,openedAt,openedBy:profile.fullName,openingCash:input.openingCash,status:"open"};setShift(next);return next;
  }
  async function createCashRegister(input:{name:string}){
    const name=input.name.trim();if(!name)throw new Error("Captura el nombre de la caja");
    if(remote.current&&supabase){const baseCode=name.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toUpperCase().replace(/[^A-Z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,10)||"CAJA";const code=`${baseCode}-${crypto.randomUUID().slice(0,4).toUpperCase()}`;const {data,error}=await supabase.from("parking_cash_registers").insert({business_id:remote.current.businessId,lot_id:lotId,name,code,active:true}).select("id,business_id,lot_id,name,code,active").single();if(error)throw error;const row:CashRegister={id:String(data.id),businessId:String(data.business_id),lotId:String(data.lot_id),name:String(data.name),code:String(data.code),active:Boolean(data.active)};setCashRegisters(v=>[...v,row].sort((a,b)=>a.name.localeCompare(b.name)));return row}
    const row:CashRegister={id:crypto.randomUUID(),businessId:lot.businessId,lotId,name,code:"DEMO",active:true};setCashRegisters(v=>[...v,row]);return row;
  }
  async function closeShift(input:{countedCash:number;expectedCash:number;notes?:string}){
    if(shift.status!=="open"||shift.lotId!==lotId)throw new Error("No hay una caja abierta para cerrar");
    const closedAt=new Date().toISOString();
    if(remote.current&&supabase){const {error}=await supabase.from("parking_shifts").update({closed_at:closedAt,closed_by:remote.current.userId,counted_cash:input.countedCash,expected_cash:input.expectedCash,notes:input.notes||null}).eq("id",shift.id).is("closed_at",null);if(error)throw error}
    setCashCuts(v=>[{id:shift.id,lotId:shift.lotId,cashRegisterId:shift.cashRegisterId,openedAt:shift.openedAt,closedAt,openedBy:shift.openedBy,closedBy:profile.fullName,openingCash:shift.openingCash,expectedCash:input.expectedCash,countedCash:input.countedCash,notes:input.notes},...v]);
    setShift({...shift,status:"closed"});
  }
  async function saveRate(next:RatePlan){setRate(next);setRates(v=>v.map(r=>r.id===next.id?next:r));if(remote.current&&supabase){const {error}=await supabase.from("parking_rate_plans").update({pricing_mode:next.pricingMode,flat_price:next.pricingMode==="free_time"?next.flatPrice:null,fraction_minutes:next.fractionMinutes,price_per_fraction:next.price,grace_minutes:next.graceMinutes,daily_max:next.dailyMax,lost_ticket_fee:next.lostTicketFee}).eq("id",next.id);if(error)throw error;}}
  async function createVehicleType(input:{name:string;description?:string;fractionMinutes:15|30|45|60;price:number}){
    const name=input.name.trim(),key=name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");if(!name||!key)throw new Error("Captura el nombre del tipo de unidad");
    if(remote.current&&supabase){const ctx=remote.current;const {data:typeRow,error:typeError}=await supabase.from("parking_vehicle_types").insert({business_id:ctx.businessId,name,key,description:input.description||null,active:true}).select("id,business_id,name,key,description,active").single();if(typeError)throw typeError;const {data:rateRow,error:rateError}=await supabase.from("parking_rate_plans").insert({business_id:ctx.businessId,lot_id:lotId,vehicle_type_id:typeRow.id,name:`Tarifa ${name.toLowerCase()}`,fraction_minutes:input.fractionMinutes,price_per_fraction:input.price,grace_minutes:0,lost_ticket_fee:0,active:true}).select("*").single();if(rateError){await supabase.from("parking_vehicle_types").delete().eq("id",typeRow.id);throw rateError}const type:VehicleType={id:String(typeRow.id),businessId:String(typeRow.business_id),name:String(typeRow.name),key:String(typeRow.key),description:typeRow.description?String(typeRow.description):undefined,active:Boolean(typeRow.active)},newRate=mapRate(rateRow);setVehicleTypes(v=>[...v,type]);setRates(v=>[...v,newRate]);return type}
    const type:VehicleType={id:crypto.randomUUID(),businessId:lot.businessId,name,key,description:input.description,active:true},newRate:RatePlan={...fallbackRate,id:crypto.randomUUID(),lotId,vehicleTypeId:type.id,name:`Tarifa ${name.toLowerCase()}`,fractionMinutes:input.fractionMinutes,price:input.price};setVehicleTypes(v=>[...v,type]);setRates(v=>[...v,newRate]);return type;
  }
  async function signIn(email:string,password:string){if(!supabase)throw new Error("Faltan las credenciales públicas de Supabase");const {error}=await supabase.auth.signInWithPassword({email,password});if(error)throw error;setSource("loading");setAuthState("checking");await loadRemote();}
  async function signUp(email:string,password:string,fullName:string){if(!supabase)throw new Error("Faltan las credenciales públicas de Supabase");const {error}=await supabase.auth.signUp({email,password,options:{data:{full_name:fullName}}});if(error)throw error;setSource("loading");setAuthState("checking");await loadRemote();}
  async function registerBusiness(input:{name:string;slug:string;lotName:string;lotCode:string;capacity:number;ownerName:string;ownerEmail:string;ownerPassword:string}){if(!supabase)throw new Error("Faltan las credenciales públicas de Supabase");const {data,error}=await supabase.functions.invoke("create-parking-business",{body:{business_name:input.name,slug:input.slug,lot_name:input.lotName,lot_code:input.lotCode,capacity:input.capacity,owner_name:input.ownerName,owner_email:input.ownerEmail,owner_password:input.ownerPassword}});if(error)throw new Error((data as {error?:string}|null)?.error||error.message);if((data as {error?:string}|null)?.error)throw new Error((data as {error:string}).error);const {error:loginError}=await supabase.auth.signInWithPassword({email:input.ownerEmail,password:input.ownerPassword});if(loginError)throw loginError;setSource("loading");setAuthState("checking");await loadRemote();return data;}
  async function signOut(){if(supabase)await supabase.auth.signOut();remote.current=null;setLots(fallbackLots);setLotId("centro");setBusinessName("Empresa");setProfile(fallbackProfile);setStays(fallbackStays);setPayments([]);setRate(fallbackRates[0]);setRates(fallbackRates);setVehicleTypes(fallbackVehicleTypes);setShift(fallbackShift);setCashRegisters(fallbackRegisters);setCashCuts([]);setStaff([]);setSource("fallback");setAuthState("unauthenticated");setSyncError("Sesión cerrada");}
  function continueDemo(){setSource("fallback");setAuthState("demo");setSyncError("Modo demostración");}
  async function inviteStaff(input:{fullName:string;email:string;role:string;lotIds:string[]}):Promise<CreatedStaffRecord>{
    if(remote.current&&supabase){
      const {data,error}=await supabase.functions.invoke("create-parking-user",{body:{full_name:input.fullName,email:input.email,role:input.role,lot_ids:input.lotIds}});
      const response=data as {error?:string;user?:{id:string;full_name:string;email:string;role:string;lot_ids:string[];temporary_password:string}}|null;
      if(error)throw new Error(response?.error||error.message);
      if(response?.error||!response?.user)throw new Error(response?.error||"No fue posible crear el usuario");
      const row:StaffRecord={id:response.user.id,fullName:response.user.full_name,email:response.user.email,role:response.user.role,lotIds:response.user.lot_ids,status:"active"};
      setStaff(v=>[row,...v]);
      return{...row,temporaryPassword:response.user.temporary_password};
    }
    const temporaryPassword=`Park-${crypto.randomUUID().slice(0,8)}!`;
    const row:StaffRecord={id:crypto.randomUUID(),...input,status:"active"};
    setStaff(v=>[row,...v]);
    return{...row,temporaryPassword};
  }
  async function updateStaff(input:{id:string;fullName:string;email?:string;role:string;lotIds:string[];active:boolean;newPassword?:string}):Promise<StaffRecord>{
    if(remote.current&&supabase){
      const {data,error}=await supabase.functions.invoke("update-parking-user",{body:{membership_id:input.id,full_name:input.fullName,email:input.email||undefined,role:input.role,lot_ids:input.lotIds,active:input.active,new_password:input.newPassword||undefined}});
      const response=data as {error?:string;user?:{id:string;full_name:string;email:string;role:string;lot_ids:string[];active:boolean}}|null;
      if(error)throw new Error(response?.error||error.message);
      if(response?.error||!response?.user)throw new Error(response?.error||"No fue posible actualizar el usuario");
      const row:StaffRecord={id:response.user.id,fullName:response.user.full_name,email:response.user.email||input.email||"Usuario registrado",role:response.user.role,lotIds:response.user.lot_ids,status:response.user.active?"active":"inactive"};
      setStaff(v=>v.map(item=>item.id===row.id?row:item));return row;
    }
    const row:StaffRecord={id:input.id,fullName:input.fullName,email:input.email||"Usuario registrado",role:input.role,lotIds:input.lotIds,status:input.active?"active":"inactive"};
    setStaff(v=>v.map(item=>item.id===row.id?row:item));return row;
  }
  async function createBusiness(input:{name:string;slug:string;lotName:string;lotCode:string;capacity:number;ownerName?:string;ownerEmail?:string;ownerPassword?:string}){if(profile.role!=="super_admin")throw new Error("Solo el super administrador puede crear negocios");if(!supabase)throw new Error("Supabase no está configurado");if(!input.ownerName?.trim()||!input.ownerEmail?.trim())throw new Error("Completa los datos del propietario");if(!input.ownerPassword||input.ownerPassword.length<8)throw new Error("La contraseña debe tener al menos 8 caracteres");const {data,error}=await supabase.functions.invoke("create-parking-business",{body:{business_name:input.name,slug:input.slug,lot_name:input.lotName,lot_code:input.lotCode,capacity:input.capacity,owner_name:input.ownerName,owner_email:input.ownerEmail,owner_password:input.ownerPassword}});if(error)throw new Error((data as {error?:string}|null)?.error||error.message);if((data as {error?:string}|null)?.error)throw new Error((data as {error:string}).error);await loadRemote();return data;}
  const canManageStaff=["super_admin","owner","admin"].includes(profile.role);
  return{profile,businessName,lots,lotId,setLotId,lot,stays,active,payments,rate:currentRate,rates,vehicleTypes,setRate,saveRate,createVehicleType,shift,setShift,cashRegisters,cashCuts,openShift,closeShift,createCashRegister,registerEntry,charge,calculate:(stay:ParkingStay)=>calculateFee(stay.enteredAt,rateForVehicleType(stay.vehicleTypeId)),source,syncError,reload:loadRemote,authState,signIn,signUp,registerBusiness,signOut,continueDemo,staff,inviteStaff,updateStaff,createBusiness,canManageStaff};
}
function mapRate(r:any):RatePlan{return{id:String(r.id),lotId:String(r.lot_id),vehicleTypeId:r.vehicle_type_id?String(r.vehicle_type_id):undefined,name:String(r.name),pricingMode:r.pricing_mode==="free_time"?"free_time":"fraction",flatPrice:r.flat_price==null?null:Number(r.flat_price),fractionMinutes:Number(r.fraction_minutes) as 15|30|45|60,price:Number(r.price_per_fraction),graceMinutes:Number(r.grace_minutes),dailyMax:r.daily_max==null?null:Number(r.daily_max),lostTicketFee:Number(r.lost_ticket_fee)}}
