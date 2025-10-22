import { BrandConfig } from "@/types/ui";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

/**
 * Gera um hash único baseado na configuração da marca
 * para identificar se o CSS em cache ainda é válido
 */
export const generateBrandConfigHash = (brandConfig: BrandConfig): string => {
  const configString = JSON.stringify({
    primaryColor: brandConfig.primaryColor,
    secondaryColor: brandConfig.secondaryColor,
    accentColor: brandConfig.accentColor,
    backgroundColor: brandConfig.backgroundColor,
  });
  return crypto.createHash("md5").update(configString).digest("hex");
};

/**
 * Substitui as variáveis CSS do style.css pelas cores da marca
 */
export const injectBrandColors = (cssContent: string, brandConfig: BrandConfig): string => {
  // Mapa de substituição de variáveis CSS para cores da marca
  const colorMap: Record<string, string> = {
    "--bg-color": brandConfig.backgroundColor,
    "--primary-orange": brandConfig.primaryColor,
    "--dark-blue": brandConfig.secondaryColor,
    "--medium-blue": brandConfig.accentColor,
    "--light-text": "#fff9d5", // Mantém texto claro para contraste
    "--dark-text": brandConfig.secondaryColor,
    "--black-text": brandConfig.secondaryColor,
    "--orange-accent-light": `${brandConfig.primaryColor}1A`,
    "--orange-accent-medium": `${brandConfig.primaryColor}66`,
    "--orange-accent-strong": `${brandConfig.primaryColor}CC`,
    "--blue-accent-light": `${brandConfig.accentColor}40`,
    "--blue-accent-medium": `${brandConfig.accentColor}66`,
  };

  let customizedCSS = cssContent;

  // Substitui cada variável CSS pelo valor da marca
  for (const [cssVar, brandValue] of Object.entries(colorMap)) {
    // Padrão: --var-name: #valor;
    const regex = new RegExp(`${cssVar}:\\s*[^;]+;`, "g");
    customizedCSS = customizedCSS.replace(regex, `${cssVar}: ${brandValue};`);
  }

  // Adiciona comentário indicando que foi customizado
  const timestamp = new Date().toISOString();
  customizedCSS = `/* CSS Customizado - Gerado em ${timestamp} */\n/* Cores da marca aplicadas automaticamente */\n\n${customizedCSS}`;

  return customizedCSS;
};

/**
 * Inline de assets CSS (fontes, imagens) para data URLs
 */
export const inlineCssAssets = async (styles: string, templateDir: string): Promise<string> => {
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
      case ".woff": return "font/woff";
      case ".woff2": return "font/woff2";
      case ".ttf": return "font/ttf";
      case ".otf": return "font/otf";
      case ".eot": return "application/vnd.ms-fontobject";
      case ".png": return "image/png";
      case ".jpg": case ".jpeg": return "image/jpeg";
      case ".svg": return "image/svg+xml";
      case ".webp": return "image/webp";
      case ".gif": return "image/gif";
      default: return "application/octet-stream";
    }
  };

  const refToDataUrl = new Map<string, string>();
  
  await Promise.all(
    uniqueRefs.map(async (ref) => {
      try {
        let filePath: string | null = null;

        if (ref.startsWith("/")) {
          filePath = path.join(process.cwd(), "public", ref.slice(1));
        } else {
          filePath = path.join(templateDir, ref);
        }

        const buffer = await fs.readFile(filePath);
        const mime = getMime(filePath);
        const base64 = buffer.toString("base64");
        const dataUrl = `data:${mime};base64,${base64}`;
        refToDataUrl.set(ref, dataUrl);
      } catch (err) {
        console.warn(`[styleGenerator] Não foi possível embutir asset: ${ref}`, err);
      }
    })
  );

  if (refToDataUrl.size === 0) return styles;

  let patched = styles;
  for (const [ref, dataUrl] of refToDataUrl) {
    const escaped = ref.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    patched = patched.replace(new RegExp(`url\\(\\s*(['"]?)${escaped}\\1\\s*\\)`, "g"), `url(${dataUrl})`);
  }
  
  return patched;
};

/**
 * Gera o CSS completo customizado com cores da marca e assets inline
 */
export const generateCustomizedCSS = async (brandConfig: BrandConfig): Promise<string> => {
  const templateDir = path.join(process.cwd(), "public", "templates", "document");
  const stylePath = path.join(templateDir, "style.css");

  // Lê o style.css original
  const originalCSS = await fs.readFile(stylePath, "utf-8");

  // Injeta as cores da marca
  const brandedCSS = injectBrandColors(originalCSS, brandConfig);

  // Inline de assets (fontes, imagens)
  const finalCSS = await inlineCssAssets(brandedCSS, templateDir);

  return finalCSS;
};

/**
 * Cache de estilos em memória (em produção, considere usar Redis ou similar)
 */
const styleCache = new Map<string, string>();

/**
 * Obtém o CSS customizado (usa cache quando possível)
 */
export const getCachedCustomizedCSS = async (brandConfig: BrandConfig): Promise<string> => {
  const hash = generateBrandConfigHash(brandConfig);

  // Verifica se já está em cache
  if (styleCache.has(hash)) {
    console.log(`[styleGenerator] CSS encontrado em cache (hash: ${hash})`);
    return styleCache.get(hash)!;
  }

  // Gera novo CSS customizado
  console.log(`[styleGenerator] Gerando novo CSS customizado (hash: ${hash})`);
  const customCSS = await generateCustomizedCSS(brandConfig);

  // Armazena em cache
  styleCache.set(hash, customCSS);

  // Limita o tamanho do cache (mantém apenas os últimos 50)
  if (styleCache.size > 50) {
    const firstKey = styleCache.keys().next().value;
    if (firstKey) {
      styleCache.delete(firstKey);
    }
  }

  return customCSS;
};

/**
 * Limpa o cache de estilos (útil para desenvolvimento/testes)
 */
export const clearStyleCache = () => {
  styleCache.clear();
  console.log("[styleGenerator] Cache de estilos limpo");
};
