-- Limpeza das configurações de AI desnecessárias
-- Manter apenas as 5 páginas que realmente usam IA no projeto

-- Remover configurações que não são usadas
DELETE FROM ai_configurations 
WHERE page_key IN (
  'plan_medical_nutritionist',
  'plan_other_professional', 
  'questionnaire_organization'
);

-- Verificar resultado final
SELECT 
  page_key, 
  model, 
  temperature, 
  max_tokens, 
  is_active,
  length(prompt) as prompt_length
FROM ai_configurations 
ORDER BY page_key; 