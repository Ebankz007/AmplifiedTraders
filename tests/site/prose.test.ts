import { describe, expect, it } from 'vitest';
import { parseBlocks, parseInline, isSafeHref } from '@/lib/prose';

describe('prose', () => {
  it('parses inline bold/italic/code/link', () => {
    const tokens = parseInline('**bold** *em* `code` [link](/x)');
    expect(tokens.some((t) => t.kind === 'strong')).toBe(true);
    expect(tokens.some((t) => t.kind === 'em')).toBe(true);
    expect(tokens.some((t) => t.kind === 'code')).toBe(true);
    expect(tokens.some((t) => t.kind === 'link')).toBe(true);
  });

  it('blocks: h2/h3/ul/ol/p', () => {
    const blocks = parseBlocks('## Title\n\n- one\n- two\n\n1. a\n2. b\n\ntext');
    expect(blocks.some((b) => b.kind === 'h2')).toBe(true);
    expect(blocks.some((b) => b.kind === 'ul')).toBe(true);
    expect(blocks.some((b) => b.kind === 'ol')).toBe(true);
    expect(blocks.some((b) => b.kind === 'p')).toBe(true);
  });

  it('only allows safe hrefs', () => {
    expect(isSafeHref('/x')).toBe(true);
    expect(isSafeHref('https://x.com')).toBe(true);
    expect(isSafeHref('javascript:alert(1)')).toBe(false);
  });

  it('treats javascript: as text when parsed', () => {
    const tokens = parseInline('[bad](javascript:alert(1))');
    expect(tokens[0]?.kind).toBe('text');
  });
});
