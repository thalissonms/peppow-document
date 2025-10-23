import { Sparkles } from "lucide-react";
import { useState } from "react";
import { DocumentMeta, AIOptions, PdfLayout } from "@/types/ui";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/Card";
import { Input } from "./ui/Input";
import { Textarea } from "./ui/Textarea";
import { Label } from "./ui/Label";
import { Switch } from "./ui/Switch";
import { Button } from "./ui/Button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/Select";

interface DocumentEditorProps {
  meta: DocumentMeta;
  onMetaChange: (meta: DocumentMeta) => void;
  aiOptions: AIOptions;
  onAIOptionsChange: (options: AIOptions) => void;
  onEnhance: () => void;
  loading?: boolean;
  pdfLayout: PdfLayout;
}

export const DocumentEditor = ({
  meta,
  onMetaChange,
  aiOptions,
  onAIOptionsChange,
  onEnhance,
  loading = false,
  pdfLayout,
}: DocumentEditorProps) => {
  // Estado local para edição - só atualiza o pai no onBlur
  const [localMeta, setLocalMeta] = useState(meta);

  const showPaginationLegend = pdfLayout !== "padrao";
  const paginationCopy: Record<PdfLayout, { title: string; description: string }> = {
    padrao: {
      title: "Paginação desativada",
      description: "O conteúdo flui sem quebras automáticas.",
    },
    a4: {
      title: "Paginação A4 ativa",
      description:
        "Cada linha tracejada no editor marca o final de uma página A4 (297 mm ≈ 1123 px). Ajuste o conteúdo para evitar cortes inesperados.",
    },
    apresentacao: {
      title: "Paginação Apresentação (16:9)",
      description:
        "Cada linha tracejada representa um slide 16:9 (≈ 900 px de altura). Organize blocos para que caibam em cada slide.",
    },
  };
  return (
    <div className="space-y-4">
      <Card className="border-[rgba(255,94,43,0.25)]">
        <CardHeader>
          <CardTitle className="text-[#154C71] font-medium text-xl">
            Personalize o Cabeçalho
          </CardTitle>
          <CardDescription>Ajuste as informações do cabeçalho do documento</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="title">Título do documento</Label>
            <Input
              id="title"
              value={localMeta.title}
              onChange={(e) => setLocalMeta({ ...localMeta, title: e.target.value })}
              onBlur={() => onMetaChange(localMeta)}
              disabled={loading}
            />
          </div>
          <div>
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={localMeta.description}
              onChange={(e) => setLocalMeta({ ...localMeta, description: e.target.value })}
              onBlur={() => onMetaChange(localMeta)}
              rows={2}
              disabled={loading}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="headerLabel">Rótulo</Label>
              <Input
                id="headerLabel"
                value={localMeta.headerLabel}
                onChange={(e) => setLocalMeta({ ...localMeta, headerLabel: e.target.value })}
                onBlur={() => onMetaChange(localMeta)}
                disabled={loading}
              />
            </div>
            <div>
              <Label htmlFor="headerValue">Valor</Label>
              <Input
                id="headerValue"
                value={localMeta.headerValue}
                onChange={(e) => setLocalMeta({ ...localMeta, headerValue: e.target.value })}
                onBlur={() => onMetaChange(localMeta)}
                disabled={loading}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="validity">Mensagem de validade</Label>
            <Input
              id="validity"
              value={localMeta.validityMessage}
              onChange={(e) => setLocalMeta({ ...localMeta, validityMessage: e.target.value })}
              onBlur={() => onMetaChange(localMeta)}
              disabled={loading}
            />
          </div>
          {showPaginationLegend && (
            <div className="hidden rounded-lg border border-dashed border-[#ff5e2b]/40 bg-[#fff9d5]/60 p-3 text-xs text-[#154C71]/90">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-[#ff5e2b]">
                  {paginationCopy[pdfLayout].title}
                </span>
                <span className="rounded-full bg-[#ff5e2b]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-[#ff5e2b]">
                  Quebra visual
                </span>
              </div>
              <p className="mt-2 text-[11px] text-[#154C71]/80">
                {paginationCopy[pdfLayout].description}
              </p>
              <div className="mt-3 grid gap-2">
                {[0, 1].map((sample) => (
                  <div
                    key={sample}
                    className="relative h-12 rounded-md border border-[#ff5e2b]/25 bg-white/80"
                  >
                    <div className="absolute inset-x-3 bottom-0 border-t border-dashed border-[#ff5e2b]/60" />
                    <span className="absolute left-3 bottom-1 text-[10px] font-semibold uppercase tracking-widest text-[#154C71]/70">
                      Página {sample + 1}
                    </span>
                    <span className="absolute right-3 bottom-1 text-[10px] font-semibold uppercase tracking-widest text-[#ff5e2b]">
                      Quebra
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-[rgba(255,94,43,0.25)] pb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-[#154C71] font-medium text-xl flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#ff5e2b]" />
                Melhorar com IA
              </CardTitle>
              <CardDescription>
                Aprimoramento automático do documento
              </CardDescription>
            </div>
            <Switch
              checked={aiOptions.enabled}
              onCheckedChange={(checked) =>
                onAIOptionsChange({ ...aiOptions, enabled: checked })
              }
              disabled={loading}
            />
          </div>
        </CardHeader>
        {aiOptions.enabled && (
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="provider">Provider</Label>
              <Select
                value={aiOptions.provider}
                onValueChange={(value: "gemini" | "openai") =>
                  onAIOptionsChange({ ...aiOptions, provider: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gemini">Google Gemini</SelectItem>
                  <SelectItem value="openai">GPT-4o-mini</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="mode">Modo de melhoria</Label>
              <Select
                value={aiOptions.mode}
                onValueChange={(
                  value: "grammar" | "clarity" | "professional" | "full"
                ) => onAIOptionsChange({ ...aiOptions, mode: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="grammar">Gramática</SelectItem>
                  <SelectItem value="clarity">Clareza</SelectItem>
                  <SelectItem value="professional">Profissional</SelectItem>
                  <SelectItem value="full">Visual Completo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={onEnhance}
              disabled={loading}
              className="w-full bg-[#ff5e2b] hover:bg-[#ff7e4d]"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Melhorar documento
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  );
};
