# 🔢 Correção de Numeração Automática de Headings

**Data:** 28 de novembro de 2025  
**Status:** ✅ Implementado e Testado

---

## 🎯 Problema Resolvido

Os tópicos numerados estavam saindo com o número **1** em todos os casos, em vez de números crescentes:

```
❌ Antes (Incorreto):
  1
  1
  1
  1.1
  1.1
```

```
✅ Depois (Correto):
  1
  2
  3
  1
  2
```

---

## 🔧 Solução Implementada

### 1. **Nova Lógica em `utils/headingHelpers.ts`**

A função `enhanceHeadings()` foi atualizada para:

#### ✅ Gerar numeração automática crescente
- Mantém contador independente por nível (H1-H6)
- Incrementa automaticamente: `1 → 2 → 3 → 1.1 → 1.2 → 1.3`
- Reset automático de sub-níveis ao voltar para nível anterior

#### ✅ Remover números antigos do Word
- Detecta e remove números originais do DOCX: `"1 - Título"` → `"Título"`
- Substitui por números gerados automaticamente

#### ✅ Criar números circulares visualmente
- Cada número fica dentro de um círculo/quadrado laranja
- Classe CSS: `.heading-number`

### Algoritmo de Contagem Hierárquica

```typescript
// Exemplo com 3 níveis de headings:
<h1>Introdução</h1>           // contador[0]++ → "1"
<h1>Metodologia</h1>          // contador[0]++ → "2"
<h2>Abordagem Qualitativa</h2> // contador[1]++ → "2.1" (reset contador[1])
<h2>Abordagem Quantitativa</h2> // contador[1]++ → "2.2"
<h3>Estatísticas</h3>          // contador[2]++ → "2.2.1" (reset contador[2])
<h3>Gráficos</h3>              // contador[2]++ → "2.2.2"
<h2>Conclusão</h2>             // contador[1]++ → "2.3" (contador[2] reset)
<h1>Resultados</h1>            // contador[0]++ → "3" (reset contador[1] e contador[2])
```

---

## 📝 Estrutura HTML Gerada

### Antes (sem número circular)
```html
<h2 class="doc-heading"><span class="heading-text">Sobre a Peppow</span></h2>
```

### Depois (com número circular automático)
```html
<h2 class="doc-heading">
  <span class="heading-number">1</span>
  <span class="heading-text">Sobre a Peppow</span>
</h2>
```

---

## 🎨 Estilo CSS Atualizado

### `.doc-heading` (Container)
```css
.doc #content .doc-heading {
  display: flex;
  align-items: center;
  gap: 12px;  /* ← Espaço entre número e texto */
}
```

### `.heading-number` (Número Circular)
```css
.doc #content .heading-number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  padding: 8px 12px;
  border-radius: 10px;
  background: linear-gradient(135deg, rgba(255,94,43,0.2) 0%, rgba(255,94,43,0.8) 100%);
  border: 2px solid #ff5e2b;
  box-shadow: 0 4px 12px rgba(255, 94, 43, 0.25);
  color: #ff5e2b;
  font-weight: 800;
  font-size: 22px;
  flex-shrink: 0;  /* ← Nunca comprime o círculo */
}
```

### `.heading-text` (Título)
```css
.doc #content .heading-text {
  display: inline-flex;
  align-items: center;
  font-weight: 700;
  color: #ff5e2b;
  flex: 1;  /* ← Ocupa espaço disponível */
}
```

---

## 📦 Arquivos Modificados

| Arquivo | Mudança |
|---------|---------|
| `utils/headingHelpers.ts` | ✅ Nova lógica com contadores automáticos |
| `src/pages/api/convert-docx.ts` | ✅ Importa função do helper (removeu duplicação) |
| `public/templates/document/style.css` | ✅ Melhorado spacing e flex layout |
| `src/pages/api/generate-pdf.ts` | ✅ Já usava import correto (sem mudanças) |

---

## 🧪 Teste Manual

### Passo 1: Prepare um DOCX com headings
```
Título Principal (H1)
Seção 1 (H1)
  Subsecção 1.1 (H2)
  Subsecção 1.2 (H2)
    Item 1.2.1 (H3)
    Item 1.2.2 (H3)
  Subsecção 1.3 (H2)
Seção 2 (H1)
  Subsecção 2.1 (H2)
```

### Passo 2: Upload no sistema
Envie o arquivo DOCX para `POST /api/generate-pdf`

### Passo 3: Verifique a numeração
O PDF deve exibir:
```
📍 1 - Título Principal
📍 2 - Seção 1
  📍 2.1 - Subsecção 1.1
  📍 2.2 - Subsecção 1.2
    📍 2.2.1 - Item 1.2.1
    📍 2.2.2 - Item 1.2.2
  📍 2.3 - Subsecção 1.3
📍 3 - Seção 2
  📍 3.1 - Subsecção 2.1
```

---

## 🔌 Como Funciona Internamente

### 1. DOCX → HTML (Mammoth)
```
Mammoth converte: "1 - Sobre a Peppow" (H2)
↓
HTML Bruto: <h2>1 - Sobre a Peppow</h2>
```

### 2. Processamento (enhanceHeadings)
```
enhanceHeadings() recebe: <h2>1 - Sobre a Peppow</h2>
↓
- Detecta: contador H2 = 1, numero antigo = "1"
- Remove número antigo
- Incrementa contador[1]++  (agora = 1)
- Gera numero hierarquico: "1"
↓
Retorna: <h2 class="doc-heading">
          <span class="heading-number">1</span>
          <span class="heading-text">Sobre a Peppow</span>
        </h2>
```

### 3. Rendering (Puppeteer)
```
Puppeteer aplica CSS e renderiza PDF:
↓
PDF Final com número circular: ⬜1 Sobre a Peppow
(onde ⬜ = fundo laranja gradiente)
```

---

## 💡 Benefícios

✅ **Numeração automática e consistente**
- Não depende do que está no DOCX
- Sempre crescente e hierárquica

✅ **Edição sem preocupações**
- Pode renomerar sections no Word (1, 2, 3, etc.)
- Sistema corrige automaticamente

✅ **Suporte a múltiplos níveis**
- De H1 até H6 (1 até 6 níveis de profundidade)
- Reset automático de sub-contadores

✅ **Visual profissional**
- Números em círculos laranjas
- Espaçamento adequado
- Responsive em PDFs A4

---

## 🚀 Próximas Melhorias (Opcional)

- [ ] Adicionar opção de desativar numeração
- [ ] Suporte a numeração romana (I, II, III)
- [ ] Suporte a letras (A, B, C)
- [ ] Configuração de estilo de número (cor, forma)
- [ ] Sincronização com índice automático (TOC)

---

## 📊 Resumo

| Aspecto | Status |
|--------|--------|
| Numeração automática | ✅ Implementado |
| Hierarquia correta | ✅ Testado |
| Remoção de números antigos | ✅ Funcionando |
| Estilo CSS | ✅ Atualizado |
| Build | ✅ Sem erros |
| Compilação TypeScript | ✅ Válido |

---

**Correção finalizada com sucesso! 🎉**  
Agora todos os tópicos numerados aparecerão com números crescentes corretos.
