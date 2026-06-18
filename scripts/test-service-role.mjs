// Test da li SUPABASE_SERVICE_ROLE_KEY radi za admin pozive.
// Pokretanje: node --env-file=.env.local scripts/test-service-role.mjs
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("❌ Nedostaju env varijable:");
  console.error("   NEXT_PUBLIC_SUPABASE_URL:", url ? "OK" : "FALI");
  console.error("   SUPABASE_SERVICE_ROLE_KEY:", serviceKey ? "OK" : "FALI");
  process.exit(1);
}

// Format ključa (bez ispisivanja same tajne)
const keyFormat = serviceKey.startsWith("eyJ")
  ? "JWT (eyJ...) — legacy"
  : serviceKey.startsWith("sb_secret_")
    ? "sb_secret_ — novi API key"
    : "NEPOZNAT format";
console.log("URL:", url);
console.log("Service key format:", keyFormat);
console.log("Pozivam auth.admin.listUsers()...\n");

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data, error } = await supabase.auth.admin.listUsers();

if (error) {
  console.error("❌ NEUSPEH:", error.status ?? "", error.message);
  console.error(error);
  process.exit(2);
}

console.log(`✅ USPEH — service role radi. Korisnika: ${data.users.length}`);
for (const u of data.users.slice(0, 10)) {
  console.log(`   - ${u.email ?? u.id} (${u.id})`);
}
