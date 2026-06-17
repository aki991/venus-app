import { requireStaff } from "@/lib/auth/get-user";
import { Sidebar } from "@/components/layout/Sidebar";
import { DashboardShell } from "@/components/layout/DashboardShell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireStaff();

  return (
    <div className="min-h-screen bg-venus-bg text-venus-text">
      <Sidebar />
      <DashboardShell user={user}>{children}</DashboardShell>
    </div>
  );
}
