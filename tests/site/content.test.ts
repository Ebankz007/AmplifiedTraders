import { describe, expect, it } from 'vitest';
import { groupFaqs, readingMinutes, excerptOf, postHref } from '@/lib/content-shape';

describe('content shape', () => {
  it('groups faqs by category', () => {
    const groups = groupFaqs([
      { id: '1', question: 'q1', answer: 'a1', category: 'Account' },
      { id: '2', question: 'q2', answer: 'a2', category: null },
    ]);
    expect(groups.length).toBe(2);
  });

  it('reading minutes never below 1', () => {
    expect(readingMinutes('hi')).toBe(1);
    const long = Array(400).fill('word').join(' ');
    expect(readingMinutes(long)).toBe(2);
  });

  it('excerpt truncates', () => {
    const s = 'x'.repeat(200);
    expect(excerptOf(s, 10).endsWith('…')).toBe(true);
  });

  it('post href', () => {
    expect(postHref('hello')).toBe('/blog/hello');
  });
});
