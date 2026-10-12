import { cn } from "@/lib/utils";

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        "min-h-12 w-full rounded-xl border border-border bg-card px-3.5 text-base text-foreground outline-none transition placeholder:text-muted/70 focus:border-ring focus:ring-2 focus:ring-ring/30",
        className,
      )}
      {...props}
    />
  );
}
