"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { forgotPasswordAction } from "@/lib/auth/actions";
import {
  forgotPasswordSchema,
  type ForgotPasswordInput,
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

export default function ForgotPasswordPage() {
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: ForgotPasswordInput) {
    setPending(true);
    // Uvek success (anti-enumeration) — samo prikaži potvrdu
    await forgotPasswordAction(values);
    setPending(false);
    setSent(true);
  }

  return (
    <Card className="border-venus-border bg-venus-surface text-venus-text">
      <CardHeader>
        <CardTitle className="font-serif text-2xl">Zaboravljena šifra</CardTitle>
        <CardDescription className="text-venus-text-dim">
          {sent
            ? "Proverite vaš email."
            : "Unesite email i poslaćemo vam link za resetovanje šifre."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {sent ? (
          <div className="space-y-4">
            <p className="text-sm text-venus-text-dim">
              Ako nalog postoji, poslali smo vam email sa instrukcijama.
              Proverite inbox (i Spam folder).
            </p>
            <Button
              asChild
              variant="outline"
              className="w-full border-venus-border text-venus-text hover:bg-venus-surface-2"
            >
              <Link href="/login">Nazad na prijavu</Link>
            </Button>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        autoComplete="email"
                        placeholder="ime@ordinacija.rs"
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
                {pending ? "Šaljem..." : "Pošalji link"}
              </Button>
              <div className="text-center">
                <Link
                  href="/login"
                  className="text-xs text-venus-gold transition-colors hover:text-venus-gold-bright"
                >
                  Nazad na prijavu
                </Link>
              </div>
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  );
}
