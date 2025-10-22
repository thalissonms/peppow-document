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
          const errorData = await response.json();
          throw new Error(errorData.error || "Erro ao gerar preview");
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
