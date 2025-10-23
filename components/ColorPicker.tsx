import { useRef } from "react";
import { Paintbrush } from "lucide-react";
import { Input } from "./ui/Input";
import { Label } from "./ui/Label";

interface ColorPickerProps {
  label: string;
  description: string;
  color: string;
  onChange: (color: string) => void;
}

export const ColorPicker = ({
  label,
  description,
  color,
  onChange,
}: ColorPickerProps) => {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label
          htmlFor={label}
          className="text-[15px] font-medium text-[#152937]"
        >
          {label}
        </Label>
        <span className="text-xs text-gray-500 font-mono">{color}</span>
      </div>

      <div className="relative">
        <div className="flex gap-3 items-stretch">
          <div className="relative">
            {/* Hidden Color Input */}
            <input
              ref={inputRef}
              id={label}
              type="color"
              value={color}
              onChange={(e) => onChange(e.target.value)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div
              onClick={() => inputRef.current?.click()}
              className="w-14 h-14 rounded-xl border-2 border-[rgba(255,94,43,0.35)]
              cursor-pointer hover:border-[#ff5e2b] transition-all shadow-sm 
              flex items-center justify-center group"
              style={{ backgroundColor: color }}
            >
              <Paintbrush
                onClick={() => inputRef.current?.click()}
                className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 
                transition-opacity drop-shadow-md pointer-events-none"
              />
            </div>
          </div>

          {/* Manual Hex Input */}
          <div className="flex-1">
            <Input
              type="text"
              value={color}
              onChange={(e) => onChange(e.target.value)}
              placeholder="#000000"
              className="h-14 text-[15px] font-mono"
              maxLength={7}
            />
          </div>
        </div>
      </div>

      <p className="text-xs text-gray-500 leading-relaxed">{description}</p>
    </div>
  );
};
