// Implementação GRATUITA com Google Gemini
// Copie este código para substituir a função enhanceDocumentWithAI

import type { NextApiRequest, NextApiResponse } from "next";

type AIEnhancementOptions = {
  enabled: boolean;
  mode?: "grammar" | "clarity" | "professional" | "full";
  apiKey?: string;
  provider?: "gemini" | "openai" | "groq" | "ollama";
};

/**
 * Melhora o documento usando IA (Google Gemini - GRATUITO)
 * 
 * Limites Gratuitos:
 * - 1500 requisições/dia
 * - ~45,000 documentos/mês
 * - Sem necessidade de cartão de crédito
 * 
 * Obter API Key: https://aistudio.google.com/app/apikey
 */
const enhanceDocumentWithAI = async (
  html: string,
  options: AIEnhancementOptions
): Promise<string> => {
  if (!options.enabled || !options.apiKey) {
    return html;
  }

  try {
    const mode = options.mode || "full";
    const provider = options.provider || "gemini";

    const prompts = {
      grammar:
        "Corrija APENAS erros gramaticais e ortográficos no texto em português, mantendo TODO o HTML intacto (tags, atributos, classes, estrutura).",
      clarity:
        "Melhore a clareza e legibilidade do texto em português, tornando-o mais objetivo e direto. Mantenha TODO o HTML intacto.",
      professional:
        "Torne o texto em português mais profissional e formal, adequado para documentos corporativos. Mantenha TODO o HTML intacto.",
      full: `Você é um especialista em melhorar a APARÊNCIA VISUAL (apenas visual) de documentos empresariais em português brasileiro.

⚠️ NÃO ALTERE O TEXTO nem reescreva. Apenas organize e estilize com classes Tailwind dentro do padrão de cores e fonte Kanit.

PDF A4: evite quebras de página no meio de tabelas/cards/listas (use no-break/avoid-break/page-break-avoid), deixe imagens responsivas (max-w-full h-auto), não use style inline, nem fontes além de Kanit.

Regra de duplicação: se o PRIMEIRO título do corpo (H1/H2) repetir o título principal do documento, remova esse título do corpo. Se houver uma descrição abaixo repetindo validade/ID do cabeçalho, remova-a do corpo. Não remova mais nada além disso.

Retorne apenas o HTML melhorado.`,
    };

    // Extrair texto para validação
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

    // ====== GOOGLE GEMINI (GRÁTIS) ======
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
                    text: `Você é um assistente especializado em melhorar documentos em português brasileiro.

INSTRUÇÃO: ${prompts[mode]}

REGRAS IMPORTANTES:
1. Retorne APENAS o HTML melhorado
2. NÃO adicione explicações, comentários ou marcações de código
3. PRESERVE todas as tags HTML exatamente como estão
4. PRESERVE todos os atributos, classes e estrutura
5. Melhore APENAS o conteúdo de texto dentro das tags
6. Não remova nem adicione tags HTML

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
              {
                category: "HARM_CATEGORY_HARASSMENT",
                threshold: "BLOCK_NONE",
              },
              {
                category: "HARM_CATEGORY_HATE_SPEECH",
                threshold: "BLOCK_NONE",
              },
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
        return html;
      }

      const data = await response.json();
      enhancedHtml = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    }

    // ====== GROQ (GRÁTIS, SUPER RÁPIDO) ======
    else if (provider === "groq") {
      const response = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
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
        }
      );

      if (!response.ok) {
        console.error("Erro Groq:", response.status);
        return html;
      }

      const data = await response.json();
      enhancedHtml = data.choices?.[0]?.message?.content?.trim();
    }

    // ====== OLLAMA (LOCAL, GRÁTIS) ======
    else if (provider === "ollama") {
      const response = await fetch("http://localhost:11434/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "llama3.2:3b", // ou "qwen2.5:7b" para melhor qualidade
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

    // ====== OPENAI (PAGO, $5 inicial) ======
    else if (provider === "openai") {
      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
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
        }
      );

      if (!response.ok) {
        console.error("Erro OpenAI:", response.status);
        return html;
      }

      const data = await response.json();
      enhancedHtml = data.choices?.[0]?.message?.content?.trim();
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
    console.error(`Erro ao melhorar documento:`, error);
    return html; // Sempre retorna o original em caso de erro
  }
};

// ====== EXEMPLO DE USO ======

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
    const { html, aiEnhancement } = req.body as {
      html?: string;
      aiEnhancement?: Partial<AIEnhancementOptions>;
    };

    if (!html) {
      res.status(400).json({ error: "HTML é obrigatório." });
      return;
    }

    // Configuração da IA
    const aiOptions: AIEnhancementOptions = {
      enabled: aiEnhancement?.enabled ?? false,
      mode: aiEnhancement?.mode ?? "full",
      provider: aiEnhancement?.provider ?? "gemini", // padrão: Google Gemini (grátis)
      apiKey:
        aiEnhancement?.apiKey ??
        process.env.GEMINI_API_KEY ?? // Tenta Gemini primeiro
        process.env.OPENAI_API_KEY, // Fallback para OpenAI
    };

    // Aplicar melhoria com IA
    let processedHtml = html;
    if (aiOptions.enabled) {
      console.log(
        `[IA] Melhorando com ${aiOptions.provider} (modo: ${aiOptions.mode})...`
      );
      const startTime = Date.now();
      processedHtml = await enhanceDocumentWithAI(html, aiOptions);
      const duration = Date.now() - startTime;
      console.log(`[IA] Concluído em ${duration}ms`);
    }

    res.status(200).json({ enhancedHtml: processedHtml });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao processar documento.";
    res.status(500).json({ error: message });
  }
}
