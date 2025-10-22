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
};

export type PdfLayout = "padrao" | "a4" | "apresentacao";
