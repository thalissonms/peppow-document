export type DocumentMeta = {
    title: string;
    description: string;
    headerLabel: string;
    headerValue: string;
    validityMessage: string;
};


export type AIOptions = {
    enabled: boolean;
    provider: "gemini" | "openai";
    mode: "grammar" | "clarity" | "professional" | "full";
};

export type BrandConfig = {
    logo: string | null;
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    backgroundColor: string;
    textColor: string;
    borderColor: string;
    /** Altura do logo em pixels (aplicado no header). Padrão: 34 */
    logoHeight?: number;
    /** Largura máxima do logo em pixels (opcional). */
    logoMaxWidth?: number;
};

export type PdfLayout = "padrao" | "a4" | "apresentacao";
