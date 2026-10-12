import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  loading?: boolean;
};

export function Button({
  className,
  variant = "primary",
  loading,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
    primary:
      "bg-accent text-accent-foreground shadow-[0_8px_24px_-12px_rgb(46_196_214_/_0.75)] hover:brightness-105",
    secondary:
      "border border-border bg-card text-foreground hover:bg-accent-soft",
    ghost: "text-foreground hover:bg-accent-soft",
    danger: "bg-danger text-danger-foreground hover:brightness-105",
  };

  return (
    <button
      className={cn(
        "inline-flex min-h-12 items-center justify-center rounded-xl px-5 text-base font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? "Chargement…" : children}
    </button>
  );
}
