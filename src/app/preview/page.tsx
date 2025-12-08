"use client";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import type { Editor, EditorConfig } from "@ckeditor/ckeditor5-core";
import { Expand, Shrink, X } from "lucide-react";

type Meta = {
  title: string;
  description: string;
  headerLabel: string;
  headerValue: string;
  validityMessage: string;
};

type AIEnhancementOptions = {
  enabled: boolean;
  provider: "gemini" | "openai" | "groq" | "ollama";
  mode: "grammar" | "clarity" | "professional" | "full";
};

type ClassicEditorStatic = {
  create: (element: HTMLElement, config?: EditorConfig) => Promise<Editor>;
};

type LoadingAction = "upload" | "pdf" | null;

const INITIAL_META: Meta = {
  title: "",
  description: "",
  headerLabel: "",
  headerValue: "",
  validityMessage: "",
};

const INITIAL_AI_OPTIONS: AIEnhancementOptions = {
  enabled: true, 
  provider: "gemini", 
  mode: "full",
};

export default function PreviewPage() {
  const [mounted, setMounted] = useState(false);
  const [html, setHtml] = useState<string>("");
  const [meta, setMeta] = useState<Meta>(INITIAL_META);
  const [aiOptions, setAiOptions] = useState<AIEnhancementOptions>(INITIAL_AI_OPTIONS);
  const [loading, setLoading] = useState(false);
  const [activeProcess, setActiveProcess] = useState<LoadingAction>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [currentFileName, setCurrentFileName] = useState<string | null>(null);
  const [inlineTemplateCss, setInlineTemplateCss] = useState<string>("");
  const [pdfLayout, setPdfLayout] = useState<"padrao" | "a4" | "apresentacao">("padrao");
  const ckRef = useRef<Editor | null>(null);
  const editorHostRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [ClassicEditorBuild, setClassicEditorBuild] =
    useState<ClassicEditorStatic | null>(null);
  const isApplyingExternalHtmlRef = useRef(false);
  const latestHtmlRef = useRef<string>("");
  const [isEditorReady, setIsEditorReady] = useState(false);
  const [editorInitError, setEditorInitError] = useState<string | null>(null);
  const [shouldAttachEditor, setShouldAttachEditor] = useState(false);
  const [isPreviewFullscreen, setIsPreviewFullscreen] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);

  // Render only after client hydration to avoid dev-time mismatch noise from extensions
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  useEffect(() => {
    latestHtmlRef.current = html;
  }, [html]);

  // Carrega e inline-a o CSS do template para evitar FOUC no iframe
  useEffect(() => {
    let aborted = false;
    (async () => {
      try {
        const resp = await fetch("/templates/document/style.css", { cache: "force-cache" });
        if (!resp.ok) return;
        const css = await resp.text();
        if (!aborted) setInlineTemplateCss(css);
      } catch {
        // ignora; cai no fallback com <link>
      }
    })();
    return () => {
      aborted = true;
    };
  }, []);

  const resetDocument = () => {
    // Destrói o editor caso exista e reseta todos os estados para o inicial
    if (ckRef.current) {
      // Evita vazamento de instância
      ckRef.current.destroy().catch(() => {});
      ckRef.current = null;
    }
    setIsEditorReady(false);
    setEditorInitError(null);
    setShouldAttachEditor(false);
    setHtml("");
    latestHtmlRef.current = "";
    isApplyingExternalHtmlRef.current = false;
    setMeta(INITIAL_META);
    setAiOptions(INITIAL_AI_OPTIONS);
    setCurrentFileName(null);
    setError(null);
    setLoading(false);
    setActiveProcess(null);
    setIsDragActive(false);
    setIsPreviewFullscreen(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  useEffect(() => {
    if (!html || shouldAttachEditor) return;
    setShouldAttachEditor(true);
  }, [html, shouldAttachEditor]);

  const ckConfig = useMemo(
    () => ({
      toolbar: {
        items: [
          "heading",
          "|",
          "bold",
          "italic",
          "link",
          "|",
          "bulletedList",
          "numberedList",
          "blockQuote",
          "|",
          "insertTable",
          "undo",
          "redo",
        ],
      },
      table: {
        contentToolbar: ["tableColumn", "tableRow", "mergeTableCells"],
      },
      placeholder: "Edite o conteúdo…",
    }),
    []
  );

  useEffect(() => {
    const styleId = "ck-classic-minheight";
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = `
        .ck-editor__editable { min-height: 360px; }
        .ck.ck-editor { background: #ffffff; }
        .ck .ck-toolbar { background: #f8fafc; border: none; }
        .ck .ck-toolbar .ck-toolbar__separator { background: #e5e7eb; }
        .ck .ck-content { background: #ffffff; color: #111827; padding: 0.75rem; }
      `;
      document.head.appendChild(style);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const mod = await import("@ckeditor/ckeditor5-build-classic");
        if (!mounted) return;
        const candidate: unknown =
          (mod as Record<string, unknown>)?.default ??
          (mod as Record<string, unknown>)?.ClassicEditor ??
          mod;
        const hasCreate =
          typeof (candidate as Record<string, unknown>)?.create === "function";
        if (!hasCreate) {
          console.error(
            "CKEditor build inválido: método create não encontrado no módulo",
            mod
          );
          setEditorInitError("Não foi possível carregar o build do CKEditor.");
          return;
        }
        setClassicEditorBuild(() => candidate as ClassicEditorStatic);
      } catch (e) {
        console.error("Falha ao carregar CKEditor via npm:", e);
        setEditorInitError("Não foi possível carregar o CKEditor.");
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (
      !shouldAttachEditor ||
      !ClassicEditorBuild ||
      !editorHostRef.current ||
      ckRef.current
    )
      return;
    (async () => {
      try {
        const config: EditorConfig = {
          ...ckConfig,
          initialData: latestHtmlRef.current || undefined,
        };
        const editor = await ClassicEditorBuild.create(
          editorHostRef.current as HTMLElement,
          config
        );
        ckRef.current = editor;
        setIsEditorReady(true);
        editor.model.document.on("change:data", () => {
          if (isApplyingExternalHtmlRef.current) return;
          setHtml(editor.getData());
        });
      } catch (e) {
        const message =
          e instanceof Error ? e.message : "Falha ao inicializar ClassicEditor";
        setEditorInitError(message);
        console.error("Falha ao inicializar ClassicEditor:", e);
      }
    })();
    return () => {
      if (ckRef.current) {
        ckRef.current.destroy().catch(() => {});
        ckRef.current = null;
      }
    };
  }, [ClassicEditorBuild, ckConfig, shouldAttachEditor]);

  useEffect(() => {
    if (!ckRef.current) return;
    const editor = ckRef.current;
    const currentData = editor.getData();
    if (html && html !== currentData) {
      isApplyingExternalHtmlRef.current = true;
      editor.setData(html);
      setTimeout(() => {
        isApplyingExternalHtmlRef.current = false;
      }, 0);
    }
  }, [html]);

  const handleFileProcessing = async (file: File | null) => {
    setIsDragActive(false);
    if (!file) return;
    setError(null);
    if (!file.name.toLowerCase().endsWith(".docx")) {
      setError("O arquivo deve ter a extensão .docx.");
      return;
    }

    setLoading(true);
    setActiveProcess("upload");
    try {
      const form = new FormData();
      form.append("document", file);
      const resp = await fetch("/api/convert-docx", {
        method: "POST",
        body: form,
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || "Falha ao converter");

      setHtml(data.html);
      const metaPayload = (data.meta ?? {}) as Partial<Meta>;
      setMeta({
        title: metaPayload.title ?? INITIAL_META.title,
        description: metaPayload.description ?? INITIAL_META.description,
        headerLabel: metaPayload.headerLabel ?? INITIAL_META.headerLabel,
        headerValue: metaPayload.headerValue ?? INITIAL_META.headerValue,
        validityMessage:
          metaPayload.validityMessage ?? INITIAL_META.validityMessage,
      });
      setCurrentFileName(file.name);
      setShouldAttachEditor(true);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Erro ao enviar arquivo";
      setError(message);
    } finally {
      setLoading(false);
      setActiveProcess(null);
    }
  };

  const onUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    void handleFileProcessing(file);
    event.target.value = "";
  };

  const onDropZoneClick = () => {
    fileInputRef.current?.click();
  };

  const onDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragActive(false);
    const file = event.dataTransfer.files?.[0] ?? null;
    void handleFileProcessing(file);
  };

  const onDragEnter = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragActive(true);
  };

  const onDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const onDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    const nextTarget = event.relatedTarget as Node | null;
    if (nextTarget && event.currentTarget.contains(nextTarget)) return;
    setIsDragActive(false);
  };

  const onDropzoneKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    onDropZoneClick();
  };

  // Memoiza os handlers dos inputs para evitar re-renderização e perda de foco
  const handleTitleChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setMeta((current) => ({ ...current, title: event.target.value }));
  }, []);

  const handleDescriptionChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMeta((current) => ({ ...current, description: event.target.value }));
  }, []);

  const handleHeaderLabelChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setMeta((current) => ({ ...current, headerLabel: event.target.value }));
  }, []);

  const handleHeaderValueChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setMeta((current) => ({ ...current, headerValue: event.target.value }));
  }, []);

  const handleValidityMessageChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setMeta((current) => ({ ...current, validityMessage: event.target.value }));
  }, []);

  const onEnhanceWithAI = async () => {
    if (!html || !aiOptions.enabled) return;
    
    setError(null);
    setIsEnhancing(true);
    try {
      const apiKey = aiOptions.provider === "gemini" 
        ? process.env.NEXT_PUBLIC_GEMINI_API_KEY 
        : process.env.NEXT_PUBLIC_OPENAI_API_KEY;

      const response = await fetch("/api/enhance-html", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          html,
          meta, // fornece título e mensagens para anti-duplicação
          provider: aiOptions.provider,
          mode: aiOptions.mode,
          apiKey,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error || "Falha ao melhorar documento");
      }

      const { enhancedHtml } = await response.json();
      
      // Atualiza o HTML no editor
      setHtml(enhancedHtml);
      
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao melhorar documento";
      setError(message);
    } finally {
      setIsEnhancing(false);
    }
  };

  const onGeneratePdf = async () => {
    setError(null);
    setLoading(true);
    setActiveProcess("pdf");
    try {
      const resp = await fetch("/api/generate-pdf-from-html", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          html, 
          meta,
          aiEnhancement: undefined, // Não aplica IA aqui, já foi aplicado no preview
          pdfLayout,
        }),
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        throw new Error(data?.error || "Falha ao gerar PDF");
      }
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao gerar PDF";
      setError(message);
    } finally {
      setLoading(false);
      setActiveProcess(null);
    }
  };

  const isEditorAvailable = shouldAttachEditor && !editorInitError;
  const dropMessage =
    activeProcess === "upload"
      ? "Convertendo documento…"
      : "Arraste um .docx ou clique para selecionar";
  

  return (
    <div className="min-h-screen px-8 md:px-12 lg:px-10 py-8 md:py-12 lg:py-16 bg-[#fff9d5] text-[#152937] flex flex-col gap-8 relative">
      {/* Top gradient line */}
      <div className="absolute top-0 left-0 right-0 h-[5px] bg-[rgba(255,94,43,0.4)] rounded-[20px] border border-[#ff5e2b] pointer-events-none" />

      <header className="flex flex-wrap justify-between gap-4 items-start animate-slideDown">
        <div>
          <h1 className="text-4xl md:text-5xl font-bold font-['Kanit',sans-serif] text-[#ff5e2b] m-0 [text-shadow:rgba(21,41,55,0.25)_0px_0px_4px]">
            Pré-visualize, edite e publique seu PDF
          </h1>
          <p className="mt-3 text-[#152937] font-['Kanit',sans-serif] text-base leading-relaxed w-full">
            Converta um arquivo .docx, personalize as informações principais e
            edite o conteúdo em tempo real antes de gerar o PDF final.
          </p>
        </div>
        {currentFileName && (
          <span className="flex items-center gap-3 self-center bg-[rgba(255,94,43,0.1)] text-[#ff5e2b] rounded-full px-4 py-2.5 font-['Kanit',sans-serif] font-semibold text-sm border border-[rgba(255,94,43,0.25)] backdrop-blur-sm animate-popIn">
            <button
              type="button"
              onClick={resetDocument}
              className="p-1 rounded-full hover:bg-[rgba(255,94,43,0.2)] cursor-pointer transition-colors text-[#ff5e2b] hover:text-[#ff5e2b] focus:outline-none focus:ring-2 focus:ring-[rgba(255,94,43,0.3)]"
              title="Limpar documento selecionado"
              aria-label="Limpar documento selecionado"
            >
              <X className="w-4 h-4" />
            </button>
            {currentFileName}
          </span>
        )}
      </header>

      {error && (
        <div
          className="flex items-center gap-3 p-3.5 rounded-[10px] bg-[rgba(255,94,43,0.1)] border border-[rgba(255,94,43,0.25)] text-[#ff5e2b] font-['Kanit',sans-serif] font-semibold shadow-lg shadow-[rgba(255,94,43,0.2)] animate-slideDown"
          role="alert"
        >
          <span className="grid place-items-center w-6 h-6 rounded-full bg-white text-[#ff5e2b] font-bold shrink-0">
            !
          </span>
          <span>{error}</span>
        </div>
      )}
      {!shouldAttachEditor && (
        <section className=" flex-1 flex flex-col justify-center">
          {/* Step 1: Import Document */}
          <div className="p-7 rounded-[25px] bg-[rgba(255,255,255,0.9)] border border-[rgba(255,94,43,0.25)] backdrop-blur-lg shadow-xl shadow-[rgba(255,94,43,0.1)]">
            <div className="mb-6">
              <h2 className="text-2xl font-['Kanit',sans-serif] font-bold text-[#152937] mb-2">
                1. Importe o documento
              </h2>
              <p className="text-[#154c71] font-['Kanit',sans-serif] text-sm">
                Suporte a arquivos .docx até 20 MB.
              </p>
            </div>

            <div
              className={`h-120 flex flex-col justify-center items-center p-8 rounded-[10px] border-2 border-dashed transition-all duration-300 cursor-pointer ${isDragActive ? "border-[#ff5e2b] bg-[rgba(255,94,43,0.1)] scale-102" : "border-[rgba(255,94,43,0.25)] bg-[rgba(255,255,255,0.5)]"} ${loading && activeProcess === "upload" ? "opacity-60" : ""}`}
              role="button"
              tabIndex={0}
              onClick={onDropZoneClick}
              onKeyDown={onDropzoneKeyDown}
              onDrop={onDrop}
              onDragEnter={onDragEnter}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              aria-label="Envie um arquivo .docx"
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={onUpload}
                disabled={loading}
                aria-hidden
              />
              <span
                className="flex justify-center mb-4 animate-float"
                aria-hidden
              >
                <svg
                  width="44"
                  height="44"
                  viewBox="0 0 44 44"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <rect
                    x="2"
                    y="2"
                    width="40"
                    height="40"
                    rx="12"
                    fill="rgba(255,94,43,0.1)"
                    stroke="rgba(255,94,43,0.25)"
                    strokeWidth="2"
                  />
                  <path
                    d="M22 12v20"
                    stroke="#ff5e2b"
                    strokeWidth="2.8"
                    strokeLinecap="round"
                  />
                  <path
                    d="M32 22H12"
                    stroke="#ff5e2b"
                    strokeWidth="2.8"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
              <div className="text-center">
                <span className="block text-[#152937] font-['Kanit',sans-serif] font-medium">
                  {dropMessage}
                </span>
                <span className="block text-[#154c71] font-['Kanit',sans-serif] text-sm mt-1">
                  Nós converteremos automaticamente o conteúdo para edição.
                </span>
              </div>
            </div>
            {currentFileName && (
              <p className="mt-4 text-[#154c71] font-['Kanit',sans-serif] text-sm">
                Arquivo selecionado{" "}
                <span className="font-semibold text-[#ff5e2b]">
                  {currentFileName}
                </span>
              </p>
            )}
          </div>
        </section>
      )}
      {shouldAttachEditor && (
        <div className="grid grid-cols-1 lg:grid-cols-[35%_65%] gap-7 items-start">
          {/* Left Column */}
          <section className="flex flex-col gap-7">
            {/* Step 2: Customize Content */}
            <div className="p-7 rounded-[25px] bg-[rgba(255,255,255,0.9)] border border-[rgba(255,94,43,0.25)] backdrop-blur-lg shadow-xl shadow-[rgba(255,94,43,0.1)]">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-['Kanit',sans-serif] font-bold text-[#152937] mb-2">
                    2. Personalize o conteúdo
                  </h2>
                  <p className="text-[#154c71] font-['Kanit',sans-serif] text-sm">
                    Ajuste as informações do cabeçalho e faça edições visuais
                    antes de exportar.
                  </p>
                </div>
                {/* <span
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-2 ${editorInitError ? "bg-red-100 text-red-700" : isEditorReady ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}
                >
                  <span
                    className={`inline-block w-2 h-2 rounded-full ${editorInitError ? "bg-red-500" : isEditorReady ? "bg-green-500 animate-pulse" : "bg-blue-500 animate-pulse"}`}
                  />
                  {editorInitError
                    ? "Erro ao iniciar"
                    : isEditorReady
                      ? "Editor pronto"
                      : "Preparando editor"}
                </span> */}
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <label
                    className="block text-sm font-['Kanit',sans-serif] font-semibold text-[#154c71] mb-2"
                    htmlFor="meta-title"
                  >
                    Título do documento
                  </label>
                  <input
                    id="meta-title"
                    className="w-full px-4 py-2.5 rounded-[10px] border border-[rgba(255,94,43,0.25)] bg-white text-[#152937] font-['Kanit',sans-serif] placeholder-[#154c71] focus:outline-none focus:ring-1 focus:ring-[#ff5e2b] focus:border-transparent transition-all shadow-sm focus:shadow-md focus:shadow-[rgba(255,94,43,0.2)] disabled:opacity-60"
                    value={meta.title}
                    onChange={handleTitleChange}
                    placeholder="Título do documento"
                    disabled={!isEditorAvailable || loading}
                  />
                </div>

                <div>
                  <label
                    className="block text-sm font-['Kanit',sans-serif] font-semibold text-[#154c71] mb-2"
                    htmlFor="meta-description"
                  >
                    Descrição
                  </label>
                  <textarea
                    id="meta-description"
                    className="w-full px-4 py-2.5 rounded-[10px] border border-[rgba(255,94,43,0.25)] bg-white text-[#152937] font-['Kanit',sans-serif] placeholder-[#154c71] focus:outline-none focus:ring-1 focus:ring-[#ff5e2b] focus:border-transparent transition-all shadow-sm focus:shadow-md focus:shadow-[rgba(255,94,43,0.2)] disabled:opacity-60 resize-none"
                    rows={2}
                    value={meta.description}
                    onChange={handleDescriptionChange}
                    placeholder="Breve descrição que aparecerá abaixo do título"
                    disabled={!isEditorAvailable || loading}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      className="block text-sm font-['Kanit',sans-serif] font-semibold text-[#154c71] mb-2"
                      htmlFor="meta-header-label"
                    >
                      Rótulo do cabeçalho
                    </label>
                    <input
                      id="meta-header-label"
                      className="w-full px-4 py-2.5 rounded-[10px] border border-[rgba(255,94,43,0.25)] bg-white text-[#152937] font-['Kanit',sans-serif] placeholder-[#154c71] focus:outline-none focus:ring-1 focus:ring-[#ff5e2b] focus:border-transparent transition-all shadow-sm focus:shadow-md focus:shadow-[rgba(255,94,43,0.2)] disabled:opacity-60"
                      value={meta.headerLabel}
                      onChange={handleHeaderLabelChange}
                      placeholder="Ex.: Proposta"
                      disabled={!isEditorAvailable || loading}
                    />
                  </div>
                  <div>
                    <label
                      className="block text-sm font-['Kanit',sans-serif] font-semibold text-[#154c71] mb-2"
                      htmlFor="meta-header-value"
                    >
                      Valor do cabeçalho
                    </label>
                    <input
                      id="meta-header-value"
                      className="w-full px-4 py-2.5 rounded-[10px] border border-[rgba(255,94,43,0.25)] bg-white text-[#152937] font-['Kanit',sans-serif] placeholder-[#154c71] focus:outline-none focus:ring-1 focus:ring-[#ff5e2b] focus:border-transparent transition-all shadow-sm focus:shadow-md focus:shadow-[rgba(255,94,43,0.2)] disabled:opacity-60"
                      value={meta.headerValue}
                      onChange={handleHeaderValueChange}
                      placeholder="#1234"
                      disabled={!isEditorAvailable || loading}
                    />
                  </div>
                </div>

                <div>
                  <label
                    className="block text-sm font-['Kanit',sans-serif] font-semibold text-[#154c71] mb-2"
                    htmlFor="meta-validity"
                  >
                    Mensagem de validade
                  </label>
                  <input
                    id="meta-validity"
                    className="w-full px-4 py-2.5 rounded-[10px] border border-[rgba(255,94,43,0.25)] bg-white text-[#152937] font-['Kanit',sans-serif] placeholder-[#154c71] focus:outline-none focus:ring-1 focus:ring-[#ff5e2b] focus:border-transparent transition-all shadow-sm focus:shadow-md focus:shadow-[rgba(255,94,43,0.2)] disabled:opacity-60"
                    value={meta.validityMessage}
                    onChange={handleValidityMessageChange}
                    placeholder="Válido por 7 dias"
                    disabled={!isEditorAvailable || loading}
                  />
                </div>
              </div>

              {/* AI Enhancement Section */}
              <div className="mt-6 p-4 rounded-[10px] bg-[rgba(255,94,43,0.1)] border border-[rgba(255,94,43,0.25)]">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    
                    <label
                      htmlFor="ai-toggle"
                      className="text-sm font-['Kanit',sans-serif] font-semibold text-[#152937] cursor-pointer"
                    >
                      Melhorar documento com IA
                    </label>
                  </div>
                  <button
                    id="ai-toggle"
                    type="button"
                    role="switch"
                    aria-checked={aiOptions.enabled}
                    aria-label="Ativar ou desativar melhoria com IA"
                    onClick={() =>
                      setAiOptions((prev) => ({ ...prev, enabled: !prev.enabled }))
                    }
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#ff5e2b] focus:ring-offset-2 ${
                      aiOptions.enabled ? "bg-[#ff5e2b]" : "bg-[rgba(255,94,43,0.25)]"
                    }`}
                    disabled={!isEditorAvailable || loading}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        aiOptions.enabled ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                {aiOptions.enabled && (
                  <div className="space-y-3 animate-slideDown">
                    <div className="">
                      <label
                        htmlFor="ai-provider"
                        className="block text-xs font-['Kanit',sans-serif] font-semibold text-[#154c71] mb-1.5"
                      >
                        Provider (IA)
                      </label>
                      <select
                        id="ai-provider"
                        value={aiOptions.provider}
                        onChange={(e) =>
                          setAiOptions((prev) => ({
                            ...prev,
                            provider: e.target.value as AIEnhancementOptions["provider"],
                          }))
                        }
                        className="w-full px-3 py-2 rounded-[10px] border border-[rgba(255,94,43,0.25)] bg-white text-[#152937] font-['Kanit',sans-serif] text-sm focus:outline-none focus:ring-2 focus:ring-[#ff5e2b] focus:border-transparent transition-all disabled:opacity-60"
                        disabled={!isEditorAvailable || loading}
                      >
                        <option value="gemini">Google Gemini</option>
                        <option value="openai">GPT-4o-mini</option>
                        {/* <option value="groq">Groq Llama 3.3 (Grátis - 14400/dia)</option>
                        <option value="ollama">Ollama (Local)</option> */}
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="ai-mode"
                        className="block text-xs font-['Kanit',sans-serif] font-semibold text-[#154c71] mb-1.5"
                      >
                        Modo de melhoria
                      </label>
                      <select
                        id="ai-mode"
                        value={aiOptions.mode}
                        onChange={(e) =>
                          setAiOptions((prev) => ({
                            ...prev,
                            mode: e.target.value as AIEnhancementOptions["mode"],
                          }))
                        }
                        className="w-full px-3 py-2 rounded-[10px] border border-[rgba(255,94,43,0.25)] bg-white text-[#152937] font-['Kanit',sans-serif] text-sm focus:outline-none focus:ring-2 focus:ring-[#ff5e2b] focus:border-transparent transition-all disabled:opacity-60"
                        disabled={!isEditorAvailable || loading || isEnhancing}
                      >
                        <option value="grammar">Gramática - Corrige erros ortográficos</option>
                        <option value="clarity">Clareza - Torna o texto mais direto</option>
                        <option value="professional">Profissional - Formaliza o texto</option>
                        <option value="full">Visual - Melhora aparência (sem alterar texto)</option>
                      </select>
                    </div>

                    

                    {/* Botão Melhorar com Gemini */}
                    <button
                      type="button"
                      onClick={onEnhanceWithAI}
                      disabled={!isEditorAvailable || loading || isEnhancing || !html}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[rgba(255,94,43,0.8)] border border-[#ff5e2b] text-[#fff9d5] font-['Kanit',sans-serif] font-semibold rounded-[10px] hover:bg-[#ff5e2b] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[0px_4px_4px_0px_rgba(21,41,55,0.25)] hover:shadow-lg mt-3 cursor-pointer"
                    >
                      {isEnhancing ? (
                        <>
                          <svg
                            className="animate-spin h-5 w-5 text-white"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                          </svg>
                          Melhorando documento...
                        </>
                      ) : (
                        <>
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                            />
                          </svg>
                          Melhorar com {aiOptions.provider === "gemini" ? "Gemini" : aiOptions.provider === "openai" ? "OpenAI" : aiOptions.provider === "groq" ? "Groq" : "Ollama"}
                        </>
                      )}
                    </button>

                    <p className="text-xs text-[#154c71] font-['Kanit',sans-serif] text-center mt-2">
                      {aiOptions.mode === "grammar" && "Corrige erros de português no preview"}
                      {aiOptions.mode === "clarity" && "Deixa o texto mais claro e objetivo no preview"}
                      {aiOptions.mode === "professional" && "Torna o documento mais formal no preview"}
                      {aiOptions.mode === "full" && "Melhora apenas a aparência visual (não altera o texto)"}
                    </p>
                  </div>
                )}
              </div>

              {/* Editor Section */}
              <div className="space-y-3 max-h-600 mt-8">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-['Kanit',sans-serif] font-semibold text-[#154c71]">
                    Editor visual
                  </span>
                  {/* <button
                  type="button"
                  className="px-5 py-2.5 rounded-xl bg-gradient-button text-white font-semibold text-sm hover:shadow-lg hover:shadow-indigo-600/40 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group"
                  onClick={onGeneratePdf}
                  disabled={!shouldAttachEditor || loading || !!editorInitError}
                >
                  <span className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                  {generateLabel}
                </button> */}
                </div>

                <div
                  className="relative rounded-[10px] bg-[rgba(255,255,255,0.5)] border border-[rgba(255,94,43,0.25)] overflow-hidden"
                  style={{ minHeight: "400px", maxHeight: "128.25rem" }}
                >
                  <div ref={editorHostRef} className="relative w-full h-full" />

                  {!shouldAttachEditor && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
                      <p className="text-slate-900 font-semibold mb-1">
                        Envie um documento para liberar o editor.
                      </p>
                      <p className="text-slate-500 text-sm">
                        Converta um .docx para destravar a edição visual do
                        conteúdo.
                      </p>
                    </div>
                  )}

                  {shouldAttachEditor && !isEditorReady && !editorInitError && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
                      <svg
                        className="w-10 h-10 text-indigo-500 animate-spin mb-3"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      <p className="text-slate-900 font-semibold mb-1">
                        Preparando editor…
                      </p>
                      <p className="text-slate-500 text-sm">
                        Estamos carregando os componentes de edição.
                      </p>
                    </div>
                  )}

                  {editorInitError && (
                    <div
                      className="absolute inset-0 flex flex-col items-center justify-center bg-red-50/80 backdrop-blur-sm"
                      role="alert"
                    >
                      <p className="text-slate-900 font-semibold mb-1">
                        Não foi possível iniciar o editor
                      </p>
                      <p className="text-slate-500 text-sm">
                        {editorInitError}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Right Column */}
          <aside
            className={`min-h-0 flex flex-col ${isPreviewFullscreen ? "fixed inset-0 z-50 p-4 bg-[rgba(21,41,55,0.5)] backdrop-blur-sm" : ""}`}
          >
            <div
              className={`${isPreviewFullscreen ? "w-full h-full flex flex-col" : "p-7 rounded-[25px] bg-[rgba(255,255,255,0.9)] border border-[rgba(255,94,43,0.25)] backdrop-blur-lg shadow-xl shadow-[rgba(255,94,43,0.1)] sticky top-8"}`}
            >
              <div
                className={`${isPreviewFullscreen ? "p-7 bg-[rgba(255,255,255,0.96)] rounded-t-[25px] border border-[rgba(255,94,43,0.25)] backdrop-blur-lg shadow-xl" : "mb-6"}`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-['Kanit',sans-serif] font-bold text-[#152937] mb-2">
                      3. Visualize o PDF
                    </h2>
                    <p className="text-[#154c71] font-['Kanit',sans-serif] text-sm">
                      Acompanhe o resultado final renderizado com o estilo do
                      template.
                    </p>
                  </div>
                  <div className="flex gap-2 ml-3 shrink-0 items-center">
                    <label htmlFor="pdf-layout" className="sr-only">Formato do PDF</label>
                    <select
                      id="pdf-layout"
                      value={pdfLayout}
                      onChange={(e) => setPdfLayout(e.target.value as "padrao" | "a4" | "apresentacao")}
                      className="px-3 py-2 rounded-[10px] border border-[rgba(255,94,43,0.25)] bg-white text-[#152937] text-sm font-['Kanit',sans-serif] hover:border-[#ff5e2b] focus:outline-none focus:ring-1 focus:ring-[#ff5e2b]"
                      title="Formato de saída do PDF"
                    >
                      <option value="padrao">Padrão (sem paginação)</option>
                      <option value="a4">A4 (páginas A4)</option>
                      <option value="apresentacao">Apresentação (16:9)</option>
                    </select>
                    <button
                      type="button"
                      onClick={onGeneratePdf}
                      disabled={
                        !shouldAttachEditor || loading || !!editorInitError
                      }
                      className="px-5 py-2.5 rounded-[10px] bg-[rgba(255,94,43,0.8)] border border-[#ff5e2b] text-[#fff9d5] font-['Kanit',sans-serif] font-semibold text-sm hover:bg-[#ff5e2b] hover:shadow-lg cursor-pointer transition-all duration-200 shadow-[0px_4px_4px_0px_rgba(21,41,55,0.25)] disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Gerar PDF do documento"
                      aria-label="Gerar PDF do documento"
                    >
                      {activeProcess === "pdf" ? (
                        <span className="flex items-center gap-2">
                          <svg
                            className="w-4 h-4 animate-spin"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                          </svg>
                          Gerando…
                        </span>
                      ) : (
                        "Gerar PDF"
                      )}
                    </button>
                    {isEditorReady && (
                      <button
                        type="button"
                        onClick={() =>
                          setIsPreviewFullscreen(!isPreviewFullscreen)
                        }
                        className="p-2 rounded-[10px] hover:bg-[rgba(255,94,43,0.1)] transition-colors text-[#154c71] hover:text-[#152937]"
                        title={
                          isPreviewFullscreen
                            ? "Sair da tela cheia"
                            : "Expandir para tela cheia"
                        }
                        aria-label={
                          isPreviewFullscreen
                            ? "Sair da tela cheia"
                            : "Expandir para tela cheia"
                        }
                      >
                        {isPreviewFullscreen ? <Shrink /> : <Expand />}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div
                className={`${isPreviewFullscreen ? "flex-1 overflow-hidden rounded-b-3xl" : ""} ${isEditorReady && "h-600"}`}
              >
                {shouldAttachEditor ? (
                  <iframe
                    title="Pré-visualização do documento"
                    className={`px-6 py-2 ${isPreviewFullscreen ? "w-full h-screen rounded-b-3xl" : "w-full rounded-2xl border border-slate-200"} `}
                    style={{ height: isPreviewFullscreen ? "100%" : "150rem" }}
                    srcDoc={`<!doctype html>
                  <html lang='pt-BR'>
                    <head>
                      <meta charset='utf-8' />
                      <meta name='viewport' content='width=device-width, initial-scale=1' />
                      ${inlineTemplateCss
                        ? `<style>${inlineTemplateCss.replace(/<\//g, '<\\/')}</style>`
                        : `<link rel='preload' href='/templates/document/style.css' as='style' /><link rel='stylesheet' href='/templates/document/style.css' />`}
                    </head>
                    <body class='doc'>
                      <div class='main-container'>
                        <header class='proposal-header' role='banner' aria-label='Cabeçalho da Proposta'>
                          <div class='header-content'>
                            <div class='logos'>
                              <svg width="127" height="34" viewBox="0 0 127 34" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <g clip-path="url(#clip0_2675_4202)">
                                <path d="M52.5988 7.26219C50.2196 7.26219 48.7481 9.06971 48.5208 11.4809V18.4467C48.7839 22.0617 50.8605 23.4942 53.0123 23.4942C55.6564 23.4942 57.5056 21.4973 57.5056 15.6211C57.5056 9.59482 55.7692 7.26041 52.5988 7.26041M53.0893 24.0586C51.2758 24.0586 49.688 23.5692 48.5208 22.7779V29.8991C48.5208 31.9709 48.6998 32.7997 50.0675 33.1373V33.7035H43.0088V33.1373C44.441 32.7229 44.5197 31.8191 44.5197 29.8991V9.89489C44.5197 8.57675 44.1796 8.2374 42.6311 7.82302V7.26219L48.5136 5.98157V8.95719C49.6844 6.84782 52.3267 5.98157 54.1759 5.98157C58.8196 5.98157 62.1422 9.59661 62.1422 15.171C62.1422 21.1222 58.2539 24.0604 53.0821 24.0604" fill="#FF5E2B"/>
                                <path d="M38.9594 15.0031C38.961 16.3736 38.501 17.7048 37.6533 18.7832C36.8056 19.8616 35.6194 20.6245 34.285 20.9495C32.9506 21.2745 31.5454 21.1428 30.295 20.5755C29.0446 20.0082 28.0216 19.0382 27.39 17.8211C26.7585 16.6041 26.5551 15.2107 26.8125 13.8645C27.0699 12.5183 27.7731 11.2974 28.8094 10.3979C29.8456 9.49829 31.1548 8.97217 32.5267 8.90396C33.8986 8.83575 35.2537 9.2294 36.3744 10.0217L28.1396 14.4584L29.7293 17.3893L41.4424 11.0737C40.4696 8.95725 38.7472 7.27415 36.6061 6.3479C34.465 5.42165 32.0563 5.31761 29.843 6.05579C27.6296 6.79396 25.7678 8.32226 24.6154 10.347C23.463 12.3716 23.1012 14.7499 23.5997 17.0245C24.0982 19.2992 25.4217 21.3098 27.3158 22.6699C29.21 24.03 31.5411 24.6437 33.8613 24.3929C36.1814 24.1422 38.3268 23.0447 39.8851 21.3115C41.4435 19.5782 42.3047 17.3315 42.3035 15.0031H38.9594Z" fill="#FF5E2B"/>
                                <path d="M14.6507 18.1395C14.5177 18.9176 14.3109 19.6813 14.0331 20.4204C13.6089 21.5295 12.6368 23.4156 10.8735 23.596C10.7786 23.6067 10.6945 23.6121 10.6068 23.6157C10.6068 23.6157 10.0966 23.6157 9.87637 23.3995C9.61679 23.1495 9.75106 22.5976 9.75106 22.5976C9.87816 22.026 10.2988 20.8115 11.6683 19.104C12.1554 18.4983 12.6829 17.926 13.2473 17.3911L15.0893 15.6354L14.6507 18.1395ZM22.3485 11.1595C22.2178 10.245 21.9332 10.0039 21.6038 10.0521C20.3988 10.2085 19.2164 10.5053 18.0807 10.9362L17.259 11.2524L16.9887 10.4129C16.5555 9.09298 15.9594 8.01061 15.2182 7.19793C13.8613 5.71548 12.0496 5.19573 10.1252 5.73334C8.03965 6.31561 6.13312 8.191 4.45752 11.3077L2.88038 14.2405V5.84587C2.88038 5.58688 2.36661 5.42078 1.44825 5.42078C0.529892 5.42078 0.0161133 5.66011 0.0161133 5.84587V33.5785C0.0161133 33.766 0.426062 34 1.35158 34C2.2771 34 2.8965 33.8392 2.8965 33.5785V27.938C2.88038 19.8042 6.1743 9.82349 10.9021 8.50178C11.7972 8.25709 12.465 8.45356 13.0915 9.13941C13.6823 9.78598 14.1656 10.813 14.4807 12.1079L14.6167 12.6812L14.1423 12.9974C10.741 15.3032 8.523 18.2145 7.59032 20.1685C6.36047 22.7458 6.80623 24.2765 7.39877 25.1213C7.91255 25.8501 8.98665 26.6681 11.1778 26.4555C13.6178 26.2073 15.5906 24.4266 16.7273 21.4456C17.4559 19.538 17.8014 17.1732 17.7227 14.787L17.703 14.228L18.2132 13.9958C19.3537 13.4702 20.5635 13.1094 21.8061 12.9241C22.259 12.8527 22.4881 12.0722 22.3592 11.1595" fill="#FF5E2B"/>
                                <path d="M67.3444 20.6204C67.3421 20.6391 67.3439 20.6581 67.3498 20.676C67.3557 20.6939 67.3654 20.7103 67.3784 20.724C68.0094 21.3849 68.7702 21.9089 69.6131 22.2635C70.4561 22.6182 71.3633 22.7957 72.2781 22.7852C76.3024 22.7852 78.157 19.8167 78.157 15.9069C78.157 11.7168 75.9175 7.10867 71.4385 7.10867C70.662 7.09102 69.8919 7.25197 69.1878 7.57904C68.4838 7.90612 67.8646 8.39055 67.3784 8.99478C67.3654 9.00851 67.3557 9.0249 67.3498 9.0428C67.3439 9.0607 67.3421 9.07967 67.3444 9.09837V20.6204ZM64.02 5.95664C64.02 5.85126 64.0898 5.81733 64.199 5.81733H67.2083C67.3121 5.81733 67.3479 5.85126 67.3479 5.95664V7.2069C67.3437 7.2369 67.3496 7.26744 67.3645 7.29379C67.3795 7.32014 67.4028 7.34082 67.4307 7.35263C67.4587 7.36443 67.4897 7.3667 67.5191 7.35909C67.5485 7.35147 67.5745 7.33439 67.5932 7.3105C69.1667 6.08881 71.2308 5.81018 73.1911 5.81018C78.0549 6.08881 81.5547 9.78959 81.5547 14.9192C81.5547 20.2257 77.8455 23.9604 72.4571 23.9604C70.7416 23.9584 69.0595 23.4877 67.5932 22.5994C67.4876 22.494 67.3479 22.5994 67.3479 22.7387V33.491C67.3479 33.5964 67.3121 33.6696 67.2083 33.6696H64.1954C64.1714 33.6718 64.1471 33.6687 64.1244 33.6605C64.1017 33.6523 64.0811 33.6392 64.064 33.6222C64.0469 33.6051 64.0338 33.5845 64.0256 33.5619C64.0173 33.5392 64.0142 33.515 64.0164 33.491L64.02 5.95664Z" fill="#FF5E2B"/>
                                <path d="M93.8192 6.42995C93.0901 6.4254 92.3668 6.5581 91.6871 6.8211C91.0502 7.06186 90.4748 7.4407 90.0025 7.93026C89.4853 8.48034 89.0554 9.10617 88.7279 9.78601C88.3601 10.546 88.0929 11.3506 87.9331 12.1794C87.7486 13.1171 87.6586 14.0708 87.6646 15.0264C87.6521 16.1997 87.7948 17.3696 88.0888 18.5057C88.3335 19.4704 88.7455 20.385 89.3061 21.208C89.7943 21.927 90.4465 22.5202 91.2091 22.9388C92.1013 23.3974 93.1043 23.5982 94.1048 23.5183C95.1053 23.4385 96.0636 23.0812 96.8714 22.4869C97.7796 21.7891 98.4754 20.7907 98.9587 19.4916C99.4421 18.1925 99.6849 16.6499 99.6873 14.8639C99.6953 13.7682 99.5611 12.6762 99.2881 11.615C99.0551 10.6796 98.6692 9.78891 98.146 8.97869C97.6818 8.26012 97.0667 7.65071 96.3433 7.19261C95.9702 6.94923 95.5638 6.76093 95.1367 6.63356C94.7101 6.5008 94.266 6.43217 93.8192 6.42995ZM93.4951 5.98342C95.0162 5.96528 96.5275 6.22809 97.9527 6.75859C99.2705 7.25765 100.468 8.0295 101.465 9.02335C102.281 9.83612 102.938 10.793 103.404 11.8454C103.953 13.079 104.177 14.4323 104.054 15.7765C103.931 17.1208 103.466 18.4114 102.702 19.5256C101.753 20.9191 100.458 22.0429 98.9426 22.7869C97.3243 23.5958 95.536 24.0078 93.7261 23.989C92.3399 23.9982 90.9626 23.768 89.6552 23.3085C88.4234 22.8816 87.2811 22.2312 86.2861 21.3902C85.3366 20.5868 84.5638 19.5962 84.0162 18.4807C83.4793 17.3998 83.2005 16.2095 83.2017 15.0032C83.2021 13.3988 83.6923 11.8325 84.6069 10.5129C85.558 9.10997 86.8519 7.97211 88.3663 7.20689C89.9488 6.39075 91.7066 5.97144 93.488 5.98521" fill="#FF5E2B"/>
                                <path d="M126.1 4.51879C126.1 4.55273 126.064 4.51879 126.03 4.55273C126.03 4.51879 126.064 4.51879 126.1 4.51879ZM125.716 3.19709C125.716 3.23281 125.682 3.23281 125.682 3.26674C125.543 3.26674 125.682 3.08814 125.716 3.19709ZM125.647 6.98717C125.577 6.95145 125.647 6.91751 125.647 6.88179C125.716 6.88179 125.647 6.91751 125.647 6.98717ZM125.613 3.02384C125.543 3.02384 125.543 2.95418 125.543 2.92024C125.577 2.92024 125.613 2.95418 125.613 3.02384ZM126.028 6.39597C126.036 6.91511 125.917 7.42838 125.681 7.89093C125.611 8.09812 125.681 8.41247 125.471 8.48213C125.715 7.68196 125.715 6.87464 126.098 6.04769C126.237 6.04769 126.062 6.29238 126.028 6.4049M125.296 6.82106C125.296 6.89072 125.226 6.96038 125.332 7.03003C125.296 6.96038 125.366 6.82106 125.296 6.82106ZM125.296 7.13541C125.332 7.20329 125.192 7.41226 125.332 7.41226C125.332 7.27294 125.366 7.16935 125.296 7.13541ZM125.226 4.66704V4.56166H125.133C125.133 4.59738 125.169 4.63132 125.169 4.66704H125.226ZM125.194 3.92938C125.124 3.99904 125.054 4.31161 125.263 4.34733C125.16 4.20801 125.264 4.0687 125.194 3.92938ZM125.16 6.57101H125.088V6.64067H125.16V6.57101ZM125.133 1.25025C125.063 1.28419 125.099 1.38778 125.203 1.38778C125.203 1.28419 125.203 1.25025 125.133 1.25025ZM125.099 7.08897C125.133 7.19257 125.063 7.19257 125.029 7.33188C125.133 7.33188 125.237 7.05504 125.099 7.08897ZM125.133 1.90932C124.993 1.80572 125.133 1.63247 124.993 1.63247C124.923 1.87538 125.063 2.04863 124.959 2.22188C125.054 2.1423 125.118 2.03146 125.138 1.90932M125.174 8.54821C125.104 8.7929 124.929 8.90543 124.965 9.13941C125.144 9.06975 125.278 8.68753 125.174 8.54821ZM124.954 7.09076C124.918 7.12648 124.848 7.33367 124.954 7.33367C124.954 7.23008 125.133 7.09076 124.954 7.09076ZM124.954 7.75161C124.918 7.82127 124.814 7.96059 124.918 7.99452C124.988 7.96059 125.024 7.75161 124.954 7.75161ZM124.848 5.66546C124.884 5.66546 124.918 5.70118 124.918 5.66546C124.918 5.62974 124.848 5.5958 124.848 5.66546ZM124.884 7.40333H124.814V7.47298H124.884V7.40333ZM124.848 2.18973C124.778 2.18973 124.778 2.1558 124.814 2.12008C124.848 2.12008 124.848 2.12008 124.848 2.18973ZM124.744 2.88452C124.778 2.85059 124.814 2.88452 124.814 2.85059C124.778 2.85059 124.744 2.85059 124.744 2.88452ZM124.744 2.74521C124.778 2.74521 124.814 2.78093 124.814 2.74521C124.814 2.70948 124.744 2.67555 124.744 2.74521ZM124.709 7.64802C124.744 7.64802 124.778 7.68196 124.778 7.64802C124.778 7.61409 124.709 7.57836 124.709 7.64802ZM124.325 9.17691C124.33 9.22586 124.318 9.27501 124.291 9.31623C124.395 9.31623 124.431 9.17691 124.325 9.17691ZM124.257 7.6123C124.222 7.6123 124.186 7.75161 124.257 7.79091C124.291 7.75697 124.325 7.6123 124.257 7.6123ZM124.078 4.93317C124.044 4.89923 124.009 4.86529 124.009 4.82957C124.044 4.82957 124.078 4.86529 124.078 4.93317ZM124.044 7.43369C124.044 7.36403 124.044 7.32831 123.975 7.36403C123.972 7.38273 123.974 7.4017 123.98 7.4196C123.986 7.4375 123.996 7.4539 124.009 7.46763C124.009 7.43369 124.009 7.39797 124.044 7.43369ZM124.009 4.72241C124.009 4.75634 123.975 4.72241 123.939 4.75634C123.939 4.72241 123.975 4.72241 124.009 4.72241ZM124.078 5.03497C124.078 5.10463 123.975 5.13857 124.009 5.24395C123.869 5.20822 123.975 5.03497 123.939 5.03497C123.975 4.92959 124.009 5.06891 124.078 5.03497ZM123.975 10.4575H123.905V10.3236H123.975V10.4575ZM123.905 5.45649C123.905 5.38862 123.905 5.3529 123.939 5.3529C123.941 5.3716 123.939 5.39061 123.933 5.40853C123.928 5.42645 123.918 5.44283 123.905 5.45649ZM123.939 5.52615C123.939 5.63153 123.801 5.42255 123.905 5.45649C123.905 5.45649 123.905 5.52615 123.939 5.52615ZM124.044 9.9753H124.114C124.114 10.1539 124.009 10.2539 123.935 10.1539C123.935 10.4307 123.552 10.8844 123.756 10.988C123.86 10.8844 123.756 10.779 123.826 10.7094C123.896 10.779 123.93 10.7451 123.966 10.779C124 10.8844 123.756 11.0219 123.93 11.0916C124.173 10.8487 123.93 10.5361 124.139 10.3629C124.139 10.2575 124.069 10.2236 124.139 10.1182C124.318 10.0146 124.279 9.73596 124.349 9.56271C124.371 9.53853 124.4 9.52217 124.433 9.51605C124.465 9.50993 124.498 9.5144 124.528 9.52877C124.564 9.3198 124.841 8.97151 124.598 8.86792C124.701 8.72861 124.777 8.27672 124.956 8.44998C125.025 8.20707 125.165 8.03382 125.233 7.78912C125.303 7.78912 125.199 7.85878 125.303 7.8945C125.409 7.68553 125.269 7.65159 125.303 7.47656C125.025 7.58194 125.059 8.06775 124.85 8.27672C124.78 8.13741 124.99 8.03382 124.816 8.03382C124.71 8.17135 124.746 8.55357 124.537 8.55357C124.503 8.65895 124.716 8.69288 124.537 8.8322C124.503 8.79826 124.537 8.72861 124.433 8.76254C124.397 9.14476 124.363 9.59664 124.12 9.911C124.159 9.77487 124.182 9.63456 124.188 9.49305C124.05 9.52877 124.009 9.84134 124.05 9.97887C124.084 10.1182 123.944 9.97887 124.05 9.97887M123.701 7.12648C123.701 7.23008 123.667 7.30509 123.806 7.30509C123.84 7.19971 123.806 7.09612 123.701 7.12648ZM123.631 6.08341V6.01375C123.636 6.01375 123.64 6.01283 123.645 6.01103C123.649 6.00924 123.653 6.0066 123.656 6.00329C123.66 5.99997 123.662 5.99603 123.664 5.9917C123.666 5.98736 123.667 5.98272 123.667 5.97803C123.736 5.94409 123.736 6.11734 123.631 6.08341ZM123.421 6.84785C123.387 6.81213 123.284 6.81213 123.318 6.74426C123.387 6.70854 123.421 6.74426 123.421 6.84785ZM123.214 7.47298H123.144V7.40333H123.214V7.47298ZM123.035 9.38589C122.931 9.48948 122.931 9.48948 122.965 9.62879C123.144 9.62879 123.105 9.41982 123.035 9.38589ZM123.001 9.66273H122.931V9.73239H123.001V9.66273ZM122.965 9.17691C122.965 9.10726 122.965 9.0376 122.897 9.07153V9.14119C122.931 9.14119 122.931 9.14119 122.965 9.17691ZM122.861 13.5225C122.791 13.5564 122.582 13.7011 122.721 13.7993C122.721 13.6207 122.9 13.6207 123.001 13.5903C123.18 13.0349 123.244 12.5187 123.557 12.0614C123.593 11.9221 123.523 11.9221 123.523 11.8185C123.627 11.6399 123.907 11.297 123.803 11.088C123.663 11.6096 123.14 12.0275 123.21 12.583C123.04 12.8744 122.919 13.1918 122.852 13.5225M122.673 9.38589C122.673 9.41982 122.637 9.38589 122.603 9.41982C122.603 9.38589 122.637 9.38589 122.673 9.38589ZM122.533 10.9148H122.464V10.9844H122.533V10.9148ZM122.568 15.0853C122.533 15.155 122.324 15.3996 122.533 15.4425C122.498 15.3032 122.713 15.1639 122.568 15.0853ZM122.22 15.9891C122.29 15.8855 122.399 15.8855 122.399 15.8104C122.329 15.7069 122.26 15.8462 122.22 15.9891C122.22 16.0248 122.184 15.9891 122.22 15.9891ZM122.041 11.297H121.971V11.3667H122.041V11.297ZM121.903 10.9398V10.8005C121.971 10.8005 121.971 10.8719 121.903 10.9398ZM122.007 12.2615C122.007 12.1579 122.007 12.1222 122.041 12.0829C121.971 12.0472 121.862 12.0472 121.862 12.1525C121.932 12.1525 121.932 12.2222 122.002 12.2561M121.823 15.8712C121.857 15.8015 121.857 15.7676 121.787 15.7676C121.789 15.7863 121.787 15.8053 121.782 15.8232C121.776 15.8411 121.766 15.8574 121.753 15.8712H121.823ZM121.604 11.6096C121.604 11.6453 121.57 11.6096 121.535 11.6096C121.535 11.5399 121.604 11.5756 121.604 11.6096ZM121.467 14.9817V14.8781C121.57 14.8085 121.57 15.0156 121.467 14.9817ZM121.431 11.8525C121.361 11.8185 121.431 11.7846 121.431 11.7489C121.501 11.7489 121.431 11.7846 121.431 11.8525ZM121.431 12.0972C121.431 12.1311 121.397 12.0972 121.361 12.1311C121.361 12.0972 121.397 12.0972 121.431 12.0972ZM121.221 15.8158H121.151V15.8855H121.221V15.8158ZM123.416 9.62879C123.312 9.69845 123.278 9.8074 123.312 10.011C122.999 10.8808 122.476 11.6453 122.267 12.6902C122.057 12.8991 122.057 13.1081 121.987 13.4564C121.78 13.635 121.71 14.0119 121.674 14.3244C121.535 14.3601 121.57 14.637 121.431 14.6727C121.501 14.9496 121.291 14.9496 121.187 15.1942C121.117 15.2978 121.221 15.2978 121.221 15.3729C121.153 15.3729 121.117 15.3729 121.082 15.4086C121.082 15.5872 121.082 15.7211 121.221 15.7551C121.226 15.5538 121.262 15.3545 121.327 15.1639C121.361 15.1639 121.361 15.1996 121.431 15.1996C121.501 14.921 121.814 14.921 121.78 14.5388C121.85 14.5388 121.814 14.6423 121.884 14.5727C121.953 14.1208 121.987 13.635 122.163 13.3224C122.163 13.426 122.163 13.501 122.267 13.501C122.406 13.0152 122.625 12.7009 122.546 12.2508H122.686C122.755 11.9364 122.789 11.7274 122.963 11.5899C122.929 11.5542 122.895 11.5203 122.895 11.4845C122.911 11.4428 122.939 11.407 122.977 11.3823C123.014 11.3576 123.058 11.3453 123.103 11.347C123.103 11.0327 123.461 10.7201 123.346 10.3039C123.62 9.8915 123.766 9.40742 123.765 8.91257C123.975 8.77326 124.114 8.60001 124.044 8.3571C124.182 8.32138 124.223 8.04453 124.223 7.93915C124.223 7.90522 124.188 7.8695 124.154 7.90522C124.05 8.21778 123.597 8.32138 123.701 8.73932C123.457 8.87864 123.343 9.40017 123.421 9.64308M120.699 14.4673C120.699 14.3637 120.768 14.3637 120.734 14.2583C120.665 14.2244 120.665 14.2941 120.595 14.2941C120.595 14.3977 120.595 14.4727 120.699 14.4727M120.561 14.5423C120.525 14.612 120.525 14.7209 120.421 14.6816C120.455 14.9585 120.699 14.5763 120.561 14.5423ZM119.898 15.6551C119.793 15.6193 119.863 15.4122 119.968 15.4122C119.932 15.5157 119.932 15.5497 119.898 15.6551ZM119.445 17.1143C119.445 17.0107 119.445 16.9053 119.34 16.9357C119.41 17.1143 119.236 17.075 119.236 17.1786C119.306 17.2483 119.34 17.1089 119.445 17.1089M117.181 24.7212C117.111 24.7212 117.002 24.757 117.002 24.8606C117.107 24.8606 117.142 24.7909 117.181 24.7212ZM116.032 24.9302C115.996 24.7909 116.169 24.8606 116.169 24.7909C116.275 24.8266 116.1 24.9302 116.032 24.9302ZM115.543 24.4087C115.439 24.3747 115.403 24.4087 115.403 24.5141C115.509 24.5141 115.543 24.4783 115.543 24.4087ZM114.533 23.5049C114.463 23.5746 114.603 23.6835 114.671 23.7478C114.741 23.6442 114.603 23.5406 114.533 23.5049ZM114.497 23.3656H114.428V23.4353H114.497V23.3656ZM114.318 20.4114C114.318 20.3418 114.283 20.3078 114.249 20.3078C114.249 20.3418 114.213 20.3418 114.213 20.3775C114.249 20.3775 114.249 20.4114 114.318 20.4114ZM114.179 19.0558C114.213 19.0218 114.249 19.0558 114.249 19.0218C114.213 19.0218 114.179 19.0218 114.179 19.0558ZM114.249 20.4846C114.179 20.4846 114.179 20.4846 114.145 20.5543C114.213 20.5543 114.249 20.5204 114.249 20.4846ZM114.213 18.0752C114.213 18.0056 114.213 17.9716 114.179 17.9716C114.179 18.0056 114.109 17.9716 114.109 18.0752H114.213ZM114.145 17.7287C114.145 17.7626 114.109 17.7966 114.109 17.8662C114.213 17.8662 114.249 17.7287 114.145 17.7287ZM114.145 19.9881H114.073V20.056H114.145V19.9881ZM113.9 13.1045C113.796 13.0349 113.865 12.7223 114.005 12.7223C113.942 12.8404 113.906 12.9709 113.9 13.1045ZM113.622 17.2125C113.516 17.1768 113.482 17.2125 113.482 17.3161C113.586 17.3501 113.586 17.2465 113.622 17.2125ZM113.516 13.6404C113.516 13.6743 113.482 13.6404 113.447 13.6404C113.447 13.5707 113.516 13.6046 113.516 13.6404ZM112.611 14.8567C112.507 14.8567 112.541 14.6477 112.68 14.6781C112.611 14.712 112.611 14.7477 112.611 14.8567ZM112.124 15.0656C112.124 14.996 112.158 14.996 112.227 14.996C112.227 15.0299 112.193 15.0656 112.124 15.0656ZM112.023 17.1464H111.954V17.2161H112.023V17.1464ZM111.954 16.9375C112.023 16.9714 112.023 17.1161 112.163 17.1161C112.199 17.0125 112.129 17.0125 112.129 16.9375C112.233 16.9714 112.233 16.9375 112.308 16.9017C112.308 16.6588 112.448 16.6588 112.412 16.4499C112.274 16.5195 112.308 16.382 112.168 16.4159C112.134 16.5195 112.204 16.5552 112.238 16.6249C112.168 16.7285 112.029 16.7642 111.959 16.9375M111.855 15.6872C111.834 15.6708 111.816 15.6497 111.804 15.6255C111.792 15.6014 111.786 15.5749 111.785 15.5479C111.889 15.514 111.855 15.6176 111.855 15.6872ZM111.332 16.3141C111.368 16.1748 111.402 16.0355 111.511 16.0355C111.442 16.1052 111.511 16.3141 111.332 16.3141ZM111.332 16.6963C111.298 16.7999 111.053 16.9035 111.263 17.0089C111.298 16.9393 111.442 16.766 111.332 16.6963ZM110.874 16.9678C110.84 16.9339 110.84 16.9339 110.804 16.9339C110.808 16.9073 110.821 16.8827 110.84 16.8642C110.908 16.8303 110.874 16.8982 110.874 16.9678ZM110.734 17.1768C110.595 17.1768 110.631 17.0732 110.631 16.9678C110.734 16.9678 110.81 17.1071 110.734 17.1768ZM110.525 16.7249C110.491 16.691 110.491 16.7249 110.491 16.7606C110.478 16.7466 110.468 16.7299 110.462 16.7117C110.457 16.6935 110.455 16.6742 110.457 16.6553C110.525 16.6213 110.525 16.6553 110.525 16.7249ZM110.491 18.1538C110.421 18.1538 110.421 18.1538 110.387 18.2235C110.457 18.2235 110.491 18.1877 110.491 18.1538ZM110.351 17.7376C110.351 17.6662 110.387 17.5983 110.317 17.5983C110.387 17.4197 110.421 17.6323 110.525 17.5626C110.387 17.4233 110.595 17.1804 110.734 17.25C110.595 17.3536 110.595 17.6323 110.351 17.7376ZM110.317 17.3804V17.4501C110.282 17.4501 110.282 17.4501 110.248 17.484V17.4144C110.282 17.3804 110.282 17.3804 110.317 17.3804ZM109.098 19.5702C109.028 19.6041 109.062 19.7791 109.166 19.7791C109.166 19.6738 109.202 19.5702 109.098 19.5702ZM108.126 17.902C108.126 17.9359 108.126 18.0056 108.194 18.0056C108.194 17.9359 108.16 17.902 108.126 17.902ZM108.053 26.9699C108.053 26.9021 108.123 26.9021 108.123 26.8663H108.017V26.936C108.017 26.9406 108.018 26.9452 108.02 26.9494C108.022 26.9537 108.024 26.9575 108.028 26.9606C108.031 26.9638 108.035 26.9663 108.039 26.9679C108.044 26.9695 108.048 26.9702 108.053 26.9699ZM108.053 18.5932H107.947C107.947 18.6289 107.843 18.8021 107.947 18.8021C107.947 18.6968 108.053 18.6968 108.053 18.5932ZM107.874 20.1221H107.804V20.1917H107.874V20.1221ZM107.874 19.3933V19.3237C107.84 19.3237 107.84 19.3237 107.804 19.3576V19.4273C107.84 19.3933 107.84 19.3933 107.874 19.3933ZM107.874 19.1147C107.878 19.0883 107.89 19.0639 107.91 19.0451C107.874 19.0451 107.874 19.0451 107.84 19.0808C107.82 19.0993 107.808 19.1238 107.804 19.1504C107.84 19.1147 107.84 19.1147 107.874 19.1147ZM107.874 19.7398C107.84 19.7398 107.804 19.7756 107.77 19.7756C107.77 19.8095 107.736 19.8792 107.77 19.9149C107.77 19.8452 107.874 19.8095 107.874 19.7363M107.564 21.7903H107.494V21.8599H107.564V21.7903ZM107.385 18.2181C107.389 18.3006 107.376 18.383 107.349 18.461C107.528 18.461 107.455 18.252 107.385 18.2181ZM107.349 17.6966H107.419C107.419 17.6608 107.455 17.6269 107.455 17.6608C107.474 17.6432 107.486 17.619 107.489 17.593H107.419C107.419 17.602 107.416 17.6106 107.409 17.617C107.403 17.6233 107.394 17.6269 107.385 17.6269C107.366 17.6454 107.353 17.6699 107.349 17.6966ZM106.793 22.3547C106.792 22.421 106.817 22.485 106.862 22.5333C106.932 22.4636 106.932 22.3261 106.793 22.3547ZM106.793 20.8258C106.793 20.9294 106.793 21.033 106.896 21.033C106.896 20.9294 106.896 20.8258 106.793 20.8258ZM106.304 15.1246C106.304 15.0549 106.27 15.0192 106.236 15.0192C106.236 15.0549 106.2 15.0549 106.2 15.0889C106.236 15.0889 106.236 15.1246 106.304 15.1246ZM106.27 26.5556C106.13 26.4502 105.991 26.5895 106.13 26.6949C106.149 26.6968 106.168 26.6946 106.186 26.6883C106.204 26.682 106.22 26.6718 106.233 26.6584C106.247 26.6451 106.257 26.6289 106.263 26.6111C106.27 26.5933 106.272 26.5743 106.27 26.5556ZM105.991 20.1935C105.921 20.1596 105.853 20.2989 105.921 20.3328C105.921 20.2632 106.026 20.2632 105.991 20.1935ZM105.887 16.7535C105.887 16.8232 105.817 16.8232 105.853 16.9321C105.921 16.966 106.032 16.7231 105.887 16.7535ZM105.781 20.4721C105.781 20.5418 105.713 20.6811 105.853 20.6508C105.817 20.5811 105.887 20.4436 105.781 20.4721ZM105.781 18.1091C105.713 17.9305 105.921 17.9002 105.817 17.8305C105.761 17.8513 105.713 17.8897 105.681 17.94C105.648 17.9902 105.633 18.0496 105.638 18.1091H105.781ZM105.781 21.0633H105.677C105.651 21.0986 105.632 21.1393 105.623 21.1825C105.614 21.2256 105.614 21.2703 105.624 21.3133C105.634 21.3563 105.653 21.3967 105.68 21.4315C105.707 21.4664 105.742 21.495 105.781 21.5152C105.817 21.3062 105.747 21.2366 105.781 21.0633ZM105.602 18.2467V18.3521C105.672 18.386 105.708 18.1734 105.602 18.2467ZM105.602 22.7655C105.568 22.8709 105.708 22.9441 105.742 22.8709C105.638 22.8709 105.708 22.7315 105.602 22.7655ZM105.602 22.9441C105.568 22.978 105.568 23.1227 105.638 23.1227C105.672 23.053 105.708 22.9441 105.602 22.9441ZM105.568 21.7278C105.568 21.8314 105.602 21.9064 105.747 21.9064C105.747 21.7671 105.713 21.6974 105.568 21.7278ZM105.638 18.5646H105.568V18.6343H105.638V18.5646ZM105.602 18.9468C105.532 18.9808 105.568 18.8414 105.462 18.9111C105.498 19.0504 105.393 19.2933 105.462 19.3987C105.428 19.1897 105.602 19.1558 105.602 18.9468ZM125.75 4.27589C125.507 4.45449 125.682 4.86708 125.437 5.10999C125.437 5.14392 125.473 5.17965 125.543 5.17965C125.507 5.28324 125.437 5.21358 125.364 5.17965C125.4 5.45649 125.33 5.52615 125.26 5.80478C125.294 5.90837 125.364 5.77084 125.4 5.80478C125.016 5.94409 125.364 6.29238 125.156 6.42991C125.19 6.46563 125.26 6.49957 125.26 6.53529C125.469 6.25666 125.609 5.73512 125.539 5.52615C125.609 5.49221 125.817 5.2493 125.643 5.14392C125.747 5.04033 125.852 4.96532 125.852 4.83136C125.713 4.79742 125.783 5.00997 125.643 5.00997C125.686 4.85152 125.71 4.68834 125.713 4.52415C125.852 4.66347 125.817 4.76706 125.956 4.94031C126.2 4.87244 125.886 4.73312 126.06 4.62774C126.27 4.76706 125.992 4.94031 126.096 5.11535C126.236 5.11535 126.2 4.93674 126.275 4.93674C126.314 5.29103 126.226 5.64759 126.028 5.94409C125.994 5.94409 125.958 5.90837 125.924 5.90837C125.471 6.63888 125.541 7.33724 125.471 8.09812C125.332 8.09812 125.332 8.23743 125.262 8.30709C125.262 8.96794 125.052 9.31623 125.018 9.9753C124.924 10.0765 124.861 10.2024 124.837 10.3381C124.812 10.4738 124.826 10.6138 124.879 10.7415C124.843 10.8451 124.739 10.9201 124.669 11.0184C124.739 11.197 124.599 11.197 124.669 11.4006H124.596C124.632 12.2365 123.969 12.4097 123.933 13.1742C123.864 13.2081 123.83 13.3528 123.754 13.4528C123.858 13.7654 123.79 14.2173 123.545 14.3905C123.545 14.4602 123.651 14.4262 123.581 14.5298C123.058 15.6426 122.884 16.7553 122.256 17.7626C122.186 18.2485 121.839 18.4235 121.769 18.945C121.699 18.979 121.733 19.1236 121.629 19.0844C121.65 19.1515 121.651 19.2231 121.632 19.2907C121.613 19.3583 121.576 19.4193 121.524 19.4666C120.967 20.6829 120.45 21.9332 119.712 22.9762C119.469 23.7067 118.806 24.089 118.28 24.5409C118.003 24.4712 117.899 24.8534 117.689 24.7838C117.653 24.7838 117.619 24.8534 117.619 24.9624C117.304 24.8231 117.027 25.032 116.783 24.857C116.735 24.8829 116.681 24.8965 116.626 24.8965C116.571 24.8965 116.517 24.8829 116.468 24.857C116.365 24.857 116.504 24.9266 116.468 24.9963C116.261 24.9963 116.331 24.7177 116.191 24.6837C116.094 24.7188 116.01 24.7808 115.947 24.8623C115.87 24.8108 115.779 24.7833 115.686 24.7833C115.593 24.7833 115.502 24.8108 115.425 24.8623C115.495 24.723 115.285 24.7927 115.355 24.6837C115.459 24.6498 115.459 24.7177 115.563 24.7177C115.529 24.5784 115.319 24.5105 115.285 24.6837C115.145 24.4408 114.796 24.4408 114.762 24.1283C114.693 24.0229 114.483 23.9497 114.553 23.8139C114.483 23.8139 114.483 23.8139 114.449 23.8836C114.432 23.5146 114.349 23.1516 114.204 22.8119C114.247 22.4625 114.174 22.1086 113.996 21.8046C114.204 21.1437 113.857 20.4489 114.03 19.8577C113.96 19.7881 113.996 19.613 113.96 19.5094C114.204 19.5094 114.066 19.7184 114.066 19.822C114.17 19.822 114.136 19.7523 114.204 19.7523C114.164 19.6571 114.156 19.5516 114.182 19.4516C114.207 19.3516 114.264 19.2622 114.343 19.1969C114.204 19.1272 114.066 19.3755 113.891 19.4058C113.982 19.1974 114.029 18.9725 114.03 18.745H114.17C114.17 18.536 114.066 18.745 114.03 18.6753C114.1 18.536 114.209 18.3628 114.066 18.2931C113.96 18.327 114.136 18.3967 114.03 18.4717C113.988 18.417 113.965 18.3498 113.965 18.2806C113.965 18.2114 113.988 18.1442 114.03 18.0895C113.967 18.0084 113.937 17.9073 113.943 17.805C113.95 17.7028 113.993 17.6065 114.066 17.534C114.03 17.4286 113.926 17.568 113.926 17.4983C113.891 17.359 114.03 17.4286 114.03 17.359C113.851 17.2215 114.03 16.9428 113.926 16.8035C113.926 17.2911 113.647 17.6376 113.613 17.9859C113.473 17.9859 113.613 17.9162 113.577 17.8466C113.398 17.7769 113.264 18.1931 113.473 18.1931C113.404 18.2985 113.368 18.3717 113.294 18.2627C113.242 18.2722 113.194 18.2963 113.155 18.3324C113.191 18.9933 112.319 19.2719 112.389 19.9399C112.31 20.004 112.245 20.0831 112.197 20.1727C112.149 20.2623 112.12 20.3604 112.111 20.4614C112.041 20.4257 112.006 20.3221 111.932 20.4257C112.002 20.9812 111.341 21.1205 111.375 21.7117C111.272 21.7474 111.196 21.8903 111.026 21.9546C111.026 22.06 111.026 22.1993 110.922 22.2332C111.026 22.5119 110.783 22.5119 110.783 22.8584C110.156 23.7282 109.737 24.8749 109.077 25.7786C108.96 26.0775 108.753 26.3327 108.484 26.5091C108.451 26.6282 108.394 26.7392 108.316 26.8351C108.238 26.931 108.141 27.0098 108.031 27.0664C107.962 27.0664 107.962 26.9949 107.822 27.0307V26.8521C107.578 26.7824 107.718 27.061 107.643 27.1289C107.504 27.1469 107.364 27.1469 107.226 27.1289C107.26 27.0253 107.26 26.9503 107.226 26.9217C107.122 27.0253 106.868 27.2343 106.773 27.0253C106.664 27.0147 106.554 27.0391 106.46 27.095C106.529 26.9164 106.281 26.9896 106.354 26.7824C106.25 26.7467 106.216 26.8163 106.146 26.8521C106.18 26.9217 106.284 26.886 106.216 27.061C106.076 26.8824 105.937 26.7467 105.761 26.7824C105.661 26.5611 105.519 26.3606 105.344 26.1912C105.378 26.0519 105.414 25.9822 105.274 25.9483C105.31 25.8429 105.344 25.9126 105.414 25.9126C105.414 25.734 105.274 25.8429 105.171 25.8786C105.154 25.8273 105.155 25.7719 105.174 25.7213C105.193 25.6707 105.228 25.628 105.274 25.6C105.31 25.4607 105.171 25.5643 105.171 25.4964C105.171 24.8356 104.891 23.7568 105.171 23.0977C105.101 23.0977 105.065 23.0977 105.065 23.1674C104.961 23.028 105.135 22.8887 105.171 22.7494C105.135 22.7494 105.101 22.7494 105.065 22.8191C105.031 22.0546 105.065 21.0455 105.378 20.3864C105.274 20.3507 105.31 20.49 105.171 20.4561C105.205 20.3168 105.31 20.1774 105.35 20.0721C105.35 20.0042 105.28 20.0381 105.246 20.0381C105.316 19.8292 105.28 19.7256 105.425 19.6202C105.389 19.5523 105.389 19.4416 105.321 19.413C105.564 17.6733 105.878 16.2498 106.087 14.7191C106.216 14.4734 106.278 14.198 106.266 13.9208C106.3 13.7118 106.476 13.5385 106.37 13.3635C106.685 12.8777 106.51 12.2919 106.859 11.9043C106.963 11.4167 107.172 11.1041 107.102 10.7576C107.281 10.6522 107.242 10.27 107.416 10.2003C107.731 8.91436 108.252 7.907 108.601 6.51564C108.801 6.29442 109.036 6.10687 109.297 5.96017C109.367 5.96017 109.367 5.9941 109.333 6.09948C110.099 5.61188 111.109 6.09948 111.805 6.27809C111.875 6.4567 112.014 6.55672 112.014 6.76569C111.98 6.97288 111.805 7.04254 111.667 7.14792C111.144 8.21957 110.795 9.64844 110.273 10.763C110.239 10.8308 110.308 10.9416 110.273 11.0398C110.169 11.2488 109.995 11.4577 110.029 11.7346C109.925 11.7007 109.959 11.806 109.89 11.84C109.89 12.2919 109.472 12.9116 109.576 13.4046C109.193 14.5173 109.054 16.0105 108.67 17.1232C108.652 17.4566 108.581 17.785 108.461 18.0966C108.531 18.7575 108.252 19.2094 108.114 19.8006C108.182 20.1131 108.078 20.5311 107.974 20.9115C107.974 20.9472 108.008 20.9472 108.044 20.9812C108.223 20.9115 108.182 20.6686 108.287 20.565C108.357 20.6347 108.427 20.5311 108.497 20.565C108.844 20.0095 109.193 19.279 109.472 18.7914C109.612 18.7914 109.403 19.0361 109.651 19.0361C109.685 18.9307 109.472 18.6878 109.791 18.7218C109.791 18.6539 109.685 18.6539 109.721 18.5842C109.9 18.6182 109.791 18.4056 109.861 18.3753C110.069 18.4092 110.314 18.0966 110.138 17.9234C110.317 17.7448 110.496 17.9234 110.521 18.0627C110.56 17.9972 110.607 17.9371 110.661 17.8841C110.557 17.5019 111.019 17.4679 110.871 17.05C110.889 17.0516 110.905 17.0595 110.918 17.0722C110.931 17.0849 110.939 17.1017 110.94 17.1197C111.144 16.7455 111.39 16.3956 111.673 16.0766C111.673 16.182 111.603 16.182 111.603 16.3213C112.229 16.0069 112.369 15.2496 112.856 14.8263C112.892 14.5137 113.135 14.4691 113.169 14.1994C113.475 13.9709 113.706 13.6561 113.831 13.2956C113.971 13.226 113.971 13.1581 114.077 13.226C114.14 12.9643 114.272 12.7243 114.46 12.5312C114.39 12.3919 114.599 12.3222 114.46 12.2883C114.877 11.6971 114.877 10.5147 115.783 10.3414C116.828 10.5504 118.43 10.445 118.468 11.4542C118.468 11.731 118.259 11.9757 118.225 12.3579H118.151C117.972 13.226 117.836 14.0619 117.628 15.0371C117.628 15.0728 117.698 15.0728 117.698 15.1425C117.453 16.3588 117.453 17.6108 117.279 18.7575C117.419 19.0361 117.313 19.313 117.313 19.6952C117.374 19.7391 117.448 19.7634 117.523 19.7649C117.802 19.5577 117.836 19.1397 118.151 19.0361C118.185 18.8968 118.012 18.9665 118.081 18.7914C118.359 19.0361 118.464 18.5485 118.325 18.3396C118.429 18.3056 118.395 18.4092 118.464 18.4449C118.807 17.9268 119.089 17.3713 119.306 16.7892C119.41 16.6856 119.41 16.8249 119.485 16.8589C119.521 16.7553 119.306 16.4409 119.59 16.3373C119.624 16.4409 119.485 16.4409 119.521 16.5463C119.537 16.5675 119.558 16.5847 119.582 16.5967C119.605 16.6088 119.632 16.6154 119.658 16.616C119.694 16.4767 119.479 16.0944 119.764 15.9194C119.658 16.098 119.624 16.3034 119.798 16.407C119.904 16.3034 119.834 16.0944 119.904 15.9194C119.904 15.8158 119.798 15.8855 119.764 15.9194C119.728 15.7819 119.834 15.7819 119.798 15.6765C119.904 15.6765 119.834 15.8158 119.977 15.8158C120.081 15.7819 119.907 15.6372 120.081 15.6765C120.047 15.5729 120.047 15.3996 120.117 15.3639C119.907 14.6334 120.708 14.3209 120.674 13.4528C120.777 13.4528 120.708 13.66 120.813 13.6957C120.83 13.5223 120.83 13.3476 120.813 13.1742C121.023 13.2081 120.883 12.8956 120.953 12.8956C121.132 12.9652 120.987 13.1402 121.023 13.3135C120.917 13.3474 120.987 13.1742 120.917 13.2081C121.057 13.4528 120.777 13.7993 120.813 14.1119C121.023 13.835 121.023 13.3474 121.336 13.1742C121.126 12.9652 121.126 12.7223 121.057 12.4437C121.196 12.4097 121.162 12.549 121.266 12.583C121.266 12.6187 121.23 12.6526 121.162 12.6526C121.196 12.792 121.3 12.8313 121.3 13.0099C121.613 12.5223 121.613 11.9382 121.859 11.3756C121.837 11.3701 121.817 11.36 121.8 11.3462C121.782 11.3323 121.768 11.3148 121.758 11.295C121.748 11.2752 121.743 11.2535 121.742 11.2314C121.741 11.2092 121.745 11.1872 121.753 11.1666C121.864 11.2102 121.982 11.2338 122.102 11.2363C122.172 11.1666 122.102 11.1666 122.066 11.1666C122.346 10.988 122.066 10.5058 122.381 10.3325C122.242 10.2289 122.415 9.98423 122.56 9.95029C122.838 8.94115 123.327 8.10705 123.5 6.96038C123.57 6.82106 123.606 6.68175 123.679 6.5085C123.858 6.61388 123.609 6.92644 123.679 7.06576C123.858 6.82106 123.858 6.54422 123.858 6.19593C123.754 6.16199 123.788 6.26559 123.788 6.33525C123.649 6.09234 123.998 5.88337 123.892 5.71011C123.928 5.60474 123.998 5.71011 124.071 5.71011C124.185 5.43247 124.256 5.13916 124.281 4.84029H124.349C124.385 4.87601 124.419 4.94388 124.454 4.9796C124.558 4.90995 124.454 4.77063 124.349 4.84029C124.454 4.24909 124.664 3.76864 124.664 3.24174C124.698 3.20602 124.732 3.17208 124.732 3.13636C124.628 3.10242 124.628 3.17208 124.664 3.24174C124.558 3.27567 124.594 3.52037 124.558 3.6579C124.488 3.6579 124.488 3.58824 124.379 3.62396C124.519 3.83293 124.2 3.97046 124.24 4.17944C124.061 4.17944 124.17 4.492 123.996 4.492C124.136 4.35447 124.066 3.97046 124.24 3.93653C124.17 3.69362 124.419 3.44893 124.379 3.3114C124.558 3.3114 124.309 3.52037 124.483 3.58824C124.623 3.27567 124.343 3.10242 124.623 2.78986C124.623 2.85952 124.692 2.89345 124.726 2.85952C124.762 2.78986 124.692 2.78986 124.623 2.78986V2.39871C124.726 2.53802 124.762 2.43264 124.981 2.39871C124.911 2.29333 124.945 2.2201 124.875 2.18973C125.084 1.98076 124.771 1.77179 124.911 1.52888C124.945 1.52888 125.015 1.49494 125.05 1.49494C125.12 1.38956 125.015 1.42529 124.981 1.42529C125.084 1.35563 125.015 1.14666 125.19 1.18238C125.155 1.07192 125.153 0.953446 125.184 0.841883C125.216 0.73032 125.281 0.63066 125.369 0.555461C125.403 0.451868 125.263 0.485803 125.299 0.376852C125.478 0.307195 125.369 0.0982221 125.478 -0.00537109C125.657 0.237537 125.548 0.723353 125.657 1.1413C125.691 1.21096 125.588 1.21096 125.588 1.28061C125.622 1.38421 125.691 1.41993 125.657 1.55924C125.657 1.59318 125.657 1.6289 125.588 1.6289C125.621 1.71685 125.668 1.79888 125.727 1.87181C125.691 2.35762 125.308 3.05241 125.518 3.71327C125.727 3.57395 125.588 3.43464 125.622 3.29711C125.691 3.26139 125.727 3.36677 125.727 3.26139C126.04 3.50608 125.761 3.95617 125.795 4.27053" fill="#FF5E2B"/>
                                </g>
                                <defs>
                                <clipPath id="clip0_2675_4202">
                                <rect width="126.286" height="34" fill="white"/>
                                </clipPath>
                                </defs>
                              </svg>
                            </div>
                            <div>
                              <h1>${meta.title || "Documento"}</h1>
                              <p class='proposal-description'>${meta.description || ""}</p>
                            </div>
                          </div>
                          <div class='proposal-meta'>
                            <p class='proposal-meta__id'>${meta.headerLabel} <strong>${meta.headerValue}</strong></p>
                            <p class='proposal-meta__validity'>${meta.validityMessage || ""}</p>
                          </div>
                        </header>
                        <main class='document-main'>
                          <div id='content'>${html}</div>
                        </main>
                      </div>
                    </body>
                  </html>`}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 border border-dashed border-slate-300">
                    <svg
                      width="80"
                      height="80"
                      viewBox="0 0 80 80"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className="mb-4 opacity-40"
                    >
                      <rect
                        x="6"
                        y="6"
                        width="68"
                        height="68"
                        rx="20"
                        fill="#F8FAFC"
                        stroke="#E2E8F0"
                        strokeWidth="2"
                      />
                      <path
                        d="M28 40h24"
                        stroke="#94A3B8"
                        strokeWidth="4"
                        strokeLinecap="round"
                      />
                      <path
                        d="M40 28v24"
                        stroke="#94A3B8"
                        strokeWidth="4"
                        strokeLinecap="round"
                      />
                    </svg>
                    <h3 className="text-slate-900 font-semibold mb-1">
                      Envie um .docx para começar
                    </h3>
                    <p className="text-slate-500 text-sm text-center max-w-xs">
                      Assim que o documento for convertido, o template será
                      renderizado automaticamente nesta pré-visualização.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>
      )}
      <div className="absolute bottom-0.5 w-full flex items-center justify-center">
        <span className="text-xs text-amber-500">Versão Beta 1.0.1 - TMS</span>
      </div>
    </div>
  );
}
