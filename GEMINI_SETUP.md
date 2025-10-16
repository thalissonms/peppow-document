# 🚀 Configuração Rápida - Google Gemini

## ✨ Por que Gemini?

- 🎁 **Grátis**: 1500 requisições/dia (sem cartão de crédito)
- ⚡ **Rápido**: Gemini 2.5 Flash é otimizado para velocidade e inteligência
- 🇧🇷 **Português**: Excelente compreensão de português brasileiro
- 🔒 **Seguro**: API oficial do Google

---

## 📝 Passo a Passo (2 minutos)

### 1️⃣ Obter Chave da API

1. Acesse: https://aistudio.google.com/app/apikey
2. Faça login com sua conta Google
3. Clique em **"Create API key"**
4. Selecione um projeto (ou crie um novo)
5. Copie a chave gerada (formato: `AIza...`)

### 2️⃣ Configurar no Projeto

Crie um arquivo `.env.local` na raiz do projeto:

```bash
GEMINI_API_KEY=AIza...sua-chave-aqui
```

### 3️⃣ Testar a API

```bash
# 1. Inicie o servidor
npm run dev

# 2. Teste o endpoint (PowerShell)
$body = @{
    html = "<h1>Teste de Documento</h1><p>Este é um teste simples de melhoria com IA.</p>"
    aiEnhancement = @{
        enabled = $true
        provider = "gemini"
        mode = "full"
    }
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/generate-pdf-from-html" `
    -Method POST `
    -ContentType "application/json" `
    -Body $body `
    -OutFile "teste.pdf"
```

---

## 🎯 Modos de Melhoria

Configure o campo `mode` conforme sua necessidade:

| Modo | Descrição | Exemplo |
|------|-----------|---------|
| `grammar` | Apenas corrige gramática e ortografia | "tanbem" → "também" |
| `clarity` | Melhora clareza e legibilidade | Frases complexas → diretas |
| `professional` | Torna o texto mais formal | "Olá" → "Prezado(a)" |
| `full` | Combinação de todos acima | Correção + clareza + formalidade |

---

## 💡 Exemplo de Uso no Código

```typescript
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const response = await fetch('http://localhost:3000/api/generate-pdf-from-html', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      html: '<h1>Relatório Anual</h1><p>Este documento apresenta os resultados...</p>',
      aiEnhancement: {
        enabled: true,
        provider: 'gemini',    // ou 'openai', 'groq', 'ollama'
        mode: 'professional',  // torna o texto mais formal
      },
    }),
  });

  const pdfBuffer = await response.arrayBuffer();
  res.setHeader('Content-Type', 'application/pdf');
  res.send(Buffer.from(pdfBuffer));
}
```

---

## 🔧 Trocar de Provider

Para usar outro provider, basta alterar:

```typescript
aiEnhancement: {
  enabled: true,
  provider: "openai",  // 'gemini' | 'openai' | 'groq' | 'ollama'
  mode: "full"
}
```

E adicionar a chave correspondente no `.env.local`:

```bash
# OpenAI (pago)
OPENAI_API_KEY=sk-...

# Groq (grátis com limite)
GROQ_API_KEY=gsk_...

# Ollama (local - não precisa de chave)
# Instale em: https://ollama.com/download
```

---

## 📊 Limites do Gemini

| Recurso | Limite Gratuito |
|---------|-----------------|
| Requisições/dia | 1.500 |
| Tokens/minuto | 1.000.000 |
| Requisições/minuto | 1.000 |
| Cartão de crédito | ❌ Não necessário |

---

## ❓ Solução de Problemas

### Erro: "API key not valid"
✅ Verifique se copiou a chave completa (começa com `AIza`)
✅ Confirme que criou o arquivo `.env.local` (não `.env`)
✅ Reinicie o servidor Next.js (`npm run dev`)

### Erro: "429 - Too Many Requests"
✅ Você excedeu o limite de 1500 req/dia
✅ Aguarde até o próximo dia ou use outra chave

### Resposta vazia ou inválida
✅ HTML muito curto (< 10 caracteres)
✅ Timeout da API (tente novamente)
✅ Verifique os logs no console

---

## 📚 Documentação Completa

- [AI_ENHANCEMENT.md](./AI_ENHANCEMENT.md) - Guia completo com todos os providers
- [AI_FREE_OPTIONS.md](./AI_FREE_OPTIONS.md) - Comparação de opções gratuitas
- [QUICK_START_AI.md](./QUICK_START_AI.md) - Setup de 5 minutos

---

## 🎓 Próximos Passos

1. ✅ Configure sua chave do Gemini
2. 🧪 Teste com documentos reais
3. 🎨 Ajuste o modo conforme necessidade
4. 📈 Monitore o uso no [Google AI Studio](https://aistudio.google.com)
5. 🚀 Integre no seu fluxo de trabalho

---

**Dica Pro**: Use `mode: "grammar"` para revisões rápidas e `mode: "full"` para documentos oficiais! 🎯
