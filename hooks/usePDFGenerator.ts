import { useState } from "react";
import html2pdf from "html2pdf.js";

export const usePDFGenerator = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const generatePDF = async (
        iframeRef: React.RefObject<HTMLIFrameElement>,
        filename: string
    ): Promise<boolean> => {
        setLoading(true);
        setError(null);

        try {
            const element = iframeRef.current?.contentDocument?.body;
            if (!element) {
                throw new Error("Não foi possível acessar o preview do documento");
            }

            const opt = {
                margin: [10, 0, 10, 0] as [number, number, number, number],
                filename: `${filename || "documento"}.pdf`,
                image: { type: "jpeg" as const, quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true },
                jsPDF: { unit: "mm" as const, format: "a4" as const, orientation: "portrait" as const },
            };

            await html2pdf().set(opt).from(element).save();
            setLoading(false);
            return true;
        } catch (err) {
            setError("Erro ao gerar PDF");
            console.error(err);
            setLoading(false);
            return false;
        }
    };

    return {
        loading,
        error,
        generatePDF,
    };
};
