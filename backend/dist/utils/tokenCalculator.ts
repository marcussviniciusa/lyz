// Model pricing (per 1000 tokens, in USD)
const modelPricing = {
  'gpt-4': { input: 0.03, output: 0.06 },
  'gpt-4-32k': { input: 0.06, output: 0.12 },
  'gpt-3.5-turbo': { input: 0.0015, output: 0.002 },
  'gpt-3.5-turbo-16k': { input: 0.003, output: 0.004 },
};

// Função para calcular o custo aproximado de uma requisição à OpenAI
export const calculateCost = (totalTokens: number, model: string = 'gpt-4'): number => {
  // Usar preços padrão se o modelo não for encontrado na tabela
  const pricing = modelPricing[model] || modelPricing['gpt-4'];
  
  // Considerando que em média 25% são tokens de entrada e 75% são tokens de saída
  // Esta é uma simplificação, não temos como saber a divisão exata sem um contador separado
  const inputTokens = totalTokens * 0.25;
  const outputTokens = totalTokens * 0.75;
  
  // Calcular custo
  const cost = 
    (inputTokens / 1000) * pricing.input + 
    (outputTokens / 1000) * pricing.output;
  
  return parseFloat(cost.toFixed(6));
};
