// Exemplo de componente React para usar a API com melhoria de IA

import { useState } from 'react';

export default function DocumentGenerator() {
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [enhancementMode, setEnhancementMode] = useState<'grammar' | 'clarity' | 'professional' | 'full'>('full');
  const [useAI, setUseAI] = useState(false);

  const generatePDF = async () => {
    setIsEnhancing(true);

    try {
      const response = await fetch('/api/generate-pdf-from-html', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          html: `
            <h1>Relatório de Vendas - Q4 2024</h1>
            
            <h2>1. Resumo Executivo</h2>
            <p>
              Este documento apresenta os resultados de vendas do quarto trimestre de 2024.
              Os números mostram um crescimento significativo em relação ao trimestre anterior.
            </p>
            
            <h2>2. Métricas Principais</h2>
            <ul>
              <li>Receita total: R$ 2.450.000</li>
              <li>Crescimento: 15% vs Q3</li>
              <li>Novos clientes: 234</li>
              <li>Taxa de conversão: 12.5%</li>
              <li>Ticket médio: R$ 10.470</li>
            </ul>
            
            <h2>3. Análise por Região</h2>
            <table>
              <thead>
                <tr>
                  <th>Região</th>
                  <th>Vendas (R$)</th>
                  <th>Crescimento</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Sudeste</td>
                  <td>1.200.000</td>
                  <td>+18%</td>
                </tr>
                <tr>
                  <td>Sul</td>
                  <td>680.000</td>
                  <td>+12%</td>
                </tr>
                <tr>
                  <td>Nordeste</td>
                  <td>420.000</td>
                  <td>+20%</td>
                </tr>
                <tr>
                  <td>Centro-Oeste</td>
                  <td>150.000</td>
                  <td>+8%</td>
                </tr>
              </tbody>
            </table>
            
            <h2>4. Próximos Passos</h2>
            <ol>
              <li>Expandir equipe comercial em 20%</li>
              <li>Lançar novos produtos no Q1 2025</li>
              <li>Investir em marketing digital</li>
              <li>Implementar CRM avançado</li>
            </ol>
            
            <blockquote>
              "Os resultados do Q4 demonstram a força do nosso time comercial 
              e a aceitação dos nossos produtos no mercado."
              <cite>— João Silva, Diretor Comercial</cite>
            </blockquote>
          `,
          meta: {
            title: 'Relatório de Vendas Q4 2024',
            headerLabel: 'Documento',
            headerValue: 'REL-VENDAS-Q4-2024',
            validityMessage: 'Gerado em: ' + new Date().toLocaleDateString('pt-BR'),
          },
          aiEnhancement: {
            enabled: useAI,
            mode: enhancementMode,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao gerar PDF');
      }

      // Baixar o PDF
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio-${useAI ? 'melhorado' : 'original'}-${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      alert('PDF gerado com sucesso!');
    } catch (error) {
      console.error('Erro:', error);
      alert('Erro ao gerar PDF');
    } finally {
      setIsEnhancing(false);
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Gerador de Documentos PDF</h1>
      
      <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
        {/* Toggle IA */}
        <div className="flex items-center space-x-3">
          <input
            type="checkbox"
            id="use-ai"
            checked={useAI}
            onChange={(e) => setUseAI(e.target.checked)}
            className="w-5 h-5 text-orange-500 rounded focus:ring-orange-500"
          />
          <label htmlFor="use-ai" className="text-lg font-medium">
            🤖 Melhorar documento com IA
          </label>
        </div>

        {/* Modo de melhoria */}
        {useAI && (
          <div className="ml-8 space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Modo de melhoria:
            </label>
            <select
              value={enhancementMode}
              onChange={(e) =>
                setEnhancementMode(
                  e.target.value as 'grammar' | 'clarity' | 'professional' | 'full'
                )
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
            >
              <option value="grammar">Gramática - Apenas correção ortográfica</option>
              <option value="clarity">Clareza - Texto mais objetivo</option>
              <option value="professional">Profissional - Tom formal</option>
              <option value="full">Completo - Todas as melhorias</option>
            </select>
            
            <p className="text-sm text-gray-500 mt-2">
              {enhancementMode === 'grammar' && '✏️ Corrige erros gramaticais e ortográficos'}
              {enhancementMode === 'clarity' && '💡 Melhora clareza e legibilidade'}
              {enhancementMode === 'professional' && '💼 Torna o texto mais profissional'}
              {enhancementMode === 'full' && '⚡ Aplica todas as melhorias disponíveis'}
            </p>
          </div>
        )}

        {/* Botão de gerar */}
        <button
          onClick={generatePDF}
          disabled={isEnhancing}
          className={`
            w-full py-3 px-4 rounded-lg font-semibold text-white
            transition-all duration-200
            ${isEnhancing 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-orange-500 hover:bg-orange-600 active:scale-95'
            }
          `}
        >
          {isEnhancing ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {useAI ? 'Melhorando com IA...' : 'Gerando PDF...'}
            </span>
          ) : (
            `📄 Gerar PDF ${useAI ? 'Melhorado' : ''}`
          )}
        </button>

        {/* Info sobre custos */}
        {useAI && (
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mt-4">
            <div className="flex">
              <div className="shrink-0">
                <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-blue-700">
                  <strong>Atenção:</strong> A melhoria com IA consome créditos da API OpenAI.
                  Custo estimado: ~$0.01 por documento.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Exemplo de resultado */}
      <div className="mt-8 bg-gray-50 rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4">📊 Comparação</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded border border-gray-200">
            <h3 className="font-semibold text-gray-700 mb-2">Sem IA</h3>
            <p className="text-sm text-gray-600">
              &ldquo;Os números mostram um crescimento significativo em relação ao trimestre anterior.&rdquo;
            </p>
          </div>
          
          <div className="bg-green-50 p-4 rounded border border-green-200">
            <h3 className="font-semibold text-green-700 mb-2">Com IA (Profissional)</h3>
            <p className="text-sm text-gray-600">
              &ldquo;Os resultados demonstram um crescimento expressivo de 15% em comparação ao trimestre anterior, evidenciando a eficácia das estratégias implementadas.&rdquo;
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
