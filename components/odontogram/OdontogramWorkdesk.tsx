"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  FileText,
  Loader2,
  RefreshCw,
  Search,
  Trash2,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";

import {
  fetchPatientRecordById,
  type PatientPickerResult,
} from "@/lib/db/patients";
import {
  applySetCondition,
  applyRemoveCondition,
  toothMapToRecords,
} from "@/lib/odontogram/toothMap";
import type { ToothMap } from "@/lib/db/toothRecords";
import { createPatientAction } from "@/lib/admin/patient-actions";
import { saveToothRecordsBatchAction } from "@/lib/actions/tooth-actions";
import type { PatientFormInput } from "@/lib/validations/patient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Odontogram } from "@/components/odontogram/Odontogram";
import { OdontogramView } from "@/components/odontogram/OdontogramView";
import { PatientPicker } from "@/components/odontogram/PatientPicker";

const STORAGE_KEY = "venus-odontogram-last-patient";
const GUEST_DRAFT_KEY = "venus-odontogram-guest-draft";

interface GuestDraft {
  teeth: ToothMap;
  firstName: string;
  lastName: string;
}

export function OdontogramWorkdesk() {
  // active = null → "Pacijent gost" (lokalna skica, ne čuva se).
  const [active, setActive] = useState<PatientPickerResult | null>(null);
  // Lokalna skica gosta — odvojena od baze; nestaje pri izboru pacijenta.
  const [guestMap, setGuestMap] = useState<ToothMap>({});
  const [pickerOpen, setPickerOpen] = useState(false);
  // Brzi unos novog pacijenta iz gost moda.
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [adding, startAdding] = useTransition();
  // Tek kad pročitamo postojeći draft smemo da pišemo (da prvi prazan render
  // ne pregazi sačuvanu skicu).
  const [draftLoaded, setDraftLoaded] = useState(false);

  // Gost je default na prvom renderu (SSR-safe). Tek u useEffect proveravamo
  // localStorage i, ako ima poslednjeg pacijenta, prebacujemo na njega.
  useEffect(() => {
    let cancelled = false;
    const raw =
      typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (!raw) return;
    let id: string | null = null;
    try {
      id = (JSON.parse(raw) as { id?: string }).id ?? null;
    } catch {
      id = null;
    }
    if (!id) return;
    fetchPatientRecordById(id)
      .then((p) => {
        if (cancelled) return;
        if (p) setActive(p);
        else localStorage.removeItem(STORAGE_KEY); // obrisan u međuvremenu
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Učitaj gost draft (skica + ime/prezime) iz localStorage — samo klijent,
  // posle mount-a (prvi render je prazan → nema hydration mismatch-a).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(GUEST_DRAFT_KEY);
      if (raw) {
        const d = JSON.parse(raw) as Partial<GuestDraft>;
        if (d.teeth && typeof d.teeth === "object") {
          setGuestMap(d.teeth as ToothMap);
        }
        if (typeof d.firstName === "string") setFirstName(d.firstName);
        if (typeof d.lastName === "string") setLastName(d.lastName);
      }
    } catch {
      // korumpiran draft → tretiraj kao prazno (ne ruši stranicu)
    }
    setDraftLoaded(true);
  }, []);

  // Perzistuj gost draft na svaku promenu (samo u gost modu i tek po učitavanju).
  useEffect(() => {
    if (!draftLoaded) return;
    if (active) return; // pravi pacijent se čuva u bazu, NE u draft
    try {
      const draft: GuestDraft = { teeth: guestMap, firstName, lastName };
      localStorage.setItem(GUEST_DRAFT_KEY, JSON.stringify(draft));
    } catch {
      // npr. localStorage pun/blokiran → tiho ignoriši
    }
  }, [draftLoaded, active, guestMap, firstName, lastName]);

  function selectPatient(p: PatientPickerResult) {
    // Draft OSTAJE (možeš se vratiti preko "Nov pacijent" i nastaviti skicu).
    setActive(p);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ id: p.id }));
    setPickerOpen(false);
  }

  // Namerno brisanje skice (dugme "Očisti skicu").
  function clearDraft() {
    setGuestMap({});
    setFirstName("");
    setLastName("");
    localStorage.removeItem(GUEST_DRAFT_KEY);
  }

  // "Nov pacijent": vrati na gost mod. Zadržava postojeću skicu (draft) da se
  // nastavi — slučajan prelaz ne gubi rad; namerno brisanje je "Očisti skicu".
  // Čistimo samo "poslednjeg pacijenta" (sledeće otvaranje → gost, ne stari).
  function startNewPatient() {
    setActive(null);
    localStorage.removeItem(STORAGE_KEY);
    setPickerOpen(false);
  }

  // "Dodaj": kreiraj novog pacijenta + prenesi gost skicu na njega, ostani ovde.
  function addGuestAsPatient() {
    const fn = firstName.trim();
    const ln = lastName.trim();
    if (!fn || !ln) {
      toast.error("Unesite ime i prezime");
      return;
    }
    startAdding(async () => {
      const input: PatientFormInput = {
        first_name: fn,
        last_name: ln,
        date_of_birth: null,
        gender: null,
        phone: null,
        email: null,
        occupation: null,
        location: null,
        status: "nov",
        card_number: null, // auto preko next_card_number
        notes: null,
      };
      const res = await createPatientAction(input);
      if ("error" in res) {
        toast.error(res.error);
        return;
      }

      // Prenesi skicu (ako ima nacrtanog) batch-om.
      const records = toothMapToRecords(guestMap);
      if (records.length > 0) {
        const saveRes = await saveToothRecordsBatchAction(res.patientId, records);
        if ("error" in saveRes) {
          toast.error(`Pacijent kreiran, ali skica nije sačuvana: ${saveRes.error}`);
        }
      }

      // Prebaci na STANJE B sa novim pacijentom (svež record zbog broja kartona).
      const rec = await fetchPatientRecordById(res.patientId);
      setActive(
        rec ?? {
          id: res.patientId,
          first_name: fn,
          last_name: ln,
          card_number: null,
          phone: null,
        }
      );
      setGuestMap({});
      setFirstName("");
      setLastName("");
      localStorage.removeItem(GUEST_DRAFT_KEY); // skica preneta u bazu → nepotrebna
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ id: res.patientId }));
      toast.success("Pacijent dodat");
    });
  }

  return (
    <div className="p-6">
      <h1 className="font-serif text-3xl font-bold text-venus-text">
        Odontogram
      </h1>
      <p className="mb-6 mt-1 text-sm text-venus-text-dim">
        Radni prikaz zuba pacijenta.
      </p>

      <div className="grid gap-5">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-venus-border bg-venus-surface px-5 py-4">
          {active ? (
            <>
              <div>
                <p className="font-serif text-xl font-semibold text-venus-text">
                  {active.first_name} {active.last_name}
                </p>
                <p className="mt-0.5 text-sm text-venus-text-dim">
                  Karton #{active.card_number ?? "—"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={startNewPatient}>
                  <UserPlus size={15} />
                  Nov pacijent
                </Button>
                <Button variant="outline" onClick={() => setPickerOpen(true)}>
                  <RefreshCw size={15} />
                  Promeni pacijenta
                </Button>
                <Button variant="ghost" asChild>
                  <Link href={`/pacijenti/${active.id}`}>
                    <FileText size={15} />
                    Otvori karton
                  </Link>
                </Button>
              </div>
            </>
          ) : (
            <>
              <div>
                <p className="font-serif text-xl font-semibold text-venus-text">
                  Pacijent gost
                </p>
                <p className="mt-0.5 text-sm text-venus-text-faint">
                  Skica — dodajte novog pacijenta ili izaberite postojećeg da
                  sačuvate izmene.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  placeholder="Ime"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="h-9 w-28"
                />
                <Input
                  placeholder="Prezime"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="h-9 w-32"
                />
                <Button
                  onClick={addGuestAsPatient}
                  disabled={adding || !firstName.trim() || !lastName.trim()}
                >
                  {adding && <Loader2 className="animate-spin" />}
                  Dodaj
                </Button>
                <Button variant="outline" onClick={() => setPickerOpen(true)}>
                  <Search size={15} />
                  Izaberi pacijenta
                </Button>
                {(Object.keys(guestMap).length > 0 ||
                  firstName.trim() !== "" ||
                  lastName.trim() !== "") && (
                  <Button
                    variant="ghost"
                    className="text-venus-text-dim"
                    onClick={clearDraft}
                  >
                    <Trash2 size={15} />
                    Očisti skicu
                  </Button>
                )}
              </div>
            </>
          )}
        </div>

        {/* Odontogram: pravi pacijent (baza) ILI gost (lokalna skica) */}
        {active ? (
          <Odontogram patientId={active.id} size="large" showHeader={false} />
        ) : (
          <OdontogramView
            map={guestMap}
            size="large"
            showHeader={false}
            onSetCondition={(toothNumber, surface, condition) =>
              setGuestMap((m) =>
                applySetCondition(m, toothNumber, surface, condition)
              )
            }
            onRemove={(toothNumber, surface) =>
              setGuestMap((m) => applyRemoveCondition(m, toothNumber, surface))
            }
          />
        )}
      </div>

      {/* Izbor pacijenta */}
      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Izaberi pacijenta</DialogTitle>
          </DialogHeader>
          <PatientPicker onSelect={selectPatient} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
