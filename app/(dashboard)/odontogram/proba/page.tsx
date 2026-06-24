import { requireStaff } from "@/lib/auth/get-user";
import { AnatomyProba } from "@/components/odontogram/AnatomyProba";

export default async function AnatomyProbaPage() {
  await requireStaff();

  return (
    <div className="p-6">
      <h1 className="font-serif text-3xl font-bold text-venus-text">
        Anatomski prikaz — proba
      </h1>
      <p className="mb-6 mt-1 text-sm text-venus-text-dim">
        Test slike + klikabilnih poligona (2 zuba). Bez baze.
      </p>
      <AnatomyProba />
    </div>
  );
}
