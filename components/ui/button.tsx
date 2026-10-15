import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const base =
  "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap select-none";

export const buttonVariants = {
  primary:
    "bg-brand-gradient text-[#0e1013] font-semibold hover:brightness-110 shadow-[0_12px_34px_-14px_rgba(195,203,214,0.45)] hover:shadow-[0_16px_42px_-14px_rgba(195,203,214,0.55)]",
  gold: "bg-gold-gradient text-[#0e1013] font-semibold hover:brightness-110 shadow-[0_12px_34px_-14px_rgba(245,185,66,0.75)]",
  secondary:
    "border border-border-strong bg-elevated text-foreground hover:border-brand/60 hover:text-brand",
  outline: "border border-brand/45 text-brand hover:bg-brand/10",
  ghost: "text-muted hover:text-foreground hover:bg-elevated",
  danger: "bg-danger text-white hover:brightness-110",
  subtle: "bg-elevated text-foreground hover:bg-border",
} as const;

export const buttonSizes = {
  sm: "h-9 px-3.5 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-6 text-base",
  icon: "h-10 w-10",
} as const;

export type ButtonVariant = keyof typeof buttonVariants;
export type ButtonSize = keyof typeof buttonSizes;

export function buttonClass(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  className?: string,
) {
  return cn(base, buttonVariants[variant], buttonSizes[size], className);
}

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={buttonClass(variant, size, className)}
      {...props}
    />
  ),
);
Button.displayName = "Button";

export interface ButtonLinkProps
  extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function ButtonLink({
  href,
  className,
  variant = "primary",
  size = "md",
  ...props
}: ButtonLinkProps) {
  const classes = buttonClass(variant, size, className);
  const isExternal = /^https?:|^mailto:|^tel:/.test(href);
  if (isExternal) {
    return (
      <a
        href={href}
        className={classes}
        target="_blank"
        rel="noopener noreferrer"
        {...props}
      />
    );
  }
  return <Link href={href} className={classes} {...props} />;
}
