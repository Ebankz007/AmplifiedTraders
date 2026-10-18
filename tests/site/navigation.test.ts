import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  HEADER_LINKS,
  FOOTER_COMPANY,
  FOOTER_LEGAL,
  PUBLIC_ROUTES,
  SEED_NAV_ITEMS,
} from '@/lib/navigation';

const ROOT = process.cwd();

function pageExists(href: string): boolean {
  if (href === '/') return existsSync(join(ROOT, 'app/page.tsx'));
  const base = href.replace(/^\//, '');
  const appPath = join(ROOT, 'app', '(site)', base, 'page.tsx');
  if (existsSync(appPath)) return true;
  const legalPath = join(ROOT, 'app', '(site)', 'legal', base, 'page.tsx');
  if (existsSync(legalPath)) return true;
  const dynamicPath = join(ROOT, 'app', '(site)', base, '[slug]', 'page.tsx');
  if (existsSync(dynamicPath)) return true;
  const authPath = join(ROOT, 'app', '(auth)', base, 'page.tsx');
  if (existsSync(authPath)) return true;
  return false;
}

describe('public site navigation', () => {
  it('header links point to real pages', () => {
    for (const link of HEADER_LINKS) {
      expect(pageExists(link.href)).toBe(true);
    }
  });

  it('company/footer links point to real pages', () => {
    for (const link of FOOTER_COMPANY) {
      expect(pageExists(link.href)).toBe(true);
    }
  });

  it('legal links point to legal/[slug]', () => {
    // The legal section is a single dynamic route; each footer link is a slug under it.
    expect(existsSync(join(ROOT, 'app', '(site)', 'legal', '[slug]', 'page.tsx'))).toBe(true);
    for (const link of FOOTER_LEGAL) {
      expect(link.href.startsWith('/legal/')).toBe(true);
      expect(link.href.length > '/legal/'.length).toBe(true);
    }
  });

  it('PUBLIC_ROUTES includes the home and key pages', () => {
    expect(PUBLIC_ROUTES).toContain('/');
    expect(PUBLIC_ROUTES).toContain('/contact');
    expect(PUBLIC_ROUTES).toContain('/faq');
  });

  it('seed nav items mirror the source arrays', () => {
    const headerSeed = SEED_NAV_ITEMS.filter((i) => i.location === 'HEADER');
    const footerSeed = SEED_NAV_ITEMS.filter((i) => i.location === 'FOOTER');
    expect(headerSeed).toHaveLength(HEADER_LINKS.length);
    expect(footerSeed.length).toBeGreaterThan(0);
    for (const link of HEADER_LINKS) {
      expect(headerSeed.some((s) => s.url === link.href && s.label === link.label)).toBe(true);
    }
  });
});
