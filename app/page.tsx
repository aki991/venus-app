import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";

export default async function Home() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role === "patient") redirect("/patient-not-allowed");
  redirect("/kalendar");
}
