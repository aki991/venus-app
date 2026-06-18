"use client";

import { cn } from "@/lib/utils";
import { useUIStore } from "@/stores/uiStore";
import { TopBar } from "@/components/layout/TopBar";
import { AppointmentModals } from "@/components/kalendar/AppointmentModals";
import type { UserWithProfile } from "@/lib/auth/get-user";

export function DashboardShell({
  user,
  children,
}: {
  user: UserWithProfile;
  children: React.ReactNode;
}) {
  const collapsed = useUIStore((s) => s.sidebarCollapsed);

  return (
    <div
      className={cn(
        "flex min-h-screen flex-col transition-[margin] duration-200 ease-in-out",
        collapsed ? "ml-[70px]" : "ml-[262px]"
      )}
    >
      <TopBar user={user} />
      <main className="flex-1">{children}</main>

      {/* Modali termina — na layout nivou da rade na svim dashboard stranicama */}
      <AppointmentModals />
    </div>
  );
}
