import { cn } from "@/lib/utils";

interface LogoProps {
  variant?: "light" | "dark";
  size?: "sm" | "md" | "lg";
  className?: string;
  showText?: boolean;
}

/**
 * Placeholder elegante para los logos INVENTIVA / EAFIT.
 * Reemplazable luego por imagen real importando un asset en lugar del bloque visual.
 */
export function Logo({ variant = "light", size = "md", className, showText = true }: LogoProps) {
  const sizes = {
    sm: { box: "h-9 w-9", text: "text-sm", sub: "text-[10px]" },
    md: { box: "h-11 w-11", text: "text-base", sub: "text-[11px]" },
    lg: { box: "h-16 w-16", text: "text-xl", sub: "text-xs" },
  }[size];
  const isLight = variant === "light";
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div
        className={cn(
          "relative grid place-items-center rounded-xl font-display font-bold text-primary",
          "bg-[var(--brand-yellow)] shadow-[var(--shadow-card)]",
          sizes.box,
        )}
        aria-label="Logo INVENTIVA EAFIT"
      >
        <span className="text-[1.1em] leading-none tracking-tighter">IE</span>
        <span className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full bg-[var(--brand-sky)] ring-2 ring-[color:var(--background)]" />
      </div>
      {showText && (
        <div className="flex flex-col leading-tight">
          <span
            className={cn(
              "font-display font-bold tracking-tight",
              isLight ? "text-foreground" : "text-[color:var(--background)]",
              sizes.text,
            )}
          >
            INVENTIVA EAFIT
          </span>
          <span
            className={cn(
              "uppercase tracking-[0.18em] font-medium",
              isLight ? "text-muted-foreground" : "text-[color:var(--background)]/70",
              sizes.sub,
            )}
          >
            Votaciones · 2026-1
          </span>
        </div>
      )}
    </div>
  );
}
