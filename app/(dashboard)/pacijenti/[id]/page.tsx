import { notFound } from "next/navigation";

import { requireStaff } from "@/lib/auth/get-user";
import { fetchPatientById, fetchPatientAppointments } from "@/lib/db/admin";
import { PatientCard } from "@/components/pacijenti/PatientCard";

export default async function PatientCardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireStaff();
  const { id } = await params;

  const [patient, appointments] = await Promise.all([
    fetchPatientById(id),
    fetchPatientAppointments(id),
  ]);

  if (!patient) notFound();

  return (
    <div className="p-6">
      <PatientCard patient={patient} appointments={appointments} />
    </div>
  );
}
