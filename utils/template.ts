/**
 * Substitui o conteúdo do container de logo (<div class="logos">…</div>)
 * por uma imagem quando for fornecido um logo em data URL.
 * Caso não exista logo, retorna o HTML inalterado para manter o SVG padrão do template.
 */
export function applyLogoContainer(templateHtml: string, logoDataUrl?: string | null): string {
  if (!logoDataUrl || typeof logoDataUrl !== "string" || !logoDataUrl.startsWith("data:")) {
    return templateHtml;
  }

  return templateHtml.replace(
    /<div\s+class=["']logos["'][^>]*>[\s\S]*?<\/div>/i,
    `<div class="logos"><img src="${logoDataUrl}" alt="Logo" /></div>`
  );
}
