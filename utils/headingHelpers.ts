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
 * Processa headings HTML para adicionar classes, estrutura semântica e numeração automática
 * 
 * Comportamentos:
 * - Adiciona classe "doc-heading" a todos os headings
 * - Gera numeração crescente automática (1, 1.1, 1.2, etc.) baseada no nível
 * - Remove numeração existente do conteúdo (ex: "1.2 Título" → "<span>Título</span>")
 * - Ignora headings que já possuem "heading-number"
 * 
 * @param html - String HTML a processar
 * @returns HTML com headings processados e numeração corrida
 * 
 * @example
 * enhanceHeadings('<h1>Introdução</h1><h2>1.2 - Conceitos</h2><h2>1.3 - Definições</h2>')
 * // retorna com números: 1, 2, 3 para H1 e 1, 1, 2 para H2 (corrigido automaticamente)
 */
export const enhanceHeadings = (html: string) => {
  // Rastreadores de contadores por nível
  const counters = [0, 0, 0, 0, 0, 0]; // h1, h2, h3, h4, h5, h6

  return html.replace(/<h([1-6])([^>]*)>([\s\S]*?)<\/h\1>/gi, (match, levelStr, attrs, inner) => {
    const level = parseInt(levelStr, 10); // 1-6
    const levelIndex = level - 1; // 0-5

    // Ignora headings já processados
    if (inner.includes("heading-number")) return match;

    const textContent = inner.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (!textContent) return `<h${level}${attrs}>${inner}</h${level}>`;

    // Incrementa counter do nível atual
    counters[levelIndex]++;

    // Reset de contadores de níveis mais profundos
    for (let i = levelIndex + 1; i < 6; i++) {
      counters[i] = 0;
    }

    // Gera número hierárquico (ex: 1.2.3)
    const numberParts = counters.slice(0, level).map(String);
    const generatedNumber = numberParts.join(".");

    // Extrai conteúdo do heading, removendo número antigo se existir
    const numberMatch = textContent.match(headingPattern);
    let cleanedInner = inner;

    if (numberMatch) {
      // Se encontrou número antigo, remove dele
      const [, rawNumber] = numberMatch;
      const cleanPattern = new RegExp(`^\\s*${escapeRegExp(rawNumber)}(?:\\s*[-–—:]\\s*)?`, "i");
      cleanedInner = inner.replace(cleanPattern, "").trim();
    }

    // Cria o heading com número circular e texto
    const titleSpan = cleanedInner ? `<span class="heading-text">${cleanedInner}</span>` : "";
    const numberSpan = `<span class="heading-number">${generatedNumber}</span>`;
    const mergedAttrs = mergeClassAttribute(attrs, "doc-heading");

    return `<h${level}${mergedAttrs}>${numberSpan}${titleSpan}</h${level}>`;
  });
};
