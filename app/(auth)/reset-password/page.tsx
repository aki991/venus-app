import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { ResetPasswordForm } from "./reset-password-form";

export default async function ResetPasswordPage() {
  // Ova stranica je dostupna samo sa aktivnom sesijom (recovery iz reset linka
  // koji je /auth/confirm postavio). Direktan pristup bez sesije → /login.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?error=invalid_link");
  }

  return <ResetPasswordForm />;
}
