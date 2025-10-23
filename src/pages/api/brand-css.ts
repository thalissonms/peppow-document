import type { NextApiRequest, NextApiResponse } from "next";
import { getCachedCustomizedCSS } from "@/lib/styleGenerator";
import { BrandConfig } from "@/types/ui";
import { DEFAULT_BRAND_CONFIG } from "@/lib/constants";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { brandConfig } = req.body as { brandConfig?: BrandConfig };
    const brand = brandConfig || DEFAULT_BRAND_CONFIG;

    const css = await getCachedCustomizedCSS(brand);

    res.setHeader("Content-Type", "text/css; charset=utf-8");
    return res.status(200).send(css);
  } catch (error) {
    console.error("/api/brand-css error:", error);
    return res.status(500).json({
      error: "Erro ao gerar CSS da marca",
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
