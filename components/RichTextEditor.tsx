import { useEffect, useCallback, useState, useRef } from "react";
import type { JSX } from "react";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { TabIndentationPlugin } from "@lexical/react/LexicalTabIndentationPlugin";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  HeadingNode,
  QuoteNode,
  $createHeadingNode,
  $createQuoteNode,
  $isHeadingNode,
} from "@lexical/rich-text";
import {
  ListNode,
  ListItemNode,
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  $isListNode,
} from "@lexical/list";
import {
  TableNode,
  TableCellNode,
  TableRowNode,
  INSERT_TABLE_COMMAND,
} from "@lexical/table";
import { TablePlugin } from "@lexical/react/LexicalTablePlugin";
import {
  HorizontalRuleNode,
  INSERT_HORIZONTAL_RULE_COMMAND,
} from "@lexical/react/LexicalHorizontalRuleNode";
import { LinkNode } from "@lexical/link";
import { AutoLinkNode } from "@lexical/link";
import {
  $getRoot,
  $getSelection,
  $isRangeSelection,
  $isTextNode,
  FORMAT_TEXT_COMMAND,
  UNDO_COMMAND,
  REDO_COMMAND,
  CAN_UNDO_COMMAND,
  CAN_REDO_COMMAND,
  COMMAND_PRIORITY_CRITICAL,
  SELECTION_CHANGE_COMMAND,
  $createParagraphNode,
  EditorState,
  LexicalEditor,
  NodeKey,
  DecoratorNode,
} from "lexical";
import { $generateHtmlFromNodes, $generateNodesFromDOM } from "@lexical/html";
import { $setBlocksType, $patchStyleText } from "@lexical/selection";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  Table2,
  Minus,
  Undo,
  Redo,
  Code,
  Strikethrough,
  Underline as UnderlineIcon,
  RemoveFormatting,
  Palette,
} from "lucide-react";
import { Button } from "./ui/Button";
import { Separator } from "./ui/Separator";
import { EditorHelp } from "./EditorHelper";
import { BrandConfig, PdfLayout, DocumentMeta } from "@/types/ui";
import { HoverPopover } from "./ui/HoverPopover";

// ---- Image support (keeps <img> from DOCX) ----
class ImageNode extends DecoratorNode<JSX.Element> {
  __src: string;
  __altText: string;

  static getType(): string {
    return "image";
  }

  static clone(node: ImageNode): ImageNode {
    return new ImageNode(node.__src, node.__altText, node.getKey());
  }

  constructor(src: string, altText: string, key?: NodeKey) {
    super(key);
    this.__src = src;
    this.__altText = altText;
  }

  createDOM(): HTMLElement {
    const span = document.createElement("span");
    return span;
  }

  updateDOM(): false {
    return false;
  }

  decorate(): JSX.Element {
    return (
      <img
        src={this.__src}
        alt={this.__altText}
        className="max-w-full h-auto"
        loading="lazy"
      />
    );
  }

  static importDOM() {
    return {
      img: (domNode: Node) => {
        if (!(domNode instanceof HTMLImageElement)) return null;
        return {
          conversion: () => $createImageNode(domNode.src, domNode.alt || ""),
          priority: 1,
        };
      },
    };
  }

  exportDOM(): { element: HTMLElement } {
    const img = document.createElement("img");
    img.setAttribute("src", this.__src);
    if (this.__altText) img.setAttribute("alt", this.__altText);
    img.className = "max-w-full h-auto";
    return { element: img };
  }

  static importJSON(serializedNode: { src: string; altText: string }): ImageNode {
    return $createImageNode(serializedNode.src, serializedNode.altText);
  }

  exportJSON(): { src: string; altText: string; type: string; version: 1 } {
    return {
      ...super.exportJSON(),
      type: "image",
      version: 1,
      src: this.__src,
      altText: this.__altText,
    };
  }
}

const $createImageNode = (src: string, altText = ""): ImageNode =>
  new ImageNode(src, altText);


interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  brandConfig: BrandConfig;
  pdfLayout?: PdfLayout;
  meta?: DocumentMeta;
}

// Plugin para sincronizar conteúdo inicial
function InitialContentPlugin({ content }: { content: string }) {
  const [editor] = useLexicalComposerContext();
  const isFirstRender = useRef(true);

  useEffect(() => {
    // Apenas carrega o conteúdo inicial uma vez
    if (content && isFirstRender.current) {
      isFirstRender.current = false;
      editor.update(() => {
        const root = $getRoot();
        root.clear();

        // Parse HTML usando o parser nativo do Lexical
        const parser = new DOMParser();
        const dom = parser.parseFromString(content, "text/html");

        // Gera nós do Lexical a partir do DOM
        const nodes = $generateNodesFromDOM(editor, dom);

        // Insere os nós no root
        root.append(...nodes);
      });
    }
  }, [content, editor]);

  return null;
}

// Plugin para auto-foco
function AutoFocusPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    editor.focus();
  }, [editor]);

  return null;
}

// Plugin para atalhos de teclado customizados
function KeyboardShortcutsPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const { key, ctrlKey, metaKey, shiftKey } = event;
      const mod = ctrlKey || metaKey;

      // Ctrl/Cmd + Shift + H = Linha horizontal
      if (mod && shiftKey && key.toLowerCase() === "h") {
        event.preventDefault();
        editor.dispatchCommand(INSERT_HORIZONTAL_RULE_COMMAND, undefined);
        return;
      }

      // Ctrl/Cmd + Shift + T = Inserir tabela
      if (mod && shiftKey && key.toLowerCase() === "t") {
        event.preventDefault();
        editor.dispatchCommand(INSERT_TABLE_COMMAND, {
          columns: "3",
          rows: "3",
          includeHeaders: true,
        });
        return;
      }

      // Ctrl/Cmd + Shift + 1/2/3 = Headings
      if (mod && shiftKey && ["1", "2", "3"].includes(key)) {
        event.preventDefault();
        const headingSize = `h${key}` as "h1" | "h2" | "h3";
        editor.update(() => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            $setBlocksType(selection, () => $createHeadingNode(headingSize));
          }
        });
        return;
      }

      // Ctrl/Cmd + Shift + Q = Quote
      if (mod && shiftKey && key.toLowerCase() === "q") {
        event.preventDefault();
        editor.update(() => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            $setBlocksType(selection, () => $createQuoteNode());
          }
        });
        return;
      }
    };

    return editor.registerRootListener((rootElement, prevRootElement) => {
      if (prevRootElement !== null) {
        prevRootElement.removeEventListener("keydown", handleKeyDown);
      }
      if (rootElement !== null) {
        rootElement.addEventListener("keydown", handleKeyDown);
      }
    });
  }, [editor]);

  return null;
}

// Plugin da toolbar
function ToolbarPlugin({ brandConfig }: { brandConfig: BrandConfig }) {
  const [editor] = useLexicalComposerContext();
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [blockType, setBlockType] = useState("paragraph");
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isStrikethrough, setIsStrikethrough] = useState(false);
  const [isCode, setIsCode] = useState(false);

  const updateToolbar = useCallback(() => {
    const selection = $getSelection();

    if ($isRangeSelection(selection)) {
      // Atualiza formatos de texto
      setIsBold(selection.hasFormat("bold"));
      setIsItalic(selection.hasFormat("italic"));
      setIsUnderline(selection.hasFormat("underline"));
      setIsStrikethrough(selection.hasFormat("strikethrough"));
      setIsCode(selection.hasFormat("code"));

      // Determina o tipo de bloco
      const anchorNode = selection.anchor.getNode();
      const element =
        anchorNode.getKey() === "root"
          ? anchorNode
          : anchorNode.getTopLevelElementOrThrow();

      if (element !== null) {
        if ($isListNode(element)) {
          const parentList = element.getParent();
          const type = parentList ? parentList.getType() : element.getType();
          setBlockType(type);
        } else {
          const type = $isHeadingNode(element)
            ? element.getTag()
            : element.getType();
          setBlockType(type);
        }
      }
    }
  }, []);

  useEffect(() => {
    return editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      () => {
        updateToolbar();
        return false;
      },
      COMMAND_PRIORITY_CRITICAL
    );
  }, [editor, updateToolbar]);

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        updateToolbar();
      });
    });
  }, [editor, updateToolbar]);

  useEffect(() => {
    return editor.registerCommand(
      CAN_UNDO_COMMAND,
      (payload) => {
        setCanUndo(payload);
        return false;
      },
      COMMAND_PRIORITY_CRITICAL
    );
  }, [editor]);

  useEffect(() => {
    return editor.registerCommand(
      CAN_REDO_COMMAND,
      (payload) => {
        setCanRedo(payload);
        return false;
      },
      COMMAND_PRIORITY_CRITICAL
    );
  }, [editor]);

  const formatHeading = (headingSize: "h1" | "h2" | "h3") => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        if (blockType !== headingSize) {
          $setBlocksType(selection, () => $createHeadingNode(headingSize));
        } else {
          $setBlocksType(selection, () => $createParagraphNode());
        }
      }
    });
  };

  const formatQuote = () => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        if (blockType !== "quote") {
          $setBlocksType(selection, () => $createQuoteNode());
        } else {
          $setBlocksType(selection, () => $createParagraphNode());
        }
      }
    });
  };

  const clearFormatting = () => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        const anchor = selection.anchor;
        const focus = selection.focus;
        const nodes = selection.getNodes();

        if (anchor.key === focus.key && anchor.offset === focus.offset) {
          return;
        }

        nodes.forEach((node) => {
          if ($isTextNode(node)) {
            node.setFormat(0);
            node.setStyle("");
          }
        });
      }
    });
  };

  const insertTable = () => {
    editor.dispatchCommand(INSERT_TABLE_COMMAND, {
      columns: "3",
      rows: "3",
      includeHeaders: true,
    });
  };

  const insertHorizontalRule = () => {
    editor.dispatchCommand(INSERT_HORIZONTAL_RULE_COMMAND, undefined);
  };

  // Alternar cabeçalho: promove/demove a 1ª linha da tabela para <th>/<td>
  const toggleFirstRowHeader = () => {
    editor.update(() => {
      try {
        const html = $generateHtmlFromNodes(editor, null);
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");
        const tables = Array.from(doc.querySelectorAll("table"));
        tables.forEach((table) => {
          const firstRow = table.querySelector("tr");
          if (!firstRow) return;
          const cellEls = Array.from(firstRow.children).filter(
            (el) => el instanceof HTMLElement && (el.tagName === "TD" || el.tagName === "TH")
          ) as HTMLElement[];
          if (cellEls.length === 0) return;
          const isHeader = cellEls.every((c) => c.tagName === "TH");
          cellEls.forEach((cell) => {
            const newCell = doc.createElement(isHeader ? "td" : "th");
            // copia atributos relevantes (exceto style/width/height)
            Array.from(cell.attributes).forEach((attr) => {
              const name = attr.name.toLowerCase();
              if (name === "style" || name === "width" || name === "height") return;
              newCell.setAttribute(attr.name, attr.value);
            });
            newCell.innerHTML = cell.innerHTML;
            cell.replaceWith(newCell);
          });
        });

        const dom = doc;
        const root = $getRoot();
        root.clear();
        const nodes = $generateNodesFromDOM(editor, dom);
        root.append(...nodes);
      } catch (e) {
        console.error("toggleFirstRowHeader failed", e);
      }
    });
  };

  const setTextColor = (color: string) => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        $patchStyleText(selection, { color });
      }
    });
  };

  const ToolbarButton = ({
    onClick,
    isActive = false,
    disabled = false,
    children,
    title,
  }: {
    onClick: () => void;
    isActive?: boolean;
    disabled?: boolean;
    children: React.ReactNode;
    title: string;
  }) => (
    <HoverPopover trigger={
      <Button
        type="button"
        onClick={onClick}
        disabled={disabled}
        variant={isActive ? "default" : "ghost"}
        size="sm"
        className={`h-10 w-10 p-0 ${isActive ? "bg-[#ff5e2b] text-white hover:bg-[#ff7e4d]" : ""} cursor-pointer`}
        title={title}
      >
        {children}
      </Button>
    }
    side="left"
    align="start"
    className="w-fit px-4 py-2 mr-1 border-[#ff5e2b]/50">
      <div className="space-y-1">
        <h4 className="text-sm font-semibold">{title}</h4>
      </div> 
    </HoverPopover>
  );

  return (
    <div className="fixed top-6 right-6 rounded-full border border-[#ff5e2b]/30 hover:border-[#ff5e2b]/50 bg-white shadow-md p-2 flex flex-col flex-wrap gap-1 items-center z-10">
      {/* History */}
      <ToolbarButton
        onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)}
        disabled={!canUndo}
        title="Desfazer (Ctrl+Z)"
      >
        <Undo className="h-6 w-6" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)}
        disabled={!canRedo}
        title="Refazer (Ctrl+Y)"
      >
        <Redo className="h-6 w-6" />
      </ToolbarButton>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Block types */}
      <ToolbarButton
        onClick={() => formatHeading("h1")}
        isActive={blockType === "h1"}
        title="Título 1"
      >
        <Heading1 className="h-6 w-6" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => formatHeading("h2")}
        isActive={blockType === "h2"}
        title="Título 2"
      >
        <Heading2 className="h-6 w-6" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => formatHeading("h3")}
        isActive={blockType === "h3"}
        title="Título 3"
      >
        <Heading3 className="h-6 w-6" />
      </ToolbarButton>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Text formatting */}
      <ToolbarButton
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold")}
        isActive={isBold}
        title="Negrito (Ctrl+B)"
      >
        <Bold className="h-6 w-6" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic")}
        isActive={isItalic}
        title="Itálico (Ctrl+I)"
      >
        <Italic className="h-6 w-6" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "underline")}
        isActive={isUnderline}
        title="Sublinhado (Ctrl+U)"
      >
        <UnderlineIcon className="h-6 w-6" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() =>
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, "strikethrough")
        }
        isActive={isStrikethrough}
        title="Tachado"
      >
        <Strikethrough className="h-6 w-6" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "code")}
        isActive={isCode}
        title="Código"
      >
        <Code className="h-6 w-6" />
      </ToolbarButton>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Lists */}
      <ToolbarButton
        onClick={() =>
          editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)
        }
        isActive={blockType === "bullet"}
        title="Lista com marcadores"
      >
        <List className="h-6 w-6" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() =>
          editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined)
        }
        isActive={blockType === "number"}
        title="Lista numerada"
      >
        <ListOrdered className="h-6 w-6" />
      </ToolbarButton>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Blockquote */}
      <ToolbarButton
        onClick={formatQuote}
        isActive={blockType === "quote"}
        title="Citação"
      >
        <Quote className="h-6 w-6" />
      </ToolbarButton>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Table */}
      <ToolbarButton onClick={insertTable} title="Inserir tabela (3x3)">
        <Table2 className="h-6 w-6" />
      </ToolbarButton>
      <ToolbarButton onClick={toggleFirstRowHeader} title="Alternar cabeçalho (1ª linha TH)">
        <span className="h-6 w-6 flex items-center justify-center text-[10px] font-bold">TH</span>
      </ToolbarButton>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Horizontal Rule */}
      <ToolbarButton onClick={insertHorizontalRule} title="Linha horizontal">
        <Minus className="h-6 w-6" />
      </ToolbarButton>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Clear Formatting */}
      <ToolbarButton onClick={clearFormatting} title="Limpar formatação">
        <RemoveFormatting className="h-6 w-6" />
      </ToolbarButton>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Paleta de Cores (Popover) */}
      <HoverPopover
        trigger={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-10 w-10 p-0 cursor-pointer"
            onMouseDown={(e) => {
              // Evita que o botão roube o foco do editor e a seleção seja perdida
              e.preventDefault();
            }}
            title="Paleta de cores"
          >
            <Palette className="h-6 w-6" />
          </Button>
        }
        side="left"
        align="center"
        className="w-fit px-4 py-2 mr-1 border-[#ff5e2b]/50"
      >
        <div className="space-y-3">
          <div>
            <div className="text-xs text-[#154C71]/70 mb-1">Texto</div>
            <div className="grid grid-cols-6 gap-2">
              {(
                [
                  ["Primária", brandConfig.primaryColor],
                  ["Secundária", brandConfig.secondaryColor],
                  ["Acento", brandConfig.accentColor],
                  ["Text", brandConfig.textColor],
                  ["Border", brandConfig.borderColor],
                ] as const
              ).map(([label, color]) => (
                <button
                  key={`txt-${label}`}
                  type="button"
                  className="h-6 w-6 rounded border border-black/10 bg-white flex items-center justify-center hover:border-black/30"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onClick={() => {
                    setTextColor(color);
                    editor.focus();
                  }}
                  title={`Cor do texto: ${label}`}
                >
                  <span className="font-semibold" style={{ color }}>
                    A
                  </span>
                </button>
              ))}
            </div>
          </div>         
        </div>
      </HoverPopover>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Help */}
      <EditorHelp />
    </div>
  );
}

export const RichTextEditor = ({
  content,
  onChange,
  brandConfig,
  pdfLayout = "padrao",
  meta,
}: RichTextEditorProps) => {
  const [brandCss, setBrandCss] = useState<string>("");
  const initialConfig = {
    namespace: "DocumentEditor",
    theme: {
      paragraph: "editor-paragraph",
      heading: {
        h1: "editor-heading-h1",
        h2: "editor-heading-h2",
        h3: "editor-heading-h3",
      },
      list: {
        ul: "editor-list-ul",
        ol: "editor-list-ol",
        listitem: "editor-list-item",
        nested: {
          listitem: "editor-list-item-nested",
        },
      },
      quote: "editor-quote",
      code: "editor-code",
      text: {
        bold: "editor-text-bold",
        italic: "editor-text-italic",
        underline: "editor-text-underline",
        strikethrough: "editor-text-strikethrough",
        code: "editor-text-code",
      },
      table: "editor-table",
      tableCell: "editor-table-cell",
      tableCellHeader: "editor-table-cell-header",
    },
    onError: (error: Error) => {
      console.error("Lexical Error:", error);
    },
    nodes: [
      HeadingNode,
      QuoteNode,
      ListNode,
      ListItemNode,
      TableNode,
      TableCellNode,
      TableRowNode,
      HorizontalRuleNode,
      LinkNode,
      AutoLinkNode,
      ImageNode,
    ],
  };

  const handleChange = (editorState: EditorState, editor: LexicalEditor) => {
    editorState.read(() => {
      const html = $generateHtmlFromNodes(editor, null);
      // Sanitiza somente tabelas/células antes de propagar (não altera outros elementos)
      const sanitize = (raw: string) => {
        try {
          const parser = new DOMParser();
          const doc = parser.parseFromString(raw, "text/html");
          const nodes = doc.querySelectorAll("table, th, td, thead, tbody, tfoot, tr");
          nodes.forEach((el) => {
            el.removeAttribute("style");
            el.removeAttribute("width");
            el.removeAttribute("height");
          });
          return doc.body.innerHTML;
        } catch {
          return raw;
        }
      };
      onChange(sanitize(html));
    });
  };

  const resolvedLayout = pdfLayout;
  // | Medir a altura do cabeçalho de prévia para deslocar o padrão de quebras
  const headerRef = useRef<HTMLDivElement | null>(null);
  const [headerOffset, setHeaderOffset] = useState(0);
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const measure = () => setHeaderOffset(el.offsetHeight || 0);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [meta, brandConfig, resolvedLayout]);
  const legendCopy =
    resolvedLayout === "a4"
      ? "As linhas tracejadas mostram onde cada página A4 termina."
      : resolvedLayout === "apresentacao"
      ? "As linhas tracejadas representam o fim de cada slide 16:9."
      : null;

  // Busca o CSS de marca da API e injeta no editor
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/brand-css", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ brandConfig }),
        });
        const cssText = await res.text();
        if (active) setBrandCss(cssText);
      } catch (e) {
        console.error("Falha ao carregar CSS da marca:", e);
        if (active) setBrandCss("");
      }
    })();
    return () => {
      active = false;
    };
  }, [brandConfig]);

  return (
    <div className="border border-[rgba(255,94,43,0.2)] rounded-xl overflow-hidden bg-white">
      <LexicalComposer initialConfig={initialConfig}>
        <ToolbarPlugin brandConfig={brandConfig} />
        <div
          className="doc"
          data-layout={pdfLayout}
          style={{ ["--header-offset" as string]: `${headerOffset}px` }}
        >
          <style>{`
            /* CSS da marca (gerado no servidor) */
            ${brandCss}

            /* Overrides reativos direto do client para refletir alterações imediatas do brandConfig */
            .doc { 
              ${brandConfig?.textColor ? `--dark-text: ${brandConfig.textColor};` : ""}
              ${brandConfig?.borderColor ? `--border-color: ${brandConfig.borderColor};` : ""}
            }

            /* Bridge mínimo para o editor refletir variáveis de cor */
            .doc .editor-container {
              background: var(--bg-color);
              color: var(--dark-text);
              outline: none;
              min-height: 600px;
              padding: 2rem;
              font-family: 'Kanit', 'Segoe UI', Arial, Helvetica, sans-serif;
            }
            /* Lexical theme: estilos de texto */
            .editor-text-bold { font-weight: 700; }
            .editor-text-italic { font-style: italic; }
            .editor-text-underline { text-decoration: underline; text-underline-offset: 2px; }
            .editor-text-strikethrough { text-decoration: line-through; }
            .editor-text-code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; font-size: 0.9em; background: rgba(0,0,0,0.04); padding: 0.15em 0.35em; border-radius: 4px; }
            .doc .editor-container h1,
            .doc .editor-container h2,
            .doc .editor-container h3 { color: var(--primary-orange); }
            .doc .editor-container a { color: var(--medium-blue); border-bottom: 2px solid var(--orange-accent-light); text-decoration: none; }
            .doc .editor-container a:hover { color: var(--primary-orange); border-bottom-color: var(--primary-orange); }

            /* Normalização de estilos inline gerados pelo Lexical em tabelas */
            .doc .editor-container table[style] {
              width: 100% !important;
              table-layout: fixed !important;
            }
            .doc .editor-container th[style],
            .doc .editor-container td[style] {
              width: auto !important;
              height: auto !important;
            }

            /* Header laranja quando não houver THEAD no conteúdo do editor */
            .doc .editor-container table tr:first-child th {
              background: rgba(255, 94, 43, 0.75);
            }
            /* Corpo branco para contraste com fundo da página do editor */
            .doc .editor-container table tbody tr {
              background-color: #FFFFFF;
            }
            /* Zebra igual ao template */
            .doc .editor-container table tbody tr:nth-child(even) {
              background-color: rgba(255, 249, 213, 0.15);
            }

            /* Overrides para layout 'padrao' (iguais ao preview) */
            ${resolvedLayout === 'padrao' ? `
              .doc .main-container { min-height: auto !important; }
              .doc .document-main { padding: 20px !important; margin: 0 !important; }
              .doc #content, .doc #content * {
                page-break-before: auto !important;
                page-break-after: auto !important;
                page-break-inside: auto !important;
                break-before: auto !important;
                break-after: auto !important;
                break-inside: auto !important;
              }
            ` : ''}
          `}</style>
          {/* Cabeçalho visual (não editável), apenas para alinhar as quebras */}
          
            <div ref={headerRef} className="w-full h-[262.39px] flex justify-center items-center border border-dashed bg-[#152937]/20 rounded-md border-[#152937]/10  select-none">
              <h1 className="text-[#152937]">Cabeçalho</h1>
            </div>
          
          <RichTextPlugin
            contentEditable={
              <ContentEditable
                id="content"
                className="editor-container focus:outline-none"
                aria-label="Editor de texto rico"
              />
            }
            placeholder={
              <div className="absolute top-8 left-8 text-gray-400 pointer-events-none">
                Comece a digitar ou use os comandos da barra de ferramentas...
              </div>
            }
            ErrorBoundary={() => (
              <div className="p-4 bg-red-50 text-red-600 rounded">
                Erro ao carregar o editor. Por favor, recarregue a página.
              </div>
            )}
          />
          <div className="bg-black flex flex-col">
            <HistoryPlugin />
            <ListPlugin />
            <TablePlugin />
            <TabIndentationPlugin />
            <KeyboardShortcutsPlugin />
            <OnChangePlugin onChange={handleChange} ignoreSelectionChange />
            <InitialContentPlugin content={content} />
            <AutoFocusPlugin />
          </div>
        </div>
      </LexicalComposer>
      {legendCopy && (
        <div className="hidden mt-3 items-center gap-3 rounded-md border border-dashed border-[#ff5e2b]/40 bg-[#fff9d5]/60 px-3 py-2 text-xs text-[#154C71]/80">
          <span className="h-px flex-1 bg-linear-to-r from-transparent via-[#ff5e2b]/60 to-transparent" />
          <span className="whitespace-nowrap font-medium text-[#ff5e2b]">
            Quebra de página
          </span>
          <span className="h-px flex-1 bg-linear-to-r from-transparent via-[#ff5e2b]/60 to-transparent" />
          <span className="ml-2 text-[11px] text-[#154C71]/70">{legendCopy}</span>
        </div>
      )}
    </div>
  );
};
