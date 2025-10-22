import { NextApiRequest, NextApiResponse } from "next";
import { getCachedCustomizedCSS } from "@/lib/styleGenerator";
import { BrandConfig } from "@/types/ui";
import fs from "fs/promises";
import path from "path";

type DocumentMeta = {
  headerLabel: string;
  headerValue: string;
  validityMessage: string;
  title: string;
  description?: string;
};

const DEFAULT_BRAND_CONFIG: BrandConfig = {
  logo: null,
  primaryColor: "#ff5e2b",
  secondaryColor: "#152937",
  accentColor: "#154c71",
  backgroundColor: "#fff9d5",
};

/**
 * Gera o HTML completo do documento com template e estilos customizados
 */
const buildDocumentHtml = async (
  docHtml: string,
  meta: DocumentMeta,
  brand: BrandConfig = DEFAULT_BRAND_CONFIG,
  layout: "padrao" | "a4" | "apresentacao" = "a4"
) => {
  const templateDir = path.join(process.cwd(), "public", "templates", "document");

  // Carrega o template HTML e o logo padrão
  const [template, logoBase64] = await Promise.all([
    fs.readFile(path.join(templateDir, "index.html"), "utf-8"),
    fs.readFile(path.join(templateDir, "assets", "logo.png"), { encoding: "base64" }),
  ]);

  // Obtém o CSS customizado com cache
  const customizedCSS = await getCachedCustomizedCSS(brand);

  // Timestamp para metadados
  const timestamp = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date());

  // CSS adicional para layout padrão (sem paginação)
  const padraoOverrides = layout === "padrao" ? `
    <style id="pdf-overrides">
      /* Remover tamanho A4 e margens impostas pelo @page padrão */
      @page { size: auto; margin: 0; }
      /* Evitar blocos com altura de viewport que centralizam conteúdo */
      .doc .main-container { min-height: auto !important; }
      /* Remover padding/margem exagerados que aparentam "centralização" */
      .doc .document-main { padding: 20px !important; margin: 0 !important; }
      /* Não forçar anti-quebra em excesso para permitir fluxo contínuo */
      .doc #content, .doc #content * {
        page-break-before: auto !important;
        page-break-after: auto !important;
        page-break-inside: auto !important;
        break-before: auto !important;
        break-after: auto !important;
        break-inside: auto !important;
      }
    </style>
  ` : "";

  // Injeta os estilos no template
  const inlineStyles = `<style>${customizedCSS}</style>${padraoOverrides}`;
  const templateWithStyles = template.replace("</head>", `${inlineStyles}</head>`);

  // Substitui placeholders de metadados
  const templateWithMeta = templateWithStyles
    .replace(/{{HEADER_LABEL}}/g, meta.headerLabel)
    .replace(/{{HEADER_VALUE}}/g, meta.headerValue)
    .replace(/{{VALIDITY_MESSAGE}}/g, meta.validityMessage)
    .replace(/{{GENERATED_AT}}/g, timestamp)
    .replace(/{{TITLE}}/g, meta.title || "Documento")
    .replace(/{{DESCRIPTION}}/g, meta.description || "");

  // Logo: usa o logo da marca ou o padrão
  const selectedLogo = brand.logo && brand.logo.startsWith("data:")
    ? brand.logo
    : `data:image/png;base64,${logoBase64}`;
  const withLogo = templateWithMeta.replace(/{{LOGO_SRC}}/g, selectedLogo);

  // Injeta o conteúdo do documento
  return withLogo.replace("{{CONTENT}}", docHtml);
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { html, meta, brandConfig, layout = "a4" } = req.body;

    if (!html || !meta) {
      return res.status(400).json({ error: "HTML e metadados são obrigatórios" });
    }

    const brand = brandConfig || DEFAULT_BRAND_CONFIG;
    const documentHTML = await buildDocumentHtml(html, meta, brand, layout);

    res.status(200).json({ html: documentHTML });
  } catch (error) {
    console.error("[generate-preview] Erro ao gerar preview:", error);
    res.status(500).json({ 
      error: "Erro ao gerar preview do documento",
      details: error instanceof Error ? error.message : String(error)
    });
  }
}
