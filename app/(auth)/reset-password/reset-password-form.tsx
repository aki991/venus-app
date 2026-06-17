"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { updatePasswordAction } from "@/lib/auth/actions";
import {
  resetPasswordSchema,
  type ResetPasswordInput,
} from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

export function ResetPasswordForm() {
  const [pending, setPending] = useState(false);

  const form = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  async function onSubmit(values: ResetPasswordInput) {
    setPending(true);
    // Na uspeh action redirect-uje na /login?reset=success — ovde stižemo samo na grešku
    const result = await updatePasswordAction(values);
    if (result?.error) {
      toast.error(result.error);
      setPending(false);
    }
  }

  return (
    <Card className="border-venus-border bg-venus-surface text-venus-text">
      <CardHeader>
        <CardTitle className="font-serif text-2xl">Nova šifra</CardTitle>
        <CardDescription className="text-venus-text-dim">
          Unesite novu šifru za vaš nalog.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nova šifra</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      autoComplete="new-password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Potvrdi šifru</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      autoComplete="new-password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              disabled={pending}
              className="w-full bg-venus-gold text-venus-bg hover:bg-venus-gold-bright"
            >
              {pending ? "Čuvam..." : "Sačuvaj novu šifru"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
