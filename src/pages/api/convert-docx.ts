import type { NextApiRequest, NextApiResponse } from "next";
import formidable, { File as FormidableFile, Files, Fields } from "formidable";
import { promises as fs } from "node:fs";
import mammoth, { Image as MammothImage } from "mammoth";
import { enhanceHeadings } from "@/utils/headingHelpers";

export const config = {
  api: {
    bodyParser: false,
  },
};

type ParsedForm = {
  file: FormidableFile;
  fields: Record<string, string>;
};

const parseForm = (req: NextApiRequest): Promise<ParsedForm> => {
  return new Promise((resolve, reject) => {
    const form = formidable({ multiples: false, keepExtensions: true });

    form.parse(req, (err: unknown, parsedFields: Fields, files: Files) => {
      if (err) {
        reject(err);
        return;
      }

      const uploaded = files.document ?? files.file;
      const file = Array.isArray(uploaded) ? uploaded[0] : uploaded;

      if (!file) {
        reject(new Error("Nenhum arquivo foi enviado."));
        return;
      }

      const normalizedFields: Record<string, string> = {};

      Object.entries(parsedFields).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          normalizedFields[key] = value[0] != null ? String(value[0]) : "";
        } else if (value != null) {
          normalizedFields[key] = String(value);
        }
      });

      resolve({ file, fields: normalizedFields });
    });
  });
};

const toInlineImages = () =>
  mammoth.images.inline(async (element: MammothImage) => {
    const base64 = await element.read("base64");
    return {
      src: `data:${element.contentType};base64,${base64}`,
    };
  });

// Note: escapeRegExp and mergeClassAttribute are now in @/utils/headingHelpers
// Keeping imports to maintain API compatibility if needed

const extractTitleFromHtml = (html: string) => {
  const firstHeading = html.match(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/i);
  if (!firstHeading) return "";
  const inner = firstHeading[2] ?? "";
  const text = inner.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return text.slice(0, 180);
};

// StyleMap básico para melhorar heading/title em EN/PT-BR
const styleMap: string[] = [
  "p[style-name='Title'] => h1.doc-title:fresh",
  "p[style-name='Título'] => h1.doc-title:fresh",
  "p[style-name='Heading 1'] => h1:fresh",
  "p[style-name='Heading 2'] => h2:fresh",
  "p[style-name='Heading 3'] => h3:fresh",
  "p[style-name='Heading 4'] => h4:fresh",
  "p[style-name='Heading 5'] => h5:fresh",
  "p[style-name='Heading 6'] => h6:fresh",
  "p[style-name='Título 1'] => h1:fresh",
  "p[style-name='Título 2'] => h2:fresh",
  "p[style-name='Título 3'] => h3:fresh",
  "p[style-name='Título 4'] => h4:fresh",
  "p[style-name='Título 5'] => h5:fresh",
  "p[style-name='Título 6'] => h6:fresh",
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Método não suportado." });
    return;
  }

  let uploadedFile: FormidableFile | undefined;

  try {
    const { file, fields } = await parseForm(req);
    uploadedFile = file;

    const allowedMimeTypes = new Set([
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
    ]);

    const filename = uploadedFile.originalFilename?.toLowerCase() ?? "";
    const hasDocxExtension = filename.endsWith(".docx");
    const isAllowedMimeType = allowedMimeTypes.has(uploadedFile.mimetype ?? "");

    if (!uploadedFile.filepath || !(hasDocxExtension || isAllowedMimeType)) {
      throw new Error("Envie um arquivo no formato .docx.");
    }

    const { value: html, messages } = await mammoth.convertToHtml(
      { path: uploadedFile.filepath },
      { convertImage: toInlineImages(), styleMap, includeDefaultStyleMap: true }
    );

    const enhancedHtml = enhanceHeadings(html);

    const isProposal = fields.isProposal === "true";
    const rawId = fields.proposalId?.trim() ?? "";
    const normalizedId = rawId ? (rawId.startsWith("#") ? rawId : `#${rawId}`) : "—";
    const headerLabel = isProposal ? "Proposta" : "ID";
    const validityMessage = isProposal ? (fields.proposalValidity?.trim() ?? "") : "";

    const extractedTitle = extractTitleFromHtml(enhancedHtml);
    const title =
      extractedTitle || (isProposal && normalizedId !== "—" ? `Proposta ${normalizedId}` : "Documento");

    res.status(200).json({
      html: enhancedHtml,
      meta: {
        title,
        headerLabel,
        headerValue: normalizedId,
        validityMessage,
      },
      messages,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao converter o DOCX.";
    res.status(400).json({ error: message });
  } finally {
    if (uploadedFile?.filepath) {
      await fs.unlink(uploadedFile.filepath).catch(() => undefined);
    }
  }
}
