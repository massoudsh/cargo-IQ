import type { ComponentPropsWithoutRef } from "react";

interface Props extends ComponentPropsWithoutRef<"section"> {
  variant?: "subtle" | "medium" | "elevated";
}

export default function GlassSurface({ variant = "medium", className = "", ...props }: Props) {
  return <section className={`glass-surface glass-${variant} ${className}`} {...props} />;
}
