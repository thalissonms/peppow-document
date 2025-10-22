import type { NextApiRequest, NextApiResponse } from "next";
import { promises as fs } from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import { DEFAULT_BRAND_CONFIG } from "@/lib/constants";
import { getCachedCustomizedCSS } from "@/lib/styleGenerator";

type DocumentMeta = {
  headerLabel: string;
  headerValue: string;
  validityMessage: string;
  title: string;
  description?: string;
};

type AIEnhancementOptions = {
  enabled: boolean;
  mode?: "grammar" | "clarity" | "professional" | "full";
  provider?: "gemini" | "openai" | "groq" | "ollama";
  apiKey?: string;
};

type BrandConfig = {
  logo: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
};

// Função para melhorar o HTML usando IA (Google Gemini ou OpenAI)
const enhanceDocumentWithAI = async (html: string, options: AIEnhancementOptions): Promise<string> => {
  if (!options.enabled || !options.apiKey) {
    return html;
  }

  try {
    const mode = options.mode || "full";
    const provider = options.provider || "gemini";
    
    const prompts = {
      grammar: "Corrija APENAS erros gramaticais e ortográficos no texto em português, mantendo TODO o HTML intacto (tags, atributos, classes, estrutura).",
      clarity: "Melhore a clareza e legibilidade do texto em português, tornando-o mais objetivo e direto. Mantenha TODO o HTML intacto.",
      professional: "Torne o texto em português mais profissional e formal, adequado para documentos corporativos. Mantenha TODO o HTML intacto.",
  full: `Você é um especialista em melhorar a APARÊNCIA VISUAL de documentos empresariais em português brasileiro.

⚠️ REGRA CRÍTICA: NUNCA ALTERE O CONTEÚDO DO TEXTO!
- NÃO corrija gramática
- NÃO mude palavras
- NÃO reescreva frases
- NÃO adicione ou remova informações
- APENAS melhore a ESTRUTURA VISUAL com Tailwind CSS

SUA ÚNICA TAREFA:
🎨 Melhorar a APARÊNCIA VISUAL e ORGANIZAÇÃO usando classes Tailwind CSS

SAÍDA É PARA PDF A4 (Padrão de impressão):
- Evite quebras de página no meio de componentes: adicione classes utilitárias no-break/avoid-break em tabelas, cards, blockquotes e listas importantes
- Não crie layouts muito largos: use largura fluida e espaçamentos consistentes; respeite margens para A4
- Imagens: mantenha responsivas (max-w-full h-auto) e evite quebra no meio (aplicar no-break quando apropriado)
- Tabelas: use thead com cabeçalho e aplicar classes no-break em linhas críticas quando couber
- Não use fontes externas além de Kanit; não use styles inline

O QUE VOCÊ PODE FAZER:
✅ Adicionar/modificar classes Tailwind CSS
✅ Reorganizar estrutura HTML (divs, seções)
✅ Criar componentes visuais (cards, badges, números circulares)
✅ Melhorar hierarquia de títulos (<h1>, <h2>, etc.)
✅ Estilizar listas (<ul>, <li> com bullets coloridos)
✅ Criar tabelas bonitas (<table> com cabeçalhos coloridos)
✅ Adicionar espaçamento e alinhamento
✅ Criar destaques visuais com cores do esquema

O QUE VOCÊ NÃO PODE FAZER:
❌ Alterar qualquer palavra do texto
❌ Corrigir erros de português
❌ Adicionar ou remover informações
❌ Mudar o significado de frases
❌ Reescrever conteúdo

REGRAS DE ESTRUTURA VISUAL (crie classes Tailwind CSS):
- Use <h1> a <h6> para hierarquia de títulos
- Use <strong> ou <b> para destaque em negrito
- Use <ul> e <li> para listas estilizadas
- Use <table>, <thead>, <tbody>, <tr>, <th>, <td> para dados tabulares
- Use <blockquote> ou divs estilizadas para citações importantes
- Use <p> para parágrafos bem espaçados
- CRIE componentes visuais: números circulares, cards, badges, etc.

PADRÃO DE CORES TAILWIND (OBRIGATÓRIO):
- Laranja: bg-[#ff5e2b], text-[#ff5e2b], bg-[rgba(255,94,43,0.2)], bg-[rgba(255,94,43,0.8)]
- Azul escuro: bg-[#152937], text-[#152937], border-[#152937]
- Azul claro: text-[#afcde1] (para textos em fundo escuro)
- Amarelo: bg-[#fff9d5], text-[#fff9d5]
- Branco suave: bg-[rgba(255,255,255,0.9)]

FONTE KANIT (OBRIGATÓRIO):
- font-['Kanit:Bold',_sans-serif]
- font-['Kanit:SemiBold',_sans-serif]
- font-['Kanit:Medium',_sans-serif]
- font-['Kanit:Regular',_sans-serif]
- font-['Kanit:Italic',_sans-serif]

COMPONENTES VISUAIS (exemplos):
- Seção com número: flex gap-[10px] items-center + número circular bg-[rgba(255,94,43,0.2)] rounded-[5px]
- Lista estilizada: space-y-[5px] + bullets laranjas
- Tabela profissional: bg-[rgba(255,94,43,0.8)] no thead, bg-[rgba(255,255,255,0.9)] no tbody
- Card de destaque: bg-[#152937] rounded-[10px] p-[15px] com texto text-[#fff9d5]
- Badge: bg-[rgba(21,76,113,0.25)] border-[#154c71] rounded-[5px] px-[10px] py-[5px]

NUNCA FAÇA ISSO:
❌ Use cores fora do esquema (laranja, azul, amarelo)
❌ Use fontes diferentes de Kanit
❌ Adicione estilos inline (style="...")
❌ ALTERE QUALQUER PALAVRA DO TEXTO ORIGINAL
❌ Corrija gramática ou ortografia
❌ Reescreva frases
❌ Adicione ou remova informações

PRESERVE 100%:
✅ TODO O TEXTO ORIGINAL (palavra por palavra)
✅ Atributos importantes (id, data-*, etc.)
✅ O significado e conteúdo exato

REGRA ESPECIAL SOBRE DUPLICAÇÃO DO TÍTULO/DESCRIÇÃO:
- O template final já possui cabeçalho com título e informações principais. Se o PRIMEIRO elemento do corpo for um título de página (ex.: H1/H2) que repete o título principal, você PODE removê-lo do corpo.
- Se houver logo abaixo uma linha de descrição que repete a validade/identificador do cabeçalho, você PODE removê-la do corpo.
- Fora esses casos, NÃO remova nenhum outro conteúdo.

UTILITÁRIOS QUE VOCÊ PODE ADICIONAR:
- no-break, avoid-break, page-break-avoid (para evitar quebras internas)
- classes de listas, cards, tabelas e imagens responsivas (ex.: max-w-full h-auto)
`,
    };

    // Extrai texto para validação
    const textContent = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (!textContent || textContent.length < 10) {
      console.warn("Conteúdo muito curto para melhoria");
      return html;
    }

    let enhancedHtml: string | undefined;

    // ====== GOOGLE GEMINI (GRÁTIS - PADRÃO) ======
    if (provider === "gemini") {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${options.apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `Você é um assistente especializado em melhorar documentos empresariais em português brasileiro.

INSTRUÇÃO: ${prompts[mode]}

PADRÃO VISUAL DO DOCUMENTO (Tailwind CSS):
Você PODE e DEVE criar novas classes Tailwind CSS seguindo este padrão:

✅ CORES DISPONÍVEIS:
- Laranja: bg-[#ff5e2b], text-[#ff5e2b], bg-[rgba(255,94,43,0.2)], bg-[rgba(255,94,43,0.8)]
- Azul escuro: bg-[#152937], text-[#152937], text-[#afcde1] (texto claro em fundo escuro)
- Amarelo: bg-[#fff9d5], text-[#fff9d5]
- Branco suave: bg-[rgba(255,255,255,0.9)]

✅ FONTE KANIT (obrigatória):
- font-['Kanit:Bold',_sans-serif]
- font-['Kanit:SemiBold',_sans-serif]
- font-['Kanit:Medium',_sans-serif]
- font-['Kanit:Regular',_sans-serif]
- font-['Kanit:Italic',_sans-serif]

✅ COMPONENTES VISUAIS (CRIE conforme necessário):

Seção com número circular:
<div class="flex gap-[10px] items-center mb-[20px]">
  <div class="relative size-[38px]">
    <div class="bg-[rgba(255,94,43,0.2)] rounded-[5px] size-full border-[0.5px] border-[#ff5e2b]"></div>
    <div class="absolute inset-0 flex items-center justify-center font-['Kanit:Bold',sans-serif] text-[22px] text-[#ff5e2b]">1</div>
  </div>
  <h2 class="font-['Kanit:Bold',sans-serif] text-[26px] text-[#ff5e2b]">Título</h2>
</div>

Lista estilizada:
<ul class="space-y-[5px]">
  <li class="flex gap-[5px]">
    <span class="text-[#ff5e2b]">•</span>
    <span class="font-['Kanit:Regular',sans-serif] text-[12px] text-[#152937]">
      <strong class="font-['Kanit:Medium',sans-serif]">Item:</strong> Descrição
    </span>
  </li>
</ul>

Tabela profissional:
<table class="w-full border-collapse">
  <thead>
    <tr class="bg-[rgba(255,94,43,0.8)]">
      <th class="px-[15px] py-[10px] font-['Kanit:SemiBold',sans-serif] text-[#fff9d5]">Coluna</th>
    </tr>
  </thead>
  <tbody>
    <tr class="bg-[rgba(255,255,255,0.9)]">
      <td class="px-[15px] py-[10px] font-['Kanit:Regular',sans-serif] text-[14px]">Dado</td>
    </tr>
  </tbody>
</table>

Card de destaque:
<div class="bg-[#152937] rounded-[10px] p-[15px]">
  <p class="font-['Kanit:SemiBold',sans-serif] text-[#afcde1] text-[14px]">Título:</p>
  <p class="font-['Kanit:Regular',sans-serif] text-[#fff9d5] text-[14px]">Conteúdo</p>
</div>

Badge/Tag:
<div class="inline-flex bg-[rgba(21,76,113,0.25)] border border-[#154c71] rounded-[5px] px-[10px] py-[5px]">
  <span class="font-['Kanit:SemiBold',sans-serif] text-[#154c71] text-[14px]">Tag</span>
</div>

REGRAS CRÍTICAS:
1. ⚠️ NUNCA ALTERE O TEXTO - Mantenha TODO o conteúdo original palavra por palavra
2. 🎨 APENAS melhore VISUAL - Adicione classes Tailwind CSS e reorganize estrutura
3. 🎨 Use APENAS cores do esquema (laranja, azul, amarelo)
4. 🎨 Use APENAS fonte Kanit
5. 🎨 CRIE componentes visuais bonitos (cards, badges, números circulares)
6. 🎨 Organize em seções com hierarquia clara
7. ❌ NÃO use estilos inline (style="...")
8. 📤 Retorne APENAS o HTML (sem \`\`\`html ou explicações)

HTML ORIGINAL:
${html}`,
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 8000,
              topP: 0.95,
              topK: 40,
            },
            safetySettings: [
              { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
              { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
              { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
              { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
            ],
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Erro Gemini:", response.status, errorData);
        return html;
      }

      const data = await response.json();
      enhancedHtml = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    }

    // ====== OPENAI ======
    else if (provider === "openai") {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${options.apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: `Você é um assistente especializado em melhorar documentos em português. ${prompts[mode]} Retorne APENAS o HTML melhorado, sem explicações.`,
            },
            { role: "user", content: html },
          ],
          temperature: 0.3,
          max_tokens: 4000,
        }),
      });

      if (!response.ok) {
        console.error("Erro OpenAI:", response.status);
        return html;
      }

      const data = await response.json();
      enhancedHtml = data.choices?.[0]?.message?.content?.trim();
    }

    // ====== GROQ ======
    else if (provider === "groq") {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${options.apiKey}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            {
              role: "system",
              content: `Você é um assistente especializado em melhorar documentos em português. ${prompts[mode]} Retorne APENAS o HTML melhorado, sem explicações.`,
            },
            { role: "user", content: html },
          ],
          temperature: 0.3,
          max_tokens: 4000,
        }),
      });

      if (!response.ok) {
        console.error("Erro Groq:", response.status);
        return html;
      }

      const data = await response.json();
      enhancedHtml = data.choices?.[0]?.message?.content?.trim();
    }

    // ====== OLLAMA (LOCAL) ======
    else if (provider === "ollama") {
      const response = await fetch("http://localhost:11434/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "llama3.2:3b",
          prompt: `Você é um especialista em melhorar documentos em português. ${prompts[mode]}

HTML original:
${html}

HTML melhorado:`,
          stream: false,
          options: {
            temperature: 0.3,
            num_predict: 4000,
          },
        }),
      });

      if (!response.ok) {
        console.error("Erro Ollama:", response.status);
        return html;
      }

      const data = await response.json();
      enhancedHtml = data.response?.trim();
    }

    // Validação da resposta
    if (!enhancedHtml || enhancedHtml.length < html.length * 0.3) {
      console.warn(
        `Resposta inválida do ${provider}, usando HTML original. Tamanho: ${enhancedHtml?.length || 0} vs ${html.length}`
      );
      return html;
    }

    // Limpar possíveis marcadores de código
    const cleaned = enhancedHtml
      .replace(/^```html\n?/gi, "")
      .replace(/^```\n?/gi, "")
      .replace(/\n?```$/gi, "")
      .trim();

    console.log(`[${provider.toUpperCase()}] Documento melhorado: ${html.length} → ${cleaned.length} chars`);

    return cleaned;
  } catch (error) {
    console.error("Erro ao melhorar documento com IA:", error);
    return html;
  }
};

// Helpers para normalizar headings (equivalente ao tratamento feito no fluxo DOCX)
const headingPattern = /^([0-9]+(?:\.[0-9]+)*)(?:\s*[-–—:]\s*)?(.*)$/;
const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const mergeClassAttribute = (attrs: string | undefined, className: string) => {
  if (!attrs || !attrs.trim()) {
    return ` class="${className}"`;
  }
  const attrString = attrs.trim();
  const doubleMatch = attrString.match(/class="([^"]*)"/);
  if (doubleMatch) {
    const classes = doubleMatch[1].split(/\s+/).filter(Boolean);
    if (!classes.includes(className)) classes.push(className);
    return ` ${attrString.replace(doubleMatch[0], `class="${classes.join(" ")}"`)}`;
  }
  const singleMatch = attrString.match(/class='([^']*)'/);
  if (singleMatch) {
    const classes = singleMatch[1].split(/\s+/).filter(Boolean);
    if (!classes.includes(className)) classes.push(className);
    return ` ${attrString.replace(singleMatch[0], `class='${classes.join(" ")}'`)}`;
  }
  return ` ${attrString} class="${className}"`;
};

const enhanceHeadings = (html: string) => {
  return html.replace(/<h([1-6])([^>]*)>([\s\S]*?)<\/h\1>/gi, (match, level, attrs, inner) => {
    if (inner.includes("heading-number")) return match;

    const textContent = inner.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (!textContent) return `<h${level}${attrs}>${inner}</h${level}>`;

    const numberMatch = textContent.match(headingPattern);
    if (!numberMatch) {
      const mergedAttrs = mergeClassAttribute(attrs, "doc-heading");
      return `<h${level}${mergedAttrs}>${inner}</h${level}>`;
    }

    const [, rawNumber] = numberMatch;
    const cleanPattern = new RegExp(`^\\s*${escapeRegExp(rawNumber)}(?:\\s*[-–—:]\\s*)?`, "i");
    const cleanedInner = inner.replace(cleanPattern, "").trim();
    const titleSpan = cleanedInner ? `<span class="heading-text">${cleanedInner}</span>` : "";
    const mergedAttrs = mergeClassAttribute(attrs, "doc-heading");
    return `<h${level}${mergedAttrs}>${titleSpan}</h${level}>`;
  });
};

// Garante mapeamentos equivalentes ao styleMap do fluxo DOCX
const ensureFirstTagClass = (html: string, tag: string, className: string) => {
  let applied = false;
  const re = new RegExp(`<${tag}([^>]*)>`, "i");
  return html.replace(re, (match, attrs) => {
    if (applied) return match;
    // já tem a classe?
    if (attrs && /class=["']([^"']*)["']/.test(attrs)) {
      const existing = (attrs.match(/class=["']([^"']*)["']/) || ["", ""])[1]
        .split(/\s+/)
        .filter(Boolean);
      if (existing.includes(className)) return match;
    }
    applied = true;
    const merged = mergeClassAttribute(attrs, className);
    return `<${tag}${merged}>`;
  });
};

const ensurePreCodeClass = (html: string) => {
  return html.replace(/<pre([^>]*)>/gi, (match, attrs) => {
    // se já tem class="... code ..." mantém
    if (attrs && /class=["']([^"']*)["']/.test(attrs)) {
      const cls = (attrs.match(/class=["']([^"']*)["']/) || ["", ""])[1];
      if (cls.split(/\s+/).includes("code")) return match;
    }
    const merged = mergeClassAttribute(attrs, "code");
    return `<pre${merged}>`;
  });
};

const buildDocumentHtml = async (
  docHtml: string,
  meta: DocumentMeta,
  layout: "padrao" | "a4" | "apresentacao" = "a4",
  brand: BrandConfig = DEFAULT_BRAND_CONFIG
) => {
  const templateDir = path.join(process.cwd(), "public", "templates", "document");

  const [template, logoBase64] = await Promise.all([
    fs.readFile(path.join(templateDir, "index.html"), "utf-8"),
    fs.readFile(path.join(templateDir, "assets", "logo.png"), { encoding: "base64" }),
  ]);

  const timestamp = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date());

  // Obtém o CSS customizado com cache (inclui cores da marca e assets inline)
  const customizedCSS = await getCachedCustomizedCSS(brand);

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
  const inlineStyles = `<style>${customizedCSS}</style>${padraoOverrides}`;
  const templateWithStyles = template.replace("</head>", `${inlineStyles}</head>`);

  const templateWithMeta = templateWithStyles
    .replace(/{{HEADER_LABEL}}/g, meta.headerLabel)
    .replace(/{{HEADER_VALUE}}/g, meta.headerValue)
    .replace(/{{VALIDITY_MESSAGE}}/g, meta.validityMessage)
    .replace(/{{GENERATED_AT}}/g, timestamp)
    .replace(/{{TITLE}}/g, meta.title || "Documento")
    .replace(/{{DESCRIPTION}}/g, meta.description || "");

  const selectedLogo = brand.logo && brand.logo.startsWith("data:")
    ? brand.logo
    : `data:image/png;base64,${logoBase64}`;
  const withLogo = templateWithMeta.replace(/{{LOGO_SRC}}/g, selectedLogo);

  // Injeta o conteúdo do documento
  return withLogo.replace("{{CONTENT}}", docHtml);
};

// Remove estilos inline das tabelas que podem conflitar com o tema
const stripTableInlineStyles = (content: string): string => {
  return content
    .replace(/<(table|thead|tbody|tr|th|td)([^>]*?)\sstyle\s*=\s*(["'])(.*?)\3([^>]*)>/gi, "<$1$2$5>")
    .replace(/<(table|thead|tbody|tr|th|td)([^>]*?)\sstyle\s*=\s*([^\s>]+)([^>]*)>/gi, "<$1$2$4>");
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Método não suportado." });
    return;
  }

  try {
    const { html, meta, aiEnhancement, pdfLayout, brandConfig } = req.body as {
      html?: string;
      meta?: Partial<DocumentMeta>;
      aiEnhancement?: Partial<AIEnhancementOptions>;
      pdfLayout?: "padrao" | "a4" | "apresentacao";
      brandConfig?: Partial<BrandConfig>;
    };
    const safeBrand: BrandConfig = {
      logo: brandConfig?.logo ?? DEFAULT_BRAND_CONFIG.logo,
      primaryColor: brandConfig?.primaryColor ?? DEFAULT_BRAND_CONFIG.primaryColor,
      secondaryColor: brandConfig?.secondaryColor ?? DEFAULT_BRAND_CONFIG.secondaryColor,
      accentColor: brandConfig?.accentColor ?? DEFAULT_BRAND_CONFIG.accentColor,
      backgroundColor: brandConfig?.backgroundColor ?? DEFAULT_BRAND_CONFIG.backgroundColor,
    };
    
    if (!html) {
      res.status(400).json({ error: "HTML é obrigatório." });
      return;
    }

    const safeMeta: DocumentMeta = {
      headerLabel: meta?.headerLabel ?? "ID",
      headerValue: meta?.headerValue ?? "—",
      validityMessage: meta?.validityMessage ?? "",
      title: meta?.title ?? "Documento",
      description: meta?.description ?? "",
    };

    const aiOptions: AIEnhancementOptions = {
      enabled: aiEnhancement?.enabled ?? false,
      provider: aiEnhancement?.provider ?? "gemini", // Gemini grátis como padrão
      mode: aiEnhancement?.mode ?? "full",
      apiKey: aiEnhancement?.apiKey ?? process.env.GEMINI_API_KEY ?? process.env.OPENAI_API_KEY,
    };

    // Aplica melhoria com IA se habilitado
    let processedHtml = html;
    if (aiOptions.enabled) {
      console.log("Melhorando documento com IA...");
      processedHtml = await enhanceDocumentWithAI(html, aiOptions);
    }

  // Remove estilos inline específicos de tabela para padronizar visual
  const withoutInlineTableStyles = stripTableInlineStyles(processedHtml);
  let normalizedHtml = enhanceHeadings(withoutInlineTableStyles);
    // Equivalentes ao styleMap do fluxo DOCX
    normalizedHtml = ensureFirstTagClass(normalizedHtml, 'h1', 'doc-title');
    normalizedHtml = ensureFirstTagClass(normalizedHtml, 'h2', 'subtitle');
    normalizedHtml = ensurePreCodeClass(normalizedHtml);
  const documentHtml = await buildDocumentHtml(normalizedHtml, safeMeta, pdfLayout ?? "a4", safeBrand);

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

    // Seleção de layout
    const layout = pdfLayout ?? "padrao";
  let pdfBuffer: Uint8Array;
    if (layout === "a4") {
      pdfBuffer = await page.pdf({
        format: "A4",
        margin: { top: "10mm", bottom: "10mm", left: "0mm", right: "0mm" },
        printBackground: true,
        preferCSSPageSize: true,
      });
    } else if (layout === "apresentacao") {
      // Tamanho widescreen 16:9 típico do PowerPoint: 13.333in x 7.5in
      pdfBuffer = await page.pdf({
        width: "13.333in",
        height: "7.5in",
        printBackground: true,
        preferCSSPageSize: true,
        margin: { top: "0.3in", bottom: "0.3in", left: "0.3in", right: "0.3in" },
      });
    } else {
      // "padrao": sem paginação (uma página longa). Calcula a altura total do documento em px e converte para mm.
      const totalHeightPx = await page.evaluate(() => {
        const body = document.body;
        const html = document.documentElement;
        const main = document.querySelector(".document-main") as HTMLElement | null;
        if (main) {
          main.style.marginLeft = "4rem";
          main.style.marginRight = "4rem";
        }
        return Math.max(
          body.scrollHeight,
          body.offsetHeight,
          html.clientHeight,
          html.scrollHeight,
          html.offsetHeight
        );
      });
      const inches = Math.max(totalHeightPx / 96, 11);
      const heightMm = inches * 25.5;
      pdfBuffer = await page.pdf({
        width: "1140px",
        height: `${heightMm}mm`,
        printBackground: true,
        preferCSSPageSize: true,
        margin: { top: "0mm", bottom: "0mm", left: "0mm", right: "0mm" },
      });
    }
    await browser.close();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'inline; filename="documento-padronizado.pdf"');
    res.status(200).end(pdfBuffer);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao gerar o PDF.";
    res.status(400).json({ error: message });
  }
}
