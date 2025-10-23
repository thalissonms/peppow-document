import { useState, useEffect } from "react";
import { BrandConfig } from "@/types/ui";
import { DEFAULT_BRAND_CONFIG, BRAND_CONFIG_STORAGE_KEY } from "@/lib/constants";

export const useBrandConfig = () => {
    const [brandConfig, setBrandConfig] = useState<BrandConfig>(DEFAULT_BRAND_CONFIG);

    // Carregar configurações do localStorage ao iniciar
    useEffect(() => {
        const savedConfig = localStorage.getItem(BRAND_CONFIG_STORAGE_KEY);
        if (savedConfig) {
            try {
                setBrandConfig(JSON.parse(savedConfig));
            } catch (e) {
                console.error("Erro ao carregar configurações:", e);
            }
        }
    }, []);

    // Salvar configurações no localStorage
    const saveBrandConfig = (config: BrandConfig) => {
        setBrandConfig(config);
        localStorage.setItem(BRAND_CONFIG_STORAGE_KEY, JSON.stringify(config));
    };

    // Resetar para configuração padrão
    const resetBrandConfig = () => {
        saveBrandConfig(DEFAULT_BRAND_CONFIG);
    };

    return {
        brandConfig,
        saveBrandConfig,
        resetBrandConfig,
    };
};
