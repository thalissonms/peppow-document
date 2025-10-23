# Migração do Sistema de Estilos

## O que mudou?

Anteriormente, o sistema gerava HTML com estilos inline através do `documentTemplate.ts`. Agora, utilizamos um **sistema de cache de estilos** que garante consistência visual entre o preview e o PDF final.

## Nova Arquitetura

### 1. **styleGenerator.ts** (Novo)
- Lê o `style.css` do template
- Substitui variáveis CSS pelas cores da `BrandConfig`
- Faz cache em memória para melhor performance
- Inline de assets (fontes, imagens) para data URLs

### 2. **generate-preview.ts** (Nova API)
- Endpoint: `/api/generate-preview`
- Gera o HTML de preview usando o CSS cacheado
- Garante que o preview seja idêntico ao PDF final

### 3. **useDocumentPreview.ts** (Novo Hook)
- Hook React para gerenciar o estado do preview
- Chama a API `generate-preview` automaticamente
- Gerencia loading e erros

## Fluxo Atualizado

```
┌─────────────────────────────────────────────────────┐
│  Usuário configura cores da marca (BrandConfig)    │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│  styleGenerator.ts                                  │
│  1. Lê style.css original                          │
│  2. Substitui variáveis CSS pelas cores da marca   │
│  3. Faz inline de assets (fontes, imagens)         │
│  4. Armazena em cache (hash da configuração)       │
└────────────────┬────────────────────────────────────┘
                 │
                 ├────────────────┬────────────────────┐
                 ▼                ▼                    ▼
         ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
         │   Preview    │  │  PDF Final   │  │   Editor     │
         │   (iframe)   │  │  (Puppeteer) │  │  (Lexical)   │
         └──────────────┘  └──────────────┘  └──────────────┘
```

## Benefícios

### ✅ Consistência Visual
- Preview e PDF final são **idênticos**
- Mesmo CSS aplicado em ambos os contextos

### ✅ Performance
- CSS cacheado em memória (evita reprocessamento)
- Inline de assets (menos requisições HTTP)

### ✅ Manutenibilidade
- Um único arquivo CSS (`style.css`) define todos os estilos
- Mudanças no design são feitas apenas no `style.css`
- Cores da marca injetadas automaticamente

### ✅ Separação de Responsabilidades
- `style.css`: Define estrutura e layout
- `BrandConfig`: Define cores da marca
- `styleGenerator.ts`: Combina ambos

## Como Usar

### No Componente React

```tsx
import { useDocumentPreview } from "@/hooks/useDocumentPreview";

const { previewHTML, generatePreview } = useDocumentPreview({
  brandConfig,
  documentMeta,
});

// Gera preview automaticamente quando o conteúdo muda
useEffect(() => {
  if (contentHTML) {
    generatePreview(contentHTML, pdfLayout);
  }
}, [contentHTML, pdfLayout, generatePreview]);
```

### Na API de Geração de PDF

```ts
import { getCachedCustomizedCSS } from "@/lib/styleGenerator";

// Obtém CSS customizado (usa cache quando possível)
const customizedCSS = await getCachedCustomizedCSS(brandConfig);

// Injeta no template HTML
const inlineStyles = `<style>${customizedCSS}</style>`;
```

## Arquivos Removidos

- ❌ `lib/documentTemplate.ts` - Substituído pelo sistema de cache

## Arquivos Novos

- ✅ `lib/styleGenerator.ts` - Geração e cache de CSS
- ✅ `hooks/useDocumentPreview.ts` - Hook para preview
- ✅ `src/pages/api/generate-preview.ts` - API de preview

## Arquivos Atualizados

- 🔄 `src/pages/api/generate-pdf-from-html.ts` - Usa CSS cacheado
- 🔄 `src/app/preview/config/page.tsx` - Usa novo hook
- 🔄 `components/RichTextEditor.tsx` - Usa mesmas variáveis CSS
- 🔄 `components/DocumentPreview.tsx` - Integrado com novo sistema

## Migração de Código Legado

Se você tem código que usa `generateDocumentHTML` do `documentTemplate.ts`:

### Antes:
```ts
import { generateDocumentHTML } from "@/lib/documentTemplate";

const html = generateDocumentHTML(content, meta, brandConfig);
```

### Depois:
```ts
// Use a API generate-preview
const response = await fetch("/api/generate-preview", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    html: content,
    meta,
    brandConfig,
    layout: "a4"
  }),
});

const { html } = await response.json();
```

Ou use o hook React:

```ts
import { useDocumentPreview } from "@/hooks/useDocumentPreview";

const { previewHTML, generatePreview } = useDocumentPreview({
  brandConfig,
  documentMeta: meta,
});

generatePreview(content, "a4");
```

## Cache

O cache é armazenado em memória usando um `Map`:

```ts
// Hash baseado nas cores da marca
const hash = generateBrandConfigHash(brandConfig);

// CSS é cacheado por configuração
styleCache.set(hash, customizedCSS);

// Limite de 50 configurações em cache
// (as mais antigas são removidas automaticamente)
```

## Variáveis CSS Disponíveis

As seguintes variáveis CSS são injetadas automaticamente:

```css
--bg-color: ${brandConfig.backgroundColor}
--primary-orange: ${brandConfig.primaryColor}
--dark-blue: ${brandConfig.secondaryColor}
--medium-blue: ${brandConfig.accentColor}
--light-text: #fff9d5
--dark-text: ${brandConfig.secondaryColor}
--orange-accent-light: ${brandConfig.primaryColor}1A
--orange-accent-medium: ${brandConfig.primaryColor}66
--orange-accent-strong: ${brandConfig.primaryColor}CC
--blue-accent-light: ${brandConfig.accentColor}40
--blue-accent-medium: ${brandConfig.accentColor}66
```

## Logs

O sistema registra logs úteis para debugging:

```
[styleGenerator] Gerando novo CSS customizado (hash: abc123)
[styleGenerator] CSS encontrado em cache (hash: abc123)
[styleGenerator] Não foi possível embutir asset: /fonts/missing.woff2
```

## Testes

Para limpar o cache durante desenvolvimento:

```ts
import { clearStyleCache } from "@/lib/styleGenerator";

clearStyleCache();
```

---

**Data da Migração:** 22 de outubro de 2025  
**Autor:** Sistema de Geração de Documentos
