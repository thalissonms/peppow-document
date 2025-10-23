import { BrandConfig, DocumentMeta } from "@/types/ui";

export const DEFAULT_BRAND_CONFIG: BrandConfig = {
    logo: null,
    primaryColor: "#ff5e2b",
    secondaryColor: "#152937",
    accentColor: "#321bc1",
    backgroundColor: "#fff9d5",
    textColor: "#000",
    borderColor: "#AFCDE1",
    logoHeight: 34,
    // logoMaxWidth: undefined // opcional
};

export const DEFAULT_DOCUMENT_META: DocumentMeta = {
    title: "",
    description: "",
    headerLabel: "Proposta",
    headerValue: "#0001",
    validityMessage: "Válido por 30 dias",
};

export const BRAND_CONFIG_STORAGE_KEY = "brandConfig";
