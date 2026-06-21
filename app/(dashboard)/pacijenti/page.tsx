import { requireStaff } from "@/lib/auth/get-user";
import { fetchPatients } from "@/lib/db/admin";
import { PatientsList } from "@/components/pacijenti/PatientsList";

export default async function PacijentiPage() {
  await requireStaff();
  const patients = await fetchPatients();

  return (
    <div className="p-6">
      <h1 className="font-serif text-3xl font-bold text-venus-text">Pacijenti</h1>
      <p className="mb-6 mt-1 text-sm text-venus-text-dim">
        Spisak pacijenata ordinacije.
      </p>

      <PatientsList patients={patients} />
    </div>
  );
}
