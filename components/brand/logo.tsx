import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";

type LogoProps = {
  variant?: "full" | "mark";
  href?: string | null;
  className?: string;
  priority?: boolean;
  /** Show logo without the dark brand plate (for already-dark surfaces) */
  bare?: boolean;
};

const SIZES = {
  full: { width: 200, height: 48, className: "h-8 w-auto sm:h-9" },
  mark: { width: 44, height: 44, className: "h-8 w-8 sm:h-9 sm:w-9" },
} as const;

export function Logo({
  variant = "full",
  href = "/",
  className,
  priority,
  bare,
}: LogoProps) {
  const size = SIZES[variant];
  const src = variant === "full" ? "/logo-bibulance.png" : "/logo-b.png";

  const content = (
    <span
      className={cn(
        "inline-flex items-center",
        !bare && "rounded-xl bg-ink px-2.5 py-1.5 shadow-sm",
        className,
      )}
    >
      <Image
        src={src}
        alt="Bibulance"
        width={size.width}
        height={size.height}
        priority={priority}
        className={cn(size.className, "object-contain object-left")}
      />
    </span>
  );

  if (href === null) return content;

  return (
    <Link
      href={href}
      className="inline-flex shrink-0 items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      aria-label="Bibulance — accueil"
    >
      {content}
    </Link>
  );
}
