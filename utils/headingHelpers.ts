/**
 * Utilitários para processamento de headings em HTML
 * Consolidação de funções duplicadas em APIs
 */

/**
 * Padrão para detectar numeração de headings (ex: "1.2.3 - Título")
 * Captura grupos:
 * - [1]: número (ex: "1.2.3")
 * - [2]: texto após o separador
 */
export const headingPattern = /^([0-9]+(?:\.[0-9]+)*)(?:\s*[-–—:]\s*)?(.*)$/;

/**
 * Escapa caracteres especiais para uso em RegExp
 */
const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Adiciona ou mescla uma classe CSS em uma string de atributos HTML
 * 
 * @param attrs - String de atributos HTML existentes (ex: ' id="test" class="foo"')
 * @param className - Nome da classe a adicionar
 * @returns String de atributos com a classe mesclada
 * 
 * @example
 * mergeClassAttribute(' class="foo"', 'bar') 
 * // retorna ' class="foo bar"'
 * 
 * mergeClassAttribute(' id="x"', 'bar')
 * // retorna ' id="x" class="bar"'
 */
export const mergeClassAttribute = (attrs: string | undefined, className: string) => {
  if (!attrs || !attrs.trim()) {
    return ` class="${className}"`;
  }
  
  const attrString = attrs.trim();
  
  // Tenta match com aspas duplas
  const doubleMatch = attrString.match(/class="([^"]*)"/);
  if (doubleMatch) {
    const classes = doubleMatch[1].split(/\s+/).filter(Boolean);
    if (!classes.includes(className)) classes.push(className);
    return ` ${attrString.replace(doubleMatch[0], `class="${classes.join(" ")}"`)}`;
  }
  
  // Tenta match com aspas simples
  const singleMatch = attrString.match(/class='([^']*)'/);
  if (singleMatch) {
    const classes = singleMatch[1].split(/\s+/).filter(Boolean);
    if (!classes.includes(className)) classes.push(className);
    return ` ${attrString.replace(singleMatch[0], `class='${classes.join(" ")}'`)}`;
  }
  
  // Sem classe existente, adiciona nova
  return ` ${attrString} class="${className}"`;
};

/**
 * Processa headings HTML para adicionar classes e estrutura semântica
 * 
 * Comportamentos:
 * - Adiciona classe "doc-heading" a todos os headings
 * - Remove numeração do conteúdo (ex: "1.2 Título" → "<span>Título</span>")
 * - Ignora headings que já possuem "heading-number"
 * 
 * @param html - String HTML a processar
 * @returns HTML com headings processados
 * 
 * @example
 * enhanceHeadings('<h2>1.2 - Título</h2>')
 * // retorna '<h2 class="doc-heading"><span class="heading-text">Título</span></h2>'
 */
export const enhanceHeadings = (html: string) => {
  return html.replace(/<h([1-6])([^>]*)>([\s\S]*?)<\/h\1>/gi, (match, level, attrs, inner) => {
    // Ignora headings já processados
    if (inner.includes("heading-number")) return match;

    const textContent = inner.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (!textContent) return `<h${level}${attrs}>${inner}</h${level}>`;

    const numberMatch = textContent.match(headingPattern);
    
    // Sem numeração: apenas adiciona classe
    if (!numberMatch) {
      const mergedAttrs = mergeClassAttribute(attrs, "doc-heading");
      return `<h${level}${mergedAttrs}>${inner}</h${level}>`;
    }

    // Com numeração: extrai número e texto
    const [, rawNumber] = numberMatch;
    const cleanPattern = new RegExp(`^\\s*${escapeRegExp(rawNumber)}(?:\\s*[-–—:]\\s*)?`, "i");
    const cleanedInner = inner.replace(cleanPattern, "").trim();
    const titleSpan = cleanedInner ? `<span class="heading-text">${cleanedInner}</span>` : "";
    const mergedAttrs = mergeClassAttribute(attrs, "doc-heading");
    
    return `<h${level}${mergedAttrs}>${titleSpan}</h${level}>`;
  });
};
