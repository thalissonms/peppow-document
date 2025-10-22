import { useRef } from "react";
import { ImageIcon, Palette } from "lucide-react";
import { BrandConfig } from "@/types/ui";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/Card";
import { Button } from "./ui/Button";
import { ColorPicker } from "./ColorPicker";

interface BrandConfigurationProps {
  brandConfig: BrandConfig;
  onConfigChange: (config: BrandConfig) => void;
  onReset: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

export const BrandConfiguration = ({
  brandConfig,
  onConfigChange,
  onReset,
  onSuccess,
  onError,
}: BrandConfigurationProps) => {
  const logoInputRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      onError("Por favor, selecione um arquivo de imagem válido");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const logoData = event.target?.result as string;
      onConfigChange({ ...brandConfig, logo: logoData });
      onSuccess("Logo atualizada com sucesso!");
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6">
      {/* Logo Upload */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="flex flex-col gap-4">

        
      <Card className="border-[rgba(255,94,43,0.25)]">
        <CardHeader>
          <CardTitle className="text-[#154C71] font-medium text-xl flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-[#ff5e2b] mt-0.5" />
            Logo da Empresa
          </CardTitle>
          <CardDescription className="text-[15px]">
            Adicione a logo que aparecerá no cabeçalho do documento
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            onClick={() => logoInputRef.current?.click()}
            className="border-2 border-dashed border-[rgba(255,94,43,0.35)] rounded-xl p-8 cursor-pointer hover:bg-[rgba(255,94,43,0.05)] hover:border-[#ff5e2b] transition-all"
          >
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleLogoUpload}
            />
            {brandConfig.logo ? (
              <div className="flex flex-col items-center gap-4">
                <img
                  src={brandConfig.logo}
                  alt="Logo"
                  className="max-h-32 object-contain"
                />
                <p className="text-sm text-[#152937] opacity-60">
                  Clique para alterar a logo
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="w-16 h-16 rounded-full bg-[rgba(255,94,43,0.1)] flex items-center justify-center">
                  <ImageIcon className="w-8 h-8 text-[#ff5e2b]" />
                </div>
                <div className="text-center">
                  <p className="text-[15px] text-[#152937] font-medium">
                    Clique para fazer upload da logo
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    PNG, JPG, SVG até 5MB
                  </p>
                </div>
              </div>
            )}
          </div>
          {brandConfig.logo && (
            <Button
              variant="outline"
              onClick={() => {
                onConfigChange({ ...brandConfig, logo: null });
                onSuccess("Logo removida com sucesso!");
              }}
              className="w-full hover:bg-red-50 hover:border-red-300 hover:text-red-600 transition-colors"
            >
              Remover Logo
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Color Configuration */}
      <Card className="border-[rgba(255,94,43,0.25)]">
        <CardHeader>
          <CardTitle className="text-[#154C71] font-medium text-xl flex items-center gap-2">
            <Palette className="w-5 h-5 text-[#ff5e2b]" />
            Paleta de Cores
          </CardTitle>
          <CardDescription className="text-[15px] mt-0.5">
            Personalize as cores do seu documento
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ColorPicker
              label="Cor Primária"
              description="Títulos e elementos de destaque"
              color={brandConfig.primaryColor}
              onChange={(color) =>
                onConfigChange({ ...brandConfig, primaryColor: color })
              }
            />

            <ColorPicker
              label="Cor Secundária"
              description="Cabeçalho e textos principais"
              color={brandConfig.secondaryColor}
              onChange={(color) =>
                onConfigChange({ ...brandConfig, secondaryColor: color })
              }
            />

            <ColorPicker
              label="Cor de Acento"
              description="Bordas e detalhes especiais"
              color={brandConfig.accentColor}
              onChange={(color) =>
                onConfigChange({ ...brandConfig, accentColor: color })
              }
            />

            <ColorPicker
              label="Cor de Fundo"
              description="Fundo do documento"
              color={brandConfig.backgroundColor}
              onChange={(color) =>
                onConfigChange({ ...brandConfig, backgroundColor: color })
              }
            />
          </div>

          <div className="pt-4 border-t border-[rgba(255,94,43,0.25)]">
            <Button 
              variant="outline" 
              onClick={onReset} 
              className="w-full hover:bg-[rgba(255,94,43,0.05)] border-[rgba(255,94,43,0.35)] hover:border-[#ff5e2b] text-[#152937]"
            >
              Restaurar Cores Padrão
            </Button>
          </div>
        </CardContent>
      </Card>
      </div>
      

      {/* Color Preview */}
      <Card className="border-[rgba(255,94,43,0.25)] bg-[rgba(255,94,43,0.05)]">
        <CardHeader>
          <CardTitle className="text-[#154C71] font-medium text-xl flex items-center gap-2">Preview das Cores</CardTitle>
          <CardDescription>
            Veja como as cores ficam no documento
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div
              className="p-6 rounded-lg"
              style={{ backgroundColor: brandConfig.secondaryColor }}
            >
              <h3 className="text-white mb-2" style={{ color: "#fff9d5" }}>
                Cabeçalho do Documento
              </h3>
              <p
                className="text-sm"
                style={{ color: "rgba(255, 249, 213, 0.9)" }}
              >
                Texto secundário no cabeçalho
              </p>
            </div>
            <div
              className="p-6 rounded-lg"
              style={{ backgroundColor: brandConfig.backgroundColor }}
            >
              <h2 className="mb-2" style={{ color: brandConfig.primaryColor }}>
                Título Principal
              </h2>
              <p style={{ color: brandConfig.secondaryColor }}>
                Este é um parágrafo de exemplo mostrando como o texto ficará no
                seu documento.
              </p>
              <p className="mt-2">
                <strong style={{ color: brandConfig.primaryColor }}>
                  Texto em destaque
                </strong>{" "}
                com cores personalizadas.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
};
