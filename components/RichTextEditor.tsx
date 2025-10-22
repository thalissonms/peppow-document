import { useEffect, useCallback, useState, useRef } from "react";
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
  $createHorizontalRuleNode,
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
  COMMAND_PRIORITY_LOW,
  SELECTION_CHANGE_COMMAND,
  $createParagraphNode,
  $createTextNode,
  EditorState,
  LexicalEditor,
  ElementNode,
  TextFormatType,
} from "lexical";
import { $generateHtmlFromNodes, $generateNodesFromDOM } from "@lexical/html";
import { $setBlocksType } from "@lexical/selection";
import { $insertNodes, $isParagraphNode } from "lexical";
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
  Link as LinkIcon,
  RemoveFormatting,
} from "lucide-react";
import { Button } from "./ui/Button";
import { Separator } from "./ui/Separator";
import { EditorHelp } from "./EditorHelper";
import { BrandConfig, PdfLayout } from "@/types/ui";

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  brandConfig: BrandConfig;
  pdfLayout?: PdfLayout;
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
  }, []); // Roda apenas uma vez

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
      let element =
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

  const formatParagraph = () => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, () => $createParagraphNode());
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
    <Button
      type="button"
      onClick={onClick}
      disabled={disabled}
      variant={isActive ? "default" : "ghost"}
      size="sm"
      className={`h-8 w-8 p-0 ${isActive ? "bg-[#ff5e2b] text-white hover:bg-[#ff7e4d]" : ""}`}
      title={title}
    >
      {children}
    </Button>
  );

  return (
    <div className="border-b border-[rgba(255,94,43,0.2)] bg-[#fff9d5] p-2 flex flex-wrap gap-1 items-center sticky top-0 z-10">
      {/* History */}
      <ToolbarButton
        onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)}
        disabled={!canUndo}
        title="Desfazer (Ctrl+Z)"
      >
        <Undo className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)}
        disabled={!canRedo}
        title="Refazer (Ctrl+Y)"
      >
        <Redo className="h-4 w-4" />
      </ToolbarButton>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Block types */}
      <ToolbarButton
        onClick={() => formatHeading("h1")}
        isActive={blockType === "h1"}
        title="Título 1"
      >
        <Heading1 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => formatHeading("h2")}
        isActive={blockType === "h2"}
        title="Título 2"
      >
        <Heading2 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => formatHeading("h3")}
        isActive={blockType === "h3"}
        title="Título 3"
      >
        <Heading3 className="h-4 w-4" />
      </ToolbarButton>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Text formatting */}
      <ToolbarButton
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold")}
        isActive={isBold}
        title="Negrito (Ctrl+B)"
      >
        <Bold className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic")}
        isActive={isItalic}
        title="Itálico (Ctrl+I)"
      >
        <Italic className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "underline")}
        isActive={isUnderline}
        title="Sublinhado (Ctrl+U)"
      >
        <UnderlineIcon className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() =>
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, "strikethrough")
        }
        isActive={isStrikethrough}
        title="Tachado"
      >
        <Strikethrough className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "code")}
        isActive={isCode}
        title="Código"
      >
        <Code className="h-4 w-4" />
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
        <List className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() =>
          editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined)
        }
        isActive={blockType === "number"}
        title="Lista numerada"
      >
        <ListOrdered className="h-4 w-4" />
      </ToolbarButton>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Blockquote */}
      <ToolbarButton
        onClick={formatQuote}
        isActive={blockType === "quote"}
        title="Citação"
      >
        <Quote className="h-4 w-4" />
      </ToolbarButton>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Table */}
      <ToolbarButton onClick={insertTable} title="Inserir tabela (3x3)">
        <Table2 className="h-4 w-4" />
      </ToolbarButton>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Horizontal Rule */}
      <ToolbarButton onClick={insertHorizontalRule} title="Linha horizontal">
        <Minus className="h-4 w-4" />
      </ToolbarButton>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Clear Formatting */}
      <ToolbarButton onClick={clearFormatting} title="Limpar formatação">
        <RemoveFormatting className="h-4 w-4" />
      </ToolbarButton>

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
}: RichTextEditorProps) => {
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
    ],
  };

  const handleChange = (editorState: EditorState, editor: LexicalEditor) => {
    editorState.read(() => {
      const html = $generateHtmlFromNodes(editor, null);
      onChange(html);
    });
  };

  const resolvedLayout = pdfLayout;
  const pageBreakHeight = resolvedLayout === "a4" ? 1123 : resolvedLayout === "apresentacao" ? 900 : 0;
  const layoutCss =
    resolvedLayout !== "padrao"
      ? `
            .doc[data-layout="${resolvedLayout}"] .editor-container {
              --page-break-height: ${pageBreakHeight}px;
            }
            .doc[data-layout="${resolvedLayout}"] .editor-container::before {
              content: "";
              position: absolute;
              inset: 0;
              pointer-events: none;
              background-image: linear-gradient(
                to bottom,
                transparent 0,
                transparent calc(var(--page-break-height) - 2px),
                rgba(255, 94, 43, 0.4) calc(var(--page-break-height) - 2px),
                rgba(255, 94, 43, 0.4) calc(var(--page-break-height)),
                transparent calc(var(--page-break-height))
              );
              background-size: 100% var(--page-break-height);
              background-repeat: repeat-y;
            }
          `
      : `
            .doc[data-layout='padrao'] .editor-container::before {
              content: none;
            }
          `;
  const legendCopy =
    resolvedLayout === "a4"
      ? "As linhas tracejadas mostram onde cada página A4 termina."
      : resolvedLayout === "apresentacao"
      ? "As linhas tracejadas representam o fim de cada slide 16:9."
      : null;

  return (
    <div className="border border-[rgba(255,94,43,0.2)] rounded-xl overflow-hidden bg-white">
      <LexicalComposer initialConfig={initialConfig}>
        <ToolbarPlugin brandConfig={brandConfig} />
        <div className="doc" data-layout={pdfLayout}>
          <style>{`
            /* Estilos do editor usando as mesmas variáveis CSS do style.css */
            .doc {
              --bg-color: ${brandConfig.backgroundColor};
              --primary-orange: ${brandConfig.primaryColor};
              --dark-blue: ${brandConfig.secondaryColor};
              --medium-blue: ${brandConfig.accentColor};
              --light-text: #fff9d5;
              --dark-text: ${brandConfig.secondaryColor};
              --orange-accent-light: ${brandConfig.primaryColor}1A;
              --orange-accent-medium: ${brandConfig.primaryColor}66;
              --orange-accent-strong: ${brandConfig.primaryColor}CC;
              --blue-accent-light: ${brandConfig.accentColor}40;
            }
            
            .doc .editor-container {
              background: var(--bg-color);
              color: var(--dark-text);
              outline: none;
              min-height: 600px;
              padding: 2rem;
              font-family: 'Kanit', 'Segoe UI', Arial, Helvetica, sans-serif;
              position: relative;
            }

            .doc .editor-container::before {
              content: none;
            }

            ${layoutCss}
            
            /* Headings - igual ao style.css */
            .doc .editor-heading-h1,
            .doc .editor-container h1 {
              color: var(--primary-orange);
              font-size: 32px;
              font-weight: 700;
              line-height: 1.3;
              margin-top: 40px;
              margin-bottom: 20px;
            }
            
            .doc .editor-heading-h2,
            .doc .editor-container h2 {
              color: var(--primary-orange);
              font-size: 26px;
              font-weight: 700;
              line-height: 1.35;
              margin-top: 40px;
              margin-bottom: 20px;
            }
            
            .doc .editor-heading-h3,
            .doc .editor-container h3 {
              color: var(--medium-blue);
              font-size: 22px;
              font-weight: 700;
              line-height: 1.4;
              margin-top: 40px;
              margin-bottom: 20px;
            }
            
            /* Parágrafos */
            .doc .editor-paragraph,
            .doc .editor-container p {
              margin-bottom: 16px;
              color: var(--dark-text);
              font-size: 14px;
              line-height: 1.7;
            }
            
            /* Listas - igual ao style.css */
            .doc .editor-list-ul,
            .doc .editor-list-ol,
            .doc .editor-container ul,
            .doc .editor-container ol {
              padding-left: 0;
              margin-left: 0;
              margin-bottom: 20px;
            }
            
            .doc .editor-list-ul,
            .doc .editor-container ul {
              list-style: none;
            }
            
            .doc .editor-list-item,
            .doc .editor-container ul li {
              position: relative;
              padding-left: 36px;
              margin-bottom: 14px;
              color: var(--dark-text);
              line-height: 1.6;
              font-size: 14px;
            }
            
            .doc .editor-container ul li::before {
              content: "";
              position: absolute;
              top: 6px;
              left: 8px;
              width: 10px;
              height: 10px;
              background: linear-gradient(135deg, var(--primary-orange) 0%, var(--orange-accent-strong) 100%);
              border-radius: 50%;
              box-shadow: 0 2px 6px rgba(255, 94, 43, 0.35), 0 0 0 3px rgba(255, 94, 43, 0.15);
            }
            
            .doc .editor-list-ol,
            .doc .editor-container ol {
              counter-reset: list-item;
              list-style: none;
            }
            
            .doc .editor-container ol li {
              counter-increment: list-item;
              position: relative;
              padding-left: 44px;
              margin-bottom: 12px;
            }
            
            .doc .editor-container ol li::before {
              content: counter(list-item);
              position: absolute;
              left: 0;
              top: 0;
              width: 32px;
              height: 32px;
              border-radius: 8px;
              background: linear-gradient(135deg, rgba(255, 249, 213, 0.9) 0%, rgba(255, 249, 213, 0.5) 100%);
              border: 2px solid var(--medium-blue);
              color: var(--medium-blue);
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: 700;
              font-size: 14px;
            }
            
            /* Negrito - igual ao style.css */
            .doc .editor-text-bold,
            .doc .editor-container strong {
              color: var(--primary-orange);
              font-weight: 600;
            }
            
            .doc .editor-text-italic,
            .doc .editor-container em {
              font-style: italic;
            }
            
            .doc .editor-text-underline,
            .doc .editor-container u {
              text-decoration: underline;
            }
            
            .doc .editor-text-strikethrough {
              text-decoration: line-through;
            }
            
            .doc .editor-text-code,
            .doc .editor-code,
            .doc .editor-container code {
              background: var(--orange-accent-light);
              color: var(--medium-blue);
              padding: 2px 6px;
              border-radius: 3px;
              font-size: 0.9em;
              font-family: 'Courier New', monospace;
            }
            
            /* Tabelas - igual ao style.css */
            .doc .editor-table,
            .doc .editor-container table {
              width: 100% !important;
              table-layout: fixed;
              border-collapse: separate;
              border-spacing: 0;
              margin-block: 32px;
              box-shadow: 0 1px 3px rgba(21, 41, 55, 0.1), 0 2px 8px rgba(21, 41, 55, 0.08);
              border-radius: 12px;
              overflow: hidden;
              border: 1px solid rgba(255, 94, 43, 0.15);
              page-break-inside: avoid;
              break-inside: avoid;
            }
            
            .doc .editor-table-cell-header,
            .doc .editor-container th {
              background: rgba(255, 94, 43, 0.75) !important;
              color: var(--light-text) !important;
              padding: 4px 8px !important;
              text-align: left !important;
              font-weight: 700 !important;
              font-size: 0.85rem !important;
              border: 1px solid rgba(255, 94, 43, 0.15) !important;
              letter-spacing: 0.03em;
              text-transform: uppercase;
            }
            
            .doc .editor-table-cell,
            .doc .editor-container td {
              padding: 4px 8px !important;
              border: 1px solid rgba(255, 94, 43, 0.15) !important;
              background: rgba(255, 255, 255, 0.9) !important;
              color: var(--dark-text) !important;
              font-size: 0.9rem !important;
            }
            
            .doc .editor-container tbody tr:nth-child(even) {
              background-color: rgba(255, 249, 213, 0.15);
            }
            
            /* Normaliza estilos inline de tabelas */
            .doc .editor-container table[style] {
              width: 100% !important;
              table-layout: fixed !important;
            }
            
            .doc .editor-container th[style],
            .doc .editor-container td[style] {
              width: auto !important;
              height: auto !important;
            }
            
            /* Blockquote - igual ao style.css */
            .doc .editor-quote,
            .doc .editor-container blockquote {
              position: relative;
              margin: 24px auto;
              padding: 24px 28px 24px 32px;
              background: linear-gradient(135deg, rgba(255, 249, 213, 0.9) 0%, rgba(255, 249, 213, 0.5) 100%);
              color: var(--medium-blue);
              border-radius: 16px;
              border-left: 5px solid var(--primary-orange);
              box-shadow: 0 2px 8px rgba(21, 41, 55, 0.08), 0 1px 3px rgba(21, 41, 55, 0.1);
              font-style: italic;
              line-height: 1.7;
            }
            
            /* HR - igual ao style.css */
            .doc .editor-container hr {
              height: 6px;
              width: 320px;
              background: linear-gradient(90deg, transparent 0%, var(--primary-orange) 20%, var(--primary-orange) 80%, transparent 100%);
              border: none;
              border-radius: 20px;
              margin: 32px auto;
              box-shadow: 0 2px 8px rgba(255, 94, 43, 0.25);
            }
            
            /* Links */
            .doc .editor-container a {
              color: var(--medium-blue);
              text-decoration: none;
              border-bottom: 2px solid var(--orange-accent-light);
              font-weight: 500;
            }
            
            .doc .editor-container a:hover {
              color: var(--primary-orange);
              border-bottom-color: var(--primary-orange);
            }
            
            /* Selection */
            .doc .editor-container ::selection {
              background: var(--orange-accent-medium);
            }
          `}</style>
          <RichTextPlugin
            contentEditable={
              <ContentEditable
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
          <HistoryPlugin />
          <ListPlugin />
          <TablePlugin />
          <TabIndentationPlugin />
          <KeyboardShortcutsPlugin />
          <OnChangePlugin onChange={handleChange} ignoreSelectionChange />
          <InitialContentPlugin content={content} />
          <AutoFocusPlugin />
        </div>
      </LexicalComposer>
      {legendCopy && (
        <div className="mt-3 flex items-center gap-3 rounded-md border border-dashed border-[#ff5e2b]/40 bg-[#fff9d5]/60 px-3 py-2 text-xs text-[#154C71]/80">
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
