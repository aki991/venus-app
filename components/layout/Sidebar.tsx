"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Calendar,
  FileText,
  Receipt,
  Stethoscope,
  ChevronLeft,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useUIStore } from "@/stores/uiStore";
import { useKalendarStore } from "@/stores/kalendarStore";
import { useDoctors } from "@/hooks/useDoctors";
import { VenusLogo } from "@/components/shared/VenusLogo";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  enabled: boolean;
}

const navItems: NavItem[] = [
  { href: "/kalendar", label: "Kalendar", icon: Calendar, enabled: true },
  { href: "/dnevnik", label: "Dnevnik", icon: FileText, enabled: false },
  { href: "/racuni", label: "Računi", icon: Receipt, enabled: false },
  { href: "/usluge", label: "Usluge", icon: Stethoscope, enabled: false },
];

const DEFAULT_DOCTOR_COLOR = "#c9a24b";

function doctorName(d: {
  first_name: string | null;
  last_name: string | null;
}): string {
  return [d.first_name, d.last_name].filter(Boolean).join(" ") || "Bez imena";
}

export function Sidebar() {
  const pathname = usePathname();
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);

  const { data: doctors, isLoading } = useDoctors();
  const doctorFilter = useKalendarStore((s) => s.doctorFilter);
  const setDoctorFilter = useKalendarStore((s) => s.setDoctorFilter);

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-30 flex h-screen flex-col border-r border-venus-border bg-venus-surface transition-[width] duration-200 ease-in-out",
        collapsed ? "w-[70px]" : "w-[262px]"
      )}
    >
      {/* Header */}
      <div className="flex h-20 shrink-0 items-center px-4">
        <VenusLogo showWordmark={!collapsed} />
      </div>

      {/* Navigacija */}
      <nav className="flex flex-col gap-1 px-3 py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");

          const inner = (
            <div
              className={cn(
                "flex items-center rounded-lg px-4 py-3 transition-colors",
                collapsed ? "justify-center" : "gap-3",
                active
                  ? "border-l-2 border-venus-gold bg-[color-mix(in_srgb,var(--venus-gold)_13%,transparent)] text-venus-gold"
                  : item.enabled
                    ? "text-venus-text-dim hover:bg-venus-surface-2"
                    : "cursor-not-allowed text-venus-text-dim opacity-50"
              )}
            >
              <Icon size={18} className="shrink-0" />
              {!collapsed && (
                <span className="text-sm font-medium">{item.label}</span>
              )}
            </div>
          );

          const node = item.enabled ? (
            <Link href={item.href}>{inner}</Link>
          ) : (
            <div aria-disabled="true">{inner}</div>
          );

          // U collapsed modu prikaži label kao tooltip na hover
          if (collapsed) {
            return (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>{node}</TooltipTrigger>
                <TooltipContent side="right">{item.label}</TooltipContent>
              </Tooltip>
            );
          }

          return <div key={item.href}>{node}</div>;
        })}
      </nav>

      {/* Tim ordinacije (sakriveno u collapsed modu) */}
      {collapsed ? (
        <div className="flex-1" />
      ) : (
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <h3 className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-venus-text-faint">
            Tim ordinacije
          </h3>
          <div className="flex flex-col gap-1">
            {/* "Svi" — clear filter */}
            <button
              type="button"
              onClick={() => setDoctorFilter(null)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors",
                doctorFilter === null
                  ? "bg-[color-mix(in_srgb,var(--venus-gold)_13%,transparent)] text-venus-gold"
                  : "text-venus-text-dim hover:bg-venus-surface-2"
              )}
            >
              <span className="size-2 shrink-0 rounded-full bg-venus-text-faint" />
              <span className="text-[12px]">Svi doktori</span>
            </button>

            {isLoading &&
              Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-lg px-2 py-2"
                >
                  <span className="size-2 shrink-0 animate-pulse rounded-full bg-venus-surface-2" />
                  <span className="h-3 w-28 animate-pulse rounded bg-venus-surface-2" />
                </div>
              ))}

            {doctors?.map((doc) => {
              const color = doc.color_hex ?? DEFAULT_DOCTOR_COLOR;
              const active = doctorFilter === doc.id;
              return (
                <button
                  key={doc.id}
                  type="button"
                  onClick={() => setDoctorFilter(active ? null : doc.id)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors",
                    active
                      ? "bg-[color-mix(in_srgb,var(--venus-gold)_13%,transparent)]"
                      : "hover:bg-venus-surface-2"
                  )}
                >
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <span
                    className={cn(
                      "truncate text-[12px]",
                      active ? "text-venus-gold" : "text-venus-text"
                    )}
                  >
                    {doctorName(doc)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Collapse dugme */}
      <div className="shrink-0 border-t border-venus-border p-3">
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label={collapsed ? "Proširi meni" : "Skupi meni"}
          className={cn(
            "flex w-full items-center rounded-lg px-4 py-2.5 text-venus-text-dim transition-colors hover:bg-venus-surface-2",
            collapsed ? "justify-center" : "gap-3"
          )}
        >
          <ChevronLeft
            size={18}
            className={cn(
              "shrink-0 transition-transform duration-200",
              collapsed && "rotate-180"
            )}
          />
          {!collapsed && <span className="text-sm">Skupi meni</span>}
        </button>
      </div>
    </aside>
  );
}
