"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Settings, Plus, Sun, Moon, LogOut } from "lucide-react";

import { cn } from "@/lib/utils";
import { useAppointmentModalStore } from "@/stores/appointmentModalStore";
import { logoutAction } from "@/lib/auth/actions";
import type { UserWithProfile } from "@/lib/auth/get-user";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function getInitials(user: UserWithProfile): string {
  const f = user.first_name?.[0] ?? "";
  const l = user.last_name?.[0] ?? "";
  const initials = (f + l).toUpperCase();
  return initials || user.email?.[0]?.toUpperCase() || "?";
}

/**
 * Theme toggle — SSR-safe: do mount-a vraća placeholder iste veličine
 * da bi se izbegao hydration mismatch (server ne zna temu klijenta).
 */
function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="h-10 w-[72px] rounded-full bg-venus-surface-2" />;
  }

  return (
    <div className="flex items-center gap-1 rounded-full bg-venus-surface-2 p-1">
      <button
        type="button"
        onClick={() => setTheme("light")}
        aria-label="Svetla tema"
        className={cn(
          "flex size-8 items-center justify-center rounded-full transition-colors",
          theme === "light"
            ? "bg-venus-gold text-white"
            : "text-venus-text-faint hover:text-venus-text-dim"
        )}
      >
        <Sun size={16} />
      </button>
      <button
        type="button"
        onClick={() => setTheme("dark")}
        aria-label="Tamna tema"
        className={cn(
          "flex size-8 items-center justify-center rounded-full transition-colors",
          theme === "dark"
            ? "bg-venus-gold text-venus-bg"
            : "text-venus-text-faint hover:text-venus-text-dim"
        )}
      >
        <Moon size={16} />
      </button>
    </div>
  );
}

export function TopBar({ user }: { user: UserWithProfile }) {
  const openNew = useAppointmentModalStore((s) => s.openNew);
  const fullName =
    [user.first_name, user.last_name].filter(Boolean).join(" ") ||
    (user.email ?? "Korisnik");

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-venus-border bg-venus-surface/80 px-6 backdrop-blur-md">
      <div className="flex-1" />

      <ThemeToggle />

      {/* Settings — vodi na admin panel, SAMO za admina */}
      {user.role === "admin" && (
        <Link
          href="/podesavanja"
          aria-label="Podešavanja"
          className="flex size-[38px] items-center justify-center rounded-lg text-venus-text-dim transition-colors hover:bg-venus-surface-2"
        >
          <Settings size={18} />
        </Link>
      )}

      {/* User avatar + dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Korisnički meni"
            className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-venus-gold"
          >
            <Avatar className="size-10 border-2 border-venus-gold">
              <AvatarFallback className="bg-[color-mix(in_srgb,var(--venus-gold)_15%,transparent)] font-medium text-venus-gold">
                {getInitials(user)}
              </AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <div className="px-2 py-1.5">
            <p className="text-sm font-medium">{fullName}</p>
            <p className="truncate text-xs text-muted-foreground">
              {user.email}
            </p>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem>Moj profil</DropdownMenuItem>
          {user.role === "admin" && (
            <DropdownMenuItem asChild>
              <Link href="/podesavanja">Podešavanja</Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => {
              void logoutAction();
            }}
          >
            <LogOut />
            Odjavi se
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Novi termin CTA (samo UI za sad) */}
      <button
        type="button"
        onClick={() => openNew()}
        className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-[#0d0d0d]"
        style={{
          backgroundImage:
            "linear-gradient(180deg, var(--venus-gold-bright), var(--venus-gold))",
          boxShadow: "0 4px 16px rgba(229, 196, 95, 0.45)",
        }}
      >
        <Plus size={16} />
        Novi termin
      </button>
    </header>
  );
}
