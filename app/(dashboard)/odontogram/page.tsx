import { requireStaff } from "@/lib/auth/get-user";

export default async function OdontogramPage() {
  await requireStaff();

  return (
    <div className="p-6">
      <h1 className="font-serif text-3xl font-bold text-venus-text">
        Odontogram
      </h1>
      <p className="mb-6 mt-1 text-sm text-venus-text-dim">
        Grafički prikaz stanja zuba pacijenata.
      </p>

      <div className="flex min-h-[300px] items-center justify-center rounded-xl border border-dashed border-venus-border bg-venus-surface/50">
        <p className="text-sm text-venus-text-faint">Uskoro.</p>
      </div>
    </div>
  );
}
