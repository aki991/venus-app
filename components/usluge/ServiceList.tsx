"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { formatRSD, formatDuration } from "@/lib/format";
import { distinctCategories, type ServiceAdminItem } from "@/lib/db/services";
import { useAdminServices, useServiceMutations } from "@/hooks/useServices";
import type { ServiceInput } from "@/lib/admin/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
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
import { ServiceFormDialog } from "./ServiceFormDialog";

const ALL = "all";

export function ServiceList({ isAdmin }: { isAdmin: boolean }) {
  const { data: services = [], isLoading } = useAdminServices();
  const { create, update, setActive, remove, reorder } = useServiceMutations();

  const [category, setCategory] = useState<string>(ALL);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceAdminItem | null>(null);

  // Source of truth za redosled = `services` (već sortirani po display_order).
  // `dragOrder` je PRIVREMENI optimistic redosled SAMO tokom/posle drag-a; čim
  // server (refetch posle mutacije) potvrdi isti redosled, briše se na null.
  const [dragOrder, setDragOrder] = useState<string[] | null>(null);

  const categories = useMemo(() => distinctCategories(services), [services]);

  // Usluge u prikaznom redosledu: override ako postoji, inače server redosled.
  const ordered = useMemo(() => {
    if (!dragOrder) return services;
    const map = new Map(services.map((s) => [s.id, s]));
    const seen = new Set(dragOrder);
    const out = dragOrder
      .map((id) => map.get(id))
      .filter(Boolean) as ServiceAdminItem[];
    // Nove usluge kojih nema u override-u (npr. tek dodate) idu na kraj.
    for (const s of services) if (!seen.has(s.id)) out.push(s);
    return out;
  }, [services, dragOrder]);

  // Kad server redosled stigne i poklopi se sa override-om → očisti override.
  // Uslovni setState (samo kad su jednaki, jednom) → bez beskonačne petlje.
  useEffect(() => {
    if (
      dragOrder &&
      dragOrder.length === services.length &&
      dragOrder.every((id, i) => services[i]?.id === id)
    ) {
      setDragOrder(null);
    }
  }, [services, dragOrder]);

  const visible =
    category === ALL
      ? ordered
      : ordered.filter((s) => s.category === category);

  // Reorder je dozvoljen SAMO adminu i SAMO kad nema filtera ("Sve").
  // Razlog: reorder_services upisuje GLOBALNI display_order (index u celoj listi).
  // Reorder filtriranog podskupa bi pisao globalne pozicije iz nepotpunog
  // konteksta → pozicije bi "skakale" čim se filter skine. Pod "Sve" je
  // mapiranje index → display_order jednoznačno.
  const dndEnabled = isAdmin && category === ALL;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const ids = ordered.map((s) => s.id);
    const oldIndex = ids.indexOf(active.id as string);
    const newIndex = ids.indexOf(over.id as string);
    if (oldIndex < 0 || newIndex < 0) return;
    const newOrder = arrayMove(ids, oldIndex, newIndex);
    setDragOrder(newOrder); // optimistic
    reorder.mutate(newOrder, {
      onError: (err) =>
        toast.error(err instanceof Error ? err.message : "Greška pri redosledu"),
    });
  }

  async function handleSubmit(input: ServiceInput): Promise<boolean> {
    try {
      if (editing) await update.mutateAsync({ id: editing.id, input });
      else await create.mutateAsync(input);
      toast.success(editing ? "Usluga izmenjena" : "Usluga dodata");
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Greška");
      return false;
    }
  }

  function handleToggle(svc: ServiceAdminItem, active: boolean) {
    setActive.mutate(
      { id: svc.id, active },
      {
        onSuccess: () =>
          toast.success(active ? "Usluga aktivirana" : "Usluga deaktivirana"),
        onError: (err) =>
          toast.error(err instanceof Error ? err.message : "Greška"),
      }
    );
  }

  function handleDelete(id: string) {
    remove.mutate(id, {
      onSuccess: () => toast.success("Usluga obrisana"),
      onError: (err) =>
        toast.error(err instanceof Error ? err.message : "Greška"),
    });
  }

  const mutating =
    setActive.isPending || remove.isPending || reorder.isPending;

  const rows = visible.map((svc) =>
    dndEnabled ? (
      <SortableServiceRow
        key={svc.id}
        service={svc}
        isAdmin={isAdmin}
        disabled={mutating}
        onEdit={() => {
          setEditing(svc);
          setDialogOpen(true);
        }}
        onToggle={(a) => handleToggle(svc, a)}
        onDelete={() => handleDelete(svc.id)}
      />
    ) : (
      <ServiceRow
        key={svc.id}
        service={svc}
        isAdmin={isAdmin}
        disabled={mutating}
        onEdit={() => {
          setEditing(svc);
          setDialogOpen(true);
        }}
        onToggle={(a) => handleToggle(svc, a)}
        onDelete={() => handleDelete(svc.id)}
      />
    )
  );

  return (
    <div>
      {/* Toolbar: filter pills + Dodaj */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <FilterPill
            label="Sve"
            active={category === ALL}
            onClick={() => setCategory(ALL)}
          />
          {categories.map((c) => (
            <FilterPill
              key={c}
              label={c}
              active={category === c}
              onClick={() => setCategory(c)}
            />
          ))}
        </div>

        {isAdmin && (
          <Button
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus size={16} />
            Dodaj uslugu
          </Button>
        )}
      </div>

      {isAdmin && category !== ALL && (
        <p className="mb-3 text-xs text-venus-text-faint">
          Promena redosleda je dostupna samo kad je filter „Sve".
        </p>
      )}

      {isLoading ? (
        <p className="py-8 text-center text-sm text-venus-text-faint">
          Učitavanje…
        </p>
      ) : visible.length === 0 ? (
        <p className="py-8 text-center text-sm text-venus-text-faint">
          Nema usluga{category !== ALL ? " u ovoj kategoriji" : ""}.
        </p>
      ) : dndEnabled ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
        >
          <SortableContext
            items={visible.map((s) => s.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="grid gap-2">{rows}</div>
          </SortableContext>
        </DndContext>
      ) : (
        <div className="grid gap-2">{rows}</div>
      )}

      {isAdmin && (
        <ServiceFormDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          editing={editing}
          categories={categories}
          pending={create.isPending || update.isPending}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}

function FilterPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        // +30% veće (px-4/py-1.5/text-base) i crna osnova (kao tabovi na admin panelu)
        "rounded-full border px-4 py-1.5 text-base font-medium transition-colors",
        active
          ? "border-venus-gold bg-venus-gold text-[#0d0d0d]"
          : "border-venus-border bg-venus-canvas text-venus-text-dim hover:text-venus-text"
      )}
    >
      {label}
    </button>
  );
}

interface RowProps {
  service: ServiceAdminItem;
  isAdmin: boolean;
  disabled: boolean;
  onEdit: () => void;
  onToggle: (active: boolean) => void;
  onDelete: () => void;
  handle?: React.ReactNode;
  innerRef?: (node: HTMLElement | null) => void;
  style?: React.CSSProperties;
}

/** Sortable wrapper — daje drag handle + transform stil. */
function SortableServiceRow(props: Omit<RowProps, "handle" | "innerRef" | "style">) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: props.service.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  const handle = (
    <button
      type="button"
      className="shrink-0 cursor-grab touch-none text-venus-text-faint hover:text-venus-text active:cursor-grabbing"
      aria-label="Prevuci za redosled"
      {...attributes}
      {...listeners}
    >
      <GripVertical size={18} />
    </button>
  );

  return (
    <ServiceRow {...props} handle={handle} innerRef={setNodeRef} style={style} />
  );
}

function ServiceRow({
  service,
  isAdmin,
  disabled,
  onEdit,
  onToggle,
  onDelete,
  handle,
  innerRef,
  style,
}: RowProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div
      ref={innerRef}
      style={style}
      className={cn(
        "flex items-center gap-3 rounded-xl border border-venus-border bg-venus-canvas p-3",
        !service.is_active && "opacity-60"
      )}
    >
      {handle}

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium text-venus-text">
            {service.name}
          </span>
          {service.category && (
            <Badge className="shrink-0 border-transparent bg-venus-surface-2 text-venus-text-dim">
              {service.category}
            </Badge>
          )}
          {!service.is_active && (
            <Badge className="shrink-0 border-transparent bg-zinc-500/15 text-zinc-400">
              Neaktivna
            </Badge>
          )}
        </div>
        {service.description && (
          <p className="mt-0.5 truncate text-[12px] text-venus-text-faint">
            {service.description}
          </p>
        )}
      </div>

      <span className="shrink-0 text-sm text-venus-text-dim">
        {formatDuration(service.duration_minutes)}
      </span>
      <span className="w-28 shrink-0 text-right text-sm font-semibold text-venus-text">
        {formatRSD(service.price)}
      </span>

      {isAdmin && (
        <div className="flex shrink-0 items-center gap-1">
          <Switch
            checked={service.is_active}
            disabled={disabled}
            onCheckedChange={onToggle}
            aria-label="Aktivna"
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={onEdit}
            aria-label="Izmeni"
          >
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
                <AlertDialogTitle>Obrisati uslugu?</AlertDialogTitle>
                <AlertDialogDescription>
                  „{service.name}" će biti trajno obrisana. Ako usluga ima buduće
                  termine, brisanje neće biti dozvoljeno — tada je deaktivirajte.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Otkaži</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete}>
                  {disabled && <Loader2 className="animate-spin" />}
                  Obriši
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </div>
  );
}
