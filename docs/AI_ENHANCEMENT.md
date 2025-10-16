# 🤖 Melhoria de Documentos com IA

Esta API permite melhorar automaticamente o conteúdo dos documentos usando Inteligência Artificial antes de gerar o PDF.

## 🔧 Configuração

### 1. Configurar a API Key

Crie um arquivo `.env.local` na raiz do projeto:

```env
OPENAI_API_KEY=sk-your-openai-api-key-here
```

Ou passe a chave diretamente no corpo da requisição (não recomendado para produção).

### 2. Obter uma API Key

1. Acesse: https://platform.openai.com/api-keys
2. Crie uma nova API Key
3. Copie e cole no arquivo `.env.local`

## 📤 Como Usar

### Exemplo de Requisição

```bash
curl -X POST http://localhost:3000/api/generate-pdf-from-html \
  -H "Content-Type: application/json" \
  -d '{
    "html": "<h1>Meu Documento</h1><p>Este é um texto com alguns erros gramaticais e que pode ser melhorado.</p>",
    "meta": {
      "title": "Relatório Mensal",
      "headerLabel": "ID",
      "headerValue": "REL-2024-001"
    },
    "aiEnhancement": {
      "enabled": true,
      "mode": "full"
    }
  }'
```

### Parâmetros do `aiEnhancement`

| Parâmetro | Tipo | Padrão | Descrição |
|-----------|------|--------|-----------|
| `enabled` | boolean | `false` | Ativa/desativa a melhoria com IA |
| `mode` | string | `"full"` | Modo de melhoria (veja abaixo) |
| `apiKey` | string | `process.env.OPENAI_API_KEY` | API Key customizada (opcional) |

### Modos de Melhoria

#### `"grammar"` - Correção Gramatical
Corrige apenas erros gramaticais e ortográficos.

```json
{
  "aiEnhancement": {
    "enabled": true,
    "mode": "grammar"
  }
}
```

#### `"clarity"` - Clareza
Melhora a legibilidade, tornando o texto mais objetivo e direto.

```json
{
  "aiEnhancement": {
    "enabled": true,
    "mode": "clarity"
  }
}
```

#### `"professional"` - Profissionalização
Torna o texto mais formal e adequado para documentos corporativos.

```json
{
  "aiEnhancement": {
    "enabled": true,
    "mode": "professional"
  }
}
```

#### `"full"` - Completo (Padrão)
Aplica todas as melhorias: gramática, clareza e profissionalização.

```json
{
  "aiEnhancement": {
    "enabled": true,
    "mode": "full"
  }
}
```

## 🔒 Segurança

### ⚠️ Importante

- **Nunca** commit sua API Key no código
- Use sempre variáveis de ambiente (`.env.local`)
- Adicione `.env.local` ao `.gitignore`
- Para produção, use secrets do seu provedor de hospedagem

### Rate Limits

A API OpenAI tem limites de requisições:
- Free tier: ~3 RPM (requests per minute)
- Paid tier: Varia conforme o plano

Considere implementar:
- Cache de resultados
- Fila de processamento
- Retry com backoff exponencial

## 💰 Comparação de Custos e Limites

| Provedor | Preço | Limite Grátis | Velocidade | Qualidade PT-BR | Recomendação |
|----------|-------|---------------|------------|-----------------|--------------|
| **Google Gemini** | 🆓 Grátis | 1500 req/dia | ⚡⚡⚡ Rápido | ⭐⭐⭐⭐⭐ Excelente | 🏆 **MELHOR OPÇÃO** |
| **Groq** | 🆓 Grátis | 14,400 tokens/min | ⚡⚡⚡⚡⚡ Muito Rápido | ⭐⭐⭐⭐ Ótimo | 🔥 **MAIS RÁPIDO** |
| **Ollama** | 🆓 Grátis | ∞ Ilimitado | ⚡⚡ Médio | ⭐⭐⭐⭐ Ótimo | 🏠 **PRIVACIDADE** |
| **OpenAI** | $0.01/doc | $5 inicial | ⚡⚡⚡ Rápido | ⭐⭐⭐⭐⭐ Excelente | 💼 Para escalar |
| **Hugging Face** | 🆓 Grátis | 30k req/mês | ⚡⚡ Médio | ⭐⭐⭐ Bom | 🔬 Experimental |
| **Cohere** | Trial grátis | 100 req/min | ⚡⚡⚡ Rápido | ⭐⭐⭐⭐ Ótimo | 🧪 Testar |

### 📊 Detalhes

#### Google Gemini (RECOMENDADO)
- **Custo:** 🆓 100% Grátis
- **Limite:** 1500 requisições/dia = ~45,000 documentos/mês
- **Ideal para:** Começar, produção leve/média
- **Setup:** 2 minutos

#### Groq (MAIS RÁPIDO)
- **Custo:** 🆓 Grátis
- **Velocidade:** Até 750 tokens/segundo!
- **Ideal para:** Alta performance, muitos documentos
- **Limitação:** Menos refinado em português

#### Ollama (PRIVADO)
- **Custo:** 🆓 Grátis forever
- **Hardware:** 8GB RAM mínimo
- **Ideal para:** Dados sensíveis, sem internet, ilimitado
- **Desvantagem:** Mais lento, precisa instalar

#### OpenAI (PAGO)
- **Custo:** ~$0.01 por documento
- **Qualidade:** ⭐⭐⭐⭐⭐ Melhor em PT-BR
- **Ideal para:** Quando acabar grátis do Gemini
- **$5 inicial:** ~500 documentos grátis

## 🎯 Exemplo Completo em JavaScript

```javascript
async function generateEnhancedPDF() {
  const response = await fetch('/api/generate-pdf-from-html', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      html: `
        <h1>Relatório de Desempenho</h1>
        <h2>Introdução</h2>
        <p>Este relatório apresenta os resultados do trimestre.</p>
        <ul>
          <li>Vendas aumentaram 15%</li>
          <li>Novos clientes: 234</li>
          <li>Satisfação: 4.5/5</li>
        </ul>
      `,
      meta: {
        title: 'Relatório Q4 2024',
        headerLabel: 'Documento',
        headerValue: 'REL-Q4-2024',
        validityMessage: 'Válido até: 31/12/2024'
      },
      aiEnhancement: {
        enabled: true,
        mode: 'professional' // Torna o documento mais profissional
      }
    })
  });

  if (response.ok) {
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'documento-melhorado.pdf';
    a.click();
  }
}
```

## 🧪 Testando

### Sem IA (rápido, sem custo)
```bash
curl -X POST http://localhost:3000/api/generate-pdf-from-html \
  -H "Content-Type: application/json" \
  -d '{"html":"<h1>Teste</h1>"}' \
  --output test.pdf
```

### Com IA (mais lento, com custo)
```bash
curl -X POST http://localhost:3000/api/generate-pdf-from-html \
  -H "Content-Type: application/json" \
  -d '{
    "html":"<h1>Teste</h1><p>Um texto que sera melhorado.</p>",
    "aiEnhancement":{"enabled":true,"mode":"full"}
  }' \
  --output test-enhanced.pdf
```

## 🆓 Opções GRATUITAS e com Tokens Limitados

### ⭐ MELHOR OPÇÃO GRATUITA: Google Gemini

**🎁 Grátis até 1500 requisições/dia** (muito generoso!)

```typescript
// Modificar a função enhanceDocumentWithAI para usar Gemini
const response = await fetch(
  `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${options.apiKey}`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: `Você é um assistente especializado em melhorar documentos em português. ${prompts[mode]} Retorne APENAS o HTML melhorado, sem explicações adicionais. Preserve TODAS as tags HTML.\n\nHTML:\n${html}`
        }]
      }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 8000,
      }
    })
  }
);

const data = await response.json();
const enhancedHtml = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
```

**Como obter a API Key:**
1. Acesse: https://aistudio.google.com/app/apikey
2. Clique em "Create API Key"
3. Copie e use! ✅

**Vantagens:**
- ✅ **100% GRÁTIS** até 1500 req/dia
- ✅ Sem necessidade de cartão de crédito
- ✅ Muito rápido (Gemini Flash)
- ✅ Excelente qualidade em português

### 🔥 OpenAI com Créditos Gratuitos

**$5 de crédito inicial** (suficiente para ~500 documentos)

```bash
# Use o código atual, apenas configure:
OPENAI_API_KEY=sk-your-key-here
```

**Como obter:**
1. Acesse: https://platform.openai.com/signup
2. Verifique seu telefone
3. Receba $5 em créditos
4. Válido por 3 meses

### 🚀 Outras Alternativas Gratuitas

#### 1. Groq (MUITO RÁPIDO + GRÁTIS)

**Limite: 14,400 tokens/minuto grátis**

```typescript
const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${options.apiKey}`
  },
  body: JSON.stringify({
    model: "llama3-70b-8192", // ou "mixtral-8x7b-32768"
    messages: [
      { role: "system", content: `${prompts[mode]} Retorne apenas HTML.` },
      { role: "user", content: html }
    ],
    temperature: 0.3,
    max_tokens: 4000
  })
});
```

**Obter chave:** https://console.groq.com/keys

**Vantagens:**
- ⚡ **SUPER RÁPIDO** (até 750 tokens/segundo!)
- ✅ Grátis e sem cartão
- ✅ Vários modelos (Llama, Mixtral)

#### 2. Hugging Face (GRÁTIS + Open Source)

**30,000 requests/mês grátis**

```typescript
const response = await fetch(
  "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2",
  {
    headers: {
      "Authorization": `Bearer ${options.apiKey}`,
      "Content-Type": "application/json"
    },
    method: "POST",
    body: JSON.stringify({
      inputs: `Melhore este documento HTML (apenas o conteúdo, preserve as tags):\n\n${html}`,
      parameters: {
        max_new_tokens: 2000,
        temperature: 0.3
      }
    })
  }
);
```

**Obter token:** https://huggingface.co/settings/tokens

#### 3. Cohere (TRIAL GRÁTIS)

**100 requests/minuto grátis**

```typescript
const response = await fetch("https://api.cohere.ai/v1/generate", {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${options.apiKey}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    model: "command",
    prompt: `Melhore este documento HTML:\n\n${html}`,
    max_tokens: 2000,
    temperature: 0.3
  })
});
```

**Obter chave:** https://dashboard.cohere.com/api-keys

### 🏠 Opção 100% Local (SEM INTERNET)

#### Ollama - Roda na sua máquina

**Totalmente GRÁTIS, sem limites, privado**

```bash
# 1. Instalar Ollama
# Windows: https://ollama.com/download
winget install Ollama.Ollama

# 2. Baixar um modelo
ollama pull llama3.2:3b  # Rápido, ~2GB
# ou
ollama pull qwen2.5:7b   # Melhor qualidade, ~4.7GB

# 3. Iniciar servidor
ollama serve
```

```typescript
// Modificar enhanceDocumentWithAI
const response = await fetch("http://localhost:11434/api/generate", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    model: "llama3.2:3b",
    prompt: `Você é um especialista em melhorar documentos. ${prompts[mode]} Preserve todas as tags HTML.\n\nHTML:\n${html}\n\nHTML melhorado:`,
    stream: false,
    options: {
      temperature: 0.3,
      num_predict: 4000
    }
  })
});

const data = await response.json();
const enhancedHtml = data.response;
```

**Vantagens:**
- ✅ **100% GRÁTIS** e offline
- ✅ **Privacidade total** (dados não saem da sua máquina)
- ✅ Sem limites de uso
- ✅ Vários modelos disponíveis
- ⚠️ Mais lento que APIs cloud

**Requisitos:**
- Windows 10/11
- 8GB+ RAM (16GB recomendado)
- ~5GB espaço em disco

## 🚀 Alternativas Pagas (quando escalar)

### Anthropic Claude
```typescript
const response = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": options.apiKey,
    "anthropic-version": "2023-06-01"
  },
  body: JSON.stringify({
    model: "claude-3-haiku-20240307",
    max_tokens: 4000,
    messages: [{
      role: "user",
      content: `${prompts[mode]}\n\n${html}`
    }]
  })
});
```

## 📊 Monitoramento

Adicione logs para monitorar o uso:

```typescript
console.log(`[IA] Tokens usados: ${data.usage.total_tokens}`);
console.log(`[IA] Custo estimado: $${(data.usage.total_tokens / 1000000 * 0.75).toFixed(4)}`);
```

## ❓ FAQ

**Q: A IA pode alterar a estrutura HTML?**  
A: Não. O prompt instrui a IA a preservar TODAS as tags, atributos e estrutura, modificando apenas o texto.

**Q: E se a API falhar?**  
A: O documento original será usado. Sempre há fallback para o HTML original.

**Q: Posso usar em produção?**  
A: Sim, mas considere:
- Implementar cache
- Monitorar custos
- Definir timeouts
- Ter rate limiting

**Q: Quanto tempo demora?**  
A: ~2-5 segundos com `gpt-4o-mini`, dependendo do tamanho do documento.

## 📝 Notas

- A melhoria é **opcional** e pode ser desabilitada a qualquer momento
- O HTML original **sempre** é preservado em caso de erro
- A IA **não** tem acesso a dados externos, apenas ao HTML fornecido
- Considere implementar **cache** para documentos similares
