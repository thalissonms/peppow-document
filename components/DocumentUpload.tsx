import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/Card";

interface DocumentUploadProps {
  onFileSelect: (file: File) => void;
  loading?: boolean;
}

export const DocumentUpload = ({
  onFileSelect,
  loading = false,
}: DocumentUploadProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      onFileSelect(droppedFile);
    }
  };

  return (
    <Card className="border-[rgba(255,94,43,0.25)]">
      <CardHeader>
        <CardTitle className="text-[#152937]">1. Importe o documento</CardTitle>
        <CardDescription>Suporte a arquivos .docx até 20 MB</CardDescription>
      </CardHeader>
      <CardContent>
        <div
          className={`h-120 flex flex-col justify-center items-center p-8 rounded-xl border-2 border-dashed transition-all cursor-pointer ${
            isDragging
              ? "border-[#ff5e2b] bg-[rgba(255,94,43,0.1)] scale-102"
              : "border-[rgba(255,94,43,0.25)] bg-[rgba(255,255,255,0.5)]"
          } ${loading ? "opacity-60 pointer-events-none" : ""}`}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".docx"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onFileSelect(file);
            }}
            disabled={loading}
          />
          <div className="w-16 h-16 rounded-full bg-[rgba(255,94,43,0.1)] flex items-center justify-center mb-4">
            <Upload className="w-8 h-8 text-[#ff5e2b]" />
          </div>
          <p className="text-lg mb-2 text-center">
            {loading
              ? "Convertendo..."
              : "Arraste um arquivo .docx ou clique para selecionar"}
          </p>
          <p className="text-sm text-[#152937] opacity-60 text-center">
            Converteremos automaticamente para o formato padronizado
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
