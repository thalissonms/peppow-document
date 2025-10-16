# 🚀 Guia Rápido: IA Gratuita em 5 Minutos

## ⭐ Opção 1: Google Gemini (RECOMENDADO - 100% GRÁTIS)

### Passo 1: Obter API Key (2 minutos)

1. Acesse: https://aistudio.google.com/app/apikey
2. Faça login com sua conta Google
3. Clique em **"Create API Key"**
4. Clique em **"Create API key in new project"**
5. Copie a chave gerada (começa com `AIza...`)

### Passo 2: Configurar no Projeto

Crie o arquivo `.env.local` na raiz do projeto:

```bash
GEMINI_API_KEY=AIzaSy...your-key-here
```

### Passo 3: Usar na API

```typescript
const response = await fetch('/api/generate-pdf-from-html', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    html: "<h1>Meu Documento</h1><p>Texto para melhorar...</p>",
    aiEnhancement: {
      enabled: true,
      mode: "full",
      provider: "gemini"  // ← Usa Gemini (grátis!)
    }
  })
});
```

### ✅ Pronto! Você tem:
- ✅ 1500 requisições/dia GRÁTIS
- ✅ ~45,000 documentos/mês
- ✅ Sem cartão de crédito
- ✅ Qualidade excelente em PT-BR

---

## 🔥 Opção 2: Groq (SUPER RÁPIDO - GRÁTIS)

### Passo 1: Obter API Key

1. Acesse: https://console.groq.com/
2. Faça login (email ou GitHub)
3. Vá em **"API Keys"**
4. Clique em **"Create API Key"**
5. Copie a chave

### Passo 2: Configurar

```bash
GROQ_API_KEY=gsk_...your-key-here
```

### Passo 3: Usar

```typescript
aiEnhancement: {
  enabled: true,
  provider: "groq",  // ← Groq (muito rápido!)
  apiKey: process.env.GROQ_API_KEY
}
```

### ⚡ Vantagens:
- ✅ Até 750 tokens/segundo!
- ✅ 14,400 tokens/minuto grátis
- ✅ Muito mais rápido que outros

---

## 🏠 Opção 3: Ollama (LOCAL - PRIVADO)

### Passo 1: Instalar Ollama

**Windows:**
```powershell
winget install Ollama.Ollama
```

**Ou baixe:** https://ollama.com/download

### Passo 2: Baixar um Modelo

```powershell
# Modelo pequeno (2GB) - Rápido
ollama pull llama3.2:3b

# OU modelo melhor (4.7GB) - Mais qualidade
ollama pull qwen2.5:7b
```

### Passo 3: Iniciar Servidor

```powershell
ollama serve
```

Deixe este terminal aberto!

### Passo 4: Usar

```typescript
aiEnhancement: {
  enabled: true,
  provider: "ollama",  // ← Roda local!
  apiKey: "not-needed"  // Não precisa de chave
}
```

### 🏆 Vantagens:
- ✅ 100% GRÁTIS e offline
- ✅ Privacidade total (dados não saem da máquina)
- ✅ Sem limites de uso
- ⚠️ Mais lento, precisa de 8GB+ RAM

---

## 📊 Qual Escolher?

| Situação | Recomendação |
|----------|--------------|
| **Quero começar rápido** | ⭐ **Google Gemini** |
| **Preciso de velocidade** | 🔥 **Groq** |
| **Dados confidenciais** | 🏠 **Ollama (local)** |
| **Produção escalável** | 💼 **OpenAI** (depois que acabar grátis) |

---

## 🧪 Testar a Integração

### Teste 1: Verificar Conexão

```bash
# Gemini
curl "https://generativelanguage.googleapis.com/v1beta/models?key=YOUR_API_KEY"

# Groq
curl -H "Authorization: Bearer YOUR_API_KEY" https://api.groq.com/openai/v1/models

# Ollama
curl http://localhost:11434/api/tags
```

### Teste 2: Gerar um PDF Melhorado

```javascript
// teste-ia.js
const html = `
<h1>Relatório de Teste</h1>
<p>Este é um texto simples que sera melhorado pela IA.</p>
<ul>
  <li>Item um</li>
  <li>Item dois</li>
</ul>
`;

fetch('http://localhost:3000/api/generate-pdf-from-html', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    html,
    aiEnhancement: {
      enabled: true,
      mode: 'full',
      provider: 'gemini'  // ou 'groq' ou 'ollama'
    }
  })
})
.then(res => res.blob())
.then(blob => {
  const url = URL.createObjectURL(blob);
  console.log('PDF gerado:', url);
});
```

---

## 🆘 Problemas Comuns

### "API key not valid"
- Verifique se a chave está correta no `.env.local`
- Reinicie o servidor: `npm run dev`

### "Failed to fetch"
- **Gemini/Groq:** Verifique sua conexão com internet
- **Ollama:** Certifique-se que `ollama serve` está rodando

### "Response too short"
- Normal! A IA retorna o HTML original se algo falhar
- Verifique os logs do console para detalhes

### Ollama lento
- Use modelo menor: `ollama pull llama3.2:3b`
- Ou adicione mais RAM ao seu PC

---

## 💡 Dicas

### Para Economizar Tokens
```typescript
// Não melhore documentos muito grandes
if (html.length > 50000) {
  console.log('Documento muito grande, pulando IA');
  return html;
}
```

### Cache de Resultados
```typescript
// Salve documentos já melhorados em cache
const cacheKey = crypto.createHash('md5').update(html).digest('hex');
const cached = await redis.get(cacheKey);
if (cached) return cached;
```

### Monitorar Uso
```typescript
console.log({
  provider: 'gemini',
  inputSize: html.length,
  outputSize: enhanced.length,
  timestamp: new Date().toISOString()
});
```

---

## ✅ Checklist Final

- [ ] API Key obtida
- [ ] `.env.local` criado com a chave
- [ ] Servidor reiniciado (`npm run dev`)
- [ ] Teste realizado com sucesso
- [ ] Documentos sendo melhorados! 🎉

---

## 📚 Recursos Adicionais

- [Documentação Gemini](https://ai.google.dev/gemini-api/docs)
- [Documentação Groq](https://console.groq.com/docs)
- [Documentação Ollama](https://ollama.com/library)
- [Arquivo de exemplo](../src/pages/api/enhance-with-ai-example.ts)

---

## 🎯 Próximos Passos

1. ✅ Configure uma das opções gratuitas
2. 📊 Teste com seus documentos reais
3. 🚀 Ajuste os prompts para seu caso de uso
4. 💰 Quando escalar, considere OpenAI pago

**Dúvidas?** Veja o arquivo [AI_ENHANCEMENT.md](./AI_ENHANCEMENT.md) com documentação completa!
