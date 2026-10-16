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

/** Official PNG wordmark — aspect ~3.06:1 */
const FULL = {
  sm: { width: 140, height: 46, className: "h-8 w-auto" },
  md: { width: 180, height: 59, className: "h-9 w-auto sm:h-10" },
  lg: { width: 220, height: 72, className: "h-11 w-auto" },
} as const;

/** Official PNG mark — aspect ~0.81:1 */
const MARK = {
  sm: { width: 28, height: 34, className: "h-8 w-auto" },
  md: { width: 36, height: 44, className: "h-9 w-auto" },
  lg: { width: 44, height: 54, className: "h-11 w-auto" },
} as const;

export function Logo({
  variant = "full",
  href = "/",
  className,
  priority,
  size = "md",
}: LogoProps) {
  const dims = variant === "full" ? FULL[size] : MARK[size];
  const src = variant === "full" ? "/logo-bibulance.png" : "/logo-b.png";

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
