import { requireStaff } from "@/lib/auth/get-user";
import { OdontogramWorkdesk } from "@/components/odontogram/OdontogramWorkdesk";

export default async function OdontogramPage() {
  await requireStaff();
  return <OdontogramWorkdesk />;
}
