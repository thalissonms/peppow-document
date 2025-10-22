import * as React from "react";

import { cn } from "@/utils/tailwind-merge";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-10 w-full min-w-0 rounded-md border border-[rgba(255,94,43,0.35)] bg-white px-3 py-2 text-[15px] font-normal text-black transition-all outline-none placeholder:text-gray-400 file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-black disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 hover:border-[#ff5e2b] focus-visible:border-[#ff5e2b] focus-visible:ring-2 focus-visible:ring-[#ff5e2b]/20 aria-invalid:border-red-500 aria-invalid:ring-2 aria-invalid:ring-red-500/20",
        className
      )}
      {...props}
    />
  );
}

export { Input };
