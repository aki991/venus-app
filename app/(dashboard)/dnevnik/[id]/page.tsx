import { requireStaff } from "@/lib/auth/get-user";
import { PatientCard } from "@/components/dnevnik/PatientCard";

export default async function PatientCardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireStaff();
  const { id } = await params;

  return (
    <div className="p-6">
      <PatientCard patientId={id} />
    </div>
  );
}
