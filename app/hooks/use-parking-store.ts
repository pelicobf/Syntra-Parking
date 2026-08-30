"use client";
import { useEffect, useMemo, useState } from "react";
import { calculateFee, makeStay } from "@/app/lib/parking";
import type { ParkingLot, ParkingStay, Payment, Profile, RatePlan, Shift } from "@/app/types/parking";

const now = Date.now();
const seed: ParkingStay[] = [
  ["PXJ-482-A","Nissan","Versa","Gris",22],["JTY-901-B","Mazda","CX-30","Rojo",68],["LWS-113-C","Chevrolet","Aveo","Blanco",113],["UNR-772-A","Volkswagen","Jetta","Negro",171],
].map(([plate,make,model,color,mins],i)=>({ id:`stay-${i}`,folio:`P-00084${i}`,lotId:"centro",plate:String(plate),make:String(make),model:String(model),color:String(color),enteredAt:new Date(now-Number(mins)*60000).toISOString(),status:i===1?"pending_payment":"active",qrToken:`https://parkflow.app/t/${i}-demo-token`,barcodeValue:`75000000084${i}` }));
const lots: ParkingLot[] = [{id:"centro",businessId:"syntra",name:"Estacionamiento Centro",code:"CTR",capacity:120,active:true},{id:"norte",businessId:"syntra",name:"Estacionamiento Norte",code:"NTE",capacity:80,active:true}];
const profile: Profile = {id:"demo",fullName:"Marco Ruiz",role:"admin",allowedLotIds:["centro","norte"]};
const defaultRate: RatePlan = {id:"general",lotId:"centro",name:"Tarifa general",fractionMinutes:15,price:8,graceMinutes:5,dailyMax:240,lostTicketFee:180};

export function useParkingStore() {
  const [lotId,setLotId]=useState("centro"); const [stays,setStays]=useState(seed); const [payments,setPayments]=useState<Payment[]>([]); const [rate,setRate]=useState(defaultRate);
  const [shift,setShift]=useState<Shift>({id:"shift-1",lotId:"centro",openedAt:new Date(now-6*3600000).toISOString(),openedBy:"Marco Ruiz",openingCash:500,status:"open"});
  useEffect(()=>{ try { const saved=localStorage.getItem("parkflow-demo-state"); if(saved){const v=JSON.parse(saved);setStays(v.stays??seed);setPayments(v.payments??[]);setRate(v.rate??defaultRate);} } catch {} },[]);
  useEffect(()=>{ localStorage.setItem("parkflow-demo-state",JSON.stringify({stays,payments,rate})); },[stays,payments,rate]);
  const active=useMemo(()=>stays.filter(s=>s.lotId===lotId&&(s.status==="active"||s.status==="pending_payment")),[stays,lotId]);
  function registerEntry(plate:string){const stay=makeStay(plate,lotId,stays.length);setStays(v=>[stay,...v]);return stay;}
  function charge(stay:ParkingStay,method:Payment["method"]){const amount=calculateFee(stay.enteredAt,rate);setPayments(v=>[{id:crypto.randomUUID(),stayId:stay.id,amount,method,paidAt:new Date().toISOString()},...v]);setStays(v=>v.map(s=>s.id===stay.id?{...s,status:"paid",exitedAt:new Date().toISOString(),amountDue:amount}:s));return amount;}
  return { profile,lots,lotId,setLotId,lot:lots.find(l=>l.id===lotId)!,stays,active,payments,rate,setRate,shift,setShift,registerEntry,charge,calculate:(stay:ParkingStay)=>calculateFee(stay.enteredAt,rate) };
}
