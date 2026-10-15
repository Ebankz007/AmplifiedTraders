"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Logo } from "./logo";
import { ButtonLink } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV = [
  { label: "Copy Trading", href: "/copy-trading" },
  { label: "Packages", href: "/packages" },
  { label: "Traders", href: "/traders" },
  { label: "Community", href: "/community" },
  { label: "Network", href: "/network" },
  { label: "Education", href: "/education" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  // Scroll state is a DOM concern, not React state — toggle a class on the node.
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const onScroll = () => el.classList.toggle("is-scrolled", window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header ref={headerRef} className="site-header fixed inset-x-0 top-0 z-50">
      {/* Signature accent hairline (ash → gold) */}
      <div
        className="h-px w-full bg-gradient-to-r from-transparent via-brand/70 to-gold/60"
        aria-hidden="true"
      />
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" aria-label="Amplified Traders — home">
          <Logo />
        </Link>

        {/* Floating pill nav — the desktop signature */}
        <nav
          className="hidden items-center gap-0.5 rounded-full border border-border bg-surface/60 px-1.5 py-1.5 backdrop-blur lg:flex"
          aria-label="Primary"
        >
          {NAV.map((item) => (
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
          <ButtonLink href="/login" variant="ghost" size="sm">
            Sign in
          </ButtonLink>
          <ButtonLink href="/register" variant="primary" size="sm">
            Join Now
          </ButtonLink>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-foreground hover:bg-elevated lg:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile panel */}
      <div
        className={cn(
          "overflow-hidden border-t border-border bg-surface/95 backdrop-blur lg:hidden",
          open ? "block" : "hidden",
        )}
      >
        <nav className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-4 sm:px-6" aria-label="Mobile">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-2.5 text-sm font-medium text-muted hover:bg-elevated hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
          <div className="mt-3 flex flex-col gap-2">
            <ButtonLink href="/login" variant="secondary" onClick={() => setOpen(false)}>
              Sign in
            </ButtonLink>
            <ButtonLink href="/register" variant="primary" onClick={() => setOpen(false)}>
              Join Now
            </ButtonLink>
          </div>
        </nav>
      </div>
    </header>
  );
}
