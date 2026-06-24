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
        className="h-auto w-10 shrink-0 drop-shadow-[0_0_7px_rgba(229,196,95,0.35)]"
      />
      {showWordmark && (
        <div className="flex flex-col gap-1 leading-none">
          <span
            className="font-serif font-semibold text-[21px] tracking-[0.46em] text-venus-text"
            style={{ paddingLeft: "0.46em" }}
          >
            VENUS
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-[7.5px] font-semibold tracking-[0.32em] text-venus-gold uppercase">
              stomatološka ordinacija
            </span>
            <span
              className="w-3 h-[5px] bg-venus-gold opacity-90 block"
              style={{ transform: "skewX(-22deg)" }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
