import * as React from "react";
import { cn } from "@/lib/utils";
import { parseBlocks, parseInline, type InlineToken } from "@/lib/prose";

function renderTokens(tokens: InlineToken[], keyPrefix: string): React.ReactNode[] {
  return tokens.map((token, index) => {
    const key = `${keyPrefix}-${index}`;
    switch (token.kind) {
      case "strong":
        return <strong key={key}>{token.value}</strong>;
      case "em":
        return <em key={key}>{token.value}</em>;
      case "code":
        return <code key={key}>{token.value}</code>;
      case "link":
        return (
          <a
            key={key}
            href={token.href}
            {...(/^https?:\/\//i.test(token.href)
              ? { target: "_blank", rel: "noopener noreferrer" }
              : {})}
          >
            {token.value}
          </a>
        );
      default:
        return <React.Fragment key={key}>{token.value}</React.Fragment>;
    }
  });
}

/**
 * Render the Markdown subset in `lib/prose.ts` as styled prose.
 *
 * Everything is a React element — there is no `dangerouslySetInnerHTML` here,
 * and there should never be one.
 */
export function Prose({
  markdown,
  className,
}: {
  markdown: string;
  className?: string;
}) {
  const blocks = parseBlocks(markdown);

  return (
    <div className={cn("prose-at", className)}>
      {blocks.map((block, index) => {
        const key = `b${index}`;
        if (block.kind === "ul" || block.kind === "ol") {
          const items = block.items.map((item, itemIndex) => (
            <li key={`${key}-${itemIndex}`}>
              {renderTokens(parseInline(item), `${key}-${itemIndex}`)}
            </li>
          ));
          return block.kind === "ul" ? (
            <ul key={key}>{items}</ul>
          ) : (
            <ol key={key}>{items}</ol>
          );
        }

        const children = renderTokens(parseInline(block.text), key);
        if (block.kind === "h2") return <h2 key={key}>{children}</h2>;
        if (block.kind === "h3") return <h3 key={key}>{children}</h3>;
        return <p key={key}>{children}</p>;
      })}
    </div>
  );
}
