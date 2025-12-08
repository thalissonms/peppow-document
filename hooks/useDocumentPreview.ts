import { useState, useCallback } from "react";
import { BrandConfig, DocumentMeta } from "@/types/ui";

interface UseDocumentPreviewProps {
  brandConfig: BrandConfig;
  documentMeta: DocumentMeta;
}

export const useDocumentPreview = ({ brandConfig, documentMeta }: UseDocumentPreviewProps) => {
  const [previewHTML, setPreviewHTML] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Gera o preview do documento usando a API generate-preview
   * Função simples sem otimizações complexas
   */
  const generatePreview = useCallback(
    async (contentHTML: string, layout: "padrao" | "a4" | "apresentacao" = "a4") => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/generate-preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            html: contentHTML,
            meta: documentMeta,
            brandConfig,
            layout,
          }),
        });

        if (!response.ok) {
          // Tenta interpretar a resposta como JSON; fallback para texto puro em erros 4xx (ex.: 413)
          const isJson = response.headers.get("content-type")?.includes("application/json");
          const payload = isJson ? await response.json() : await response.text();
          const message =
            response.status === 413
              ? "Conteúdo muito grande para gerar o preview (limite ~6MB de payload). Reduza imagens ou o HTML."
              : typeof payload === "object" && payload && "error" in payload
              ? (payload as { error?: string }).error || "Erro ao gerar preview"
              : typeof payload === "string" && payload.trim().length
              ? payload
              : "Erro ao gerar preview";

          throw new Error(message);
        }

        const data = await response.json();
        setPreviewHTML(data.html);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Erro desconhecido";
        setError(errorMessage);
        console.error("[useDocumentPreview] Erro:", err);
      } finally {
        setLoading(false);
      }
    },
    [brandConfig, documentMeta]
  );

  return {
    previewHTML,
    loading,
    error,
    generatePreview,
  };
};
