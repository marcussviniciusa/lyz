-- Script de Migração: Prompts -> AI Configurations
-- Backup dos dados atuais
CREATE TABLE IF NOT EXISTS prompts_backup AS SELECT * FROM prompts;
CREATE TABLE IF NOT EXISTS ai_configurations_backup AS SELECT * FROM ai_configurations;

-- Primeiro, vamos atualizar os existentes com dados mais completos dos prompts
UPDATE ai_configurations SET
  prompt = p.content,
  temperature = p.temperature,
  max_tokens = p.max_tokens,
  updated_at = p.updated_at,
  updated_by = p.updated_by
FROM prompts p
WHERE (
  (ai_configurations.page_key = 'lab_analysis' AND p.step_key = 'lab_results_analysis') OR
  (ai_configurations.page_key = 'tcm_analysis' AND p.step_key = 'tcm_analysis') OR
  (ai_configurations.page_key = 'timeline_generation' AND p.step_key = 'timeline_generation') OR
  (ai_configurations.page_key = 'ifm_matrix' AND p.step_key = 'ifm_matrix_generation') OR
  (ai_configurations.page_key = 'final_plan' AND p.step_key = 'final_plan')
);

-- Inserir os novos que não existem
INSERT INTO ai_configurations (page_key, model, prompt, temperature, max_tokens, is_active, created_at, updated_at, updated_by) 
SELECT 
  'plan_medical_nutritionist' as page_key,
  'gpt-4o-mini' as model,
  content as prompt,
  temperature,
  max_tokens,
  true as is_active,
  NOW() as created_at,
  COALESCE(updated_at, NOW()) as updated_at,
  updated_by
FROM prompts 
WHERE step_key = 'plan_medical_nutritionist'
ON CONFLICT (page_key) DO NOTHING;

INSERT INTO ai_configurations (page_key, model, prompt, temperature, max_tokens, is_active, created_at, updated_at, updated_by) 
SELECT 
  'plan_other_professional' as page_key,
  'gpt-4o-mini' as model,
  content as prompt,
  temperature,
  max_tokens,
  true as is_active,
  NOW() as created_at,
  COALESCE(updated_at, NOW()) as updated_at,
  updated_by
FROM prompts 
WHERE step_key = 'plan_other_professional'
ON CONFLICT (page_key) DO NOTHING;

INSERT INTO ai_configurations (page_key, model, prompt, temperature, max_tokens, is_active, created_at, updated_at, updated_by) 
SELECT 
  'questionnaire_organization' as page_key,
  'gpt-4o-mini' as model,
  content as prompt,
  temperature,
  max_tokens,
  true as is_active,
  NOW() as created_at,
  COALESCE(updated_at, NOW()) as updated_at,
  updated_by
FROM prompts 
WHERE step_key = 'questionnaire_organization'
ON CONFLICT (page_key) DO NOTHING;

-- Verificar resultado
SELECT 'AI_CONFIGURATIONS' as tabela, count(*) as total FROM ai_configurations
UNION ALL
SELECT 'PROMPTS' as tabela, count(*) as total FROM prompts; 