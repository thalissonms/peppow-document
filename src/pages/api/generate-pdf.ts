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

const headingPattern = /^([0-9]+(?:\.[0-9]+)*)(?:\s*[-–—:]\s*)?(.*)$/;

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const mergeClassAttribute = (attrs: string | undefined, className: string) => {
  if (!attrs || !attrs.trim()) {
    return ` class="${className}"`;
  }

  const attrString = attrs.trim();
  const doubleMatch = attrString.match(/class="([^"]*)"/);
  if (doubleMatch) {
    const classes = doubleMatch[1].split(/\s+/).filter(Boolean);
    if (!classes.includes(className)) {
      classes.push(className);
    }
    return ` ${attrString.replace(doubleMatch[0], `class="${classes.join(" ")}"`)}`;
  }

  const singleMatch = attrString.match(/class='([^']*)'/);
  if (singleMatch) {
    const classes = singleMatch[1].split(/\s+/).filter(Boolean);
    if (!classes.includes(className)) {
      classes.push(className);
    }
    return ` ${attrString.replace(singleMatch[0], `class='${classes.join(" ")}'`)}`;
  }

  return ` ${attrString} class="${className}"`;
};

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

const enhanceHeadings = (html: string) => {
  return html.replace(/<h([1-6])([^>]*)>([\s\S]*?)<\/h\1>/gi, (match, level, attrs, inner) => {
    if (inner.includes("heading-number")) {
      return match;
    }

    const textContent = inner.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

    if (!textContent) {
      return `<h${level}${attrs}>${inner}</h${level}>`;
    }

    const numberMatch = textContent.match(headingPattern);

    if (!numberMatch) {
      const mergedAttrs = mergeClassAttribute(attrs, "doc-heading");
      return `<h${level}${mergedAttrs}>${inner}</h${level}>`;
    }

  const [, rawNumber] = numberMatch;

    // Remover o número do início do título (e o separador), sem exibir badge numérico
    const cleanPattern = new RegExp(
      `^\\s*${escapeRegExp(rawNumber)}(?:\\s*[-–—:]\\s*)?`,
      "i"
    );
    const cleanedInner = inner.replace(cleanPattern, "").trim();
    const titleSpan = cleanedInner
      ? `<span class="heading-text">${cleanedInner}</span>`
      : "";
    const mergedAttrs = mergeClassAttribute(attrs, "doc-heading");

    // Agora retornamos apenas o texto do título, sem o número inicial
    return `<h${level}${mergedAttrs}>${titleSpan}</h${level}>`;
  });
};

// Novo: extrai o primeiro título (H1..H6) como texto puro
const extractTitleFromHtml = (html: string) => {
  const firstHeading = html.match(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/i);
  if (!firstHeading) return "";
  const inner = firstHeading[2] ?? "";
  const text = inner.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
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
        candidates.push(path.join(process.cwd(), "public", refNoQuery.slice(1)));
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
  const inlineStyles = `<style>${stylesPatched}</style>`;
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

  return withLogo.replace("{{CONTENT}}", docHtml);
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
    console.log("[mammoth] mensagens:", messages);       // avisos/infos do mammoth
    console.log("[mammoth] html length:", html.length);  // tamanho do HTML
    console.log("[mammoth] html:", html);                // HTML completo (pode ser grande)

    const enhancedHtml = enhanceHeadings(html);
    console.log("[enhanced] html:", enhancedHtml);

    const isProposal = fields.isProposal === "true";
    const rawId = fields.proposalId?.trim() ?? "";
    const normalizedId = rawId ? (rawId.startsWith("#") ? rawId : `#${rawId}`) : "—";
    const headerLabel = isProposal ? "Proposta" : "ID";
    const validityMessage = isProposal
      ? (fields.proposalValidity?.trim() ?? "")
      : "";

    // novo: título a partir do conteúdo
    const extractedTitle = extractTitleFromHtml(enhancedHtml);
    const fallbackTitle =
      extractedTitle ||
      (isProposal && normalizedId !== "—" ? `Proposta ${normalizedId}` : "Documento");

    const documentHtml = await buildDocumentHtml(enhancedHtml, {
      headerLabel,
      headerValue: normalizedId,
      validityMessage,
      title: fallbackTitle, // novo
    });

    // Configuração para funcionar tanto localmente quanto na Vercel
    const isProduction = process.env.NODE_ENV === 'production';
    let browser;
    if (isProduction) {
      browser = await puppeteer.launch({
        args: [...chromium.args, "--no-sandbox", "--disable-setuid-sandbox"],
        executablePath: await chromium.executablePath(),
        headless: true,
      });
    } else {
      const pptr = await import("puppeteer");
      browser = await pptr.default.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });
    }

    const page = await browser.newPage();
    await page.setContent(documentHtml, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      margin: {
        top: "0mm",
        bottom: "0mm",
        left: "0mm",
        right: "0mm",
      },
      printBackground: true,
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
