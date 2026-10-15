import { cn } from "@/lib/utils";

/**
 * Amplified Traders mark.
 * Concept: an abstract "A" drawn as two upward market lines meeting at a peak,
 * with connected network nodes (community / referral network).
 * Reads as: Amplified · Upward movement (trading & growth) · Connection.
 * Original artwork.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      className={cn("h-9 w-9", className)}
      aria-hidden="true"
      role="img"
    >
      <defs>
        <linearGradient id="at-ash" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#dce2ea" />
          <stop offset="50%" stopColor="#c3cbd6" />
          <stop offset="100%" stopColor="#9aa4b2" />
        </linearGradient>
        <linearGradient id="at-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffd173" />
          <stop offset="100%" stopColor="#f5b942" />
        </linearGradient>
      </defs>

      <rect
        x="1"
        y="1"
        width="38"
        height="38"
        rx="12"
        fill="#0e1013"
        stroke="url(#at-ash)"
        strokeWidth="1.5"
      />

      {/* The "A" — two upward market lines meeting at a peak */}
      <path
        d="M11 30 L20 11 L29 30"
        fill="none"
        stroke="url(#at-ash)"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Crossbar of the A — the reward accent */}
      <path
        d="M15.4 23.4 L24.6 23.4"
        fill="none"
        stroke="url(#at-gold)"
        strokeWidth="2.4"
        strokeLinecap="round"
      />

      {/* Connected network nodes */}
      <circle cx="29.5" cy="14.5" r="2.1" fill="url(#at-gold)" />
      <circle cx="33" cy="20.5" r="1.5" fill="url(#at-ash)" />
      <path
        d="M29.5 14.5 L33 20.5"
        stroke="url(#at-ash)"
        strokeWidth="1"
        opacity="0.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Logo({
  className,
  showWordmark = true,
  siteName = "Amplified Traders",
}: {
  className?: string;
  showWordmark?: boolean;
  siteName?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      {showWordmark && (
        <span className="font-display text-base font-bold tracking-tight text-foreground sm:text-lg">
          {siteName.split(" ")[0]}
          <span className="text-brand"> {siteName.split(" ").slice(1).join(" ")}</span>
        </span>
      )}
    </span>
  );
}
