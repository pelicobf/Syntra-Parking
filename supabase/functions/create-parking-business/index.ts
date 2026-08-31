import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const jsonHeaders = { "Content-Type": "application/json", ...corsHeaders };

function reply(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return reply({ error: "Método no permitido" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(url, serviceRoleKey);

  let body: {
    business_name?: string;
    slug?: string;
    lot_name?: string;
    lot_code?: string;
    capacity?: number;
    owner_name?: string;
    owner_email?: string;
    owner_password?: string;
  };
  try {
    body = await req.json();
  } catch {
    return reply({ error: "JSON inválido" }, 400);
  }

  const businessName = body.business_name?.trim();
  const slug = body.slug?.trim().toLowerCase();
  const lotName = body.lot_name?.trim();
  const lotCode = body.lot_code?.trim().toUpperCase();
  const capacity = Number(body.capacity);
  const ownerName = body.owner_name?.trim();
  const ownerEmail = body.owner_email?.trim().toLowerCase();
  const ownerPassword = body.owner_password ?? "";

  if (!businessName || !slug || !lotName || !lotCode || !ownerName || !ownerEmail) {
    return reply({ error: "Completa todos los datos de la empresa, sucursal y propietario" }, 400);
  }
  if (!Number.isInteger(capacity) || capacity < 1) return reply({ error: "La capacidad debe ser mayor que cero" }, 400);
  if (ownerPassword.length < 8) return reply({ error: "La contraseña debe tener al menos 8 caracteres" }, 400);

  const { data: created, error: createUserError } = await admin.auth.admin.createUser({
    email: ownerEmail,
    password: ownerPassword,
    email_confirm: true,
    user_metadata: { full_name: ownerName, business_name: businessName },
  });
  if (createUserError || !created.user) {
    const message = createUserError?.message ?? "No se pudo crear el propietario";
    return reply({ error: message.toLowerCase().includes("already") ? "Ya existe una cuenta con ese correo." : message }, 400);
  }

  const { data: business, error: businessError } = await admin.rpc("create_parking_business_with_owner", {
    p_name: businessName,
    p_slug: slug,
    p_lot_name: lotName,
    p_lot_code: lotCode,
    p_capacity: capacity,
    p_owner_user_id: created.user.id,
    p_owner_name: ownerName,
    p_owner_email: ownerEmail,
  });

  if (businessError) {
    await admin.auth.admin.deleteUser(created.user.id);
    return reply({ error: businessError.message }, 400);
  }

  return reply({ business, owner: { id: created.user.id, name: ownerName, email: ownerEmail, role: "owner" } });
});
