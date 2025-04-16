import React from 'react';

type MatrixCategory = {
  name: string;
  items: Array<{
    name: string;
    value: 0 | 1 | 2 | 3;
    notes?: string;
  }>;
  notes?: string;
};

interface IFMMatrixCardProps {
  category: MatrixCategory;
  description: string;
  onValueChange: (index: number, value: 0 | 1 | 2 | 3) => void;
  onNotesChange: (notes: string) => void;
}

const IFMMatrixCard: React.FC<IFMMatrixCardProps> = ({
  category,
  description,
  onValueChange,
  onNotesChange
}) => {
  // Renderiza o seletor de valor para cada item
  const renderValueSelector = (index: number, value: 0 | 1 | 2 | 3) => {
    const getImpactText = (val: number) => {
      switch(val) {
        case 0: return 'Nenhum';
        case 1: return 'Leve';
        case 2: return 'Moderado';
        case 3: return 'Severo';
        default: return '';
      }
    };
    
    return (
      <div className="flex space-x-1">
        {[0, 1, 2, 3].map((val) => (
          <button
            key={val}
            type="button"
            onClick={() => onValueChange(index, val as 0 | 1 | 2 | 3)}
            title={getImpactText(val)}
            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium
              ${value === val 
                ? 'bg-primary-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            {val}
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="border border-gray-200 rounded-md p-4 bg-white shadow-sm mb-6">
      <h3 className="text-lg font-medium text-gray-900 mb-2 flex items-center">
        <span className="mr-2">{category.name}</span>
        <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
          {category.items.filter(i => i.value > 0).length} de {category.items.length} fatores
        </span>
      </h3>
      <p className="text-sm text-gray-500 mb-4">{description}</p>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fator Funcional
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Nível de Impacto
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {category.items.map((item, index) => (
              <tr key={index} className={item.value > 0 ? 'bg-yellow-50' : ''}>
                <td className="px-6 py-3 text-sm font-medium text-gray-900">
                  {item.name}
                </td>
                <td className="px-6 py-3">
                  {renderValueSelector(index, item.value)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Observações sobre {category.name}
        </label>
        <textarea
          value={category.notes || ''}
          onChange={(e) => onNotesChange(e.target.value)}
          rows={2}
          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
          placeholder={`Observações sobre ${category.name.toLowerCase()}`}
        />
      </div>
    </div>
  );
};

export default IFMMatrixCard;
