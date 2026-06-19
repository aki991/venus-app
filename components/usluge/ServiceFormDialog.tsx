"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";

import {
  serviceFormSchema,
  type ServiceFormInput,
} from "@/lib/validations/service";
import type { ServiceAdminItem } from "@/lib/db/services";
import type { ServiceInput } from "@/lib/admin/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface ServiceFormDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: ServiceAdminItem | null;
  categories: string[];
  pending: boolean;
  /** Vraća true ako je čuvanje uspelo (dialog se tada zatvara). */
  onSubmit: (input: ServiceInput) => Promise<boolean>;
}

function defaults(editing: ServiceAdminItem | null): ServiceFormInput {
  return {
    name: editing?.name ?? "",
    category: editing?.category ?? "",
    description: editing?.description ?? null,
    duration_minutes: editing?.duration_minutes ?? 30,
    price: editing?.price ?? null,
  };
}

export function ServiceFormDialog({
  open,
  onOpenChange,
  editing,
  categories,
  pending,
  onSubmit,
}: ServiceFormDialogProps) {
  const form = useForm<ServiceFormInput>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: defaults(editing),
  });

  useEffect(() => {
    if (open) form.reset(defaults(editing));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing]);

  async function handleSubmit(values: ServiceFormInput) {
    const ok = await onSubmit({
      name: values.name,
      description: values.description,
      category: values.category,
      durationMinutes: values.duration_minutes,
      price: values.price,
    });
    if (ok) onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Izmeni uslugu" : "Dodaj uslugu"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="grid gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Naziv</FormLabel>
                  <FormControl>
                    <Input placeholder="npr. Plombiranje" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kategorija</FormLabel>
                  <FormControl>
                    {/* Slobodan unos + predlozi postojećih kategorija (datalist). */}
                    <Input
                      list="service-categories"
                      placeholder="npr. Konzervativa"
                      {...field}
                    />
                  </FormControl>
                  <datalist id="service-categories">
                    {categories.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="duration_minutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Trajanje (min)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={5}
                        max={480}
                        step={5}
                        value={field.value}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cena (RSD)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        step={100}
                        placeholder="opciono"
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value === "" ? null : Number(e.target.value)
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Opis</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Opciono..."
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value || null)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={pending}
              >
                Otkaži
              </Button>
              <Button type="submit" disabled={pending}>
                {pending && <Loader2 className="animate-spin" />}
                {editing ? "Sačuvaj" : "Dodaj"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
