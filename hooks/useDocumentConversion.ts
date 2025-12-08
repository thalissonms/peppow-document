import { useState } from "react";
import mammoth, { Image as MammothImage } from "mammoth";
import { DocumentMeta } from "@/types/ui";

export const useDocumentConversion = () => {
  const [html, setHtml] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const convertDocument = async (file: File, meta: DocumentMeta, setMeta: (meta: DocumentMeta) => void) => {
    if (!file.name.toLowerCase().endsWith(".docx")) {
      setError("Por favor, selecione um arquivo .docx");
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const toInlineImages = () =>
        mammoth.images.inline(async (element: MammothImage) => {
          const base64 = await element.read("base64");
          return { src: `data:${element.contentType};base64,${base64}` };
        });

      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.convertToHtml(
        { arrayBuffer },
        { convertImage: toInlineImages(), includeDefaultStyleMap: true }
      );
      
      setHtml(result.value);
      
      // Extrair título do primeiro heading se existir
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = result.value;
      const firstHeading = tempDiv.querySelector("h1, h2");
      if (firstHeading && !meta.title) {
        setMeta({ ...meta, title: firstHeading.textContent || "" });
      }

      setLoading(false);
      return true;
    } catch (err) {
      setError("Erro ao converter documento. Certifique-se de que é um arquivo .docx válido.");
      console.error(err);
      setLoading(false);
      return false;
    }
  };

  const updateHtml = (newHtml: string) => {
    setHtml(newHtml);
  };

  const resetDocument = () => {
    setHtml("");
    setError(null);
  };

  return {
    html,
    loading,
    error,
    convertDocument,
    updateHtml,
    resetDocument,
  };
};
