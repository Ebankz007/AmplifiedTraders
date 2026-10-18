import Link from "next/link";
import { Logo } from "@/components/site/logo";
import { SUBBRANDS, FOOTER_PLATFORM, FOOTER_COMPANY, FOOTER_LEGAL } from "@/lib/navigation";

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: readonly { label: string; href: string }[];
}) {
  return (
    <div>
      <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-foreground">
        {title}
      </h3>
      <ul className="mt-4 space-y-2.5">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="text-sm text-muted transition-colors hover:text-brand"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-border bg-surface">
      <div className="border-b border-border">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-px overflow-hidden px-4 sm:px-6 lg:grid-cols-4 lg:px-8">
          {SUBBRANDS.map((b) => (
            <Link
              key={b.href}
              href={b.href}
              className="group flex items-center gap-2 py-5 text-sm font-medium text-muted transition-colors hover:text-foreground"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-brand transition-colors group-hover:bg-gold" />
              <span className="font-display tracking-tight">{b.label}</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted">
              A modern trading ecosystem — copy trading, structured investment
              packages, referral networking, and a global trader community in one
              platform.
            </p>
            <p className="mt-4 font-display text-sm font-semibold text-gradient-gold">
              Your Trading. Your Network. Amplified.
            </p>
          </div>

          <FooterColumn title="Platform" links={FOOTER_PLATFORM} />
          <FooterColumn title="Company" links={FOOTER_COMPANY} />
          <FooterColumn title="Legal" links={FOOTER_LEGAL} />
        </div>

        <div className="mt-12 rounded-xl border border-border bg-card p-4">
          <p className="text-xs leading-relaxed text-faint">
            <span className="font-semibold text-muted">Risk notice.</span> Trading
            and investing involve substantial risk and may not be suitable for all
            participants. Past performance is not indicative of future results. No
            content on this platform constitutes financial advice or a guarantee of
            returns. Participation is at your own risk. Amplified Traders is a
            technology and community platform and does not provide investment,
            legal, or tax advice.
          </p>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-border pt-6 text-xs text-faint sm:flex-row">
          <p>© {year} Amplified Traders. All rights reserved.</p>
          <p>Trade. Copy. Connect. Grow.</p>
        </div>
      </div>
    </footer>
  );
}
