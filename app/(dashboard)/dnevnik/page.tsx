import { requireStaff } from "@/lib/auth/get-user";
import { PatientList } from "@/components/dnevnik/PatientList";

export default async function DnevnikPage() {
  // Layout već garantuje staff; eksplicitni guard radi jasnoće.
  await requireStaff();

  return (
    <div className="p-6">
      <h1 className="font-serif text-3xl font-bold text-venus-text">
        Dnevnik pacijenata
      </h1>
      <p className="mb-6 mt-1 text-sm text-venus-text-dim">
        Kartoni i istorija svih pacijenata.
      </p>
      <PatientList />
    </div>
  );
}
