"use client";

import { useRef, useState, PropsWithChildren } from "react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/Popover";

type HoverPopoverProps = PropsWithChildren<{
  trigger: React.ReactNode;
  openDelay?: number;
  closeDelay?: number;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  className?: string;
}>;

export function HoverPopover({
  trigger,
  children,
  openDelay = 120,
  closeDelay = 120,
  side = "bottom",
  align = "center",
  className,
}: HoverPopoverProps) {
  const [open, setOpen] = useState(false);
  const timer = useRef<number | null>(null);

  const clear = () => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = null;
  };

  const openLater = () => {
    clear();
    timer.current = window.setTimeout(() => setOpen(true), openDelay);
  };

  const closeLater = () => {
    if (timer) {
      clear();
      timer.current = window.setTimeout(() => setOpen(false), closeDelay);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        asChild
        onMouseEnter={openLater}
        onMouseLeave={closeLater}
      >
        {trigger}
      </PopoverTrigger>

      <PopoverContent
        side={side}
        align={align}
        sideOffset={8}
        className={className}
        onMouseEnter={openLater}
        onMouseLeave={closeLater}
      >
        {children}
      </PopoverContent>
    </Popover>
  );
}
