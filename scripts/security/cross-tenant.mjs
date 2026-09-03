import fs from "node:fs";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";

function loadEnv(path) {
  if (!fs.existsSync(path)) return;
  for (const line of fs.readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match && process.env[match[1]] === undefined) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
  }
}

loadEnv(".env");
loadEnv(".env.security.local");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const credentials = {
  a: { email: process.env.SECURITY_TEST_TENANT_A_EMAIL, password: process.env.SECURITY_TEST_TENANT_A_PASSWORD },
  b: { email: process.env.SECURITY_TEST_TENANT_B_EMAIL, password: process.env.SECURITY_TEST_TENANT_B_PASSWORD },
};
const allowMutations = process.env.SECURITY_TEST_ALLOW_MUTATIONS === "true";

if (!url || !anonKey) throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY");
if (!credentials.a.email || !credentials.a.password || !credentials.b.email || !credentials.b.password) {
  throw new Error("Configura SECURITY_TEST_TENANT_A_EMAIL/PASSWORD y SECURITY_TEST_TENANT_B_EMAIL/PASSWORD en .env.security.local");
}

const results = [];
const record = (area, name, passed, detail = "") => results.push({ area, name, passed, detail });
const client = () => createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });

async function authenticate(label, values) {
  const supabase = client();
  const { data, error } = await supabase.auth.signInWithPassword(values);
  if (error || !data.user) throw new Error(`No se pudo autenticar tenant ${label}: ${error?.message ?? "sin usuario"}`);
  const { data: rows, error: contextError } = await supabase.rpc("get_my_parking_context");
  const context = Array.isArray(rows) ? rows[0] : rows;
  if (contextError || !context) throw new Error(`Tenant ${label} no tiene contexto operativo: ${contextError?.message ?? "sin membresía"}`);
  const { data: lot } = await supabase.from("parking_lots").select("id").eq("business_id", context.business_id).limit(1).maybeSingle();
  const { data: stay } = await supabase.from("parking_stays").select("id,status,amount_due").eq("business_id", context.business_id).limit(1).maybeSingle();
  const { data: shift } = await supabase.from("parking_shifts").select("id").eq("business_id", context.business_id).is("closed_at", null).limit(1).maybeSingle();
  return { label, supabase, user: data.user, context, lot, stay, shift };
}

async function expectInvisible(actor, table, column, foreignValue) {
  const { data, error } = await actor.supabase.from(table).select("*").eq(column, foreignValue).limit(1);
  const passed = error?.code === "42501" || (!error && (data?.length ?? 0) === 0);
  record("RLS", `${actor.label} no lee ${table} ajeno`, passed, error?.message ?? `${data?.length ?? 0} filas visibles`);
}

async function testRls(actor, foreign) {
  await expectInvisible(actor, "parking_businesses", "id", foreign.context.business_id);
  const businessTables = [
    "parking_lots", "parking_memberships", "parking_rate_plans",
    "parking_vehicle_types", "parking_cash_registers", "parking_shifts", "parking_stays",
    "parking_payments", "parking_audit_log", "parking_user_invitations", "parking_subscription_payments",
    "parking_roles",
  ];
  for (const table of businessTables) await expectInvisible(actor, table, "business_id", foreign.context.business_id);
  await expectInvisible(actor, "profiles", "id", foreign.user.id);
  await expectInvisible(actor, "parking_membership_lots", "membership_id", foreign.context.membership_id);
  const { data: foreignRole } = await foreign.supabase.from("parking_roles").select("id").eq("business_id", foreign.context.business_id).limit(1).maybeSingle();
  if (foreignRole) await expectInvisible(actor, "parking_role_permissions", "role_id", foreignRole.id);
  if (foreign.stay) {
    const attempt = await actor.supabase.from("parking_stays").update({ status: foreign.stay.status }).eq("id", foreign.stay.id).select("id");
    const passed = attempt.error?.code === "42501" || (!attempt.error && (attempt.data?.length ?? 0) === 0);
    record("RLS", `${actor.label} no actualiza estancia ajena`, passed, attempt.error?.message ?? `${attempt.data?.length ?? 0} filas actualizadas`);
  } else record("RLS", `${actor.label} no actualiza estancia ajena`, false, "no ejecutada: el tenant objetivo no tiene estancias");
}

async function testRpcs(actor, foreign) {
  const access = await actor.supabase.rpc("has_parking_lot_access", { p_business_id: foreign.context.business_id, p_lot_id: foreign.lot?.id });
  record("RPC", `${actor.label} no obtiene acceso a sucursal ajena`, !access.error && access.data === false, access.error?.message ?? String(access.data));

  const permission = await actor.supabase.rpc("has_parking_permission", { p_business_id: foreign.context.business_id, p_permission: "stays.view" });
  record("RPC", `${actor.label} no obtiene permisos de empresa ajena`, !permission.error && permission.data === false, permission.error?.message ?? String(permission.data));

  if (foreign.stay) {
    const fee = await actor.supabase.rpc("calculate_parking_fee", { p_stay_id: foreign.stay.id });
    record("RPC", `${actor.label} no calcula estancia ajena`, Boolean(fee.error) || fee.data === null, fee.error?.message ?? String(fee.data));
    const checkout = await actor.supabase.rpc("checkout_parking_stay", {
      p_stay_id: foreign.stay.id,
      p_shift_id: foreign.shift?.id ?? "00000000-0000-0000-0000-000000000000",
      p_method: "cash",
    });
    const missingRpc = checkout.error && ["PGRST202", "42883"].includes(checkout.error.code);
    record("RPC", `${actor.label} no cobra estancia ajena`, Boolean(checkout.error) && !missingRpc, checkout.error?.message ?? "RPC aceptó el cobro");
  } else record("RPC", `${actor.label} no cobra estancia ajena`, false, "no ejecutada: el tenant objetivo no tiene estancias");
}

async function invokeDenied(actor, functionName, body) {
  const { data: sessionData } = await actor.supabase.auth.getSession();
  const response = await fetch(`${url}/functions/v1/${functionName}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${sessionData.session.access_token}`, apikey: anonKey, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  let payload = {};
  try { payload = await response.json(); } catch { /* La respuesta no JSON también se reporta. */ }
  return { passed: response.status === 400 || response.status === 403, detail: `${response.status} ${payload.error ?? response.statusText}` };
}

async function testEdgeFunctions(actor, foreign) {
  const createAttempt = await invokeDenied(actor, "create-parking-user", {
    full_name: "Prueba aislamiento", email: `isolation-${crypto.randomUUID()}@invalid.test`, role: "viewer",
    lot_ids: foreign.lot ? [foreign.lot.id] : [], permission_codes: ["dashboard.view"],
  });
  record("Edge Function", `${actor.label} no crea usuarios en empresa ajena`, createAttempt.passed, createAttempt.detail);

  const updateAttempt = await invokeDenied(actor, "update-parking-user", {
    membership_id: foreign.context.membership_id, full_name: "Prueba aislamiento", role: "viewer",
    lot_ids: foreign.lot ? [foreign.lot.id] : [], permission_codes: ["dashboard.view"], active: true,
  });
  record("Edge Function", `${actor.label} no modifica usuarios de empresa ajena`, updateAttempt.passed, updateAttempt.detail);
}

async function testRealtime(actor, observer) {
  if (!allowMutations) {
    record("Realtime", `${observer.label} no recibe cambios de ${actor.label}`, false, "requiere SECURITY_TEST_ALLOW_MUTATIONS=true");
    return;
  }
  if (!actor.stay) {
    record("Realtime", `${observer.label} no recibe cambios de ${actor.label}`, false, "no ejecutada: no hay estancia para emitir actualización inocua");
    return;
  }
  let leaked = false;
  const channel = observer.supabase.channel(`isolation-${crypto.randomUUID()}`).on("postgres_changes", {
    event: "UPDATE", schema: "public", table: "parking_stays", filter: `id=eq.${actor.stay.id}`,
  }, () => { leaked = true; });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Realtime no confirmó la suscripción")), 10_000);
    channel.subscribe(status => { if (status === "SUBSCRIBED") { clearTimeout(timer); resolve(); } });
  });
  const update = await actor.supabase.from("parking_stays").update({ status: actor.stay.status }).eq("id", actor.stay.id);
  if (update.error) throw new Error(`No se pudo emitir el evento Realtime de control: ${update.error.message}`);
  await new Promise(resolve => setTimeout(resolve, 2500));
  await observer.supabase.removeChannel(channel);
  record("Realtime", `${observer.label} no recibe cambios de ${actor.label}`, !leaked, leaked ? "se recibió un registro ajeno" : "sin fuga observada");
}

const tenantA = await authenticate("A", credentials.a);
const tenantB = await authenticate("B", credentials.b);
if (tenantA.context.business_id === tenantB.context.business_id) throw new Error("Las cuentas de prueba pertenecen a la misma empresa");
if (!tenantA.lot || !tenantB.lot) throw new Error("Cada empresa de prueba debe tener al menos una sucursal visible");

await testRls(tenantA, tenantB);
await testRls(tenantB, tenantA);
await testRpcs(tenantA, tenantB);
await testRpcs(tenantB, tenantA);
await testEdgeFunctions(tenantA, tenantB);
await testEdgeFunctions(tenantB, tenantA);
await testRealtime(tenantA, tenantB);
await testRealtime(tenantB, tenantA);

for (const result of results) console.log(`${result.passed ? "PASS" : "FAIL"} [${result.area}] ${result.name}${result.detail ? ` — ${result.detail}` : ""}`);
const failed = results.filter(result => !result.passed);
console.log(`\n${results.length - failed.length}/${results.length} controles aprobados`);
await Promise.all([tenantA.supabase.auth.signOut(), tenantB.supabase.auth.signOut()]);
if (failed.length) process.exitCode = 1;
