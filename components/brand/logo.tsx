import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";

type LogoProps = {
  variant?: "full" | "mark";
  href?: string | null;
  className?: string;
  priority?: boolean;
  size?: "sm" | "md" | "lg";
};

const FULL = {
  sm: { width: 140, height: 36, className: "h-7 w-auto" },
  md: { width: 168, height: 42, className: "h-8 w-auto sm:h-9" },
  lg: { width: 196, height: 50, className: "h-10 w-auto" },
} as const;

const MARK = {
  sm: { width: 28, height: 28, className: "h-7 w-7" },
  md: { width: 36, height: 36, className: "h-9 w-9" },
  lg: { width: 44, height: 44, className: "h-11 w-11" },
} as const;

export function Logo({
  variant = "full",
  href = "/",
  className,
  priority,
  size = "md",
}: LogoProps) {
  const dims = variant === "full" ? FULL[size] : MARK[size];
  const src = variant === "full" ? "/logo-full.svg" : "/logo-mark.svg";

  const content = (
    <Image
      src={src}
      alt="Bibulance"
      width={dims.width}
      height={dims.height}
      priority={priority}
      className={cn(dims.className, "object-contain object-left", className)}
    />
  );

  if (href === null) {
    return <span className="inline-flex items-center">{content}</span>;
  }

  return (
    <Link
      href={href}
      className="inline-flex shrink-0 items-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      aria-label="Bibulance — accueil"
    >
      {content}
    </Link>
  );
}
