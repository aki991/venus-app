import { cn } from "@/lib/utils";

interface VenusLogoProps {
  showWordmark?: boolean;
  className?: string;
}

export function VenusLogo({ showWordmark = true, className }: VenusLogoProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <svg
        width="32"
        height="36"
        viewBox="0 0 60 70"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinejoin="round"
        strokeLinecap="round"
        className="text-venus-gold drop-shadow-[0_0_7px_rgba(201,162,75,0.35)] shrink-0"
      >
        <path d="M30 5C18 5 11 12 11 24c0 9 2 16 5 26 1.6 5 3 12 6 12 3 0 3.5-8 5-15 .6-3 5.4-3 6 0 1.5 7 2 15 5 15 3 0 4.4-7 6-12 3-10 5-17 5-26C54 12 47 5 35 5" />
        <path d="M30 5 18 22M30 5l12 17M18 22l12 7 12-7M30 5v24M11 24l7-2M49 24l-7-2M18 22l2 28M42 22l-2 28M30 29l-1 16M30 29l1 16" />
      </svg>
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
