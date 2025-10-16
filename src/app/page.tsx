"use client"
import "@fontsource/kanit/400.css";
import "@fontsource/kanit/600.css";
import "@fontsource/kanit/700.css"
import { FormEvent, useState } from "react";

import styles from "./page.module.css";

export default function Home() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProposal, setIsProposal] = useState(false);
  const [proposalId, setProposalId] = useState("");
  const [proposalValidity, setProposalValidity] = useState("");

  // Pré-visualizações derivadas não utilizadas foram removidas para evitar avisos do eslint

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const formElement = event.currentTarget;
    const formData = new FormData(formElement);
    formData.set("isProposal", String(isProposal));
    formData.set("proposalId", proposalId.trim());
    formData.set("proposalValidity", proposalValidity.trim());
    const file = formData.get("document");

    if (!(file instanceof File)) {
      setError("Selecione um arquivo .docx antes de gerar o PDF.");
      return;
    }

    if (!file.name.endsWith(".docx")) {
      setError("O arquivo deve ter a extensão .docx.");
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await fetch("/api/generate-pdf", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Não foi possível gerar o PDF.");
      }

      const blob = await response.blob();
      const pdfUrl = URL.createObjectURL(blob);
      window.open(pdfUrl, "_blank", "noopener,noreferrer");
      formElement.reset();
  setIsProposal(false);
  setProposalId("");
  setProposalValidity("");
      setTimeout(() => URL.revokeObjectURL(pdfUrl), 30_000);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro inesperado.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className={styles.page}>
      <div className={styles.contentShell}>
        <section className={styles.formCard}>
          <h2 className={styles.formTitle}>Gerar PDF Padronizado</h2>
          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.fieldGroup}>
              <label className={styles.textLabel} htmlFor="proposalId">
                Identificador
              </label>
              <input
                id="proposalId"
                name="proposalId"
                type="text"
                placeholder="#261944175199"
                value={proposalId}
                onChange={(event) => setProposalId(event.target.value)}
                className={styles.textInput}
              />
              <p className={styles.smallHint}>
                Informe apenas os números ou cole o identificador completo; o símbolo # é aplicado automaticamente quando necessário.
              </p>
            </div>

            <div className={styles.toggleRow}>
              <label htmlFor="isProposal" className={styles.toggleLabel}>
                Proposta?
              </label>
              <input
                id="isProposal"
                name="isProposal"
                type="checkbox"
                checked={isProposal}
                onChange={(event) => setIsProposal(event.target.checked)}
                className={styles.toggleInput}
              />
            </div>

            {isProposal ? (
              <div className={styles.fieldGroup}>
                <label className={styles.textLabel} htmlFor="proposalValidity">
                  Validade da proposta
                </label>
                <input
                  id="proposalValidity"
                  name="proposalValidity"
                  type="text"
                  placeholder="Proposta válida por 30 dias"
                  value={proposalValidity}
                  onChange={(event) => setProposalValidity(event.target.value)}
                  className={styles.textInput}
                  required
                />
                <p className={styles.smallHint}>
                  Esse texto será exibido no cabeçalho do PDF quando o modo proposta estiver ativo.
                </p>
              </div>
            ) : null}

            <label className={styles.fileLabel}>
              Arquivo .docx
              <input
                id="document"
                type="file"
                name="document"
                accept=".docx"
                required
                className={styles.fileInput}
              />
            </label>
            <button
              type="submit"
              disabled={isSubmitting}
              className={styles.submitButton}
            >
              {isSubmitting ? "Gerando..." : "Gerar PDF"}
            </button>
            {error ? (
              <p className={styles.errorMessage} role="alert">
                {error}
              </p>
            ) : null}
          </form>
          <p className={styles.hintText}>
            O PDF será aberto em uma nova aba assim que o processamento for concluído.
          </p>
        </section>
      </div>
    </main>
  );
}
