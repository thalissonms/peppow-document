# docx-to-pdf-template

Aplicação Next.js (TypeScript) que recebe um arquivo `.docx`, converte o conteúdo para HTML com o Mammoth e gera um PDF padronizado a partir de um template estático renderizado pelo Puppeteer.

## Pré-requisitos

- Node.js 18+ (recomendado 20)
- Yarn Classic (`1.22.x`)

## Instalação

```bash
yarn install
```

## Executar em desenvolvimento

```bash
yarn dev
```

A aplicação ficará disponível em [http://localhost:3000](http://localhost:3000).

## Como funciona

1. A página principal (`src/app/page.tsx`) permite selecionar um arquivo `.docx` e aciona a rota `POST /api/generate-pdf`.
2. A API (`src/pages/api/generate-pdf.ts`) usa `formidable` para receber o upload, converte o Word em HTML com `mammoth`, injeta no template localizado em `public/templates/document/index.html` e renderiza um PDF A4 via `puppeteer`.
3. O PDF é retornado inline e aberto em uma nova aba pelo navegador.

### Estrutura do template

```text
public/templates/document/
	├─ index.html   # layout base com placeholder {{CONTENT}}
	├─ style.css    # estilos globais aplicados ao PDF
	└─ assets/
			└─ logo.png # logotipo padrão embutido no cabeçalho
```

Você pode substituir `logo.png` e ajustar `style.css` conforme a identidade visual desejada.

## Testes e qualidade

```bash
yarn lint
```

## Build de produção

```bash
yarn build
```

Em seguida execute `yarn start` para servir o build gerado.
