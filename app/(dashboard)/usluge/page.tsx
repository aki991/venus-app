import { requireStaff } from "@/lib/auth/get-user";
import { ServiceList } from "@/components/usluge/ServiceList";

export default async function UslugePage() {
  // Svi staff/admin vide cenovnik; admin dodatno dobija kontrole.
  const user = await requireStaff();
  const isAdmin = user.role === "admin";

  return (
    <div className="p-6">
      <h1 className="font-serif text-3xl font-bold text-venus-text">Usluge</h1>
      <p className="mb-6 mt-1 text-sm text-venus-text-dim">
        Cenovnik ordinacije
      </p>

      <ServiceList isAdmin={isAdmin} />
    </div>
  );
}
