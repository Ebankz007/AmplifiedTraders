import { describe, expect, it } from 'vitest';
import { formatDate, formatDateTime } from '@/lib/utils';

describe('date format', () => {
  it('formats date', () => {
    expect(formatDate('2026-10-18')).toBe('18 Oct 2026');
  });
  it('formats datetime', () => {
    const d = new Date('2026-10-18T12:34:00Z');
    const s = formatDateTime(d);
    expect(s).toContain('Oct');
    expect(s).toContain('2026');
  });
});
