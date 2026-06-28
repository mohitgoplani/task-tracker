"use client";
import * as React from "react";
import * as RadixAvatar from "@radix-ui/react-avatar";
import { cn } from "@/lib/utils";

export function Avatar({ name, email, src, size = 32, className }: {
  name?: string | null;
  email?: string | null;
  src?: string | null;
  size?: number;
  className?: string;
}) {
  const base = (name && name.trim()) || (email && email.split("@")[0]) || "?";
  const parts = base.split(/\s+/).filter(Boolean);
  const initials = parts.length === 1 ? parts[0].slice(0, 2).toUpperCase() : (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return (
    <RadixAvatar.Root
      className={cn("inline-flex items-center justify-center overflow-hidden rounded-full bg-muted text-xs font-medium text-foreground/70", className)}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {src ? <RadixAvatar.Image src={src} alt={base} className="h-full w-full object-cover" /> : null}
      <RadixAvatar.Fallback delayMs={200}>{initials}</RadixAvatar.Fallback>
    </RadixAvatar.Root>
  );
}
