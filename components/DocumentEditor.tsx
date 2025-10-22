import { Sparkles } from "lucide-react";
import { DocumentMeta, AIOptions } from "@/types/ui";
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
}

export const DocumentEditor = ({
  meta,
  onMetaChange,
  aiOptions,
  onAIOptionsChange,
  onEnhance,
  loading = false,
}: DocumentEditorProps) => {
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
              value={meta.title}
              onChange={(e) => onMetaChange({ ...meta, title: e.target.value })}
              disabled={loading}
            />
          </div>
          <div>
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={meta.description}
              onChange={(e) =>
                onMetaChange({ ...meta, description: e.target.value })
              }
              rows={2}
              disabled={loading}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="headerLabel">Rótulo</Label>
              <Input
                id="headerLabel"
                value={meta.headerLabel}
                onChange={(e) =>
                  onMetaChange({ ...meta, headerLabel: e.target.value })
                }
                disabled={loading}
              />
            </div>
            <div>
              <Label htmlFor="headerValue">Valor</Label>
              <Input
                id="headerValue"
                value={meta.headerValue}
                onChange={(e) =>
                  onMetaChange({ ...meta, headerValue: e.target.value })
                }
                disabled={loading}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="validity">Mensagem de validade</Label>
            <Input
              id="validity"
              value={meta.validityMessage}
              onChange={(e) =>
                onMetaChange({ ...meta, validityMessage: e.target.value })
              }
              disabled={loading}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-[rgba(255,94,43,0.25)]">
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
