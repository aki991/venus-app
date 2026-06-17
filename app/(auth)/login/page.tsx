"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { loginAction } from "@/lib/auth/actions";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";
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

function LoginForm() {
  const searchParams = useSearchParams();
  const [pending, setPending] = useState(false);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  useEffect(() => {
    if (searchParams.get("error") === "invalid_link") {
      toast.error("Link je istekao ili je nevažeći. Pokušajte ponovo.");
    }
    if (searchParams.get("reset") === "success") {
      toast.success("Šifra je uspešno promenjena. Prijavite se novom šifrom.");
    }
  }, [searchParams]);

  async function onSubmit(values: LoginInput) {
    setPending(true);
    // Na uspeh loginAction redirect-uje (NEXT_REDIRECT) — ovde stižemo samo na grešku
    const result = await loginAction(values);
    if (result?.error) {
      toast.error(result.error);
      setPending(false);
    }
  }

  return (
    <Card className="border-venus-border bg-venus-surface text-venus-text">
      <CardHeader>
        <CardTitle className="font-serif text-2xl">Prijava</CardTitle>
        <CardDescription className="text-venus-text-dim">
          Prijavite se na nalog zaposlenog.
        </CardDescription>
      </CardHeader>
      <CardContent>
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
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>Šifra</FormLabel>
                    <Link
                      href="/forgot-password"
                      className="text-xs text-venus-gold transition-colors hover:text-venus-gold-bright"
                    >
                      Zaboravljena šifra?
                    </Link>
                  </div>
                  <FormControl>
                    <Input
                      type="password"
                      autoComplete="current-password"
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
              {pending ? "Prijavljujem..." : "Prijavi se"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
