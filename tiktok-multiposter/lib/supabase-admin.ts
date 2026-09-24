import { createClient } from "@supabase/supabase-js";
import { env } from "./env";

function normalizeSupabaseUrl(raw: string) {
  const value = raw.trim().replace(/\/+$/, "");
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("SUPABASE_URL inválida: debe ser una URL https://...supabase.co");
  }

  if (parsed.protocol !== "https:" || !parsed.hostname.endsWith(".supabase.co")) {
    throw new Error("SUPABASE_URL inválida: usá la Project URL de Supabase, no una URL /rest/v1 ni otra ruta.");
  }

  // createClient necesita la raíz del proyecto. Una ruta pegada por error
  // termina generando requests PostgREST inválidos (PGRST125).
  if (parsed.pathname && parsed.pathname !== "/") {
    throw new Error("SUPABASE_URL inválida: debe terminar en .supabase.co sin /rest/v1 ni rutas adicionales.");
  }

  return parsed.origin;
}

export function supabaseAdmin() {
  const url = normalizeSupabaseUrl(env("SUPABASE_URL"));
  const serviceRoleKey = env("SUPABASE_SERVICE_ROLE_KEY").trim();

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}
