"use client";

import { useState, useRef, type ReactNode, type HTMLAttributes } from "react";

import { cn } from "@/lib/utils/cn";

type TooltipProps = HTMLAttributes<HTMLDivElement> & {
  content: string;
  children: ReactNode;
  side?: "top" | "bottom";
};

export function Tooltip({
  children,
  className,
  content,
  side = "top",
  ...props
}: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  function show() {
    timeoutRef.current = setTimeout(() => setVisible(true), 400);
  }

  function hide() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setVisible(false);
  }

  return (
    <div
      className={cn("relative inline-flex", className)}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      {...props}
    >
      {children}
      {visible && (
        <div
          role="tooltip"
          className={cn(
            "absolute left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-lg px-2.5 py-1 text-[11px] font-medium",
            "bg-[var(--surface-elevated)] text-foreground border border-[color:var(--border-strong)] shadow-xl",
            "pointer-events-none animate-in fade-in zoom-in-95 duration-150",
            side === "top" ? "bottom-full mb-1.5" : "top-full mt-1.5",
          )}
        >
          {content}
        </div>
      )}
    </div>
  );
}
