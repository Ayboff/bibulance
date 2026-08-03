import { cn } from "@/lib/utils";

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        "min-h-11 w-full rounded-lg border border-border bg-card px-3 text-base text-foreground outline-none ring-accent focus:ring-2",
        className,
      )}
      {...props}
    />
  );
}
