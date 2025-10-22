import { useState, useRef, useEffect } from "react";
import { Download, Eye, Edit3 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/Card";
import { Button } from "./ui/Button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/Select";
import { RichTextEditor } from "./RichTextEditor";
import { BrandConfig } from "@/types/ui";

interface DocumentPreviewProps {
  previewHTML: string;
  contentHTML: string;
  onContentChange: (html: string) => void;
  onGeneratePDF: () => void;
  iframeRef: React.RefObject<HTMLIFrameElement>;
  brandConfig: BrandConfig;
  loading?: boolean;
  pdfLayout?: "padrao" | "a4" | "apresentacao";
  onPdfLayoutChange?: (layout: "padrao" | "a4" | "apresentacao") => void;
}

export const DocumentPreview = ({
  previewHTML,
  contentHTML,
  onContentChange,
  onGeneratePDF,
  iframeRef,
  brandConfig,
  loading = false,
  pdfLayout = "padrao",
  onPdfLayoutChange,
}: DocumentPreviewProps) => {
  const [mode, setMode] = useState<"preview" | "edit">("preview");
  const cardRef = useRef<HTMLDivElement>(null);

  const handleModeToggle = () => {
    // Guarda a posição atual antes de mudar o modo
    const currentScrollY = window.scrollY;
    
    setMode(mode === "preview" ? "edit" : "preview");
    
    // Restaura a posição imediatamente, sem animação
    requestAnimationFrame(() => {
      window.scrollTo(0, currentScrollY);
    });
  };

  return (
    <Card ref={cardRef} className="border-[rgba(255,94,43,0.25)]">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap">
          <div>
            <CardTitle className="text-[#154C71] font-medium text-xl">
              Visualize, Edite e Exporte
            </CardTitle>
            <CardDescription>
              {mode === "preview"
                ? "Preview do documento final"
                : "Edite o conteúdo diretamente"}
            </CardDescription>
          </div>
          <div className="flex gap-2 items-center">
            {/* Seletor de layout do PDF */}
            <Select value={pdfLayout} onValueChange={onPdfLayoutChange}>
              <SelectTrigger className="w-auto border-[rgba(255,94,43,0.35)] hover:border-[#ff5e2b]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="p-0">
                <SelectItem value="padrao">Sem paginação</SelectItem>
                <SelectItem value="a4">A4</SelectItem>
                <SelectItem value="apresentacao">Apresentação (16:9)</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={handleModeToggle}
              variant="outline"
              className="border-[#ff5e2b]/35 hover:border-[#ff5e2b] text-[#ff5e2b] hover:bg-[rgba(255,94,43,0.1)] font-medium hover:text-[#ff5e2b] cursor-pointer"
            >
              {mode === "preview" ? (
                <>
                  <Edit3 className="w-4 h-4" />
                  Editar
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4" />
                  Preview
                </>
              )}
            </Button>
            <Button
              onClick={onGeneratePDF}
              disabled={loading}
              className="bg-[#ff5e2b] cursor-pointer hover:bg-[#152937] hover:border-[#152937] text-white"
            >
              <Download className="w-4 h-4" />
              {loading ? "Gerando..." : "Gerar PDF"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {mode === "preview" ? (
          <div className="border border-[rgba(255,94,43,0.2)] rounded-xl overflow-hidden bg-gray-50">
            <iframe
              ref={iframeRef}
              srcDoc={previewHTML}
              className="w-full h-[800px] bg-white"
              title="Preview do documento"
            />
          </div>
        ) : (
          <RichTextEditor
            content={contentHTML}
            onChange={onContentChange}
            brandConfig={brandConfig}
          />
        )}
      </CardContent>
    </Card>
  );
};
