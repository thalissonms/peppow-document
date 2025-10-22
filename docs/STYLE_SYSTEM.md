# Sistema de Estilos Customizados com Cache

## 📋 Resumo

Sistema que gera e cacheia CSS customizado baseado no `style.css` do template, injetando as cores da marca automaticamente. Garante que o **preview e o PDF final sejam idênticos**.

## 🎯 Arquitetura

```
BrandConfig (cores) → styleGenerator → CSS Cacheado → Preview/PDF/Editor
```

## 🚀 Como Usar

### Em Componentes React

```tsx
import { useDocumentPreview } from "@/hooks/useDocumentPreview";

const { previewHTML, generatePreview } = useDocumentPreview({
  brandConfig,
  documentMeta,
});

useEffect(() => {
  if (html) {
    generatePreview(html, "a4");
  }
}, [html, generatePreview]);
```

### Em APIs

```ts
import { getCachedCustomizedCSS } from "@/lib/styleGenerator";

const customCSS = await getCachedCustomizedCSS(brandConfig);
```

## 📁 Arquivos Principais

- **`lib/styleGenerator.ts`** - Gera e cacheia CSS
- **`hooks/useDocumentPreview.ts`** - Hook para preview
- **`src/pages/api/generate-preview.ts`** - API de preview
- **`public/templates/document/style.css`** - Template CSS base

## 🎨 Variáveis CSS Injetadas

| Variável | Fonte | Exemplo |
|----------|-------|---------|
| `--bg-color` | `brandConfig.backgroundColor` | `#fff9d5` |
| `--primary-orange` | `brandConfig.primaryColor` | `#ff5e2b` |
| `--dark-blue` | `brandConfig.secondaryColor` | `#152937` |
| `--medium-blue` | `brandConfig.accentColor` | `#154c71` |

## ✅ Benefícios

- ✅ Preview e PDF idênticos
- ✅ CSS cacheado (melhor performance)
- ✅ Um único arquivo CSS para toda a aplicação
- ✅ Cores da marca injetadas automaticamente

## 📚 Documentação Completa

Veja [STYLE_SYSTEM_MIGRATION.md](./STYLE_SYSTEM_MIGRATION.md) para detalhes completos sobre a migração e arquitetura.
