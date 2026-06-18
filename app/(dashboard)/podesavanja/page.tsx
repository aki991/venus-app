import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/get-user";
import { fetchAllDoctors, fetchAllChairs } from "@/lib/db/admin";
import { AdminPanel } from "@/components/admin/AdminPanel";

export default async function PodesavanjaPage() {
  // Dodatni admin-only guard (layout već garantuje staff).
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/kalendar");

  const [doctors, chairs] = await Promise.all([
    fetchAllDoctors(),
    fetchAllChairs(),
  ]);

  return (
    <div className="p-6">
      <h1 className="font-serif text-3xl font-bold text-venus-text">
        Podešavanja
      </h1>
      <p className="mb-6 mt-1 text-sm text-venus-text-dim">
        Upravljanje doktorima i stolicama ordinacije.
      </p>
      <AdminPanel doctors={doctors} chairs={chairs} />
    </div>
  );
}
