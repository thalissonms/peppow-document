import type { NextApiRequest, NextApiResponse } from "next";
import { promises as fs } from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import { DEFAULT_BRAND_CONFIG } from "@/lib/constants";
import { normalizeTables } from "@/utils/normalizeTables";
import { applyLogoContainer } from "@/utils/template";
import { BrandConfig } from "@/types/ui";
import { getCachedCustomizedCSS } from "@/lib/styleGenerator";
import { enhanceHeadings, mergeClassAttribute } from "@/utils/headingHelpers";

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

// Usa BrandConfig tipado com textColor e borderColor

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
<div class="flex gap-2.5 items-center mb-5">
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
  <th class="px-[15px] py-2.5 font-['Kanit:SemiBold',sans-serif] text-[#fff9d5]">Coluna</th>
    </tr>
  </thead>
  <tbody>
    <tr class="bg-[rgba(255,255,255,0.9)]">
  <td class="px-[15px] py-2.5 font-['Kanit:Regular',sans-serif] text-[14px]">Dado</td>
    </tr>
  </tbody>
</table>

Card de destaque:
<div class="bg-[#152937] rounded-[10px] p-[15px]">
  <p class="font-['Kanit:SemiBold',sans-serif] text-[#afcde1] text-[14px]">Título:</p>
  <p class="font-['Kanit:Regular',sans-serif] text-[#fff9d5] text-[14px]">Conteúdo</p>
</div>

Badge/Tag:
<div class="inline-flex bg-[rgba(21,76,113,0.25)] border border-[#154c71] rounded-[5px] px-2.5 py-[5px]">
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

  // Logo padrão é o SVG inline do template; só substituímos se brand.logo existir
  const template = await fs.readFile(path.join(templateDir, "index.html"), "utf-8");

  const timestamp = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date());

  // Obtém o CSS customizado com cache (inclui cores da marca e assets inline)
  const customizedCSS = await getCachedCustomizedCSS(brand);

  // CSS adicional para layout padrão (sem paginação) e A4
  const padraoOverrides = layout === "padrao" ? `
    <style id="pdf-overrides-padrao">
      /* MODO SEM PAGINAÇÃO - PÁGINA ÚNICA CONTÍNUA */
      @page { 
        size: auto; 
        margin: 0 !important; 
      }
      html, body.doc {
        margin: 0 !important;
        padding: 0 !important;
        overflow: visible !important;
        height: auto !important;
      }
      .doc .main-container { 
        min-height: auto !important;
        height: auto !important;
        overflow: visible !important;
      }
      .doc .document-main { 
        padding: 40px 64px 80px 64px !important;
        margin: 0 !important;
      }
      .doc #content, .doc #content * {
        page-break-before: avoid !important;
        page-break-after: avoid !important;
        page-break-inside: avoid !important;
        break-before: avoid !important;
        break-after: avoid !important;
        break-inside: avoid !important;
      }
      /* Footer fixo inline no final */
      .pdf-fixed-footer {
        position: relative !important;
        margin-top: 40px !important;
      }
    </style>
  ` : `
    <style id="pdf-overrides-a4">
      /* MODO A4 - PAGINAÇÃO PADRÃO */
      @page {
        size: A4;
        margin: 0;
      }

      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }

      html,
      body.doc {
        margin: 0 !important;
        padding: 0 !important;
        background: ${brand.backgroundColor} !important;
      }

      body.doc {
        position: relative !important;
      }

      .doc .main-container {
        background: ${brand.backgroundColor} !important;
        margin: 0 !important;
        padding: 0 !important;
      }

      .doc .proposal-header {
        margin-top: 0 !important;
        margin-bottom: 40px !important;
        background: ${brand.secondaryColor} !important;
        border-color: ${brand.accentColor} !important;
      }

      .doc .document-main {
        background: ${brand.backgroundColor} !important;
        padding: 40px 64px 80px 64px !important;
        margin: 0 !important;
      }

      .doc #content > *:first-child {
        margin-top: 0 !important;
      }

      .doc #content h1,
      .doc #content h2,
      .doc #content h3,
      .doc #content h4,
      .doc #content h5,
      .doc #content h6 {
        page-break-after: avoid !important;
        break-after: avoid !important;
        margin-top: 40px !important;
        margin-bottom: 20px !important;
        orphans: 3;
        widows: 3;
      }

      .doc #content p {
        orphans: 3;
        widows: 3;
        margin-top: 0;
        margin-bottom: 16px;
      }

      .doc #content ul,
      .doc #content ol,
      .doc #content table,
      .doc #content blockquote {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
        margin-top: 16px;
        margin-bottom: 16px;
      }

      .doc #content table {
        page-break-before: auto !important;
        page-break-after: auto !important;
      }
    </style>
  `;
  const logoVars = `<style id="brand-logo-vars">.doc{${
    typeof brand.logoHeight === 'number' ? `--logo-height:${brand.logoHeight}px;` : ''
  }${
    typeof brand.logoMaxWidth === 'number' ? `--logo-max-width:${brand.logoMaxWidth}px;` : ''
  }}</style>`;
  // Estilos do footer fixo sem faixa branca
  const fixedFooterStyles = layout === "padrao" ? `
    <style id="fixed-footer-styles">
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
    </style>` : "";
  const inlineStyles = `<style>${customizedCSS}</style>${logoVars}${padraoOverrides}${fixedFooterStyles}`;
  const templateWithStyles = template.replace("</head>", `${inlineStyles}</head>`);

  const templateWithMeta = templateWithStyles
    .replace(/{{HEADER_LABEL}}/g, meta.headerLabel)
    .replace(/{{HEADER_VALUE}}/g, meta.headerValue)
    .replace(/{{VALIDITY_MESSAGE}}/g, meta.validityMessage)
    .replace(/{{GENERATED_AT}}/g, timestamp)
    .replace(/{{TITLE}}/g, meta.title || "Documento")
    .replace(/{{DESCRIPTION}}/g, meta.description || "");

  // Aplica logo do usuário (se houver), mantendo o SVG padrão quando não houver
  const templateWithLogo = applyLogoContainer(templateWithMeta, brand.logo);

  // Footer fixo inline (sem usar header/footer nativo do PDF)
  const footerHtml = layout === "padrao" ? `
    <div class="pdf-fixed-footer">
      <svg width="127" height="34" xmlns="http://www.w3.org/2000/svg"><defs><clipPath id="clip0_2675_4202"><path fill="white" id="svg_1" d="M0 0h126.29v34H0z"/></clipPath></defs><g class="layer"><title>Layer 1</title><g clip-path="url(#clip0_2675_4202)" id="svg_2"><path d="M52.6 7.26c-2.38 0-3.85 1.81-4.08 4.22v6.97c.26 3.61 2.34 5.04 4.49 5.04 2.65 0 4.5-1.99 4.5-7.87 0-6.03-1.74-8.36-4.91-8.36m.49 16.8c-1.81 0-3.4-.49-4.57-1.28v7.12c0 2.07.18 2.9 1.55 3.24v.56h-7.06v-.56c1.43-.42 1.51-1.32 1.51-3.24V9.89c0-1.31-.34-1.65-1.89-2.07v-.56l5.88-1.28v2.98c1.17-2.11 3.82-2.98 5.67-2.98 4.64 0 7.96 3.62 7.96 9.19 0 5.95-3.89 8.89-9.06 8.89" fill="rgba(21,41,55,0.15)" id="svg_3"/><path d="M38.96 15c0 1.37-.46 2.7-1.31 3.78a6.11 6.11 0 0 1-3.37 2.17c-1.33.32-2.73.19-3.98-.37a6.093 6.093 0 0 1-2.91-2.76 6.17 6.17 0 0 1-.58-3.96 6.147 6.147 0 0 1 5.72-4.96c1.37-.06 2.72.33 3.84 1.12l-8.23 4.44 1.59 2.93 11.71-6.32a9.423 9.423 0 0 0-4.83-4.72 9.468 9.468 0 0 0-6.77-.29 9.387 9.387 0 0 0-5.22 4.29 9.355 9.355 0 0 0-1.02 6.67 9.46 9.46 0 0 0 10.26 7.37 9.498 9.498 0 0 0 6.03-3.08A9.462 9.462 0 0 0 42.3 15h-3.34z" fill="rgba(21,41,55,0.15)" id="svg_4"/><path d="M14.65 18.14c-.13.78-.34 1.54-.62 2.28-.42 1.11-1.39 3-3.16 3.18-.09.01-.18.01-.26.02 0 0-.51 0-.73-.22-.26-.25-.13-.8-.13-.8.13-.57.55-1.79 1.92-3.5.49-.6 1.01-1.17 1.58-1.71l1.84-1.75-.44 2.5zm7.7-6.98c-.13-.92-.42-1.16-.75-1.11-1.2.16-2.38.46-3.52.89l-.82.31-.27-.84c-.43-1.32-1.03-2.4-1.77-3.21-1.36-1.48-3.17-2-5.09-1.47-2.09.59-4 2.46-5.67 5.58l-1.58 2.93V5.85c0-.26-.51-.43-1.43-.43-.92 0-1.43.24-1.43.43v27.73c0 .19.41.42 1.33.42.93 0 1.55-.16 1.55-.42v-5.64c-.02-8.14 3.27-18.12 8-19.44.9-.24 1.56-.05 2.19.64.59.65 1.08 1.67 1.39 2.97l.14.57-.48.32c-3.4 2.3-5.62 5.21-6.55 7.17-1.23 2.58-.78 4.11-.19 4.95.51.73 1.59 1.55 3.78 1.34 2.44-.25 4.41-2.03 5.55-5.01.73-1.91 1.07-4.28.99-6.66l-.02-.56.51-.23c1.14-.53 2.35-.89 3.6-1.08.45-.07.68-.85.55-1.76" fill="rgba(21,41,55,0.15)" id="svg_5"/><path d="M67.34 20.62c0 .02 0 .04.01.06.01.01.02.03.03.04.63.66 1.39 1.19 2.23 1.54.85.36 1.75.54 2.67.53 4.02 0 5.88-2.97 5.88-6.88 0-4.19-2.24-8.8-6.72-8.8-.78-.02-1.55.14-2.25.47-.71.33-1.33.81-1.81 1.41-.01.02-.02.03-.03.05-.01.02-.01.04-.01.06v11.52zM64.02 5.96c0-.11.07-.14.18-.14h3.01c.1 0 .14.03.14.14v1.25c-.01.03 0 .06.01.08.02.03.04.05.07.06.03.01.06.02.09.01s.05-.03.07-.05c1.58-1.22 3.64-1.5 5.6-1.5 4.86.28 8.36 3.98 8.36 9.11 0 5.31-3.7 9.04-9.09 9.04-1.72 0-3.4-.47-4.87-1.36-.1-.11-.24 0-.24.14v10.75c0 .11-.04.18-.14.18H64.2c-.03 0-.05 0-.08-.01a.21.21 0 0 1-.06-.04c-.01-.01-.03-.04-.03-.06-.01-.02-.02-.04-.01-.07V5.96z" fill="rgba(21,41,55,0.15)" id="svg_6"/><path d="M93.82 6.43c-.73 0-1.45.13-2.13.39-.64.24-1.22.62-1.69 1.11a7.66 7.66 0 0 0-1.27 1.86c-.37.76-.64 1.56-.8 2.39-.18.94-.27 1.89-.27 2.85-.01 1.17.13 2.34.43 3.48.24.96.66 1.88 1.22 2.7a5.44 5.44 0 0 0 1.9 1.73c.89.46 1.89.66 2.89.58 1.01-.08 1.96-.44 2.77-1.03.91-.7 1.61-1.7 2.09-3 .48-1.3.72-2.84.73-4.63.01-1.09-.13-2.18-.4-3.24-.23-.94-.62-1.83-1.14-2.64a5.944 5.944 0 0 0-1.81-1.79 4.86 4.86 0 0 0-1.2-.56c-.43-.13-.87-.2-1.32-.2zm-.32-.45c1.52-.01 3.03.25 4.45.78 1.32.5 2.52 1.27 3.52 2.26.81.82 1.47 1.77 1.93 2.83.55 1.23.78 2.58.65 3.93a7.846 7.846 0 0 1-1.35 3.75 9.794 9.794 0 0 1-3.76 3.26c-1.62.81-3.4 1.22-5.21 1.2-1.39.01-2.77-.22-4.07-.68-1.24-.43-2.38-1.08-3.37-1.92-.95-.8-1.73-1.79-2.27-2.91A7.776 7.776 0 0 1 83.2 15c0-1.6.49-3.17 1.41-4.49.95-1.4 2.24-2.54 3.76-3.3 1.58-.82 3.34-1.24 5.12-1.22" fill="rgba(21,41,55,0.15)" id="svg_7"/><path d="M126.1 4.52c0 .03-.04 0-.07.03 0-.03.03-.03.07-.03zm-.38-1.32c0 .03-.04.03-.04.07-.14 0 0-.18.04-.07zm-.07 3.79c-.07-.04 0-.07 0-.11.07 0 0 .04 0 .11zm-.04-3.97c-.07 0-.07-.07-.07-.1.04 0 .07.03.07.1zm.42 3.38c.01.52-.11 1.03-.35 1.49-.07.21 0 .52-.21.59.25-.8.25-1.61.63-2.43.14 0-.04.24-.07.35m-.73.42c0 .07-.07.14.03.21-.03-.07.04-.21-.03-.21zm0 .32c.03.06-.11.27.03.27 0-.14.04-.24-.03-.27zm-.07-2.47v-.11h-.1c0 .04.04.07.04.11h.06zm-.04-.74c-.07.07-.14.38.07.42-.1-.14 0-.28-.07-.42zm-.03 2.64h-.07v.07h.07v-.07zm-.03-5.32c-.07.03-.03.14.07.14 0-.11 0-.14-.07-.14zm-.03 5.84c.03.1-.04.1-.07.24.1 0 .21-.27.07-.24zm.03-5.18c-.14-.1 0-.28-.14-.28-.07.25.07.42-.03.59.09-.08.16-.19.18-.31m.03 6.64c-.07.24-.24.36-.2.59.17-.07.31-.45.2-.59zm-.22-1.46c-.03.04-.1.24 0 .24 0-.1.18-.24 0-.24zm0 .66c-.03.07-.14.21-.03.24.07-.03.1-.24.03-.24zm-.1-2.08c.03 0 .07.03.07 0 0-.04-.07-.07-.07 0zm.03 1.73h-.07v.07h.07V7.4zm-.03-5.21c-.07 0-.07-.03-.04-.07.04 0 .04 0 .04.07zm-.11.69c.04-.03.07 0 .07-.03-.03 0-.07 0-.07.03zm0-.13c.04 0 .07.03.07 0 0-.04-.07-.07-.07 0zm-.03 4.9c.03 0 .07.03.07 0 0-.04-.07-.07-.07 0zm-.38 1.53c0 .05-.01.1-.04.14.1 0 .14-.14.04-.14zm-.07-1.57c-.04 0-.07.14 0 .18.03-.03.07-.18 0-.18zm-.18-2.68c-.04-.03-.07-.06-.07-.1.03 0 .07.04.07.1zm-.04 2.5c0-.07 0-.1-.07-.07 0 .02 0 .04.01.06.01.02.02.03.03.05 0-.04 0-.07.03-.04zm-.03-2.71c0 .04-.04 0-.07.04 0-.04.03-.04.07-.04zm.07.31c0 .07-.11.11-.07.21-.14-.03-.04-.21-.07-.21.03-.1.07.04.14 0zm-.11 5.43h-.06v-.14h.06v.14zm-.06-5c0-.07 0-.11.03-.11 0 .02 0 .04-.01.06 0 .02-.01.03-.02.05zm.03.07c0 .1-.14-.11-.03-.07 0 0 0 .07.03.07zm.1 4.45h.07c0 .17-.1.27-.17.17 0 .28-.39.73-.18.84.1-.11 0-.21.07-.28.07.07.1.04.14.07.03.1-.21.24-.04.31.24-.24 0-.55.21-.73 0-.1-.07-.14 0-.24.18-.11.14-.38.21-.56.02-.02.05-.04.08-.04.04-.01.07-.01.1.01.03-.21.31-.56.07-.66.1-.14.18-.59.36-.42.07-.24.21-.42.27-.66.07 0-.03.07.07.1.11-.2-.03-.24 0-.41-.27.1-.24.59-.45.8-.07-.14.14-.25-.03-.25-.11.14-.07.52-.28.52-.04.11.18.14 0 .28-.04-.03 0-.1-.11-.07-.03.38-.07.84-.31 1.15.04-.14.06-.28.07-.42-.14.04-.18.35-.14.49.03.14-.11 0 0 0m-.35-2.85c0 .1-.03.18.11.18.03-.11 0-.21-.11-.18zm-.07-1.05v-.07h.01c.01 0 .01 0 .02-.01v-.01c.01 0 .01-.01.01-.01.07-.04.07.14-.04.1zm-.21.77c-.03-.04-.14-.04-.1-.11.07-.03.1 0 .1.11zm-.21.62h-.07V7.4h.07v.07zm-.18 1.92c-.1.1-.1.1-.06.24.17 0 .14-.21.06-.24zm-.03.27h-.07v.07h.07v-.07zm-.03-.48c0-.07 0-.14-.07-.11v.07c.03 0 .03 0 .07.04zm-.11 4.34c-.07.04-.28.18-.14.28 0-.18.18-.18.28-.21.18-.56.24-1.07.56-1.53.03-.14-.04-.14-.04-.24.11-.18.39-.52.28-.73-.14.52-.66.94-.59 1.49-.17.29-.29.61-.36.94m-.18-4.13c0 .03-.03 0-.07.03 0-.03.04-.03.07-.03zm-.14 1.52h-.07v.07h.07v-.07zm.04 4.18c-.04.06-.25.31-.04.35-.03-.14.18-.28.04-.35zm-.35.9c.07-.1.18-.1.18-.18-.07-.1-.14.04-.18.18 0 .03-.04 0 0 0zm-.18-4.69h-.07v.07h.07v-.07zm-.14-.36v-.14c.07 0 .07.07 0 .14zm.11 1.32c0-.1 0-.14.03-.18-.07-.03-.18-.03-.18.07.07 0 .07.07.14.11m-.18 3.61c.04-.07.04-.1-.03-.1 0 .02 0 .04-.01.05 0 .02-.01.04-.03.05h.07zm-.22-4.26c0 .04-.03 0-.07 0 0-.07.07-.03.07 0zm-.13 3.37v-.1c.1-.07.1.14 0 .1zm-.04-3.13c-.07-.03 0-.07 0-.1.07 0 0 .03 0 .1zm0 .25c0 .03-.03 0-.07.03 0-.03.04-.03.07-.03zm-.21 3.72h-.07v.07h.07v-.07zm2.2-6.19c-.11.07-.14.18-.11.38-.31.87-.83 1.64-1.04 2.68-.21.21-.21.42-.28.77-.21.17-.28.55-.32.86-.14.04-.1.32-.24.35.07.28-.14.28-.24.52-.07.11.03.11.03.18-.07 0-.1 0-.14.04 0 .18 0 .31.14.35.01-.21.04-.41.11-.6.03 0 .03.04.1.04.07-.28.38-.28.35-.66.07 0 .03.1.1.03.07-.45.11-.94.28-1.25 0 .11 0 .18.11.18.14-.48.36-.8.28-1.25h.14c.06-.31.1-.52.27-.66-.03-.04-.07-.07-.07-.11.02-.04.05-.07.09-.1.03-.02.08-.03.12-.03 0-.32.36-.63.25-1.05.27-.41.42-.89.42-1.39.2-.14.34-.31.27-.55.14-.04.18-.32.18-.42 0-.03-.03-.07-.07-.03-.1.31-.55.41-.45.83-.24.14-.36.66-.28.9m-2.72 4.83c0-.11.07-.11.03-.21-.06-.04-.06.03-.14.03 0 .11 0 .18.11.18m-.14.07c-.03.07-.03.18-.14.14.03.28.28-.1.14-.14zm-.66 1.12c-.11-.04-.04-.25.07-.25-.04.11-.04.14-.07.25zm-.46 1.45c0-.1 0-.2-.1-.17.07.17-.1.13-.1.24.07.07.1-.07.2-.07m-2.26 7.61c-.07 0-.18.04-.18.14.11 0 .14-.07.18-.14zm-1.15.21c-.03-.14.14-.07.14-.14.11.04-.07.14-.14.14zm-.49-.52c-.1-.04-.14 0-.14.1.11 0 .14-.03.14-.1zm-1.01-.91c-.07.07.07.18.14.25.07-.11-.07-.21-.14-.25zm-.03-.13h-.07v.07h.07v-.07zm-.18-2.96c0-.07-.04-.1-.07-.1 0 .03-.04.03-.04.07.04 0 .04.03.11.03zm-.14-1.35c.03-.04.07 0 .07-.04-.04 0-.07 0-.07.04zm.07 1.42c-.07 0-.07 0-.11.07.07 0 .11-.03.11-.07zm-.04-2.4c0-.07 0-.11-.03-.11 0 .04-.07 0-.07.11h.1zm-.07-.35c0 .03-.03.07-.03.14.1 0 .14-.14.03-.14zm0 2.26h-.07v.07h.07v-.07zm-.24-6.89c-.1-.07-.04-.38.1-.38-.06.12-.09.25-.1.38zm-.28 4.11c-.1-.03-.14 0-.14.11.11.03.11-.07.14-.11zm-.1-3.57c0 .03-.04 0-.07 0 0-.07.07-.04.07 0zm-.91 1.22c-.1 0-.07-.21.07-.18-.07.03-.07.07-.07.18zm-.49.21c0-.07.04-.07.11-.07 0 .03-.04.07-.11.07zm-.1 2.08h-.07v.07h.07v-.07zm-.07-.21c.07.03.07.18.21.18.04-.11-.03-.11-.03-.18.1.03.1 0 .18-.04 0-.24.14-.24.1-.45-.14.07-.1-.07-.24-.03-.04.1.03.14.07.2-.07.11-.21.14-.28.32m-.1-1.25c-.03-.02-.04-.04-.06-.06-.01-.03-.01-.06-.02-.08.11-.04.08.07.08.14zm-.53.62c.04-.14.07-.27.18-.27-.07.07 0 .27-.18.27zm0 .39c-.03.1-.28.2-.07.31.04-.07.18-.24.07-.31zm-.46.27c-.03-.04-.03-.04-.07-.04.01-.02.02-.05.04-.07.07-.03.03.04.03.11zm-.14.21c-.14 0-.1-.11-.1-.21.1 0 .18.14.1.21zm-.2-.46c-.04-.03-.04 0-.04.04a.219.219 0 0 1-.03-.05c0-.02-.01-.04 0-.05.07-.04.07 0 .07.06zm-.04 1.43c-.07 0-.07 0-.1.07.07 0 .1-.03.1-.07zm-.14-.41c0-.07.04-.14-.03-.14.07-.18.1.03.21-.04-.14-.14.06-.38.2-.31-.14.1-.14.38-.38.49zm-.03-.36v.07c-.04 0-.04 0-.07.03v-.07c.03-.03.03-.03.07-.03zm-1.22 2.19c-.07.03-.04.21.07.21 0-.11.03-.21-.07-.21zm-.97-1.67c0 .04 0 .11.06.11 0-.07-.03-.11-.06-.11zm-.08 9.07c0-.07.07-.07.07-.1h-.1v.08s0 .01.01.01c0 0 0 .01.01.01h.01zm0-8.38h-.1c0 .04-.11.21 0 .21 0-.1.1-.1.1-.21zm-.18 1.53h-.07v.07h.07v-.07zm0-.73v-.07c-.03 0-.03 0-.07.04v.07c.04-.04.04-.04.07-.04zm0-.28c.01-.02.02-.05.04-.06-.04 0-.04 0-.07.03-.02.02-.03.04-.04.07.04-.04.04-.04.07-.04zm0 .63c-.03 0-.07.04-.1.04 0 .03-.03.1 0 .13 0-.06.1-.1.1-.17m-.31 2.05h-.07v.07h.07v-.07zm-.17-3.57c0 .08-.01.16-.04.24.18 0 .1-.21.04-.24zm-.04-.52h.07c0-.04.03-.07.03-.04.02-.02.04-.04.04-.07h-.07c0 .01 0 .02-.01.03-.01 0-.02.01-.02.01-.02.02-.04.04-.04.07zm-.56 4.65c0 .07.03.13.07.18.07-.07.07-.2-.07-.18zm0-1.52c0 .1 0 .2.11.2 0-.1 0-.2-.11-.2zm-.49-5.71c0-.07-.03-.1-.06-.1 0 .03-.04.03-.04.07.04 0 .04.03.1.03zm-.03 11.44c-.14-.11-.28.03-.14.13.02.01.04 0 .06 0 .01-.01.03-.02.04-.03.02-.01.03-.03.03-.05.01-.02.01-.04.01-.05zm-.28-6.37c-.07-.03-.14.11-.07.14 0-.07.11-.07.07-.14zm-.1-3.44c0 .07-.07.07-.04.18.07.04.18-.21.04-.18zm-.11 3.72c0 .07-.07.21.07.18-.03-.07.04-.21-.07-.18zm0-2.36c-.07-.18.14-.21.04-.28-.06.02-.11.06-.14.11-.03.05-.05.11-.04.17h.14zm0 2.95h-.1a.285.285 0 0 0-.06.25c.01.05.03.09.06.12.03.04.06.07.1.09.04-.21-.03-.28 0-.46zm-.18-2.81v.1c.07.04.11-.18 0-.1zm0 4.52c-.03.1.11.17.14.1-.1 0-.03-.14-.14-.1zm0 .17c-.03.04-.03.18.04.18.03-.07.07-.18-.04-.18zm-.03-1.21c0 .1.03.18.18.18 0-.14-.04-.21-.18-.18zm.07-3.17h-.07v.07h.07v-.07zm-.04.39c-.07.03-.03-.11-.14-.04.04.14-.07.38 0 .49-.03-.21.14-.24.14-.45zm20.15-14.67c-.24.17-.07.59-.31.83 0 .03.03.07.1.07-.03.1-.1.03-.18 0 .04.28-.03.35-.1.62.03.11.1-.03.14 0-.38.14-.04.49-.24.63.03.04.1.07.1.11.21-.28.35-.8.28-1.01.07-.04.28-.28.1-.39.11-.1.21-.17.21-.31-.14-.03-.07.18-.21.18.05-.16.07-.32.07-.49.14.14.11.25.25.42.24-.07-.07-.21.1-.31.21.14-.07.31.04.49.14 0 .1-.18.18-.18.03.35-.05.71-.25 1-.04 0-.07-.03-.11-.03-.45.73-.38 1.43-.45 2.19-.14 0-.14.14-.21.21 0 .66-.21 1.01-.24 1.67-.1.1-.16.22-.18.36-.03.13-.01.27.04.4-.04.11-.14.18-.21.28.07.18-.07.18 0 .38h-.07c.03.84-.63 1.01-.67 1.77-.07.04-.1.18-.18.28.11.32.04.77-.2.94 0 .07.1.04.03.14-.52 1.11-.7 2.23-1.32 3.23-.07.49-.42.66-.49 1.19-.07.03-.04.17-.14.13.02.07.02.14 0 .21-.02.07-.05.13-.11.18-.55 1.21-1.07 2.46-1.81 3.51-.24.73-.9 1.11-1.43 1.56-.28-.07-.38.31-.59.24-.04 0-.07.07-.07.18-.32-.14-.59.07-.84-.1-.05.02-.1.04-.15.04a.42.42 0 0 1-.16-.04c-.11 0 .03.07 0 .14-.21 0-.14-.28-.28-.32-.1.04-.18.1-.24.18a.496.496 0 0 0-.26-.08c-.1 0-.19.03-.27.08.08-.14-.14-.07-.06-.18.1-.03.1.04.2.04-.03-.14-.24-.21-.28-.04-.14-.24-.48-.24-.52-.55-.07-.11-.28-.18-.21-.32-.07 0-.07 0-.1.07-.02-.37-.1-.73-.25-1.07.05-.35-.03-.7-.2-1.01.2-.66-.14-1.35.03-1.94-.07-.07-.03-.25-.07-.35.24 0 .11.21.11.31.1 0 .07-.07.13-.07a.473.473 0 0 1 .14-.55c-.14-.07-.27.18-.45.21.09-.21.14-.44.14-.66h.14c0-.21-.1 0-.14-.07.07-.14.18-.32.04-.39-.11.04.07.11-.04.18a.308.308 0 0 1-.06-.19c0-.07.02-.14.06-.19a.476.476 0 0 1-.09-.29c.01-.1.05-.19.13-.27-.04-.1-.14.04-.14-.03-.04-.14.1-.07.1-.14-.18-.14 0-.42-.1-.56 0 .49-.28.84-.32 1.19-.14 0 0-.07-.03-.14-.18-.07-.32.34-.11.34-.07.11-.1.18-.18.07-.05.01-.1.04-.13.07.03.66-.84.94-.77 1.61a.71.71 0 0 0-.19.23c-.05.09-.08.19-.09.29-.07-.03-.1-.14-.18-.03.07.55-.59.69-.55 1.28-.11.04-.18.18-.35.24 0 .11 0 .25-.11.28.11.28-.14.28-.14.63-.62.87-1.04 2.01-1.7 2.92-.12.3-.33.55-.6.73-.03.12-.09.23-.16.33-.08.09-.18.17-.29.23-.07 0-.07-.08-.21-.04v-.18c-.24-.07-.1.21-.18.28-.14.02-.28.02-.41 0 .03-.1.03-.18 0-.21-.11.11-.36.31-.46.11a.472.472 0 0 0-.31.06c.07-.17-.18-.1-.11-.31-.1-.03-.13.04-.2.07.03.07.13.04.07.21-.14-.18-.28-.31-.46-.28-.1-.22-.24-.42-.42-.59.04-.14.07-.21-.07-.24.04-.11.07-.04.14-.04 0-.18-.14-.07-.24-.03-.02-.05-.01-.11 0-.16.02-.05.06-.09.1-.12.04-.14-.1-.04-.1-.1 0-.66-.28-1.74 0-2.4-.07 0-.11 0-.11.07-.1-.14.08-.28.11-.42-.03 0-.07 0-.11.07-.03-.77 0-1.77.32-2.43-.11-.04-.07.1-.21.07.03-.14.14-.28.18-.39 0-.07-.07-.03-.1-.03.07-.21.03-.31.17-.42-.03-.07-.03-.18-.1-.21.24-1.74.56-3.16.77-4.69.13-.25.19-.52.18-.8.03-.21.21-.38.1-.56.32-.48.14-1.07.49-1.46.1-.48.31-.8.24-1.14.18-.11.14-.49.32-.56.31-1.29.83-2.29 1.18-3.68.2-.23.44-.41.7-.56.07 0 .07.03.03.14.77-.49 1.78 0 2.48.18.07.18.2.28.2.49-.03.2-.2.27-.34.38-.53 1.07-.87 2.5-1.4 3.61-.03.07.04.18 0 .28-.1.21-.27.42-.24.69-.11-.03-.07.08-.14.11 0 .45-.42 1.07-.31 1.56-.39 1.12-.53 2.61-.91 3.72-.02.34-.09.67-.21.98.07.66-.21 1.11-.35 1.7.07.31-.03.73-.14 1.11 0 .04.04.04.07.07.18-.07.14-.31.25-.41.07.06.14-.04.21 0 .34-.56.69-1.29.97-1.78.14 0-.07.25.18.25.04-.11-.18-.35.14-.32 0-.07-.1-.07-.07-.14.18.04.07-.17.14-.2.21.03.45-.28.28-.46.18-.18.36 0 .38.14.04-.06.09-.12.14-.18-.1-.38.36-.41.21-.83.02 0 .04.01.05.02.01.01.02.03.02.05.2-.37.45-.72.73-1.04 0 .1-.07.1-.07.24.63-.31.77-1.07 1.26-1.49.03-.32.28-.36.31-.63.3-.23.54-.54.66-.9.14-.07.14-.14.25-.07.06-.27.19-.51.38-.7-.07-.14.14-.21 0-.24.42-.59.42-1.78 1.32-1.95 1.05.21 2.65.11 2.69 1.11 0 .28-.21.53-.25.91h-.07c-.18.87-.31 1.7-.52 2.68 0 .03.07.03.07.1-.25 1.22-.25 2.47-.42 3.62.14.28.03.55.03.94.06.04.14.06.21.06.28-.2.32-.62.63-.72.04-.14-.14-.07-.07-.25.28.25.38-.24.25-.45.1-.03.06.07.13.1.35-.51.63-1.07.85-1.65.1-.1.1.03.17.07.04-.1-.17-.42.11-.52.03.1-.11.1-.07.21.02.02.04.03.06.05.03.01.05.02.08.02.03-.14-.18-.53.1-.7-.1.18-.14.38.04.49.1-.11.03-.32.1-.49 0-.1-.1-.03-.14 0-.03-.14.07-.14.04-.24.1 0 .03.14.18.14.1-.04-.07-.18.1-.14-.03-.11-.03-.28.04-.32-.21-.73.59-1.04.55-1.91.11 0 .04.21.14.25.02-.18.02-.35 0-.53.21.04.07-.27.14-.27.18.07.04.24.07.41-.1.04-.03-.14-.1-.1.14.24-.14.59-.11.9.21-.27.21-.76.53-.94-.21-.20-.21-.45-.28-.73.14-.03.1.11.21.14 0 .04-.04.07-.11.07.04.14.14.18.14.36.31-.49.31-1.07.56-1.63l-.06-.03c-.02-.02-.03-.04-.04-.06a.107.107 0 0 1-.02-.06c0-.02.01-.04.01-.06.11.04.23.06.35.07.07-.07 0-.07-.03-.07.28-.18 0-.66.31-.84-.14-.1.04-.35.18-.38.28-1.01.77-1.84.94-2.99.07-.14.11-.28.18-.45.18.1-.07.42 0 .56.18-.25.18-.53.18-.87-.11-.04-.07.07-.07.14-.14-.25.21-.46.1-.63.04-.11.11 0 .18 0 .12-.28.19-.57.21-.87h.07c.04.04.07.1.1.14.11-.07 0-.21-.1-.14.1-.59.31-1.07.31-1.6.04-.03.07-.07.07-.1-.1-.04-.1.03-.07.1-.1.04-.07.28-.1.42-.07 0-.07-.07-.18-.04.14.21-.18.35-.14.56-.18 0-.07.31-.24.31.14-.14.07-.52.24-.55-.07-.25.18-.49.14-.63.18 0-.07.21.1.28.14-.31-.14-.49.14-.8 0 .07.07.1.11.07.03-.07-.04-.07-.11-.07V2.4c.11.14.14.03.36 0-.07-.11-.04-.18-.1-.21.2-.21-.11-.42.03-.66.03 0 .11-.04.14-.04.07-.1-.03-.06-.07-.06.1-.07.04-.28.21-.25a.654.654 0 0 1-.01-.34c.04-.11.1-.21.19-.28.03-.11-.11-.07-.07-.18.18-.07.07-.28.18-.39.18.25.07.73.18 1.15.03.07-.07.07-.07.14.03.1.1.14.07.28 0 .03 0 .07-.07.07.03.09.08.17.14.24-.04.49-.42 1.18-.21 1.84.21-.14.07-.28.10-.41.07-.04.11.07.11-.04.31.25.03.70.07 1.01" fill="rgba(21,41,55,0.15)" id="svg_8"/></g></g></svg>
    </div>
  ` : "";

  // Injeta o conteúdo e o footer fixo
  let htmlOut = templateWithLogo.replace("{{CONTENT}}", docHtml);
  htmlOut = htmlOut.replace("</body>", `${footerHtml}</body>`);
  return htmlOut;
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
      textColor: brandConfig?.textColor ?? DEFAULT_BRAND_CONFIG.textColor,
      borderColor: brandConfig?.borderColor ?? DEFAULT_BRAND_CONFIG.borderColor,
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

    // Normaliza tabelas (Lexical -> thead/tbody; corrige thead com várias linhas)
    const normalizedTables = normalizeTables(processedHtml);
    // Remove estilos inline específicos de tabela para padronizar visual
    const withoutInlineTableStyles = stripTableInlineStyles(normalizedTables);
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
      const footerTemplate = `
        <div style="width:100%; height:100%; display:flex; align-items:flex-end; justify-content:center; padding-bottom:0px;">
          <div style="display:flex; align-items:center; justify-content:center;">
<svg width="127" height="34" xmlns="http://www.w3.org/2000/svg"><defs><clipPath id="clip0_2675_4202"><path fill="white" id="svg_1" d="M0 0h126.29v34H0z"/></clipPath></defs><g class="layer"><title>Layer 1</title><g clip-path="url(#clip0_2675_4202)" id="svg_2"><path d="M52.6 7.26c-2.38 0-3.85 1.81-4.08 4.22v6.97c.26 3.61 2.34 5.04 4.49 5.04 2.65 0 4.5-1.99 4.5-7.87 0-6.03-1.74-8.36-4.91-8.36m.49 16.8c-1.81 0-3.4-.49-4.57-1.28v7.12c0 2.07.18 2.9 1.55 3.24v.56h-7.06v-.56c1.43-.42 1.51-1.32 1.51-3.24V9.89c0-1.31-.34-1.65-1.89-2.07v-.56l5.88-1.28v2.98c1.17-2.11 3.82-2.98 5.67-2.98 4.64 0 7.96 3.62 7.96 9.19 0 5.95-3.89 8.89-9.06 8.89" fill="rgba(21,41,55,0.15)" id="svg_3"/><path d="M38.96 15c0 1.37-.46 2.7-1.31 3.78a6.11 6.11 0 0 1-3.37 2.17c-1.33.32-2.73.19-3.98-.37a6.093 6.093 0 0 1-2.91-2.76 6.17 6.17 0 0 1-.58-3.96 6.147 6.147 0 0 1 5.72-4.96c1.37-.06 2.72.33 3.84 1.12l-8.23 4.44 1.59 2.93 11.71-6.32a9.423 9.423 0 0 0-4.83-4.72 9.468 9.468 0 0 0-6.77-.29 9.387 9.387 0 0 0-5.22 4.29 9.355 9.355 0 0 0-1.02 6.67 9.46 9.46 0 0 0 10.26 7.37 9.498 9.498 0 0 0 6.03-3.08A9.462 9.462 0 0 0 42.3 15h-3.34z" fill="rgba(21,41,55,0.15)" id="svg_4"/><path d="M14.65 18.14c-.13.78-.34 1.54-.62 2.28-.42 1.11-1.39 3-3.16 3.18-.09.01-.18.01-.26.02 0 0-.51 0-.73-.22-.26-.25-.13-.8-.13-.8.13-.57.55-1.79 1.92-3.5.49-.6 1.01-1.17 1.58-1.71l1.84-1.75-.44 2.5zm7.7-6.98c-.13-.92-.42-1.16-.75-1.11-1.2.16-2.38.46-3.52.89l-.82.31-.27-.84c-.43-1.32-1.03-2.4-1.77-3.21-1.36-1.48-3.17-2-5.09-1.47-2.09.59-4 2.46-5.67 5.58l-1.58 2.93V5.85c0-.26-.51-.43-1.43-.43-.92 0-1.43.24-1.43.43v27.73c0 .19.41.42 1.33.42.93 0 1.55-.16 1.55-.42v-5.64c-.02-8.14 3.27-18.12 8-19.44.9-.24 1.56-.05 2.19.64.59.65 1.08 1.67 1.39 2.97l.14.57-.48.32c-3.4 2.3-5.62 5.21-6.55 7.17-1.23 2.58-.78 4.11-.19 4.95.51.73 1.59 1.55 3.78 1.34 2.44-.25 4.41-2.03 5.55-5.01.73-1.91 1.07-4.28.99-6.66l-.02-.56.51-.23c1.14-.53 2.35-.89 3.6-1.08.45-.07.68-.85.55-1.76" fill="rgba(21,41,55,0.15)" id="svg_5"/><path d="M67.34 20.62c0 .02 0 .04.01.06.01.01.02.03.03.04.63.66 1.39 1.19 2.23 1.54.85.36 1.75.54 2.67.53 4.02 0 5.88-2.97 5.88-6.88 0-4.19-2.24-8.8-6.72-8.8-.78-.02-1.55.14-2.25.47-.71.33-1.33.81-1.81 1.41-.01.02-.02.03-.03.05-.01.02-.01.04-.01.06v11.52zM64.02 5.96c0-.11.07-.14.18-.14h3.01c.1 0 .14.03.14.14v1.25c-.01.03 0 .06.01.08.02.03.04.05.07.06.03.01.06.02.09.01s.05-.03.07-.05c1.58-1.22 3.64-1.5 5.6-1.5 4.86.28 8.36 3.98 8.36 9.11 0 5.31-3.7 9.04-9.09 9.04-1.72 0-3.4-.47-4.87-1.36-.1-.11-.24 0-.24.14v10.75c0 .11-.04.18-.14.18H64.2c-.03 0-.05 0-.08-.01a.21.21 0 0 1-.06-.04c-.01-.01-.03-.04-.03-.06-.01-.02-.02-.04-.01-.07V5.96z" fill="rgba(21,41,55,0.15)" id="svg_6"/><path d="M93.82 6.43c-.73 0-1.45.13-2.13.39-.64.24-1.22.62-1.69 1.11a7.66 7.66 0 0 0-1.27 1.86c-.37.76-.64 1.56-.8 2.39-.18.94-.27 1.89-.27 2.85-.01 1.17.13 2.34.43 3.48.24.96.66 1.88 1.22 2.7a5.44 5.44 0 0 0 1.9 1.73c.89.46 1.89.66 2.89.58 1.01-.08 1.96-.44 2.77-1.03.91-.7 1.61-1.7 2.09-3 .48-1.3.72-2.84.73-4.63.01-1.09-.13-2.18-.4-3.24-.23-.94-.62-1.83-1.14-2.64a5.944 5.944 0 0 0-1.81-1.79 4.86 4.86 0 0 0-1.2-.56c-.43-.13-.87-.2-1.32-.2zm-.32-.45c1.52-.01 3.03.25 4.45.78 1.32.5 2.52 1.27 3.52 2.26.81.82 1.47 1.77 1.93 2.83.55 1.23.78 2.58.65 3.93a7.846 7.846 0 0 1-1.35 3.75 9.794 9.794 0 0 1-3.76 3.26c-1.62.81-3.4 1.22-5.21 1.2-1.39.01-2.77-.22-4.07-.68-1.24-.43-2.38-1.08-3.37-1.92-.95-.8-1.73-1.79-2.27-2.91A7.776 7.776 0 0 1 83.2 15c0-1.6.49-3.17 1.41-4.49.95-1.4 2.24-2.54 3.76-3.3 1.58-.82 3.34-1.24 5.12-1.22" fill="rgba(21,41,55,0.15)" id="svg_7"/><path d="M126.1 4.52c0 .03-.04 0-.07.03 0-.03.03-.03.07-.03zm-.38-1.32c0 .03-.04.03-.04.07-.14 0 0-.18.04-.07zm-.07 3.79c-.07-.04 0-.07 0-.11.07 0 0 .04 0 .11zm-.04-3.97c-.07 0-.07-.07-.07-.1.04 0 .07.03.07.1zm.42 3.38c.01.52-.11 1.03-.35 1.49-.07.21 0 .52-.21.59.25-.8.25-1.61.63-2.43.14 0-.04.24-.07.35m-.73.42c0 .07-.07.14.03.21-.03-.07.04-.21-.03-.21zm0 .32c.03.06-.11.27.03.27 0-.14.04-.24-.03-.27zm-.07-2.47v-.11h-.1c0 .04.04.07.04.11h.06zm-.04-.74c-.07.07-.14.38.07.42-.1-.14 0-.28-.07-.42zm-.03 2.64h-.07v.07h.07v-.07zm-.03-5.32c-.07.03-.03.14.07.14 0-.11 0-.14-.07-.14zm-.03 5.84c.03.1-.04.1-.07.24.1 0 .21-.27.07-.24zm.03-5.18c-.14-.1 0-.28-.14-.28-.07.25.07.42-.03.59.09-.08.16-.19.18-.31m.03 6.64c-.07.24-.24.36-.2.59.17-.07.31-.45.2-.59zm-.22-1.46c-.03.04-.1.24 0 .24 0-.1.18-.24 0-.24zm0 .66c-.03.07-.14.21-.03.24.07-.03.1-.24.03-.24zm-.1-2.08c.03 0 .07.03.07 0 0-.04-.07-.07-.07 0zm.03 1.73h-.07v.07h.07V7.4zm-.03-5.21c-.07 0-.07-.03-.04-.07.04 0 .04 0 .04.07zm-.11.69c.04-.03.07 0 .07-.03-.03 0-.07 0-.07.03zm0-.13c.04 0 .07.03.07 0 0-.04-.07-.07-.07 0zm-.03 4.9c.03 0 .07.03.07 0 0-.04-.07-.07-.07 0zm-.38 1.53c0 .05-.01.1-.04.14.1 0 .14-.14.04-.14zm-.07-1.57c-.04 0-.07.14 0 .18.03-.03.07-.18 0-.18zm-.18-2.68c-.04-.03-.07-.06-.07-.1.03 0 .07.04.07.1zm-.04 2.5c0-.07 0-.1-.07-.07 0 .02 0 .04.01.06.01.02.02.03.03.05 0-.04 0-.07.03-.04zm-.03-2.71c0 .04-.04 0-.07.04 0-.04.03-.04.07-.04zm.07.31c0 .07-.11.11-.07.21-.14-.03-.04-.21-.07-.21.03-.1.07.04.14 0zm-.11 5.43h-.06v-.14h.06v.14zm-.06-5c0-.07 0-.11.03-.11 0 .02 0 .04-.01.06 0 .02-.01.03-.02.05zm.03.07c0 .1-.14-.11-.03-.07 0 0 0 .07.03.07zm.1 4.45h.07c0 .17-.1.27-.17.17 0 .28-.39.73-.18.84.1-.11 0-.21.07-.28.07.07.1.04.14.07.03.1-.21.24-.04.31.24-.24 0-.55.21-.73 0-.1-.07-.14 0-.24.18-.11.14-.38.21-.56.02-.02.05-.04.08-.04.04-.01.07-.01.1.01.03-.21.31-.56.07-.66.1-.14.18-.59.36-.42.07-.24.21-.42.27-.66.07 0-.03.07.07.1.11-.2-.03-.24 0-.41-.27.1-.24.59-.45.8-.07-.14.14-.25-.03-.25-.11.14-.07.52-.28.52-.04.11.18.14 0 .28-.04-.03 0-.1-.11-.07-.03.38-.07.84-.31 1.15.04-.14.06-.28.07-.42-.14.04-.18.35-.14.49.03.14-.11 0 0 0m-.35-2.85c0 .1-.03.18.11.18.03-.11 0-.21-.11-.18zm-.07-1.05v-.07h.01c.01 0 .01 0 .02-.01v-.01c.01 0 .01-.01.01-.01.07-.04.07.14-.04.1zm-.21.77c-.03-.04-.14-.04-.1-.11.07-.03.1 0 .1.11zm-.21.62h-.07V7.4h.07v.07zm-.18 1.92c-.1.1-.1.1-.06.24.17 0 .14-.21.06-.24zm-.03.27h-.07v.07h.07v-.07zm-.03-.48c0-.07 0-.14-.07-.11v.07c.03 0 .03 0 .07.04zm-.11 4.34c-.07.04-.28.18-.14.28 0-.18.18-.18.28-.21.18-.56.24-1.07.56-1.53.03-.14-.04-.14-.04-.24.11-.18.39-.52.28-.73-.14.52-.66.94-.59 1.49-.17.29-.29.61-.36.94m-.18-4.13c0 .03-.03 0-.07.03 0-.03.04-.03.07-.03zm-.14 1.52h-.07v.07h.07v-.07zm.04 4.18c-.04.06-.25.31-.04.35-.03-.14.18-.28.04-.35zm-.35.9c.07-.1.18-.1.18-.18-.07-.1-.14.04-.18.18 0 .03-.04 0 0 0zm-.18-4.69h-.07v.07h.07v-.07zm-.14-.36v-.14c.07 0 .07.07 0 .14zm.11 1.32c0-.1 0-.14.03-.18-.07-.03-.18-.03-.18.07.07 0 .07.07.14.11m-.18 3.61c.04-.07.04-.1-.03-.1 0 .02 0 .04-.01.05 0 .02-.01.04-.03.05h.07zm-.22-4.26c0 .04-.03 0-.07 0 0-.07.07-.03.07 0zm-.13 3.37v-.1c.1-.07.1.14 0 .1zm-.04-3.13c-.07-.03 0-.07 0-.1.07 0 0 .03 0 .1zm0 .25c0 .03-.03 0-.07.03 0-.03.04-.03.07-.03zm-.21 3.72h-.07v.07h.07v-.07zm2.2-6.19c-.11.07-.14.18-.11.38-.31.87-.83 1.64-1.04 2.68-.21.21-.21.42-.28.77-.21.17-.28.55-.32.86-.14.04-.1.32-.24.35.07.28-.14.28-.24.52-.07.11.03.11.03.18-.07 0-.1 0-.14.04 0 .18 0 .31.14.35.01-.21.04-.41.11-.6.03 0 .03.04.1.04.07-.28.38-.28.35-.66.07 0 .03.1.1.03.07-.45.11-.94.28-1.25 0 .11 0 .18.11.18.14-.48.36-.8.28-1.25h.14c.06-.31.1-.52.27-.66-.03-.04-.07-.07-.07-.11.02-.04.05-.07.09-.1.03-.02.08-.03.12-.03 0-.32.36-.63.25-1.05.27-.41.42-.89.42-1.39.2-.14.34-.31.27-.55.14-.04.18-.32.18-.42 0-.03-.03-.07-.07-.03-.1.31-.55.41-.45.83-.24.14-.36.66-.28.9m-2.72 4.83c0-.11.07-.11.03-.21-.06-.04-.06.03-.14.03 0 .11 0 .18.11.18m-.14.07c-.03.07-.03.18-.14.14.03.28.28-.1.14-.14zm-.66 1.12c-.11-.04-.04-.25.07-.25-.04.11-.04.14-.07.25zm-.46 1.45c0-.1 0-.2-.1-.17.07.17-.1.13-.1.24.07.07.1-.07.2-.07m-2.26 7.61c-.07 0-.18.04-.18.14.11 0 .14-.07.18-.14zm-1.15.21c-.03-.14.14-.07.14-.14.11.04-.07.14-.14.14zm-.49-.52c-.1-.04-.14 0-.14.1.11 0 .14-.03.14-.1zm-1.01-.91c-.07.07.07.18.14.25.07-.11-.07-.21-.14-.25zm-.03-.13h-.07v.07h.07v-.07zm-.18-2.96c0-.07-.04-.1-.07-.1 0 .03-.04.03-.04.07.04 0 .04.03.11.03zm-.14-1.35c.03-.04.07 0 .07-.04-.04 0-.07 0-.07.04zm.07 1.42c-.07 0-.07 0-.11.07.07 0 .11-.03.11-.07zm-.04-2.4c0-.07 0-.11-.03-.11 0 .04-.07 0-.07.11h.1zm-.07-.35c0 .03-.03.07-.03.14.1 0 .14-.14.03-.14zm0 2.26h-.07v.07h.07v-.07zm-.24-6.89c-.1-.07-.04-.38.1-.38-.06.12-.09.25-.1.38zm-.28 4.11c-.1-.03-.14 0-.14.11.11.03.11-.07.14-.11zm-.1-3.57c0 .03-.04 0-.07 0 0-.07.07-.04.07 0zm-.91 1.22c-.1 0-.07-.21.07-.18-.07.03-.07.07-.07.18zm-.49.21c0-.07.04-.07.11-.07 0 .03-.04.07-.11.07zm-.1 2.08h-.07v.07h.07v-.07zm-.07-.21c.07.03.07.18.21.18.04-.11-.03-.11-.03-.18.1.03.1 0 .18-.04 0-.24.14-.24.1-.45-.14.07-.1-.07-.24-.03-.04.1.03.14.07.2-.07.11-.21.14-.28.32m-.1-1.25c-.03-.02-.04-.04-.06-.06-.01-.03-.01-.06-.02-.08.11-.04.08.07.08.14zm-.53.62c.04-.14.07-.27.18-.27-.07.07 0 .27-.18.27zm0 .39c-.03.1-.28.2-.07.31.04-.07.18-.24.07-.31zm-.46.27c-.03-.04-.03-.04-.07-.04.01-.02.02-.05.04-.07.07-.03.03.04.03.11zm-.14.21c-.14 0-.1-.11-.1-.21.1 0 .18.14.1.21zm-.2-.46c-.04-.03-.04 0-.04.04a.219.219 0 0 1-.03-.05c0-.02-.01-.04 0-.05.07-.04.07 0 .07.06zm-.04 1.43c-.07 0-.07 0-.1.07.07 0 .1-.03.1-.07zm-.14-.41c0-.07.04-.14-.03-.14.07-.18.1.03.21-.04-.14-.14.06-.38.2-.31-.14.1-.14.38-.38.49zm-.03-.36v.07c-.04 0-.04 0-.07.03v-.07c.03-.03.03-.03.07-.03zm-1.22 2.19c-.07.03-.04.21.07.21 0-.11.03-.21-.07-.21zm-.97-1.67c0 .04 0 .11.06.11 0-.07-.03-.11-.06-.11zm-.08 9.07c0-.07.07-.07.07-.1h-.1v.08s0 .01.01.01c0 0 0 .01.01.01h.01zm0-8.38h-.1c0 .04-.11.21 0 .21 0-.1.1-.1.1-.21zm-.18 1.53h-.07v.07h.07v-.07zm0-.73v-.07c-.03 0-.03 0-.07.04v.07c.04-.04.04-.04.07-.04zm0-.28c.01-.02.02-.05.04-.06-.04 0-.04 0-.07.03-.02.02-.03.04-.04.07.04-.04.04-.04.07-.04zm0 .63c-.03 0-.07.04-.1.04 0 .03-.03.1 0 .13 0-.06.1-.1.1-.17m-.31 2.05h-.07v.07h.07v-.07zm-.17-3.57c0 .08-.01.16-.04.24.18 0 .1-.21.04-.24zm-.04-.52h.07c0-.04.03-.07.03-.04.02-.02.04-.04.04-.07h-.07c0 .01 0 .02-.01.03-.01 0-.02.01-.02.01-.02.02-.04.04-.04.07zm-.56 4.65c0 .07.03.13.07.18.07-.07.07-.2-.07-.18zm0-1.52c0 .1 0 .2.11.2 0-.1 0-.2-.11-.2zm-.49-5.71c0-.07-.03-.1-.06-.1 0 .03-.04.03-.04.07.04 0 .04.03.1.03zm-.03 11.44c-.14-.11-.28.03-.14.13.02.01.04 0 .06 0 .01-.01.03-.02.04-.03.02-.01.03-.03.03-.05.01-.02.01-.04.01-.05zm-.28-6.37c-.07-.03-.14.11-.07.14 0-.07.11-.07.07-.14zm-.1-3.44c0 .07-.07.07-.04.18.07.04.18-.21.04-.18zm-.11 3.72c0 .07-.07.21.07.18-.03-.07.04-.21-.07-.18zm0-2.36c-.07-.18.14-.21.04-.28-.06.02-.11.06-.14.11-.03.05-.05.11-.04.17h.14zm0 2.95h-.1a.285.285 0 0 0-.06.25c.01.05.03.09.06.12.03.04.06.07.1.09.04-.21-.03-.28 0-.46zm-.18-2.81v.1c.07.04.11-.18 0-.1zm0 4.52c-.03.1.11.17.14.1-.1 0-.03-.14-.14-.1zm0 .17c-.03.04-.03.18.04.18.03-.07.07-.18-.04-.18zm-.03-1.21c0 .1.03.18.18.18 0-.14-.04-.21-.18-.18zm.07-3.17h-.07v.07h.07v-.07zm-.04.39c-.07.03-.03-.11-.14-.04.04.14-.07.38 0 .49-.03-.21.14-.24.14-.45zm20.15-14.67c-.24.17-.07.59-.31.83 0 .03.03.07.1.07-.03.1-.1.03-.18 0 .04.28-.03.35-.1.62.03.11.1-.03.14 0-.38.14-.04.49-.24.63.03.04.1.07.1.11.21-.28.35-.8.28-1.01.07-.04.28-.28.1-.39.11-.1.21-.17.21-.31-.14-.03-.07.18-.21.18.05-.16.07-.32.07-.49.14.14.11.25.25.42.24-.07-.07-.21.1-.31.21.14-.07.31.04.49.14 0 .1-.18.18-.18.03.35-.05.71-.25 1-.04 0-.07-.03-.11-.03-.45.73-.38 1.43-.45 2.19-.14 0-.14.14-.21.21 0 .66-.21 1.01-.24 1.67-.1.1-.16.22-.18.36-.03.13-.01.27.04.4-.04.11-.14.18-.21.28.07.18-.07.18 0 .38h-.07c.03.84-.63 1.01-.67 1.77-.07.04-.1.18-.18.28.11.32.04.77-.2.94 0 .07.1.04.03.14-.52 1.11-.7 2.23-1.32 3.23-.07.49-.42.66-.49 1.19-.07.03-.04.17-.14.13.02.07.02.14 0 .21-.02.07-.05.13-.11.18-.55 1.21-1.07 2.46-1.81 3.51-.24.73-.9 1.11-1.43 1.56-.28-.07-.38.31-.59.24-.04 0-.07.07-.07.18-.32-.14-.59.07-.84-.1-.05.02-.1.04-.15.04a.42.42 0 0 1-.16-.04c-.11 0 .03.07 0 .14-.21 0-.14-.28-.28-.32-.1.04-.18.1-.24.18a.496.496 0 0 0-.26-.08c-.1 0-.19.03-.27.08.08-.14-.14-.07-.06-.18.1-.03.1.04.2.04-.03-.14-.24-.21-.28-.04-.14-.24-.48-.24-.52-.55-.07-.11-.28-.18-.21-.32-.07 0-.07 0-.1.07-.02-.37-.1-.73-.25-1.07.05-.35-.03-.7-.2-1.01.2-.66-.14-1.35.03-1.94-.07-.07-.03-.25-.07-.35.24 0 .11.21.11.31.1 0 .07-.07.13-.07a.473.473 0 0 1 .14-.55c-.14-.07-.27.18-.45.21.09-.21.14-.44.14-.66h.14c0-.21-.1 0-.14-.07.07-.14.18-.32.04-.39-.11.04.07.11-.04.18a.308.308 0 0 1-.06-.19c0-.07.02-.14.06-.19a.476.476 0 0 1-.09-.29c.01-.1.05-.19.13-.27-.04-.1-.14.04-.14-.03-.04-.14.1-.07.1-.14-.18-.14 0-.42-.1-.56 0 .49-.28.84-.32 1.19-.14 0 0-.07-.03-.14-.18-.07-.32.34-.11.34-.07.11-.1.18-.18.07-.05.01-.1.04-.13.07.03.66-.84.94-.77 1.61a.71.71 0 0 0-.19.23c-.05.09-.08.19-.09.29-.07-.03-.1-.14-.18-.03.07.55-.59.69-.55 1.28-.11.04-.18.18-.35.24 0 .11 0 .25-.11.28.11.28-.14.28-.14.63-.62.87-1.04 2.01-1.7 2.92-.12.3-.33.55-.6.73-.03.12-.09.23-.16.33-.08.09-.18.17-.29.23-.07 0-.07-.08-.21-.04v-.18c-.24-.07-.1.21-.18.28-.14.02-.28.02-.41 0 .03-.1.03-.18 0-.21-.11.11-.36.31-.46.11a.472.472 0 0 0-.31.06c.07-.17-.18-.1-.11-.31-.1-.03-.13.04-.2.07.03.07.13.04.07.21-.14-.18-.28-.31-.46-.28-.1-.22-.24-.42-.42-.59.04-.14.07-.21-.07-.24.04-.11.07-.04.14-.04 0-.18-.14-.07-.24-.03-.02-.05-.01-.11 0-.16.02-.05.06-.09.1-.12.04-.14-.1-.04-.1-.1 0-.66-.28-1.74 0-2.4-.07 0-.11 0-.11.07-.1-.14.08-.28.11-.42-.03 0-.07 0-.11.07-.03-.77 0-1.77.32-2.43-.11-.04-.07.1-.21.07.03-.14.14-.28.18-.39 0-.07-.07-.03-.1-.03.07-.21.03-.31.17-.42-.03-.07-.03-.18-.1-.21.24-1.74.56-3.16.77-4.69.13-.25.19-.52.18-.8.03-.21.21-.38.1-.56.32-.48.14-1.07.49-1.46.1-.48.31-.8.24-1.14.18-.11.14-.49.32-.56.31-1.29.83-2.29 1.18-3.68.2-.23.44-.41.7-.56.07 0 .07.03.03.14.77-.49 1.78 0 2.48.18.07.18.2.28.2.49-.03.2-.2.27-.34.38-.53 1.07-.87 2.5-1.4 3.61-.03.07.04.18 0 .28-.1.21-.27.42-.24.69-.11-.03-.07.08-.14.11 0 .45-.42 1.07-.31 1.56-.39 1.12-.53 2.61-.91 3.72-.02.34-.09.67-.21.98.07.66-.21 1.11-.35 1.7.07.31-.03.73-.14 1.11 0 .04.04.04.07.07.18-.07.14-.31.25-.41.07.06.14-.04.21 0 .34-.56.69-1.29.97-1.78.14 0-.07.25.18.25.04-.11-.18-.35.14-.32 0-.07-.1-.07-.07-.14.18.04.07-.17.14-.2.21.03.45-.28.28-.46.18-.18.36 0 .38.14.04-.06.09-.12.14-.18-.1-.38.36-.41.21-.83.02 0 .04.01.05.02.01.01.02.03.02.05.2-.37.45-.72.73-1.04 0 .1-.07.1-.07.24.63-.31.77-1.07 1.26-1.49.03-.32.28-.36.31-.63.3-.23.54-.54.66-.9.14-.07.14-.14.25-.07.06-.27.19-.51.38-.7-.07-.14.14-.21 0-.24.42-.59.42-1.78 1.32-1.95 1.05.21 2.65.11 2.69 1.11 0 .28-.21.53-.25.91h-.07c-.18.87-.31 1.7-.52 2.68 0 .03.07.03.07.1-.25 1.22-.25 2.47-.42 3.62.14.28.03.55.03.94.06.04.14.06.21.06.28-.2.32-.62.63-.72.04-.14-.14-.07-.07-.25.28.25.38-.24.25-.45.1-.03.06.07.13.1.35-.51.63-1.07.85-1.65.1-.1.1.03.17.07.04-.1-.17-.42.11-.52.03.1-.11.1-.07.21.02.02.04.03.06.05.03.01.05.02.08.02.03-.14-.18-.53.1-.7-.1.18-.14.38.04.49.1-.11.03-.32.1-.49 0-.1-.1-.03-.14 0-.03-.14.07-.14.04-.24.1 0 .03.14.18.14.1-.04-.07-.18.1-.14-.03-.11-.03-.28.04-.32-.21-.73.59-1.04.55-1.91.11 0 .04.21.14.25.02-.18.02-.35 0-.53.21.04.07-.27.14-.27.18.07.04.24.07.41-.1.04-.03-.14-.1-.1.14.24-.14.59-.11.9.21-.27.21-.76.53-.94-.21-.2-.21-.45-.28-.73.14-.03.1.11.21.14 0 .04-.04.07-.11.07.04.14.14.18.14.36.31-.49.31-1.07.56-1.63l-.06-.03c-.02-.02-.03-.04-.04-.06a.107.107 0 0 1-.02-.06c0-.02.01-.04.01-.06.11.04.23.06.35.07.07-.07 0-.07-.03-.07.28-.18 0-.66.31-.84-.14-.1.04-.35.18-.38.28-1.01.77-1.84.94-2.99.07-.14.11-.28.18-.45.18.1-.07.42 0 .56.18-.25.18-.53.18-.87-.11-.04-.07.07-.07.14-.14-.25.21-.46.1-.63.04-.11.11 0 .18 0 .12-.28.19-.57.21-.87h.07c.04.04.07.1.1.14.11-.07 0-.21-.1-.14.1-.59.31-1.07.31-1.6.04-.03.07-.07.07-.1-.1-.04-.1.03-.07.1-.1.04-.07.28-.1.42-.07 0-.07-.07-.18-.04.14.21-.18.35-.14.56-.18 0-.07.31-.24.31.14-.14.07-.52.24-.55-.07-.25.18-.49.14-.63.18 0-.07.21.1.28.14-.31-.14-.49.14-.8 0 .07.07.1.11.07.03-.07-.04-.07-.11-.07V2.4c.11.14.14.03.36 0-.07-.11-.04-.18-.1-.21.2-.21-.11-.42.03-.66.03 0 .11-.04.14-.04.07-.1-.03-.06-.07-.06.1-.07.04-.28.21-.25a.654.654 0 0 1-.01-.34c.04-.11.1-.21.19-.28.03-.11-.11-.07-.07-.18.18-.07.07-.28.18-.39.18.25.07.73.18 1.15.03.07-.07.07-.07.14.03.1.1.14.07.28 0 .03 0 .07-.07.07.03.09.08.17.14.24-.04.49-.42 1.18-.21 1.84.21-.14.07-.28.1-.41.07-.04.11.07.11-.04.31.25.03.7.07 1.01" fill="rgba(21,41,55,0.15)" id="svg_8"/></g></g></svg>
          </div>
        </div>`;


      pdfBuffer = await page.pdf({
        format: "A4",
        margin: { top: "0mm", bottom: "15mm", left: "0mm", right: "0mm" },
        printBackground: true,
        preferCSSPageSize: false,
        displayHeaderFooter: true,
        headerTemplate: "<div></div>",
        footerTemplate,
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
      // "padrao": SEM PAGINAÇÃO - página única contínua (NO PAGE BREAKS)
      const totalHeightPx = await page.evaluate(() => {
        const body = document.body;
        const html = document.documentElement;
        
        // Remove qualquer height fixa
        body.style.height = "auto";
        html.style.height = "auto";
        body.style.overflow = "visible";
        html.style.overflow = "visible";
        
        return Math.max(
          body.scrollHeight,
          body.offsetHeight,
          html.clientHeight,
          html.scrollHeight,
          html.offsetHeight
        );
      });
      
      // Largura A4 padrão (794px) com altura dinâmica + espaço do footer
      const widthPx = 794;
      const footerHeightPx = 59; // 34px (SVG) + 25px (padding-bottom)
      const totalHeightWithFooter = totalHeightPx + footerHeightPx;
      
      pdfBuffer = await page.pdf({
        width: `${widthPx}px`,
        height: `${totalHeightWithFooter}px`,
        printBackground: true,
        preferCSSPageSize: false,
        scale: 1,
        margin: { top: "0mm", bottom: "0mm", left: "0mm", right: "0mm" },
        displayHeaderFooter: false, // DESABILITA COMPLETAMENTE header/footer
        pageRanges: "1", // FORÇA página única
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
