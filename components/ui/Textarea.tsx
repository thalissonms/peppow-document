import * as React from "react";

import { cn } from "@/utils/tailwind-merge";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "resize-none flex field-sizing-content min-h-20 w-full rounded-md border border-[rgba(255,94,43,0.35)] bg-white px-3 py-2.5 text-[15px] font-normal leading-relaxed text-black transition-all outline-none placeholder:text-gray-400 disabled:cursor-not-allowed disabled:opacity-50 hover:border-[#ff5e2b] focus-visible:border-[#ff5e2b] focus-visible:ring-2 focus-visible:ring-[#ff5e2b]/20 aria-invalid:border-red-500 aria-invalid:ring-2 aria-invalid:ring-red-500/20",
        className
      )}
      {...props}
    />
  );
}

export { Textarea };
