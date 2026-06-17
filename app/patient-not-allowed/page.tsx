import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function PatientNotAllowedPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-venus-bg px-4 py-10">
      <div className="w-full max-w-[440px] space-y-8">
        <div className="space-y-1 text-center">
          <h1 className="font-serif text-5xl font-bold tracking-wide text-venus-gold">
            VENUS
          </h1>
          <p className="text-xs uppercase tracking-[0.25em] text-venus-text-faint">
            Stomatološka ordinacija
          </p>
        </div>
        <Card className="border-venus-border bg-venus-surface text-venus-text">
          <CardHeader>
            <CardTitle className="font-serif text-2xl">
              Aplikacija za zaposlene
            </CardTitle>
            <CardDescription className="text-venus-text-dim">
              Ova web aplikacija je namenjena isključivo zaposlenima ordinacije.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-sm text-venus-text-dim">
              Za zakazivanje termina i pregled svojih podataka, preuzmite
              mobilnu Venus aplikaciju.
            </p>
            <Button
              asChild
              className="w-full bg-venus-gold text-venus-bg hover:bg-venus-gold-bright"
            >
              <Link href="/login">Nazad na prijavu</Link>
            </Button>
            <p className="text-center text-xs text-venus-text-faint">
              <a
                href="#"
                className="text-venus-gold transition-colors hover:text-venus-gold-bright"
              >
                Preuzmi mobilnu aplikaciju
              </a>{" "}
              — uskoro dostupno
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
