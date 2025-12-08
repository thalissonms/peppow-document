import { NextApiRequest, NextApiResponse } from "next";
import { getCachedCustomizedCSS } from "@/lib/styleGenerator";
import { BrandConfig } from "@/types/ui";
import { DEFAULT_BRAND_CONFIG } from "@/lib/constants";
import fs from "fs/promises";
import path from "path";
import { normalizeTables } from "@/utils/normalizeTables";
import { applyLogoContainer } from "@/utils/template";

// Aumenta o limite padrão de 1MB do body parser do Next.js para suportar documentos maiores
export const config = {
  api: {
    bodyParser: {
      sizeLimit: "6mb",
    },
  },
};

type DocumentMeta = {
  headerLabel: string;
  headerValue: string;
  validityMessage: string;
  title: string;
  description?: string;
};

// DEFAULT_BRAND_CONFIG agora vem de '@/lib/constants'

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

  // Carrega apenas o template HTML; o logo padrão é o SVG inline do template
  const template = await fs.readFile(path.join(templateDir, "index.html"), "utf-8");

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

      .doc .main-container { min-height: auto !important; }
      .doc .document-main { padding: 20px !important; margin: 0 !important; }
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

  // Variáveis para logo (opcionais) vindas do BrandConfig
  const logoVars = `<style id="brand-logo-vars">.doc{${
    typeof brand.logoHeight === 'number' ? `--logo-height:${brand.logoHeight}px;` : ''
  }${
    typeof brand.logoMaxWidth === 'number' ? `--logo-max-width:${brand.logoMaxWidth}px;` : ''
  }}</style>`;

  // Injeta os estilos no template
  const inlineStyles = `<style>${customizedCSS}</style>${logoVars}${padraoOverrides}`;
  const templateWithStyles = template.replace("</head>", `${inlineStyles}</head>`);

  // Substitui placeholders de metadados
  const templateWithMeta = templateWithStyles
    .replace(/{{HEADER_LABEL}}/g, meta.headerLabel)
    .replace(/{{HEADER_VALUE}}/g, meta.headerValue)
    .replace(/{{VALIDITY_MESSAGE}}/g, meta.validityMessage)
    .replace(/{{GENERATED_AT}}/g, timestamp)
    .replace(/{{TITLE}}/g, meta.title || "Documento")
    .replace(/{{DESCRIPTION}}/g, meta.description || "");

  // Aplica logo do usuário (se houver), mantendo o SVG padrão quando não houver
  const templateWithLogo = applyLogoContainer(templateWithMeta, brand.logo);

  // Injeta o conteúdo do documento
  return templateWithLogo.replace("{{CONTENT}}", docHtml);
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
  // Normaliza tabelas (Lexical -> thead/tbody; corrige thead com várias linhas)
  const normalized = normalizeTables(html);
  const documentHTML = await buildDocumentHtml(normalized, meta, brand, layout);

    res.status(200).json({ html: documentHTML });
  } catch (error) {
    console.error("[generate-preview] Erro ao gerar preview:", error);
    res.status(500).json({ 
      error: "Erro ao gerar preview do documento",
      details: error instanceof Error ? error.message : String(error)
    });
  }
}
