/**
 * Normaliza tabelas para uma estrutura consistente:
 * - Converte tabelas do Lexical (<table class="editor-table"> com <tr> diretos) para
 *   <thead> (apenas a primeira linha) e <tbody> (demais linhas),
 *   trocando <th> por <td> nas linhas do corpo.
 * - Corrige casos em que o preview gerou <thead> com várias linhas (move as excedentes para <tbody>).
 * - Preserva <colgroup> quando presente.
 */
export function normalizeTables(html: string): string {
  if (!html || typeof html !== "string") return html;

  // Primeiro, trate cada <table> individualmente
  return html.replace(/<table\b([^>]*)>([\s\S]*?)<\/table>/gi, (match, tableAttrs, tableInner) => {
    let inner = tableInner;

    // Extrai <colgroup> se estiver no início
    let colgroup = "";
    const colgroupMatch = inner.match(/^\s*(<colgroup[\s\S]*?<\/colgroup>)/i);
    if (colgroupMatch) {
      colgroup = colgroupMatch[1];
      inner = inner.slice(colgroupMatch[0].length);
    }

    const hasThead = /<thead[\s>]/i.test(inner);

    // Função auxiliar para extrair todas as <tr> de um bloco HTML
    const extractRows = (blockHtml: string): string[] => blockHtml.match(/<tr\b[\s\S]*?<\/tr>/gi) || [];

    // Se já tem THEAD, vamos garantir que apenas a primeira linha fique no THEAD
    if (hasThead) {
      const theadMatch = inner.match(/<thead\b[^>]*>([\s\S]*?)<\/thead>/i);
      const tbodyMatch = inner.match(/<tbody\b[^>]*>([\s\S]*?)<\/tbody>/i);

      const theadInner = theadMatch?.[1] ?? "";
      const headRows = extractRows(theadInner);

      const firstHead = headRows[0] || "";
      const extraHeadRows = headRows.slice(1).map((r) => r.replace(/<th\b/gi, "<td").replace(/<\/th>/gi, "</td>")).join("");

      // Linhas já existentes no TBODY
      const bodyRows = extractRows(tbodyMatch?.[1] ?? "").join("");

      // Linhas soltas fora de thead/tbody (diretas no table)
      const innerWithoutHeadBody = inner
        .replace(theadMatch?.[0] ?? "", "")
        .replace(tbodyMatch?.[0] ?? "", "");
      const looseRows = extractRows(innerWithoutHeadBody).join("");

      const normalizedThead = firstHead ? `<thead>${firstHead}</thead>` : "";
      const normalizedTbodyContent = `${extraHeadRows}${bodyRows}${looseRows}`
        .replace(/<th\b/gi, "<td")
        .replace(/<\/th>/gi, "</td>")
        .replace(/\beditor-table-cell-header\b/g, "")
        .trim();
      const normalizedTbody = normalizedTbodyContent ? `<tbody>${normalizedTbodyContent}</tbody>` : "";

      return `<table${tableAttrs}>${colgroup}${normalizedThead}${normalizedTbody}</table>`;
    }

    // Caso NÃO tenha THEAD: estrutura típica do Lexical (tr diretos)
    const allRows = extractRows(inner);
    if (allRows.length === 0) {
      return `<table${tableAttrs}>${colgroup}${inner}</table>`;
    }

    const firstRow = allRows[0];
    const bodyRows = allRows
      .slice(1)
      .map((r) =>
        r
          .replace(/<th\b/gi, "<td")
          .replace(/<\/th>/gi, "</td>")
          .replace(/\beditor-table-cell-header\b/g, "")
      )
      .join("");

    return `<table${tableAttrs}>${colgroup}<thead>${firstRow}</thead><tbody>${bodyRows}</tbody></table>`;
  });
}

export default normalizeTables;
