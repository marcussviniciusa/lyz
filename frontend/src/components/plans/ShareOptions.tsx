import React, { useState } from 'react';
import { FiShare2, FiLink, FiCopy, FiCheck } from 'react-icons/fi';
import { planAPI } from '../../lib/api';

interface ShareOptionsProps {
  planId: string;
  patientName: string;
}

const ShareOptions: React.FC<ShareOptionsProps> = ({ planId, patientName }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Estado para compartilhar por link
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [expirationHours, setExpirationHours] = useState(72);
  const [copied, setCopied] = useState(false);
  
  const handleGenerateShareLink = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setSuccess(null);
      setCopied(false);
      
      const response = await planAPI.generateShareLink(planId, expirationHours);
      
      if (response.data && response.data.shareUrl) {
        setShareLink(response.data.shareUrl);
        setSuccess(`Link gerado com sucesso! Válido por ${expirationHours} horas.`);
      } else {
        setError('Não foi possível gerar o link de compartilhamento');
      }
    } catch (err: any) {
      console.error('Error generating share link:', err);
      setError(`Erro ao gerar link: ${err.message || 'Tente novamente'}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleCopyLink = () => {
    if (shareLink) {
      navigator.clipboard.writeText(shareLink)
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        })
        .catch(err => {
          console.error('Failed to copy link:', err);
          setError('Falha ao copiar link para a área de transferência');
        });
    }
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'expirationHours') {
      setExpirationHours(Number(value));
    }
  };
  
  return (
    <div className="relative inline-block">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-1 bg-white py-2 px-4 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
        aria-label="Compartilhar Plano"
      >
        <FiShare2 className="text-lg" />
        <span>Compartilhar</span>
      </button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg z-50 border border-gray-200 overflow-hidden">
          <div className="p-4 font-medium text-primary-600 border-b border-gray-200 flex items-center">
            <FiLink className="mr-2" />
            Compartilhar por Link
          </div>
          
          {/* Conteúdo */}
          <div className="p-4">
            {error && (
              <div className="mb-4 bg-red-50 text-red-700 p-3 rounded-md text-sm">
                {error}
              </div>
            )}
            
            {success && (
              <div className="mb-4 bg-green-50 text-green-700 p-3 rounded-md text-sm">
                {success}
              </div>
            )}
            
            {/* Compartilhar por Link */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tempo de Expiração
                </label>
                <select
                  name="expirationHours"
                  value={expirationHours}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value={24}>24 horas (1 dia)</option>
                  <option value={72}>72 horas (3 dias)</option>
                  <option value={168}>168 horas (7 dias)</option>
                </select>
              </div>
              
              {!shareLink ? (
                <button
                  onClick={handleGenerateShareLink}
                  disabled={isLoading}
                  className="w-full py-2 px-4 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Gerando...' : 'Gerar Link de Compartilhamento'}
                </button>
              ) : (
                <div className="space-y-2">
                  <div className="flex">
                    <input
                      type="text"
                      readOnly
                      value={shareLink}
                      className="flex-1 border border-gray-300 rounded-l-md px-3 py-2 bg-gray-50"
                    />
                    <button
                      onClick={handleCopyLink}
                      className="px-3 py-2 bg-gray-200 rounded-r-md hover:bg-gray-300 transition-colors flex items-center justify-center"
                      title={copied ? "Copiado!" : "Copiar link"}
                    >
                      {copied ? <FiCheck className="text-green-600" /> : <FiCopy />}
                    </button>
                  </div>
                  <button
                    onClick={() => setShareLink(null)}
                    className="text-sm text-primary-600 hover:underline"
                  >
                    Gerar novo link
                  </button>
                </div>
              )}
            </div>
          </div>
          
          {/* Rodapé */}
          <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse border-t border-gray-200">
            <button
              type="button"
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:w-auto sm:text-sm"
              onClick={() => setIsOpen(false)}
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShareOptions;
