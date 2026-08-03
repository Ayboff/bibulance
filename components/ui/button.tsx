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
    primary: "bg-accent text-accent-foreground hover:opacity-90",
    secondary: "border border-border bg-card text-foreground hover:bg-background",
    ghost: "text-foreground hover:bg-background",
    danger: "bg-danger text-white hover:opacity-90",
  };

  return (
    <button
      className={cn(
        "inline-flex min-h-12 items-center justify-center rounded-lg px-5 text-base font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
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
