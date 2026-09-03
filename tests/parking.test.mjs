import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { calculateFee, displayPlate, minutesSince } from "../app/lib/parking.ts";
import { assertOperationAllowed, assertOpenShift, hasOperationPermission, OFFLINE_OPERATION_MESSAGE } from "../app/lib/operation-rules.js";

const fractionRate={pricingMode:"fraction",flatPrice:null,fractionMinutes:15,price:8,graceMinutes:5,dailyMax:240};
const entered="2026-09-02T12:00:00.000Z";

test("tarifas: respeta gracia, fracciones y máximo diario",()=>{
  assert.equal(calculateFee(entered,fractionRate,Date.parse("2026-09-02T12:05:00.000Z")),0);
  assert.equal(calculateFee(entered,fractionRate,Date.parse("2026-09-02T12:06:00.000Z")),8);
  assert.equal(calculateFee(entered,fractionRate,Date.parse("2026-09-02T12:21:00.000Z")),16);
  assert.equal(calculateFee(entered,fractionRate,Date.parse("2026-09-03T12:00:00.000Z")),240);
});

test("tarifas: modalidad de tiempo libre cobra precio fijo",()=>{
  assert.equal(calculateFee(entered,{...fractionRate,pricingMode:"free_time",flatPrice:75},Date.parse("2026-09-03T12:00:00.000Z")),75);
});

test("placas y duración se normalizan de forma determinista",()=>{
  assert.equal(displayPlate(" pxj 482 a "),"PXJ-482-A");
  assert.equal(minutesSince(entered,Date.parse("2026-09-02T12:00:01.000Z")),1);
});

test("sin conexión bloquea toda operación real y no simula guardado",()=>{
  assert.throws(()=>assertOperationAllowed("authenticated","offline"),new RegExp(OFFLINE_OPERATION_MESSAGE));
  assert.throws(()=>assertOperationAllowed("authenticated","fallback"));
  assert.doesNotThrow(()=>assertOperationAllowed("authenticated","supabase"));
  assert.doesNotThrow(()=>assertOperationAllowed("demo","fallback"));
});

test("turnos: solo una caja abierta de la misma sucursal permite cobrar",()=>{
  assert.doesNotThrow(()=>assertOpenShift({status:"open",lotId:"lot-a"},"lot-a"));
  assert.throws(()=>assertOpenShift({status:"closed",lotId:"lot-a"},"lot-a"));
  assert.throws(()=>assertOpenShift({status:"open",lotId:"lot-b"},"lot-a"));
});

test("permisos: exige todos los permisos salvo roles globales",()=>{
  assert.equal(hasOperationPermission("cashier",["stays.checkout","payments.create"],["stays.checkout","payments.create"]),true);
  assert.equal(hasOperationPermission("operator",["stays.checkout"],["stays.checkout","payments.create"]),false);
  assert.equal(hasOperationPermission("owner",[],["payments.create"]),true);
});

test("concurrencia y cobros: la migración mantiene el contrato atómico e idempotente",()=>{
  const sql=fs.readFileSync("supabase/migrations/20260902120000_transactional_idempotent_checkout.sql","utf8");
  assert.match(sql,/unique index[\s\S]*parking_payments\(stay_id\)[\s\S]*voided_at is null/i);
  assert.match(sql,/from public\.parking_stays[\s\S]*for update/i);
  assert.match(sql,/if v_stay\.status='paid'[\s\S]*v_stay\.exited_at,true/i);
  assert.match(sql,/insert into public\.parking_payments[\s\S]*update public\.parking_stays[\s\S]*insert into public\.parking_audit_log/i);
  assert.match(sql,/has_parking_permission\(v_stay\.business_id,'payments\.create'\)/i);
});
