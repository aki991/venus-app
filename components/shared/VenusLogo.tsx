import Image from "next/image";

import { cn } from "@/lib/utils";

interface VenusLogoProps {
  showWordmark?: boolean;
  className?: string;
}

export function VenusLogo({ showWordmark = true, className }: VenusLogoProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <Image
        src="/logo.png"
        alt="Venus stomatološka ordinacija"
        width={40}
        height={40}
        priority
        className="h-auto w-11 shrink-0 drop-shadow-[0_0_7px_rgba(229,196,95,0.35)]"
      />
      {showWordmark && (
        <span
          className="font-serif font-semibold text-[25px] tracking-[0.46em] text-venus-gold leading-none"
          style={{ paddingLeft: "0.46em" }}
        >
          VENUS
        </span>
      )}
    </div>
  );
}
