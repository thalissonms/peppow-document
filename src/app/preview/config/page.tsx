"use client";
import { useEffect, useMemo, useState, useRef } from "react";
import { X, Upload, Settings, FileBox, CircleCheck, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";

// Components
import { DocumentUpload } from "@/components/DocumentUpload";
import { DocumentEditor } from "@/components/DocumentEditor";
import { DocumentPreview } from "@/components/DocumentPreview";
import { BrandConfiguration } from "@/components/BrandConfiguration";

// Hooks
import { useBrandConfig } from "@/hooks/useBrandConfig";
import { useDocumentConversion } from "@/hooks/useDocumentConversion";
import { useDocumentPreview } from "@/hooks/useDocumentPreview";

// Types & Utils
import { DocumentMeta, AIOptions } from "@/types/ui";
import { DEFAULT_DOCUMENT_META } from "@/lib/constants";

export default function App() {
  const [mounted, setMounted] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [meta, setMeta] = useState<DocumentMeta>(DEFAULT_DOCUMENT_META);
  const [aiOptions, setAiOptions] = useState<AIOptions>({
    enabled: false,
    provider: "gemini",
    mode: "full",
  });
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"upload" | "config">("upload");
  const [pdfLayout, setPdfLayout] = useState<"padrao" | "a4" | "apresentacao">(
    "padrao"
  );
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const alertTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Custom Hooks
  const { brandConfig, saveBrandConfig, resetBrandConfig } = useBrandConfig();
  const {
    html,
    loading: conversionLoading,
    error: conversionError,
    convertDocument,
    updateHtml,
    resetDocument,
  } = useDocumentConversion();

  // Usa useMemo para criar um objeto estável de meta
  // Isso evita que o hook useDocumentPreview se recrie a cada render
  const stableMeta = useMemo(() => meta, [meta]);

  const {
    previewHTML,
    loading: previewLoading,
    error: previewError,
    generatePreview,
  } = useDocumentPreview({ brandConfig, documentMeta: stableMeta });

  // Combined states
  const loading = conversionLoading || pdfLoading || aiLoading || previewLoading;
  const error = conversionError || pdfError || aiError || previewError;
  
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!success && !error) return;
    if (alertTimerRef.current) clearTimeout(alertTimerRef.current);
    const timer = setTimeout(() => {
      setSuccess(null);
      setPdfError(null);
      setAiError(null);
    }, 5000);
    alertTimerRef.current = timer;
    return () => clearTimeout(timer);
  }, [success, error]);
  const handleFileSelect = async (selectedFile: File) => {
    setFile(selectedFile);
    setSuccess(null);

    const success = await convertDocument(selectedFile, meta, setMeta);
    if (success) {
      setSuccess("Documento convertido com sucesso!");
      setActiveTab("upload");
    }
  };

  const handleReset = () => {
    setFile(null);
    resetDocument();
    setMeta(DEFAULT_DOCUMENT_META);
    setSuccess(null);
  };

  const handleGeneratePDF = async () => {
    if (!html) return;
    setSuccess(null);
    setPdfError(null);
    setPdfLoading(true);
    try {
      const res = await fetch("/api/generate-pdf-from-html", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          html, // conteúdo do editor (sem template)
          meta,
          pdfLayout,
          brandConfig,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}) as Record<string, unknown>);
        throw new Error(data?.error as string || `Falha ao gerar PDF (${res.status})`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(meta.title || "documento").trim() || "documento"}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setSuccess("PDF gerado com sucesso!");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Erro ao gerar PDF";
      setPdfError(message);
    } finally {
      setPdfLoading(false);
    }
  };

  const handleEnhanceWithAI = async () => {
    if (!html || !aiOptions.enabled) return;
    setSuccess(null);
    setAiError(null);
    setAiLoading(true);
    try {
      const res = await fetch("/api/enhance-html", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          html,
          provider: aiOptions.provider,
          mode: aiOptions.mode,
          // apiKey: opcional; a API faz fallback para variáveis de ambiente
          meta: {
            title: meta.title,
            headerLabel: meta.headerLabel,
            headerValue: meta.headerValue,
            validityMessage: meta.validityMessage,
          },
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}) as Record<string, unknown>);
        throw new Error(
          data?.error as string || `Falha ao melhorar conteúdo (${res.status})`
        );
      }
      const data = (await res.json()) as { enhancedHtml?: string };
      if (data.enhancedHtml && data.enhancedHtml.trim()) {
        updateHtml(data.enhancedHtml);
        setSuccess(
          `Documento melhorado com ${aiOptions.provider.toUpperCase()}.`
        );
      } else {
        setSuccess("Nenhuma melhoria aplicada. Conteúdo mantido.");
      }
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Erro ao melhorar documento";
      setAiError(message);
    } finally {
      setAiLoading(false);
    }
  };

  const handleBrandConfigChange = (config: typeof brandConfig) => {
    saveBrandConfig(config);
    setSuccess("Configurações salvas com sucesso!");
  };

  const handleResetBrandConfig = () => {
    resetBrandConfig();
    setSuccess("Configurações restauradas para o padrão!");
  };

  // Gera preview quando HTML, layout ou meta mudarem
  // Com onBlur nos inputs, não precisa de debounce
  useEffect(() => {
    if (!html) return;
    generatePreview(html, pdfLayout);
  }, [html, pdfLayout, stableMeta, generatePreview]);

  const handleMetaChange = (newMeta: DocumentMeta) => {
    setMeta(newMeta);
  };

  const handleAIOptionsChange = (newAIOptions: AIOptions) => {
    setAiOptions(newAIOptions);
  };

  if (!mounted) {
    return (
      <div
        className="min-h-screen bg-[#fff9d5]"
        suppressHydrationWarning
        aria-busy
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#fff9d5] text-[#152937]" suppressHydrationWarning>
      

      <div className="container mx-auto px-4 py-8" suppressHydrationWarning>
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-[#ff5e2b] font-bold text-3xl mb-1">
                Padronização de Documentos
              </h1>
              <p className="text-[#152937] opacity-80">
                Converta documentos .docx para PDF padronizado com as cores e
                identidade da empresa
              </p>
            </div>
            {file && (
              <Button
                variant="outline"
                className="border-[#ff5e2b]/60 text-[#152937] bg-transparent hover:bg-white/20 hover:text-[#152937] rounded-full py-6 "
              >
                <span className="p-0.75 rounded-full hover:bg-red-400 group cursor-pointer" onClick={handleReset}>
                  <X className="w-4 h-4 text-[#ff5e2b] group-hover:text-white"  />
                </span>
                {file.name}
              </Button>
            )}
          </div>
        </header>

        {/* Alerts */}
        {error && (
          <Alert className="mb-6 bg-red-50 border-red-200 text-red-800">
            <AlertTriangle className="h-6 w-6" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-6 bg-green-50 border-green-200 text-green-800">
            <CircleCheck className="h-6 w-6" />
            <AlertDescription className="text-green-800 font-medium">{success}</AlertDescription>
          </Alert>
        )}

        {/* Main Tabs */}
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as "upload" | "config")}
            className="w-full"
          >
            <TabsList className="fixed top-10 left-6 grid h-fit grid-rows-2 mb-6 inset-shadow-sm bg-white shadow-md border border-[#ff5e2b]/30 hover:border-[#ff5e2b]/50">
              <TabsTrigger
                value="upload"
                className="data-[state=active]:bg-[#ff5e2b] data-[state=active]:text-white data-[state=active]:data-[state=active]:inset-shadow-sm inset-shadow-black/20 text-gray-600 p-4"
              >
                {!file ? <Upload className="stroke-2" /> : <FileBox className="w-20 h-20 stroke-2" />}
              </TabsTrigger>
              <TabsTrigger
                value="config"
                className="data-[state=active]:bg-[#ff5e2b] data-[state=active]:text-white data-[state=active]:inset-shadow-sm inset-shadow-black/20 text-gray-600 p-4"
              >
                <Settings className="stroke-2" />
              </TabsTrigger>
            </TabsList>

            {/* Upload Tab */}
            <TabsContent value="upload" className="space-y-6">
              {!html ? (
                <DocumentUpload
                  onFileSelect={handleFileSelect}
                  loading={loading}
                />
              ) : (
                <div className="grid lg:grid-cols-[35%_auto] gap-4">
                  <DocumentEditor
                    meta={meta}
                    onMetaChange={handleMetaChange}
                    aiOptions={aiOptions}
                    onAIOptionsChange={handleAIOptionsChange}
                    onEnhance={handleEnhanceWithAI}
                    loading={loading}
                    pdfLayout={pdfLayout}
                  />
                  <DocumentPreview
                    previewHTML={previewHTML}
                    contentHTML={html}
                    onContentChange={updateHtml}
                    onGeneratePDF={handleGeneratePDF}
                    iframeRef={iframeRef as React.RefObject<HTMLIFrameElement>}
                    brandConfig={brandConfig}
                    loading={loading}
                    pdfLayout={pdfLayout}
                    onPdfLayoutChange={setPdfLayout}
                    meta={meta}
                  />
                </div>
              )}
            </TabsContent>

            {/* Configuration Tab */}
            <TabsContent value="config" className="space-y-6">
              <BrandConfiguration
                brandConfig={brandConfig}
                onConfigChange={handleBrandConfigChange}
                onReset={handleResetBrandConfig}
                onSuccess={setSuccess}
                onError={(msg) => (conversionError ? null : setSuccess(msg))}
              />
            </TabsContent>
          </Tabs>

        {/* Footer */}
        <footer className="mt-8 text-center">
          <p className="text-xs text-[#ff5e2b] opacity-60">
            Versão Beta 1.0.3
          </p>
        </footer>
      </div>
    </div>
  );
}
