# 🎨 Guia Visual Completo - Tailwind CSS

## 📋 Visão Geral

A IA agora tem **total liberdade criativa** para melhorar o visual dos documentos usando **Tailwind CSS**, desde que respeite:

✅ **Esquema de Cores** (laranja #ff5e2b, azul #152937, amarelo #fff9d5)  
✅ **Fonte Kanit** (Bold, SemiBold, Medium, Regular, Italic)  
✅ **Identidade Visual** (profissional, moderna, clean)

---

## 🎯 Liberdade Criativa da IA

### O que a IA PODE fazer agora:

🎨 **Criar componentes visuais customizados**
- Números circulares para seções
- Cards de destaque com fundo escuro
- Badges e tags coloridas
- Blocos de informação destacados
- Separadores visuais

📐 **Aplicar layout profissional**
- Espaçamentos (gap, padding, margin)
- Alinhamentos (flex, grid, justify, items)
- Bordas arredondadas (rounded)
- Sombras (shadow)
- Opacidades e transparências

🎭 **Estilizar elementos**
- Tamanhos de fonte customizados (text-[14px], text-[26px])
- Pesos de fonte (font-['Kanit:Bold'], font-['Kanit:SemiBold'])
- Cores de texto e fundo (text-[#ff5e2b], bg-[#152937])
- Bordas e contornos (border-[#ff5e2b], border-[0.5px])

---

## 🎨 Paleta de Cores (Tailwind)

### Cores Primárias

```css
/* LARANJA - Primário (Destaques, CTAs, Elementos Importantes) */
bg-[#ff5e2b]              /* Fundo sólido laranja */
text-[#ff5e2b]            /* Texto laranja */
border-[#ff5e2b]          /* Borda laranja */
bg-[rgba(255,94,43,0.2)]  /* Fundo laranja muito suave (20%) */
bg-[rgba(255,94,43,0.4)]  /* Fundo laranja suave (40%) */
bg-[rgba(255,94,43,0.8)]  /* Fundo laranja forte (80%) */
text-[rgba(255,94,43,0.92)] /* Texto laranja vibrante */

/* AZUL ESCURO - Secundário (Textos, Fundos Escuros) */
bg-[#152937]              /* Fundo azul escuro */
text-[#152937]            /* Texto azul escuro */
border-[#152937]          /* Borda azul escuro */
bg-[rgba(21,41,55,0.25)]  /* Fundo azul suave */
text-[#afcde1]            /* Texto azul claro (para fundos escuros) */
text-[#154c71]            /* Texto azul médio */
bg-[rgba(21,76,113,0.25)] /* Fundo azul médio suave */
border-[#154c71]          /* Borda azul médio */

/* AMARELO - Accent (Fundos Suaves, Textos Claros) */
bg-[#fff9d5]              /* Fundo amarelo claro */
text-[#fff9d5]            /* Texto amarelo claro */
text-[rgba(255,249,213,0.9)] /* Texto amarelo com opacidade */
text-[rgba(255,249,213,0.8)] /* Texto amarelo mais suave */

/* BRANCO/NEUTRO - Suporte */
bg-[rgba(255,255,255,0.9)] /* Fundo branco suave */
text-black                 /* Texto preto */
border-[rgba(255,94,43,0.25)] /* Borda laranja suave */
```

---

## 🔤 Fonte Kanit (Tailwind)

```css
/* BOLD - Títulos Principais, Destaques Fortes */
font-['Kanit:Bold',_sans-serif]

/* SEMIBOLD - Subtítulos, Cabeçalhos de Tabela */
font-['Kanit:SemiBold',_sans-serif]

/* MEDIUM - Destaques Médios, Labels */
font-['Kanit:Medium',_sans-serif]

/* REGULAR - Texto Corpo, Parágrafos */
font-['Kanit:Regular',_sans-serif]

/* ITALIC - Observações, Notas, Complementos */
font-['Kanit:Italic',_sans-serif]
font-['Kanit:Medium_Italic',_sans-serif]
```

---

## 🧩 Componentes Visuais (Biblioteca)

### 1️⃣ Número Circular (Seções)

```html
<div class="flex gap-[10px] items-center mb-[20px]">
  <!-- Número circular com fundo laranja suave -->
  <div class="relative size-[38px]">
    <div class="bg-[rgba(255,94,43,0.2)] rounded-[5px] size-full border-[0.5px] border-[#ff5e2b]"></div>
    <div class="absolute inset-0 flex items-center justify-center font-['Kanit:Bold',_sans-serif] text-[22px] text-[rgba(255,94,43,0.92)]">
      1
    </div>
  </div>
  <!-- Título da seção -->
  <h2 class="font-['Kanit:Bold',_sans-serif] text-[26px] text-[#ff5e2b] leading-[24px]">
    Título da Seção
  </h2>
</div>
```

**Resultado:** ⭕ **1** Título da Seção (número laranja em círculo + título laranja)

---

### 2️⃣ Lista Estilizada (Bullets Laranjas)

```html
<ul class="space-y-[5px] mb-[20px]">
  <li class="flex gap-[5px] items-start">
    <span class="text-[#ff5e2b] mt-[2px]">•</span>
    <span class="font-['Kanit:Regular',_sans-serif] text-[12px] text-[#152937] leading-[14px]">
      <strong class="font-['Kanit:Medium',_sans-serif]">Item Importante:</strong> 
      Descrição detalhada do item com texto corrido.
    </span>
  </li>
  <li class="flex gap-[5px] items-start">
    <span class="text-[#ff5e2b] mt-[2px]">•</span>
    <span class="font-['Kanit:Regular',_sans-serif] text-[12px] text-[#152937] leading-[14px]">
      <strong class="font-['Kanit:Medium',_sans-serif]">Outro Item:</strong> 
      Mais informações relevantes.
    </span>
  </li>
</ul>
```

**Resultado:**
- • **Item Importante:** Descrição...
- • **Outro Item:** Mais informações...

---

### 3️⃣ Tabela Profissional

```html
<table class="w-full border-collapse mb-[20px] rounded-[5px] overflow-hidden">
  <thead>
    <tr class="bg-[rgba(255,94,43,0.8)]">
      <th class="px-[15px] py-[10px] font-['Kanit:SemiBold',_sans-serif] text-[18px] text-[rgba(255,249,213,0.9)] border-[#ff5e2b]">
        Coluna 1
      </th>
      <th class="px-[15px] py-[10px] font-['Kanit:SemiBold',_sans-serif] text-[18px] text-[rgba(255,249,213,0.9)] border-[#ff5e2b]">
        Coluna 2
      </th>
    </tr>
  </thead>
  <tbody>
    <tr class="bg-[rgba(255,255,255,0.9)]">
      <td class="px-[15px] py-[10px] font-['Kanit:Regular',_sans-serif] text-[14px] text-black border-[rgba(255,94,43,0.25)]">
        Dado 1
      </td>
      <td class="px-[15px] py-[10px] font-['Kanit:Regular',_sans-serif] text-[14px] text-black border-[rgba(255,94,43,0.25)]">
        Dado 2
      </td>
    </tr>
    <tr class="bg-[rgba(255,255,255,0.9)]">
      <td class="px-[15px] py-[10px] font-['Kanit:Regular',_sans-serif] text-[14px] text-black border-[rgba(255,94,43,0.25)]">
        Dado 3
      </td>
      <td class="px-[15px] py-[10px] font-['Kanit:Regular',_sans-serif] text-[14px] text-black border-[rgba(255,94,43,0.25)]">
        Dado 4
      </td>
    </tr>
  </tbody>
</table>
```

**Resultado:** Tabela com cabeçalho laranja e linhas brancas com bordas suaves

---

### 4️⃣ Card de Destaque (Fundo Escuro)

```html
<div class="bg-[#152937] rounded-[10px] p-[15px] mb-[15px]">
  <p class="font-['Kanit:SemiBold',_sans-serif] text-[14px] text-[#afcde1] mb-[5px] leading-[16px]">
    Título do Destaque:
  </p>
  <p class="font-['Kanit:Regular',_sans-serif] text-[14px] text-[#fff9d5] leading-[16px]">
    Informação importante que merece destaque especial com fundo escuro azul.
  </p>
</div>
```

**Resultado:** Card azul escuro com texto claro (amarelo/azul claro)

---

### 5️⃣ Badge/Tag

```html
<div class="inline-flex bg-[rgba(21,76,113,0.25)] border border-[#154c71] rounded-[5px] px-[10px] py-[5px] mb-[10px]">
  <span class="font-['Kanit:SemiBold',_sans-serif] text-[#154c71] text-[14px] leading-[16px]">
    Fase 1
  </span>
</div>
```

**Resultado:** 🏷️ Fase 1 (badge azul com borda)

---

### 6️⃣ Parágrafo Estilizado

```html
<p class="font-['Kanit:Regular',_sans-serif] text-[14px] text-[#152937] leading-[16px] mb-[15px] text-justify">
  Este é um parágrafo bem formatado com fonte Kanit Regular, tamanho 14px, 
  cor azul escuro, espaçamento entre linhas de 16px e alinhamento justificado.
</p>
```

---

### 7️⃣ Título Hierárquico

```html
<!-- H1 - Título Principal -->
<h1 class="font-['Kanit:Bold',_sans-serif] text-[36px] text-[#ff5e2b] leading-[42px] mb-[20px]">
  Título Principal
</h1>

<!-- H2 - Seção -->
<h2 class="font-['Kanit:Bold',_sans-serif] text-[26px] text-[#ff5e2b] leading-[28px] mb-[15px]">
  Seção Principal
</h2>

<!-- H3 - Subseção -->
<h3 class="font-['Kanit:SemiBold',_sans-serif] text-[18px] text-[#152937] leading-[24px] mb-[10px]">
  Subseção
</h3>

<!-- H4 - Item -->
<h4 class="font-['Kanit:Medium',_sans-serif] text-[14px] text-[#152937] leading-[16px] mb-[10px]">
  Item Menor
</h4>
```

---

### 8️⃣ Bloco de Nota/Observação

```html
<div class="border-l-[3px] border-[#ff5e2b] bg-[rgba(255,94,43,0.1)] pl-[15px] py-[10px] mb-[15px]">
  <p class="font-['Kanit:Medium',_sans-serif] text-[12px] text-[#152937] leading-[14px]">
    <strong class="text-[#ff5e2b]">Observação:</strong> 
    Informação adicional importante que complementa o conteúdo principal.
  </p>
</div>
```

**Resultado:** Bloco com borda laranja à esquerda e fundo laranja muito suave

---

### 9️⃣ Linha Separadora Estilizada

```html
<div class="h-[5px] bg-[rgba(255,94,43,0.4)] rounded-[20px] w-[300px] mx-auto my-[20px] border border-[#ff5e2b]">
</div>
```

**Resultado:** Linha laranja arredondada no centro (separador de seções)

---

### 🔟 Ícone Circular (Bullet Grande)

```html
<div class="flex gap-[5px] items-center mb-[10px]">
  <div class="flex items-center justify-center size-[24px] bg-[rgba(255,94,43,0.2)] rounded-full border-[0.5px] border-[#ff5e2b]">
    <span class="font-['Kanit:Bold',_sans-serif] text-[12px] text-[#ff5e2b]">✓</span>
  </div>
  <span class="font-['Kanit:Regular',_sans-serif] text-[12px] text-[#152937]">
    Item validado com ícone
  </span>
</div>
```

**Resultado:** ⭕✓ Item validado com ícone

---

## 📐 Layout e Espaçamento

### Flexbox (Alinhamento Horizontal)

```html
<!-- Centralizado com gap -->
<div class="flex gap-[10px] items-center justify-center">
  ...
</div>

<!-- Início com espaçamento -->
<div class="flex gap-[5px] items-start">
  ...
</div>

<!-- Colunas com gap vertical -->
<div class="flex flex-col gap-[15px] items-start">
  ...
</div>
```

### Grid (Layout em Grade)

```html
<!-- 2 colunas iguais -->
<div class="grid grid-cols-2 gap-[20px]">
  ...
</div>

<!-- 3 colunas iguais -->
<div class="grid grid-cols-3 gap-[15px]">
  ...
</div>
```

### Espaçamentos (Padding e Margin)

```html
<!-- Padding -->
p-[10px]    /* Padding de 10px em todos os lados */
px-[15px]   /* Padding horizontal (esquerda/direita) 15px */
py-[20px]   /* Padding vertical (topo/baixo) 20px */
pt-[5px]    /* Padding top 5px */
pb-[5px]    /* Padding bottom 5px */
pl-[10px]   /* Padding left 10px */
pr-[10px]   /* Padding right 10px */

<!-- Margin -->
m-[10px]    /* Margin de 10px em todos os lados */
mx-auto     /* Margin horizontal automático (centralizar) */
mb-[15px]   /* Margin bottom 15px */
mt-[20px]   /* Margin top 20px */
```

### Tamanhos

```html
<!-- Largura -->
w-full      /* Largura 100% */
w-[300px]   /* Largura 300px */
w-[50%]     /* Largura 50% */

<!-- Altura -->
h-[100px]   /* Altura 100px */
h-full      /* Altura 100% */

<!-- Tamanho quadrado */
size-[38px] /* Largura e altura 38px */
```

### Bordas Arredondadas

```html
rounded-[5px]   /* Borda arredondada 5px */
rounded-[10px]  /* Borda arredondada 10px */
rounded-[20px]  /* Borda arredondada 20px */
rounded-full    /* Círculo perfeito */
```

---

## 🎓 Exemplos Práticos Completos

### Exemplo 1: Seção de Serviços

```html
<div class="mb-[30px]">
  <!-- Título da seção -->
  <div class="flex gap-[10px] items-center mb-[20px]">
    <div class="relative size-[38px]">
      <div class="bg-[rgba(255,94,43,0.2)] rounded-[5px] size-full border-[0.5px] border-[#ff5e2b]"></div>
      <div class="absolute inset-0 flex items-center justify-center font-['Kanit:Bold',_sans-serif] text-[22px] text-[rgba(255,94,43,0.92)]">1</div>
    </div>
    <h2 class="font-['Kanit:Bold',_sans-serif] text-[26px] text-[#ff5e2b]">Nossos Serviços</h2>
  </div>

  <!-- Parágrafo introdutório -->
  <p class="font-['Kanit:Regular',_sans-serif] text-[14px] text-[#152937] mb-[15px] leading-[16px]">
    Oferecemos uma solução completa que abrange todas as etapas de implementação.
  </p>

  <!-- Lista de serviços -->
  <h3 class="font-['Kanit:SemiBold',_sans-serif] text-[18px] text-[#152937] mb-[10px]">
    Serviços Inclusos
  </h3>
  <ul class="space-y-[5px] mb-[20px]">
    <li class="flex gap-[5px] items-start">
      <span class="text-[#ff5e2b] mt-[2px]">•</span>
      <span class="font-['Kanit:Regular',_sans-serif] text-[12px] text-[#152937]">
        <strong class="font-['Kanit:Medium',_sans-serif]">Consultoria:</strong> 
        Análise detalhada e desenho de solução
      </span>
    </li>
    <li class="flex gap-[5px] items-start">
      <span class="text-[#ff5e2b] mt-[2px]">•</span>
      <span class="font-['Kanit:Regular',_sans-serif] text-[12px] text-[#152937]">
        <strong class="font-['Kanit:Medium',_sans-serif]">Treinamento:</strong> 
        Capacitação completa da equipe
      </span>
    </li>
  </ul>

  <!-- Destaque final -->
  <div class="bg-[#152937] rounded-[10px] p-[15px]">
    <p class="font-['Kanit:SemiBold',_sans-serif] text-[#afcde1] text-[14px] mb-[5px]">
      Compromisso:
    </p>
    <p class="font-['Kanit:Regular',_sans-serif] text-[#fff9d5] text-[14px]">
      Garantimos resposta em até 6 horas para incidentes críticos.
    </p>
  </div>
</div>
```

---

## ✅ Checklist para a IA

Ao melhorar um documento, a IA deve:

- [x] Usar **apenas cores do esquema** (laranja, azul, amarelo)
- [x] Usar **apenas fonte Kanit** (Bold, SemiBold, Medium, Regular, Italic)
- [x] **Criar componentes visuais** apropriados para o conteúdo
- [x] Aplicar **espaçamentos consistentes** (gap, padding, margin)
- [x] Usar **hierarquia de títulos** (H1-H6) corretamente
- [x] Organizar **listas** com bullets laranjas
- [x] Criar **tabelas profissionais** com cabeçalhos laranjas
- [x] Adicionar **cards de destaque** para informações importantes
- [x] Usar **badges/tags** para categorização
- [x] Aplicar **bordas arredondadas** (rounded)
- [x] Manter **legibilidade** (line-height, text-align)
- [x] **NÃO usar** estilos inline (style="...")

---

**Resultado Final:** Documentos profissionais, visualmente atraentes e perfeitamente organizados! 🚀✨
