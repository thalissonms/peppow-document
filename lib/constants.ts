import { BrandConfig, DocumentMeta } from "@/types/ui";

// ============================================
// API Configuration Constants
// NOTE: MAX_BODY_SIZE cannot be used directly in Next.js API config
// because Next.js requires static string literals for route configs.
// Use the value "10mb" directly in API route config exports.
// ============================================
export const API_CONFIG = {
  /** Maximum body size for API routes (use "10mb" literal in API config) */
  MAX_BODY_SIZE: "10mb",
  /** Default timeout for AI requests in milliseconds */
  AI_TIMEOUT: 30000,
} as const;

// ============================================
// Brand Configuration
// ============================================
export const BRAND_CONFIG_STORAGE_KEY = "brandConfig";

export const DEFAULT_BRAND_CONFIG: BrandConfig = {
  logo: null,
  logoHeight: 34,
  logoMaxWidth: undefined,
  primaryColor: "#ff5e2b",
  secondaryColor: "#152937",
  accentColor: "#321bc1",
  backgroundColor: "#fff9d5",
  textColor: "#000",
  borderColor: "#AFCDE1",
};

// ============================================
// Document Metadata
// ============================================
export const DEFAULT_DOCUMENT_META: DocumentMeta = {
  title: "",
  description: "",
  headerLabel: "ID",
  headerValue: "",
  validityMessage: "",
};
