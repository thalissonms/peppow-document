import { HelpCircle, Keyboard } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/Popover";

export const EditorHelp = () => {
  const shortcuts = [
    { keys: "Ctrl + B", action: "Negrito" },
    { keys: "Ctrl + I", action: "Itálico" },
    { keys: "Ctrl + U", action: "Sublinhado" },
    { keys: "Ctrl + Z", action: "Desfazer" },
    { keys: "Ctrl + Y", action: "Refazer" },
    { keys: "Ctrl + Shift + 1", action: "Título 1" },
    { keys: "Ctrl + Shift + 2", action: "Título 2" },
    { keys: "Ctrl + Shift + 3", action: "Título 3" },
    { keys: "Ctrl + Shift + Q", action: "Citação" },
    { keys: "Ctrl + Shift + T", action: "Inserir tabela" },
    { keys: "Ctrl + Shift + H", action: "Linha horizontal" },
    { keys: "Tab", action: "Indentar lista" },
  ];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center justify-center h-8 w-8 p-0 rounded-md text-sm font-medium transition-colors hover:bg-[rgba(255,94,43,0.1)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#ff5e2b] disabled:pointer-events-none disabled:opacity-50"
          title="Atalhos do teclado"
        >
          <Keyboard className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-[#ff5e2b]" />
            <h4 className="font-semibold">Atalhos do Teclado</h4>
          </div>
          <div className="space-y-2 text-sm">
            {shortcuts.map((shortcut, index) => (
              <div key={index} className="flex justify-between items-center">
                <span className="text-[#152937] opacity-70">
                  {shortcut.action}
                </span>
                <kbd className="px-2 py-1 bg-[#fff9d5] border border-[rgba(255,94,43,0.25)] rounded text-xs font-mono">
                  {shortcut.keys}
                </kbd>
              </div>
            ))}
          </div>
          <div className="pt-2 border-t border-[rgba(255,94,43,0.25)] text-xs text-[#152937] opacity-60">
            Use Mac? Substitua Ctrl por Cmd
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
