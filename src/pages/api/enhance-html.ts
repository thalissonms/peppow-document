import type { NextApiRequest, NextApiResponse } from "next";

type AIEnhancementOptions = {
  html: string;
  mode?: "grammar" | "clarity" | "professional" | "full";
  provider?: "gemini" | "openai" | "groq" | "ollama";
  apiKey?: string;
};

type Meta = {
  title?: string;
  headerLabel?: string;
  headerValue?: string;
  validityMessage?: string;
};

// Função para melhorar o HTML usando IA
const enhanceDocumentWithAI = async (
  html: string,
  provider: string,
  mode: string,
  apiKey: string,
  meta?: Meta
): Promise<string> => {
  try {
    const prompts = {
      grammar:
        "Corrija APENAS erros gramaticais e ortográficos no texto em português, mantendo TODO o HTML intacto (tags, atributos, classes, estrutura).",
      clarity:
        "Melhore a clareza e legibilidade do texto em português, tornando-o mais objetivo e direto. Mantenha TODO o HTML intacto.",
      professional:
        "Torne o texto em português mais profissional e formal, adequado para documentos corporativos. Mantenha TODO o HTML intacto.",
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

  const headerContext = `\n\nCONTEXTO DO CABEÇALHO (para evitar duplicações no corpo):\n- Título principal: ${meta?.title ?? ""}\n- Identificador: ${(meta?.headerLabel ?? "").trim()} ${(meta?.headerValue ?? "").trim()}\n- Validade: ${meta?.validityMessage ?? ""}\nSe o primeiro título/linha do corpo repetir esses valores, remova-os DO CORPO apenas nesses casos.`;

  // ====== GOOGLE GEMINI (GRÁTIS - PADRÃO) ======
    if (provider === "gemini") {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `Você é um assistente especializado em melhorar documentos empresariais em português brasileiro.

INSTRUÇÃO: ${prompts[mode as keyof typeof prompts]}

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
    <div class="absolute inset-0 flex items-center justify-center font-['Kanit:Bold',_sans-serif] text-[22px] text-[#ff5e2b]">1</div>
  </div>
  <h2 class="font-['Kanit:Bold',_sans-serif] text-[26px] text-[#ff5e2b]">Título</h2>
</div>

Lista estilizada:
<ul class="space-y-[5px]">
  <li class="flex gap-[5px]">
    <span class="text-[#ff5e2b]">•</span>
    <span class="font-['Kanit:Regular',_sans-serif] text-[12px] text-[#152937]">
      <strong class="font-['Kanit:Medium',_sans-serif]">Item:</strong> Descrição
    </span>
  </li>
</ul>

Tabela profissional:
<table class="w-full border-collapse">
  <thead>
    <tr class="bg-[rgba(255,94,43,0.8)]">
      <th class="px-[15px] py-[10px] font-['Kanit:SemiBold',_sans-serif] text-[#fff9d5]">Coluna</th>
    </tr>
  </thead>
  <tbody>
    <tr class="bg-[rgba(255,255,255,0.9)]">
      <td class="px-[15px] py-[10px] font-['Kanit:Regular',_sans-serif] text-[14px]">Dado</td>
    </tr>
  </tbody>
</table>

Card de destaque:
<div class="bg-[#152937] rounded-[10px] p-[15px]">
  <p class="font-['Kanit:SemiBold',_sans-serif] text-[#afcde1] text-[14px]">Título:</p>
  <p class="font-['Kanit:Regular',_sans-serif] text-[#fff9d5] text-[14px]">Conteúdo</p>
</div>

Badge/Tag:
<div class="inline-flex bg-[rgba(21,76,113,0.25)] border border-[#154c71] rounded-[5px] px-[10px] py-[5px]">
  <span class="font-['Kanit:SemiBold',_sans-serif] text-[#154c71] text-[14px]">Tag</span>
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

${headerContext}

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
              {
                category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                threshold: "BLOCK_NONE",
              },
              {
                category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                threshold: "BLOCK_NONE",
              },
            ],
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Erro Gemini:", response.status, errorData);
        throw new Error(`Erro Gemini: ${response.status}`);
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
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: `Você é um assistente especializado em melhorar documentos em português. ${prompts[mode as keyof typeof prompts]} ${headerContext} Retorne APENAS o HTML melhorado, sem explicações.`,
            },
            { role: "user", content: html },
          ],
          temperature: 0.3,
          max_tokens: 4000,
        }),
      });

      if (!response.ok) {
        console.error("Erro OpenAI:", response.status);
        throw new Error(`Erro OpenAI: ${response.status}`);
      }

      const data = await response.json();
      enhancedHtml = data.choices?.[0]?.message?.content?.trim();
    }

    // ====== GROQ ======
  else if (provider === "groq") {
      const response = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [
              {
                role: "system",
                content: `Você é um assistente especializado em melhorar documentos em português. ${prompts[mode as keyof typeof prompts]} ${headerContext} Retorne APENAS o HTML melhorado, sem explicações.`,
              },
              { role: "user", content: html },
            ],
            temperature: 0.3,
            max_tokens: 4000,
          }),
        }
      );

      if (!response.ok) {
        console.error("Erro Groq:", response.status);
        throw new Error(`Erro Groq: ${response.status}`);
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
          prompt: `Você é um especialista em melhorar documentos em português. ${prompts[mode as keyof typeof prompts]}

${headerContext}

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
        throw new Error(`Erro Ollama: ${response.status}`);
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

    console.log(
      `[${provider.toUpperCase()}] Documento melhorado: ${html.length} → ${cleaned.length} chars`
    );

    return cleaned;
  } catch (error) {
    console.error("Erro ao melhorar documento com IA:", error);
    throw error;
  }
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Método não suportado." });
    return;
  }

  try {
  const { html, provider = "gemini", mode = "full", apiKey, meta } = req.body as AIEnhancementOptions & { meta?: Meta };

    if (!html) {
      res.status(400).json({ error: "HTML é obrigatório." });
      return;
    }

    if (!apiKey) {
      res.status(400).json({ error: "API Key é obrigatória." });
      return;
    }

    const enhancedHtml = await enhanceDocumentWithAI(
      html,
      provider,
      mode,
      apiKey,
      meta
    );

    res.status(200).json({ enhancedHtml });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao melhorar o documento.";
    res.status(400).json({ error: message });
  }
}
