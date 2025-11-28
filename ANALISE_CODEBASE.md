# 📊 Análise Completa da Codebase - docx-to-pdf-template

**Data da Análise:** 28 de novembro de 2025  
**Versão do Projeto:** 0.1.0  
**Status:** Em Desenvolvimento

---

## 🎯 Resumo Executivo

Aplicação **Next.js 15.5.5 + TypeScript** que converte documentos `.docx` em PDFs padronizados com marca corporativa. O sistema combina **Mammoth.js** (conversão DOCX→HTML) com **Puppeteer** (renderização HTML→PDF) e oferece suporte a **IA para melhoria visual** (Gemini, OpenAI, Groq).

### Objetivo Principal
Automatizar a geração de PDFs profissionais a partir de documentos Word, aplicando layout padronizado, branding corporativo e opcionalmente, melhorias de conteúdo/visual via IA.

---

## 📦 Stack Tecnológico

### Frontend
- **Next.js 15.5.5** - Framework React com SSR/SSG
- **React 19.1.0** - Biblioteca UI
- **TypeScript 5** - Tipagem estática
- **Tailwind CSS 4** - Estilização utilitária
- **Radix UI** - Componentes acessíveis (Button, Popover, Tabs, Select, Switch, Label, etc.)
- **Lucide React** - Ícones SVG
- **CKEditor 5** - Editor WYSIWYG (v41.4.2)
- **Lexical** - Editor de texto alternativo (v0.37.0)

### Backend (API Routes)
- **Next.js API Routes** - Servidor Node.js
- **Formidable 3.5.4** - Parse de multipart form data
- **Mammoth 1.11.0** - Conversão DOCX→HTML com preservação de estilos
- **Puppeteer 24.24.1** - Renderização headless Chrome (desenvolvimento)
- **Puppeteer-core 24.3.0** - Sem Chromium bundled (produção)
- **@sparticuz/chromium 141.0.0** - Chromium otimizado para serverless

### Build & Dev Tools
- **Tailwind CSS 4** - PostCSS plugin
- **ESLint 9** - Linting
- **Next.js CLI** - Dev server, build, start

### Fontes
- **@fontsource/kanit 5.2.8** - Fonte tailandesa customizada

---

## 🏗️ Arquitetura do Projeto

### Estrutura de Diretórios

```
docx-to-pdf-template/
├── src/app/
│   ├── layout.tsx          # Layout raiz com Geist fonts
│   ├── page.tsx            # Página principal (158 linhas)
│   ├── globals.css         # Estilos globais
│   ├── page.module.css     # Estilos locais da página
│   └── preview/
│       ├── page.tsx        # Página de preview
│       └── config/
│           └── page.tsx    # Página de configuração
│
├── src/pages/api/          # API Routes (Backend)
│   ├── generate-pdf.ts     # 406 linhas - Core: DOCX→PDF
│   ├── convert-docx.ts     # 205 linhas - DOCX→HTML
│   ├── enhance-html.ts     # 433 linhas - IA para melhorias
│   ├── generate-pdf-from-html.ts
│   ├── generate-preview.ts
│   └── brand-css.ts        # CSS dinâmico baseado em branding
│
├── components/             # Componentes React
│   ├── DocumentUpload.tsx   # Upload com drag-drop
│   ├── DocumentEditor.tsx   # Editor de conteúdo
│   ├── DocumentPreview.tsx  # Preview do PDF
│   ├── DocumentGeneratorExample.tsx
│   ├── BrandConfiguration.tsx
│   ├── ColorPicker.tsx
│   ├── RichTextEditor.tsx
│   ├── EditorHelper.tsx
│   └── ui/                 # Componentes Radix UI wrapped
│       ├── Alert.tsx
│       ├── Button.tsx
│       ├── Card.tsx
│       ├── HoverPopover.tsx
│       ├── Input.tsx
│       ├── Label.tsx
│       ├── Popover.tsx
│       ├── Select.tsx
│       ├── Separator.tsx
│       ├── Switch.tsx
│       ├── Tabs.tsx
│       └── Textarea.tsx
│
├── hooks/                  # React Hooks customizados
│   ├── usePDFGenerator.ts  # Geração de PDF com html2pdf.js
│   ├── useBrandConfig.ts   # Gerenciamento de branding
│   ├── useDocumentConversion.ts
│   ├── useDocumentPreview.ts
│   └── utils/
│
├── lib/                    # Utilitários e constantes
│   ├── constants.ts        # Configuração de marca padrão
│   ├── pdfConstants.ts     # Dimensões de layout (A4, apresentação)
│   ├── styleGenerator.ts   # Geração de CSS
│   └── tailwind-merge.ts   # Merge de classes Tailwind
│
├── utils/                  # Funções utilitárias
│   ├── headingHelpers.ts   # Processamento de headings (padrão: 1.2.3)
│   ├── normalizeTables.ts  # Normalização de tabelas HTML
│   ├── template.ts         # Manipulação de templates
│   └── tailwind-merge.ts
│
├── types/                  # Type definitions
│   ├── global.d.ts         # Tipos globais
│   ├── mammoth.d.ts        # Tipos Mammoth
│   └── ui.d.ts             # Tipos de UI
│
├── public/templates/       # Templates HTML estáticos
│   └── document/
│       ├── index.html      # Template base com {{CONTENT}}
│       ├── style.css       # Estilos do PDF
│       └── assets/
│           └── logo.png
│
├── docs/                   # Documentação
│   ├── AI_ENHANCEMENT.md
│   ├── AI_FREE_OPTIONS.md
│   ├── QUICK_START_AI.md
│   ├── STYLE_SYSTEM.md
│   └── STYLE_SYSTEM_MIGRATION.md
│
├── .github/
│   └── copilot-instructions.md
│
├── Configuration
│   ├── tsconfig.json       # Paths aliases (@/components, @/utils, etc)
│   ├── next.config.ts
│   ├── tailwind.config.ts  # Tailwind CSS v4
│   ├── postcss.config.mjs
│   ├── eslint.config.mjs   # ESLint flat config
│   └── package.json
│
├── README.md
└── [Doc files...]
    ├── AI_VISUAL_ENHANCEMENT.md
    ├── AI_VISUAL_ONLY.md
    ├── GEMINI_SETUP.md
    ├── TAILWIND_VISUAL_GUIDE.md
    └── API_GEMINI_STATUS.md
```

---

## 🔄 Fluxo de Dados (Pipeline DOCX→PDF)

### 1. **Upload do Arquivo**
```
Usuário seleciona .docx
    ↓
DocumentUpload.tsx (drag-drop ou input)
    ↓
Enviado via FormData para /api/generate-pdf
```

### 2. **Parsing do Formulário**
```
POST /api/generate-pdf
    ↓
Formidable.parse() - extrai arquivo + metadados
    ↓
Metadados adicionais:
  - isProposal (boolean)
  - proposalId (string)
  - proposalValidity (string)
```

### 3. **Conversão DOCX→HTML**
```
Mammoth.convert(file)
    ↓
- StyleMap (mapeamento EN/PT-BR para semântico)
- Inline images (base64 data URLs)
- Preserve heading numbering (1.2.3)
    ↓
HTML bruto com classes CSS
```

### 4. **Melhoria Visual (Opcional via IA)**
```
Se enabled:
  POST /api/enhance-html
    ↓
  Provider: Gemini | OpenAI | Groq | Ollama
    ↓
  Modo: grammar | clarity | professional | full
    ↓
  Resposta: HTML melhorado com Tailwind CSS
```

### 5. **Injeção em Template**
```
Template (public/templates/document/index.html)
    ↓
Replace {{CONTENT}} com HTML convertido
    ↓
Injeta metadata (título, ID proposta, validade)
```

### 6. **Renderização PDF**
```
Puppeteer.launch()
    ↓
- Renderiza HTML → PNG
- Aplica CSS (public/templates/document/style.css)
- Formato A4: 794x1123px
- Puppeteer-core + @sparticuz/chromium (serverless)
    ↓
PDF bytes
```

### 7. **Retorno ao Cliente**
```
Response.blob()
    ↓
URL.createObjectURL(blob)
    ↓
window.open(url, '_blank')
    ↓
Visualiza em nova aba
```

---

## 🎨 Páginas e Componentes Principais

### Páginas
| Rota | Arquivo | Função |
|------|---------|--------|
| `/` | `src/app/page.tsx` | Página principal - upload DOCX |
| `/preview` | `src/app/preview/page.tsx` | Preview do PDF |
| `/preview/config` | `src/app/preview/config/page.tsx` | Configuração de branding |

### Componentes UI
| Componente | Propósito |
|-----------|----------|
| `DocumentUpload` | Upload com drag-drop |
| `DocumentEditor` | Editor WYSIWYG (CKEditor5/Lexical) |
| `DocumentPreview` | Visualização em iframe |
| `BrandConfiguration` | Painel de cores e logo |
| `ColorPicker` | Seletor de cor |
| `RichTextEditor` | Editor de texto rico |
| UI Components (Radix) | Button, Card, Input, Tabs, etc. |

---

## 📡 Rotas de API

### POST `/api/generate-pdf`
**Propósito:** Converter DOCX completo em PDF  
**Input:**
```typescript
{
  document: File (multipart)
  isProposal: string ("true"/"false")
  proposalId: string (ex: "261944175199")
  proposalValidity: string (ex: "30 dias")
}
```
**Output:** PDF binary (Content-Type: application/pdf)  
**Linhas:** 406  
**Etapas:**
1. Parse form (Formidable)
2. Convert DOCX→HTML (Mammoth)
3. Inject metadata
4. Enhance (opcional)
5. Render PDF (Puppeteer)

### POST `/api/convert-docx`
**Propósito:** Conversão isolada DOCX→HTML  
**Output:** JSON com HTML + metadata  
**Linhas:** 205

### POST `/api/enhance-html`
**Propósito:** Melhoria de HTML via IA  
**Providers:** Gemini, OpenAI, Groq, Ollama  
**Modes:** grammar | clarity | professional | full  
**Linhas:** 433

### GET `/api/generate-preview`
**Propósito:** Preview em tempo real

### POST `/api/brand-css`
**Propósito:** Gerar CSS dinâmico baseado em config de branding

### POST `/api/generate-pdf-from-html`
**Propósito:** PDF a partir de HTML direto

---

## 🎯 Configuração de Marca (Branding)

### Modelo de Dados
```typescript
type BrandConfig = {
  logo: string | null;              // Base64 ou URL
  primaryColor: string;              // #ff5e2b (laranja)
  secondaryColor: string;            // #152937 (azul escuro)
  accentColor: string;               // #321bc1 (roxo)
  backgroundColor: string;           // #fff9d5 (amarelo claro)
  textColor: string;                 // #000 (preto)
  borderColor: string;               // #AFCDE1 (azul claro)
  logoHeight?: number;               // px (padrão: 34)
  logoMaxWidth?: number;             // px (opcional)
};
```

### Defaults
```typescript
PRIMARY: #ff5e2b (laranja)
SECONDARY: #152937 (azul escuro)
ACCENT: #321bc1 (roxo)
BACKGROUND: #fff9d5 (amarelo claro)
BORDER: #AFCDE1 (azul claro)
TEXT: #000 (preto)
```

### Armazenamento
- **Cliente:** localStorage (chave: `brandConfig`)
- **CSS:** Gerado dinamicamente via `/api/brand-css`

---

## 🤖 Integração com IA

### Provedores Suportados
1. **Gemini** (Google) - Recomendado
2. **OpenAI** (GPT-3.5/4)
3. **Groq** - Inferência rápida
4. **Ollama** - Local/self-hosted

### Modos de Melhoria

| Modo | Descrição | Use Case |
|------|-----------|----------|
| `grammar` | Corrige erros gramaticais | Documentos com typos |
| `clarity` | Melhora legibilidade | Textos longos/complexos |
| `professional` | Aumenta formalidade | Documentos corporativos |
| `full` | Melhora visual + conteúdo | Máxima qualidade |

### Regras de IA
- ✅ Melhorar estrutura visual (CSS)
- ✅ Reorganizar layout
- ✅ Adicionar estilos
- ❌ **NÃO** alterar conteúdo textual (em `full` visual)
- ❌ **NÃO** corrigir gramática (em `full` visual)

---

## 🛠️ Tecnologias de Conversão

### Mammoth.js (DOCX→HTML)
- **Versão:** 1.11.0
- **Função:** Converter .docx em HTML preservando formatação
- **StyleMap:** Mapeamento EN/PT-BR (Heading 1→h1, Subtitle→h2, etc.)
- **Imagens:** Convertidas para base64 data URLs
- **Limit:** Preserva estrutura semântica

### Puppeteer (HTML→PDF)
- **Versão:** 24.24.1 (dev), puppeteer-core 24.3.0 (prod)
- **Complemento:** @sparticuz/chromium para serverless
- **Rendering:** Headless Chrome
- **Formato:** A4 (794x1123px)
- **Output:** PDF binary

### HTML2PDF.js (Alternative)
- **Hook:** `usePDFGenerator()`
- **Uso:** Frontend PDF generation
- **Base:** jsPDF + html2canvas

---

## 📊 Dimensões e Layouts

### PDF_LAYOUTS
```typescript
a4: {
  width: 794px,
  height: 1123px,
  format: 'A4',
  margin: { top: 0, bottom: 15mm, left: 0, right: 0 }
}

apresentacao: {
  width: 1024px,
  height: 900px,
  margin: { top/bottom/left/right: 0.3in }
}

padrao: {
  width: 794px,
  minHeight: 600px
}
```

### Header/Footer
- **Footer Height:** 59px (34px SVG + 25px padding)
- **Header Offset:** 262.39px
- **Puppeteer Args:** --no-sandbox, --disable-dev-shm-usage

---

## 🎨 Sistema de Cores (Tailwind)

### Paleta Principal
```css
Laranja Primário:     #ff5e2b
Laranja Suave:        rgba(255, 94, 43, 0.2)
Laranja Escuro:       rgba(255, 94, 43, 0.8)
Azul Escuro:          #152937
Azul Claro:           #AFCDE1
Amarelo Claro:        #FFF9D5
Branco Suave:         rgba(255, 255, 255, 0.9)
```

### Fonte Personalizada
- **Family:** Kanit (tailandesa)
- **Weights:** 400, 600, 700 importados
- **Fallback:** sans-serif

---

## 📝 Processamento de Conteúdo

### headingHelpers.ts
Funções para normalizar headings:
```typescript
headingPattern = /^([0-9]+(?:\.[0-9]+)*)(?:\s*[-–—:]\s*)?(.*)$/

// Detecta: "1.2.3 - Título" → ["1.2.3", "Título"]
```

### normalizeTables.ts
- Converte tabelas Word em HTML semântico
- Preserva headers e body
- Aplica classes CSS

### template.ts
- Replace de placeholders ({{CONTENT}})
- Injeção de metadata

---

## 🔧 Configuração e Build

### tsconfig.json Aliases
```json
{
  "@/*": ["*"],
  "@/components/*": ["components/*"],
  "@/utils/*": ["utils/*"],
  "@/styles/*": ["styles/*"],
  "@/hooks/*": ["hooks/*"],
  "@/types/*": ["types/*"],
  "@/lib/*": ["lib/*"]
}
```

### ESLint Config
- **Version:** 9 (flat config)
- **Extends:** eslint-config-next

### Tailwind Config
- **Version:** 4
- **PostCSS:** 4

### Next.js Config
- **outputFileTracingRoot:** Configurado para build otimizado

---

## 🚀 Scripts do Projeto

```bash
npm install      # Instalar dependências
npm run dev      # Rodar em desenvolvimento (http://localhost:3000)
npm run build    # Build de produção
npm start        # Iniciar servidor de produção
npm run lint     # Rodar ESLint
```

---

## 📚 Documentação do Projeto

| Arquivo | Tópico |
|---------|--------|
| README.md | Overview e instruções |
| AI_VISUAL_ENHANCEMENT.md | Melhoria visual com IA (335 linhas) |
| AI_VISUAL_ONLY.md | IA somente para visual |
| AI_FREE_OPTIONS.md | Provedores IA gratuitos |
| GEMINI_SETUP.md | Configuração Google Gemini |
| QUICK_START_AI.md | Início rápido com IA |
| STYLE_SYSTEM.md | Sistema de estilos |
| STYLE_SYSTEM_MIGRATION.md | Migração de estilos |
| TAILWIND_VISUAL_GUIDE.md | Guia visual Tailwind |
| API_GEMINI_STATUS.md | Status da integração Gemini |

---

## 🔍 Análise de Componentes-Chave

### DocumentUpload.tsx
- **Linhas:** 87
- **Props:** `onFileSelect`, `loading`
- **Features:** Drag-drop, validação .docx, input file
- **Estado:** isDragging

### page.tsx (Página principal)
- **Linhas:** 158
- **Features:**
  - Upload de DOCX
  - Toggle "Proposta?"
  - Input de ID e Validade
  - Geração de PDF
  - Tratamento de erros

### generate-pdf.ts (API Core)
- **Linhas:** 406
- **Etapas Principais:**
  1. Parse form (formidable)
  2. Convert DOCX→HTML (Mammoth)
  3. Map metadata (ID, validade)
  4. Enhance (opcional)
  5. Render PDF (Puppeteer)
  6. Return blob

### enhance-html.ts (IA)
- **Linhas:** 433
- **Providers:** Gemini, OpenAI, Groq, Ollama
- **Modos:** grammar, clarity, professional, full
- **Prompt:** 300+ linhas de instruções de IA

---

## 📦 Dependências Críticas

### Produção (19 deps)
- next@15.5.5
- react@19.1.0
- typescript@5
- tailwindcss@4
- mammoth@1.11.0
- puppeteer-core@24.3.0
- @sparticuz/chromium@141.0.0
- formidable@3.5.4
- @ckeditor/ckeditor5-build-classic@41.4.2
- radix-ui/* (6 packages)
- lucide-react@0.545.0
- html2pdf.js@0.12.1
- lexical & @lexical/react@0.37.0

### Dev (8 deps)
- @types/node, @types/react, @types/react-dom
- eslint, eslint-config-next
- @tailwindcss/postcss

---

## ⚠️ Considerações Técnicas

### Serverless (Produção)
- **Chromium:** @sparticuz/chromium (141MB otimizado)
- **Puppeteer-core:** Sem bundled binary
- **Lambda:** Requer layer de Chromium

### Performance
- **DOCX pequenos:** <1s (parsing)
- **Rendering PDF:** 2-5s (Puppeteer)
- **IA (Gemini):** 3-10s (API call)

### Limitações
- **Upload max:** 20MB (formidable default)
- **Timeout:** API timeout padrão do servidor
- **Imagens:** Convertidas para base64 (↑ tamanho HTML)

### Segurança
- **Validação:** Extensão .docx obrigatória
- **Sanitização:** Mammoth preserva HTML (verificar XSS)
- **API Key IA:** Via header/config (não commitada)

---

## 🎯 Próximos Passos Recomendados

1. **Testes Unitários** - Implementar tests para APIs
2. **Error Handling** - Melhorar tratamento de erros
3. **Rate Limiting** - Proteger APIs de abuso
4. **Caching** - Cache de conversões
5. **Logging** - Sistema de logs estruturado
6. **Docker** - Containerização para produção
7. **CI/CD** - GitHub Actions workflow
8. **Analytics** - Rastreamento de uso

---

## 📝 Resumo Estatístico

| Métrica | Valor |
|---------|-------|
| **Linhas de Código (componentes)** | ~2,000+ |
| **Arquivo Maior** | enhance-html.ts (433 linhas) |
| **Dependências Prod** | 19 |
| **Dependências Dev** | 8 |
| **Componentes UI** | 13 |
| **Hooks** | 5 |
| **Rotas API** | 6 |
| **Páginas** | 3 |
| **Documentos** | 10+ |

---

**Análise Completa ✅**  
Gerado em 28 de novembro de 2025
