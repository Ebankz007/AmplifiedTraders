import Link from "next/link";
import { HEADER_LINKS, SUBBRANDS, FOOTER_PLATFORM, FOOTER_COMPANY, FOOTER_LEGAL } from "@/lib/navigation";
import { Logo } from "@/components/site/logo";

export function Navbar() {
  return (
    <header className="site-header fixed inset-x-0 top-0 z-50">
      <div
        className="h-px w-full bg-gradient-to-r from-transparent via-brand/70 to-gold/60"
        aria-hidden="true"
      />
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" aria-label="Amplified Traders — home">
          <Logo />
        </Link>

        <nav
          className="hidden items-center gap-0.5 rounded-full border border-border bg-surface/60 px-1.5 py-1.5 backdrop-blur lg:flex"
          aria-label="Primary"
        >
          {HEADER_LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full px-3.5 py-1.5 text-sm font-medium text-muted transition-colors hover:bg-elevated hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <Link
            href="/login"
            className="rounded-lg px-3.5 py-2 text-sm text-muted transition-colors hover:text-foreground"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="rounded-lg bg-brand-gradient px-3.5 py-2 text-sm font-semibold text-[#0e1013] transition-opacity hover:opacity-90"
          >
            Join Now
          </Link>
        </div>
      </div>
    </header>
  );
}
