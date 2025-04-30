import React from 'react';

// Tipo para as recomendações nutricionais
type NutritionalRecommendations = {
  foods_to_include: string;
  foods_to_avoid: string;
  meal_timing: string;
  supplements: string;
};

// Tipo para as recomendações de estilo de vida
type LifestyleRecommendations = {
  exercise: string;
  sleep: string;
  stress_management: string;
  other: string;
};

// Tipo para o plano final completo
export type FinalPlanType = {
  diagnosis: string;
  treatment_plan: string;
  nutritional_recommendations: NutritionalRecommendations;
  lifestyle_recommendations: LifestyleRecommendations;
  follow_up: string;
  additional_notes: string;
  analyses?: {
    tcm: any;
    lab: any;
    ifm: any;
  };
};

// Propriedades do componente
interface FinalPlanDisplayProps {
  plan: FinalPlanType;
  patientName: string;
  showEditButton?: boolean;
  onEdit?: () => void;
}

// Função para tratar texto vazio
const formatText = (text: string): string => {
  return text.trim() ? text : 'Não especificado';
};

// Função para transformar texto com quebras de linha em parágrafos HTML
const formatParagraphs = (text: string): React.ReactNode[] => {
  if (!text || typeof text !== 'string' || text.trim() === '') {
    return [<p key="empty">Não especificado</p>];
  }
  
  // Verificar formato especial de texto numerado com pontos ou números que podem estar em um plano de tratamento
  const hasListItems = text.match(/\d+\.\s+[A-Za-z]/);
  
  // Detectar se o texto contém uma lista numerada (padrão 1., 2., etc.)
  if (hasListItems) {
    // Temos uma lista dentro de um parágrafo - vamos formatá-la melhor
    return formatNumberedListInParagraph(text);
  }
  
  // Para texto normal - dividir por quebras de linha e renderizar
  const paragraphs = text.split('\n')
    .filter(line => line && line.trim().length > 0)
    .map((line, index) => <p key={index} className="mb-2 text-gray-800 font-medium">{line}</p>);
  
  // Se não houver parágrafos válidos, retornar texto padrão
  if (paragraphs.length === 0) {
    return [<p key="empty">Não especificado</p>];
  }
  
  return paragraphs;
};

// Função auxiliar para formatar texto que contém lista numerada embutida
const formatNumberedListInParagraph = (text: string): React.ReactNode[] => {
  // Verificar se o texto é apenas uma lista numerada ou tem partes de texto normal
  const lines = text.split('\n').filter(line => line.trim().length > 0);
  const result: React.ReactNode[] = [];
  
  let currentText = '';
  
  // Processar cada linha
  lines.forEach((line, index) => {
    const isListItem = /^\d+\.\s+/.test(line.trim());
    
    if (isListItem) {
      // Se acumulamos texto antes deste item de lista, adicionamos primeiro
      if (currentText.trim()) {
        result.push(<p key={`text-${index}`} className="mb-3 text-gray-800 font-medium">{currentText.trim()}</p>);
        currentText = '';
      }
      
      // Adicionar item de lista formatado
      const [num, ...rest] = line.split('.');
      const content = rest.join('.').trim();
      
      result.push(
        <p key={`list-item-${index}`} className="mb-2 pl-5 text-gray-800 font-medium">
          <span className="font-bold text-primary-600">{num}.</span> {content}
        </p>
      );
    } else {
      // Texto normal - acumular
      currentText += line + ' ';
    }
  });
  
  // Se sobrou texto acumulado no final
  if (currentText.trim()) {
    result.push(
      <p key="final-text" className="mb-3 text-gray-800 font-medium">
        {currentText.trim()}
      </p>
    );
  }
  
  return result;
};

// Função para formatar texto em itens de lista
const formatList = (text: string): React.ReactNode => {
  if (!text || typeof text !== 'string' || !text.trim()) {
    return <p>Não especificado</p>;
  }
  
  // Dividir por quebras de linha
  const items = text
    .split('\n')
    .filter(item => item && item.trim().length > 0);
  
  // Se for apenas um item, retornar como parágrafo
  if (items.length === 1) {
    return <p>{items[0]}</p>;
  }
  
  // Caso contrário, retornar como lista
  return (
    <ul className="list-disc pl-5 space-y-1">
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  );
};

// Componente de seção
const Section: React.FC<{
  title: string;
  children: React.ReactNode;
  className?: string;
}> = ({ title, children, className = '' }) => (
  <div className={`mb-8 ${className}`}>
    <h3 className="text-xl font-semibold text-gray-800 mb-3 pb-1 border-b border-gray-300">{title}</h3>
    <div className="pl-1">{children}</div>
  </div>
);

// Componente de subseção
const Subsection: React.FC<{
  title: string;
  children: React.ReactNode;
}> = ({ title, children }) => (
  <div className="mb-4 p-4 bg-white border border-gray-300 rounded-md shadow-sm hover:shadow transition-shadow duration-200">
    <h4 className="text-lg font-semibold text-primary-700 mb-3 pb-1 border-b border-gray-200">{title}</h4>
    <div className="pl-1 text-gray-800">{children}</div>
  </div>
);

// Componente principal
const FinalPlanDisplay: React.FC<FinalPlanDisplayProps> = ({
  plan,
  patientName,
  showEditButton = false,
  onEdit
}) => {
  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200">
      {/* Cabeçalho */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white p-6 shadow-sm">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Plano Terapêutico</h2>
            <p className="opacity-90 mt-1">Paciente: {patientName}</p>
          </div>
          {showEditButton && (
            <button 
              onClick={onEdit} 
              className="px-4 py-2 bg-white text-primary-600 rounded-md hover:bg-primary-50 transition-colors"
            >
              Editar Plano
            </button>
          )}
        </div>
      </div>
      
      {/* Conteúdo do plano */}
      <div className="p-6">
        {/* Diagnóstico */}
        <Section title="Diagnóstico">
          <div className="bg-white p-5 rounded-md border border-gray-300 shadow-sm">
            {formatParagraphs(plan.diagnosis)}
          </div>
        </Section>
        
        {/* Plano de Tratamento */}
        <Section title="Plano de Tratamento">
          <div className="bg-white p-5 rounded-md border border-gray-300 shadow-sm">
            {formatParagraphs(plan.treatment_plan)}
          </div>
        </Section>
        
        {/* Recomendações Nutricionais */}
        <Section title="Recomendações Nutricionais">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Subsection title="Alimentos a Incluir">
              {formatList(plan.nutritional_recommendations.foods_to_include)}
            </Subsection>
            
            <Subsection title="Alimentos a Evitar">
              {formatList(plan.nutritional_recommendations.foods_to_avoid)}
            </Subsection>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <Subsection title="Horários das Refeições">
              {formatParagraphs(plan.nutritional_recommendations.meal_timing)}
            </Subsection>
            
            <Subsection title="Suplementação">
              {formatList(plan.nutritional_recommendations.supplements)}
            </Subsection>
          </div>
        </Section>
        
        {/* Recomendações de Estilo de Vida */}
        <Section title="Recomendações de Estilo de Vida">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Subsection title="Exercícios Físicos">
              {formatParagraphs(plan.lifestyle_recommendations.exercise)}
            </Subsection>
            
            <Subsection title="Sono">
              {formatParagraphs(plan.lifestyle_recommendations.sleep)}
            </Subsection>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <Subsection title="Gerenciamento de Estresse">
              {formatParagraphs(plan.lifestyle_recommendations.stress_management)}
            </Subsection>
            
            <Subsection title="Outras Recomendações">
              {formatParagraphs(plan.lifestyle_recommendations.other)}
            </Subsection>
          </div>
        </Section>
        
        {/* Acompanhamento */}
        <Section title="Plano de Acompanhamento">
          {formatParagraphs(plan.follow_up)}
        </Section>
        
        {/* Observações Adicionais */}
        {plan.additional_notes && (
          <Section title="Observações Adicionais">
            {formatParagraphs(plan.additional_notes)}
          </Section>
        )}
        
        {/* Análises Anteriores (se disponíveis) */}
        {plan.analyses && (
          <Section 
            title="Análises Incorporadas" 
            className="bg-blue-50 p-4 rounded-md border border-blue-200 mt-6"
          >
            <div className="text-sm text-gray-800">
              <p className="mb-2 font-medium">Este plano incorpora dados das seguintes análises:</p>
              <ul className="list-disc pl-5">
                {plan.analyses.tcm && <li className="text-gray-900">Análise de Medicina Tradicional Chinesa</li>}
                {plan.analyses.lab && <li className="text-gray-900">Análise de Exames Laboratoriais</li>}
                {plan.analyses.ifm && <li className="text-gray-900">Análise da Matriz IFM</li>}
              </ul>
            </div>
          </Section>
        )}
      </div>
    </div>
  );
};

export default FinalPlanDisplay;
