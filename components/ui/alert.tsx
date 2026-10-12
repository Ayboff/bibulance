import { cn } from "@/lib/utils";

export function Alert({
  tone = "error",
  children,
  className,
}: {
  tone?: "error" | "success" | "info";
  children: React.ReactNode;
  className?: string;
}) {
  const tones = {
    error: "border-danger/35 bg-[#fff1f3] text-[#b4233a]",
    success: "border-success/30 bg-mint-soft text-success",
    info: "border-ring/30 bg-accent-soft text-ink",
  };

  return (
    <div
      role="alert"
      className={cn(
        "rounded-xl border px-4 py-3 text-sm font-medium",
        tones[tone],
        className,
      )}
    >
      {children}
    </div>
  );
}
