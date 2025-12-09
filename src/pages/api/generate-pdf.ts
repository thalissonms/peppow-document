import type { NextApiRequest, NextApiResponse } from "next";
import formidable, { File as FormidableFile, Files, Fields } from "formidable";
import { promises as fs } from "node:fs";
import path from "node:path";
import mammoth, { Image as MammothImage } from "mammoth";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";

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

// Converte imagens embutidas do DOCX para data URLs de modo que o template HTML as exiba corretamente.
const toInlineImages = () =>
  mammoth.images.inline(async (element: MammothImage) => {
    const base64 = await element.read("base64");
    return {
      src: `data:${element.contentType};base64,${base64}`,
    };
  });

// Mapeia estilos do Word (EN/PT-BR) para HTML semântico usando Mammoth StyleMap
// Referência: https://mwilliamson.github.io/mammoth/#style-mappings
const styleMap: string[] = [
  // Título do documento
  "p[style-name='Title'] => h1.doc-title:fresh",
  "p[style-name='Título'] => h1.doc-title:fresh",

  // Subtítulo
  "p[style-name='Subtitle'] => h2.subtitle:fresh",
  "p[style-name='Subtítulo'] => h2.subtitle:fresh",

  // Cabeçalhos (Headings)
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

  // Citações
  "p[style-name='Quote'] => blockquote:fresh",
  "p[style-name='Citação'] => blockquote:fresh",

  // Legendas
  "p[style-name='Caption'] => figcaption",
  "p[style-name='Legenda'] => figcaption",

  // Código
  "p[style-name='Code'] => pre.code",
  "p[style-name='Código'] => pre.code",

  // Ênfase / Negrito (runs)
  "r[style-name='Emphasis'] => em",
  "r[style-name='Ênfase'] => em",
  "r[style-name='Strong'] => strong",
  "r[style-name='Negrito'] => strong",
];

// Novo: extrai o primeiro título (H1..H6) como texto puro
const extractTitleFromHtml = (html: string) => {
  const firstHeading = html.match(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/i);
  if (!firstHeading) return "";
  const inner = firstHeading[2] ?? "";
  const text = inner
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.slice(0, 180); // limite defensivo
};

type DocumentMeta = {
  headerLabel: string;
  headerValue: string;
  validityMessage: string;
  title: string; // novo
};

const inlineCssAssets = async (styles: string, templateDir: string) => {
  const urlRegex = /url\(\s*(['\"]?)([^)\'\"]+)\1\s*\)/g;
  const matches: Array<{ full: string; ref: string }> = [];
  let m: RegExpExecArray | null;
  while ((m = urlRegex.exec(styles)) !== null) {
    const ref = m[2];
    if (!ref || ref.startsWith("data:") || ref.startsWith("http")) continue;
    matches.push({ full: m[0], ref });
  }
  if (matches.length === 0) return styles;

  const uniqueRefs = Array.from(new Set(matches.map((x) => x.ref)));

  const getMime = (p: string) => {
    const ext = path.extname(p).toLowerCase();
    switch (ext) {
      case ".png":
        return "image/png";
      case ".jpg":
      case ".jpeg":
        return "image/jpeg";
      case ".svg":
        return "image/svg+xml";
      case ".webp":
        return "image/webp";
      case ".gif":
        return "image/gif";
      case ".woff2":
        return "font/woff2";
      case ".woff":
        return "font/woff";
      default:
        return "application/octet-stream";
    }
  };

  const refToDataUrl = new Map<string, string>();
  await Promise.all(
    uniqueRefs.map(async (ref) => {
      const refNoQuery = ref.split("?")[0];
      const candidates: string[] = [];
      if (refNoQuery.startsWith("/")) {
        candidates.push(
          path.join(process.cwd(), "public", refNoQuery.slice(1))
        );
      } else {
        candidates.push(path.join(templateDir, refNoQuery));
        candidates.push(path.join(process.cwd(), "public", refNoQuery));
      }

      for (const filePath of candidates) {
        try {
          const data = await fs.readFile(filePath);
          const mime = getMime(filePath);
          const base64 = data.toString("base64");
          refToDataUrl.set(ref, `data:${mime};base64,${base64}`);
          break;
        } catch {}
      }
    })
  );

  if (refToDataUrl.size === 0) return styles;

  let patched = styles;
  for (const [ref, dataUrl] of refToDataUrl) {
    const esc = ref.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const replaceRe = new RegExp(`url\\(\\s*(['\"]?)${esc}\\1\\s*\\)`, "g");
    patched = patched.replace(replaceRe, `url(${dataUrl})`);
  }
  return patched;
};

const buildDocumentHtml = async (docHtml: string, meta: DocumentMeta) => {
  const templateDir = path.join(
    process.cwd(),
    "public",
    "templates",
    "document"
  );

  const [template, styles, logoBase64] = await Promise.all([
    fs.readFile(path.join(templateDir, "index.html"), "utf-8"),
    fs.readFile(path.join(templateDir, "style.css"), "utf-8"),
    fs.readFile(path.join(templateDir, "assets", "logo.png"), {
      encoding: "base64",
    }),
  ]);

  const timestamp = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date());

  const stylesPatched = await inlineCssAssets(styles, templateDir);
  // Estilos extras para footer fixo no PDF (sem usar header/footer nativo)
  const fixedFooterStyles = `
    <style id="fixed-footer-styles">
      @media print {
        .doc .document-main { padding-bottom: 59px !important; }
      }
      .pdf-fixed-footer {
        position: fixed;
        left: 0;
        right: 0;
        bottom: 25px;
        width: 100%;
        height: 34px;
        display: flex;
        align-items: center;
        justify-content: center;
        pointer-events: none;
        z-index: 20;
        background: transparent !important;
      }
      .pdf-fixed-footer svg { display: block; }
    </style>`;
  const inlineStyles = `<style>${stylesPatched}</style>${fixedFooterStyles}`;
  const templateWithStyles = template.replace(
    "</head>",
    `${inlineStyles}</head>`
  );

  const templateWithMeta = templateWithStyles
    .replace(/{{HEADER_LABEL}}/g, meta.headerLabel)
    .replace(/{{HEADER_VALUE}}/g, meta.headerValue)
    .replace(/{{VALIDITY_MESSAGE}}/g, meta.validityMessage)
    .replace(/{{GENERATED_AT}}/g, timestamp)
    .replace(/{{TITLE}}/g, meta.title || "Documento");

  const withLogo = templateWithMeta.replace(
    /{{LOGO_SRC}}/g,
    `data:image/png;base64,${logoBase64}`
  );

  const footerHtml = `
    <div class="pdf-fixed-footer">
      <svg width="127" height="34" xmlns="http://www.w3.org/2000/svg"><defs><clipPath id="clip0_2675_4202"><path fill="white" id="svg_1" d="M0 0h126.29v34H0z"/></clipPath></defs><g class="layer"><title>Layer 1</title><g clip-path="url(#clip0_2675_4202)" id="svg_2"><path d="M52.6 7.26c-2.38 0-3.85 1.81-4.08 4.22v6.97c.26 3.61 2.34 5.04 4.49 5.04 2.65 0 4.5-1.99 4.5-7.87 0-6.03-1.74-8.36-4.91-8.36m.49 16.8c-1.81 0-3.4-.49-4.57-1.28v7.12c0 2.07.18 2.9 1.55 3.24v.56h-7.06v-.56c1.43-.42 1.51-1.32 1.51-3.24V9.89c0-1.31-.34-1.65-1.89-2.07v-.56l5.88-1.28v2.98c1.17-2.11 3.82-2.98 5.67-2.98 4.64 0 7.96 3.62 7.96 9.19 0 5.95-3.89 8.89-9.06 8.89" fill="rgba(21,41,55,0.15)" id="svg_3"/><path d="M38.96 15c0 1.37-.46 2.7-1.31 3.78a6.11 6.11 0 0 1-3.37 2.17c-1.33.32-2.73.19-3.98-.37a6.093 6.093 0 0 1-2.91-2.76 6.17 6.17 0 0 1-.58-3.96 6.147 6.147 0 0 1 5.72-4.96c1.37-.06 2.72.33 3.84 1.12l-8.23 4.44 1.59 2.93 11.71-6.32a9.423 9.423 0 0 0-4.83-4.72 9.468 9.468 0 0 0-6.77-.29 9.387 9.387 0 0 0-5.22 4.29 9.355 9.355 0 0 0-1.02 6.67 9.46 9.46 0 0 0 10.26 7.37 9.498 9.498 0 0 0 6.03-3.08A9.462 9.462 0 0 0 42.3 15h-3.34z" fill="rgba(21,41,55,0.15)" id="svg_4"/><path d="M14.65 18.14c-.13.78-.34 1.54-.62 2.28-.42 1.11-1.39 3-3.16 3.18-.09.01-.18.01-.26.02 0 0-.51 0-.73-.22-.26-.25-.13-.8-.13-.8.13-.57.55-1.79 1.92-3.5.49-.6 1.01-1.17 1.58-1.71l1.84-1.75-.44 2.5zm7.7-6.98c-.13-.92-.42-1.16-.75-1.11-1.2.16-2.38.46-3.52.89l-.82.31-.27-.84c-.43-1.32-1.03-2.4-1.77-3.21-1.36-1.48-3.17-2-5.09-1.47-2.09.59-4 2.46-5.67 5.58l-1.58 2.93V5.85c0-.26-.51-.43-1.43-.43-.92 0-1.43.24-1.43.43v27.73c0 .19.41.42 1.33.42.93 0 1.55-.16 1.55-.42v-5.64c-.02-8.14 3.27-18.12 8-19.44.9-.24 1.56-.05 2.19.64.59.65 1.08 1.67 1.39 2.97l.14.57-.48.32c-3.4 2.3-5.62 5.21-6.55 7.17-1.23 2.58-.78 4.11-.19 4.95.51.73 1.59 1.55 3.78 1.34 2.44-.25 4.41-2.03 5.55-5.01.73-1.91 1.07-4.28.99-6.66l-.02-.56.51-.23c1.14-.53 2.35-.89 3.6-1.08.45-.07.68-.85.55-1.76" fill="rgba(21,41,55,0.15)" id="svg_5"/><path d="M67.34 20.62c0 .02 0 .04.01.06.01.01.02.03.03.04.63.66 1.39 1.19 2.23 1.54.85.36 1.75.54 2.67.53 4.02 0 5.88-2.97 5.88-6.88 0-4.19-2.24-8.8-6.72-8.8-.78-.02-1.55.14-2.25.47-.71.33-1.33.81-1.81 1.41-.01.02-.02.03-.03.05-.01.02-.01.04-.01.06v11.52zM64.02 5.96c0-.11.07-.14.18-.14h3.01c.1 0 .14.03.14.14v1.25c-.01.03 0 .06.01.08.02.03.04.05.07.06.03.01.06.02.09.01s.05-.03.07-.05c1.58-1.22 3.64-1.5 5.6-1.5 4.86.28 8.36 3.98 8.36 9.11 0 5.31-3.7 9.04-9.09 9.04-1.72 0-3.4-.47-4.87-1.36-.1-.11-.24 0-.24.14v10.75c0 .11-.04.18-.14.18H64.2c-.03 0-.05 0-.08-.01a.21.21 0 0 1-.06-.04c-.01-.01-.03-.04-.03-.06-.01-.02-.02-.04-.01-.07V5.96z" fill="rgba(21,41,55,0.15)" id="svg_6"/><path d="M93.82 6.43c-.73 0-1.45.13-2.13.39-.64.24-1.22.62-1.69 1.11a7.66 7.66 0 0 0-1.27 1.86c-.37.76-.64 1.56-.8 2.39-.18.94-.27 1.89-.27 2.85-.01 1.17.13 2.34.43 3.48.24.96.66 1.88 1.22 2.7a5.44 5.44 0 0 0 1.9 1.73c.89.46 1.89.66 2.89.58 1.01-.08 1.96-.44 2.77-1.03.91-.7 1.61-1.7 2.09-3 .48-1.3.72-2.84.73-4.63.01-1.09-.13-2.18-.4-3.24-.23-.94-.62-1.83-1.14-2.64a5.944 5.944 0 0 0-1.81-1.79 4.86 4.86 0 0 0-1.2-.56c-.43-.13-.87-.2-1.32-.2zm-.32-.45c1.52-.01 3.03.25 4.45.78 1.32.5 2.52 1.27 3.52 2.26.81.82 1.47 1.77 1.93 2.83.55 1.23.78 2.58.65 3.93a7.846 7.846 0 0 1-1.35 3.75 9.794 9.794 0 0 1-3.76 3.26c-1.62.81-3.4 1.22-5.21 1.2-1.39.01-2.77-.22-4.07-.68-1.24-.43-2.38-1.08-3.37-1.92-.95-.8-1.73-1.79-2.27-2.91A7.776 7.776 0 0 1 83.2 15c0-1.6.49-3.17 1.41-4.49.95-1.4 2.24-2.54 3.76-3.3 1.58-.82 3.34-1.24 5.12-1.22" fill="rgba(21,41,55,0.15)" id="svg_7"/><path d="M126.1 4.52c0 .03-.04 0-.07.03 0-.03.03-.03.07-.03zm-.38-1.32c0 .03-.04.03-.04.07-.14 0 0-.18.04-.07zm-.07 3.79c-.07-.04 0-.07 0-.11.07 0 0 .04 0 .11zm-.04-3.97c-.07 0-.07-.07-.07-.1.04 0 .07.03.07.1zm.42 3.38c.01.52-.11 1.03-.35 1.49-.07.21 0 .52-.21.59.25-.8.25-1.61.63-2.43.14 0-.04.24-.07.35m-.73.42c0 .07-.07.14.03.21-.03-.07.04-.21-.03-.21zm0 .32c.03.06-.11.27.03.27 0-.14.04-.24-.03-.27zm-.07-2.47v-.11h-.1c0 .04.04.07.04.11h.06zm-.04-.74c-.07.07-.14.38.07.42-.1-.14 0-.28-.07-.42zm-.03 2.64h-.07v.07h.07v-.07zm-.03-5.32c-.07.03-.03.14.07.14 0-.11 0-.14-.07-.14zm-.03 5.84c.03.1-.04.1-.07.24.1 0 .21-.27.07-.24zm.03-5.18c-.14-.1 0-.28-.14-.28-.07.25.07.42-.03.59.09-.08.16-.19.18-.31m.03 6.64c-.07.24-.24.36-.2.59.17-.07.31-.45.2-.59zm-.22-1.46c-.03.04-.1.24 0 .24 0-.1.18-.24 0-.24zm0 .66c-.03.07-.14.21-.03.24.07-.03.1-.24.03-.24zm-.1-2.08c.03 0 .07.03.07 0 0-.04-.07-.07-.07 0zm.03 1.73h-.07v.07h.07V7.4zm-.03-5.21c-.07 0-.07-.03-.04-.07.04 0 .04 0 .04.07zm-.11.69c.04-.03.07 0 .07-.03-.03 0-.07 0-.07.03zm0-.13c.04 0 .07.03.07 0 0-.04-.07-.07-.07 0zm-.03 4.9c.03 0 .07.03.07 0 0-.04-.07-.07-.07 0zm-.38 1.53c0 .05-.01.1-.04.14.1 0 .14-.14.04-.14zm-.07-1.57c-.04 0-.07.14 0 .18.03-.03.07-.18 0-.18zm-.18-2.68c-.04-.03-.07-.06-.07-.1.03 0 .07.04.07.1zm-.04 2.5c0-.07 0-.1-.07-.07 0 .02 0 .04.01 .06.01 .02 .02 .03 .03 .05 0 -.04 0 -.07 .03 -.04zm-.03 -2.71c0 .04 -.04 0 -.07 .04 0 -.04 .03 -.04 .07 -.04zm.07 .31c0 .07 -.11 .11 -.07 .21 -.14 -.03 -.04 -.21 -.07 -.21 .03 -.1 .07 .04 .14 0zm-.11 5.43h-.06v-.14h.06v.14zm-.06-5c0-.07 0-.11.03-.11 0 .02 0 .04-.01 .06 0 .02 -.01 .03 -.02 .05zm.03 .07c0 .1 -.14 -.11 -.03 -.07 0 0 0 .07 .03 .07zm.1 4.45h .07c0 .17 -.1 .27 -.17 .17 0 .28 -.39 .73 -.18 .84 .1 -.11 0 -.21 .07 -.28 .07 .07 .1 .04 .14 .07 .03 .1 -.21 .24 -.04 .31 .24 -.24 0 -.55 .21 -.73 0 -.1 -.07 -.14 0 -.24 .18 -.11 .14 -.38 .21 -.56 .02 -.02 .05 -.04 .08 -.04 .04 -.01 .07 -.01 .1 .01 .03 -.21 .31 -.56 .07 -.66 .1 -.14 .18 -.59 .36 -.42 .07 -.24 .21 -.42 .27 -.66 .07 0 -.03 .07 .07 .1 .11 -.2 -.03 -.24 0 -.41 -.27 .1 -.24 .59 -.45 .8 -.07 -.14 .14 -.25 -.03 -.25 -.11 .14 -.07 .52 -.28 .52 -.04 .11 .18 .14 0 .28 -.04 -.03 0 -.1 -.11 -.07 -.03 .38 -.07 .84 -.31 1.15 .04 -.14 .06 -.28 .07 -.42 -.14 .04 -.18 .35 -.14 .49 .03 .14 -.11 0 0 0" fill="rgba(21,41,55,0,15)" id="svg_8"/></g></g></svg>
    </div>`;

  let out = withLogo.replace("{{CONTENT}}", docHtml);
  out = out.replace("</body>", `${footerHtml}</body>`);
  return out;
};

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).send("Método não suportado.");
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

    // Converte o DOCX para HTML (Mammoth)
    const { value: html, messages } = await mammoth.convertToHtml(
      { path: uploadedFile.filepath },
      {
        convertImage: toInlineImages(),
        styleMap,
        includeDefaultStyleMap: true,
      }
    );

    // Logs úteis para debug
    console.log("[mammoth] mensagens:", messages); // avisos/infos do mammoth
    console.log("[mammoth] html length:", html.length); // tamanho do HTML
    console.log("[mammoth] html:", html); // HTML completo (pode ser grande)

    const isProposal = fields.isProposal === "true";
    const rawId = fields.proposalId?.trim() ?? "";
    const normalizedId = rawId
      ? rawId.startsWith("#")
        ? rawId
        : `#${rawId}`
      : "—";
    const headerLabel = isProposal ? "Proposta" : "ID";
    const validityMessage = isProposal
      ? (fields.proposalValidity?.trim() ?? "")
      : "";

    // novo: título a partir do conteúdo
    const extractedTitle = extractTitleFromHtml(html);
    const fallbackTitle =
      extractedTitle ||
      (isProposal && normalizedId !== "—"
        ? `Proposta ${normalizedId}`
        : "Documento");

    const documentHtml = await buildDocumentHtml(html, {
      headerLabel,
      headerValue: normalizedId,
      validityMessage,
      title: fallbackTitle, // novo
    });

    // Configuração para funcionar tanto localmente quanto na Vercel
    // Usa sempre puppeteer-core + @sparticuz/chromium (compatível com Vercel)
    const browser = await puppeteer.launch({
      args: [...chromium.args, "--no-sandbox", "--disable-setuid-sandbox"],
      executablePath: await chromium.executablePath(),
      headless: true,
    });

    const page = await browser.newPage();
    await page.setContent(documentHtml, { waitUntil: "networkidle0" });

    // Footer centralizado no eixo X e a 25px do bottom, repetido em todas as páginas
    const footerTemplate = `
      <div style="width:100%; height:100%; display:flex; align-items:flex-end; justify-content:center; padding-bottom:25px;">
        <div style="display:flex; align-items:center; justify-content:center;">
        <svg width="26" height="34" viewBox="0 0 34 79" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M39.9106 34.765C39.5477 36.8917 38.9837 38.9792 38.2263 40.9993C37.0693 44.0311 34.4183 49.1865 29.6095 49.6796C29.3508 49.7089 29.1213 49.7235 28.8821 49.7333C28.8821 49.7333 27.4907 49.7333 26.8902 49.1426C26.1823 48.4591 26.5485 46.9505 26.5485 46.9505C26.8951 45.3883 28.0424 42.0685 31.7771 37.4013C33.1055 35.7456 34.5441 34.1814 36.0831 32.7194L41.1067 27.9204L39.9106 34.765ZM60.9033 15.686C60.547 13.1864 59.7707 12.5273 58.8724 12.6591C55.5864 13.0867 52.3618 13.8978 49.2646 15.0757L47.0237 15.9398L46.2865 13.6453C45.1051 10.0375 43.4794 7.0789 41.4582 4.8576C37.7576 0.805499 32.817 -0.615099 27.5688 0.854401C21.8812 2.4459 16.6819 7.572 12.1123 16.0912L7.8112 24.1075V1.1619C7.8112 0.454 6.4101 0 3.9056 0C1.4011 0 0 0.6542 0 1.1619V76.965C0 77.478 1.118 78.117 3.642 78.117C6.166 78.117 7.8552 77.678 7.8552 76.965V61.5478C7.8112 39.315 16.7942 12.0342 29.6876 8.4215C32.1286 7.7527 33.9496 8.2897 35.6583 10.1644C37.2694 11.9317 38.5876 14.7389 39.4468 18.2783L39.8178 19.8455L38.5241 20.7096C29.2482 27.0123 23.1994 34.97 20.6559 40.311C17.3019 47.3557 18.5175 51.5396 20.1335 53.8488C21.5346 55.8407 24.4638 58.0767 30.4395 57.4957C37.0937 56.8171 42.4737 51.9497 45.5738 43.8016C47.5608 38.5876 48.503 32.1238 48.2882 25.6014L48.2345 24.0733L49.6258 23.4386C52.7363 22.002 56.0355 21.0157 59.4241 20.5094C60.6592 20.3141 61.2841 18.1807 60.9326 15.686" fill="#152937" fill-opacity="0.25"/>
        </svg>
        </div>
      </div>`;

    const pdfBuffer = await page.pdf({
      format: "A4",
      margin: {
        top: "0mm",
        bottom: "0mm",
        left: "0mm",
        right: "0mm",
      },
      printBackground: true,
  displayHeaderFooter: false,
      headerTemplate: "<div></div>",
      footerTemplate,
    });

    await browser.close();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      'inline; filename="documento-padronizado.pdf"'
    );
    res.status(200).end(pdfBuffer);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao gerar o PDF.";
    res.status(400).send(message);
  } finally {
    if (uploadedFile?.filepath) {
      await fs.unlink(uploadedFile.filepath).catch(() => undefined);
    }
  }
};

export default handler;
