"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Armchair, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import type { ChairAdminItem } from "@/lib/db/admin";
import {
  createChairAction,
  deleteChairAction,
  setChairActiveAction,
  updateChairAction,
} from "@/lib/admin/chair-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function ChairsTab({ chairs }: { chairs: ChairAdminItem[] }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ChairAdminItem | null>(null);

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <Plus size={16} />
          Dodaj stolicu
        </Button>
      </div>

      <div className="grid gap-2">
        {chairs.length === 0 && (
          <p className="py-8 text-center text-sm text-venus-text-faint">
            Još nema stolica.
          </p>
        )}
        {chairs.map((c) => (
          <ChairRow
            key={c.id}
            chair={c}
            onEdit={() => {
              setEditing(c);
              setDialogOpen(true);
            }}
          />
        ))}
      </div>

      <ChairDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
      />
    </div>
  );
}

function ChairRow({
  chair,
  onEdit,
}: {
  chair: ChairAdminItem;
  onEdit: () => void;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);

  function run(action: () => Promise<{ success: true } | { error: string }>) {
    startTransition(async () => {
      const res = await action();
      if ("error" in res) toast.error(res.error);
      else {
        toast.success("Sačuvano");
        router.refresh();
        // Osveži klijent-side cache (ChairSelector u kalendaru)
        queryClient.invalidateQueries({ queryKey: ["chairs"] });
      }
    });
  }

  return (
    <div
      className={cn(
        "flex items-center gap-4 rounded-xl border border-venus-border bg-venus-surface p-3",
        !chair.is_active && "opacity-60"
      )}
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-venus-surface-2 text-venus-text-dim">
        <Armchair size={18} />
      </span>

      <div className="min-w-0 flex-1">
        <span className="font-medium text-venus-text">{chair.name}</span>
      </div>

      <Badge
        className={cn(
          "border-transparent",
          chair.is_active
            ? "bg-emerald-500/15 text-emerald-500"
            : "bg-zinc-500/15 text-zinc-400"
        )}
      >
        {chair.is_active ? "Aktivna" : "Neaktivna"}
      </Badge>

      <Switch
        checked={chair.is_active}
        disabled={pending}
        onCheckedChange={(v) => run(() => setChairActiveAction(chair.id, v))}
        aria-label="Aktivna"
      />

      <Button variant="ghost" size="icon" onClick={onEdit} aria-label="Izmeni">
        <Pencil size={16} />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="text-venus-danger"
        onClick={() => setConfirmDelete(true)}
        aria-label="Obriši"
      >
        <Trash2 size={16} />
      </Button>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Obrisati stolicu?</AlertDialogTitle>
            <AlertDialogDescription>
              „{chair.name}" će biti trajno obrisana. Ovo je moguće samo ako
              stolica nema nijedan termin — u suprotnom je deaktivirajte.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Otkaži</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => run(() => deleteChairAction(chair.id))}
            >
              Obriši
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ChairDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: ChairAdminItem | null;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");

  function onSubmit() {
    if (!name.trim()) {
      toast.error("Unesite naziv stolice");
      return;
    }
    startTransition(async () => {
      const res = editing
        ? await updateChairAction(editing.id, name.trim())
        : await createChairAction(name.trim());
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      toast.success(editing ? "Stolica izmenjena" : "Stolica dodata");
      onOpenChange(false);
      router.refresh();
      queryClient.invalidateQueries({ queryKey: ["chairs"] });
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (v) setName(editing?.name ?? "");
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Izmeni stolicu" : "Dodaj stolicu"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-1.5">
          <Label>Naziv</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="npr. Stolica 2"
            onKeyDown={(e) => {
              if (e.key === "Enter") onSubmit();
            }}
          />
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Otkaži
          </Button>
          <Button onClick={onSubmit} disabled={pending}>
            {editing ? "Sačuvaj" : "Dodaj"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
