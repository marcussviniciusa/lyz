import React, { useState } from 'react';
import { FiShare2, FiMail, FiDownload, FiLink, FiCopy, FiCheck } from 'react-icons/fi';
import { planAPI } from '../../lib/api';

interface ShareOptionsProps {
  planId: string;
  patientName: string;
}

const ShareOptions: React.FC<ShareOptionsProps> = ({ planId, patientName }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'export' | 'email' | 'link'>('export');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Estado para opções de exportação
  const [exportFormat, setExportFormat] = useState<'pdf' | 'docx' | 'html'>('pdf');
  
  // Estado para compartilhar por e-mail
  const [emailData, setEmailData] = useState({
    recipientEmail: '',
    recipientName: '',
    senderName: '',
    customMessage: ''
  });
  
  // Estado para compartilhar por link
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [expirationHours, setExpirationHours] = useState(72);
  const [copied, setCopied] = useState(false);
  
  // Manipuladores
  const handleExportPlan = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setSuccess(null);
      
      const response = await planAPI.exportPlan(planId, exportFormat);
      
      if (response.data && response.data.url) {
        // Abrir URL em nova aba
        window.open(response.data.url, '_blank');
        setSuccess(`Plano exportado com sucesso em formato ${exportFormat.toUpperCase()}`);
      } else {
        setError('Não foi possível gerar o arquivo para exportação');
      }
    } catch (err: any) {
      console.error('Error exporting plan:', err);
      setError(`Erro ao exportar plano: ${err.message || 'Tente novamente'}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleShareViaEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!emailData.recipientEmail) {
      setError('O e-mail do destinatário é obrigatório');
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      setSuccess(null);
      
      const response = await planAPI.sharePlanViaEmail(planId, emailData);
      
      if (response.data && response.data.success) {
        setSuccess('Plano compartilhado por e-mail com sucesso!');
        // Limpar campos do formulário
        setEmailData({
          recipientEmail: '',
          recipientName: '',
          senderName: '',
          customMessage: ''
        });
      } else {
        setError(response.data?.message || 'Erro ao compartilhar plano por e-mail');
      }
    } catch (err: any) {
      console.error('Error sharing plan via email:', err);
      setError(`Erro ao compartilhar por e-mail: ${err.message || 'Tente novamente'}`);
    } finally {
      setIsLoading(false);
    }
  };
  
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
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'exportFormat') {
      setExportFormat(value as 'pdf' | 'docx' | 'html');
    } else if (name === 'expirationHours') {
      setExpirationHours(Number(value));
    } else {
      setEmailData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
        aria-label="Opções de compartilhamento"
      >
        <FiShare2 className="text-lg" />
        <span>Compartilhar</span>
      </button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg z-50 border border-gray-200 overflow-hidden">
          {/* Abas */}
          <div className="flex border-b border-gray-200">
            <button
              className={`flex-1 py-3 px-4 text-sm font-medium ${activeTab === 'export' ? 'bg-primary-50 text-primary-600 border-b-2 border-primary-600' : 'text-gray-600 hover:bg-gray-50'}`}
              onClick={() => setActiveTab('export')}
            >
              <div className="flex items-center justify-center gap-2">
                <FiDownload />
                <span>Exportar</span>
              </div>
            </button>
            <button
              className={`flex-1 py-3 px-4 text-sm font-medium ${activeTab === 'email' ? 'bg-primary-50 text-primary-600 border-b-2 border-primary-600' : 'text-gray-600 hover:bg-gray-50'}`}
              onClick={() => setActiveTab('email')}
            >
              <div className="flex items-center justify-center gap-2">
                <FiMail />
                <span>E-mail</span>
              </div>
            </button>
            <button
              className={`flex-1 py-3 px-4 text-sm font-medium ${activeTab === 'link' ? 'bg-primary-50 text-primary-600 border-b-2 border-primary-600' : 'text-gray-600 hover:bg-gray-50'}`}
              onClick={() => setActiveTab('link')}
            >
              <div className="flex items-center justify-center gap-2">
                <FiLink />
                <span>Link</span>
              </div>
            </button>
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
            
            {/* Opções de Exportação */}
            {activeTab === 'export' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Formato do Arquivo
                  </label>
                  <select
                    name="exportFormat"
                    value={exportFormat}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="pdf">PDF (Documento)</option>
                    <option value="docx">DOCX (Word)</option>
                    <option value="html">HTML (Página Web)</option>
                  </select>
                </div>
                
                <button
                  onClick={handleExportPlan}
                  disabled={isLoading}
                  className="w-full py-2 px-4 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Processando...' : `Exportar como ${exportFormat.toUpperCase()}`}
                </button>
              </div>
            )}
            
            {/* Compartilhar por E-mail */}
            {activeTab === 'email' && (
              <form onSubmit={handleShareViaEmail} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    E-mail do Destinatário *
                  </label>
                  <input
                    type="email"
                    name="recipientEmail"
                    value={emailData.recipientEmail}
                    onChange={handleInputChange}
                    required
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="email@exemplo.com"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome do Destinatário
                  </label>
                  <input
                    type="text"
                    name="recipientName"
                    value={emailData.recipientName}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Nome da pessoa que receberá o plano"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Seu Nome
                  </label>
                  <input
                    type="text"
                    name="senderName"
                    value={emailData.senderName}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Seu nome como remetente"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mensagem Personalizada
                  </label>
                  <textarea
                    name="customMessage"
                    value={emailData.customMessage}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Mensagem adicional para incluir no e-mail"
                  />
                </div>
                
                <button
                  type="submit"
                  disabled={isLoading || !emailData.recipientEmail}
                  className="w-full py-2 px-4 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Enviando...' : 'Enviar por E-mail'}
                </button>
              </form>
            )}
            
            {/* Compartilhar por Link */}
            {activeTab === 'link' && (
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
            )}
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
