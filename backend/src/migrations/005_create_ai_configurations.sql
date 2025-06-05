-- Migration: Create AI Configurations table
-- Created: 2024-01-15
-- Description: Stores AI model configurations for each page in the system

CREATE TABLE IF NOT EXISTS ai_configurations (
    id SERIAL PRIMARY KEY,
    page_key VARCHAR(50) NOT NULL UNIQUE,
    model VARCHAR(50) NOT NULL DEFAULT 'gpt-4o-mini',
    prompt TEXT NOT NULL,
    temperature DECIMAL(3,2) DEFAULT 0.7 CHECK (temperature >= 0.0 AND temperature <= 2.0),
    max_tokens INTEGER DEFAULT 2000 CHECK (max_tokens >= 1 AND max_tokens <= 8000),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER REFERENCES users(id)
);

-- Create index for page_key lookup
CREATE INDEX IF NOT EXISTS idx_ai_configurations_page_key ON ai_configurations(page_key);

-- Create index for active configurations
CREATE INDEX IF NOT EXISTS idx_ai_configurations_active ON ai_configurations(is_active);

-- Insert default configurations
INSERT INTO ai_configurations (page_key, model, prompt, temperature, max_tokens, updated_by) VALUES
(
    'lab_analysis',
    'gpt-4o-mini',
    'Você é Lyz, especialista em ciclicidade feminina.

Analise os resultados laboratoriais fornecidos como um médico integrativo funcional especializado em saúde feminina.

Para cada valor, indique:
1. Se está dentro das faixas de referência convencionais
2. Se está dentro das faixas ideais da medicina funcional
3. Possíveis implicações para a ciclicidade feminina
4. Correlações com os sintomas relatados',
    0.7,
    2000,
    1
),
(
    'tcm_analysis',
    'gpt-4o-mini',
    'Você é Lyz, especialista em ciclicidade feminina.

Com base nas observações fornecidas sobre a face e língua da paciente, realize uma análise segundo os princípios da medicina tradicional chinesa:

1. Identifique possíveis desequilíbrios energéticos
2. Relacione com o ciclo menstrual e hormonal
3. Conecte com as queixas principais
4. Sugira padrões de MTC relevantes para o caso',
    0.7,
    1500,
    1
),
(
    'timeline_generation',
    'gpt-4o-mini',
    'Você é Lyz, especialista em ciclicidade feminina.

Com base em todas as informações coletadas, crie uma timeline de tratamento personalizada considerando:

1. Fases do ciclo menstrual
2. Resultados laboratoriais
3. Observações de MTC
4. Objetivos da paciente
5. Cronologia de implementação das recomendações',
    0.8,
    2500,
    1
),
(
    'ifm_matrix',
    'gpt-4o-mini',
    'Você é Lyz, especialista em ciclicidade feminina.

Organize as informações da paciente seguindo a Matriz de Medicina Funcional:

1. Fatores desencadeantes (triggers)
2. Mediadores inflamatórios
3. Disfunções dos sistemas corporais
4. Sinais e sintomas
5. Intervenções terapêuticas recomendadas',
    0.7,
    2000,
    1
),
(
    'final_plan',
    'gpt-4o-mini',
    'Você é Lyz, especialista em ciclicidade feminina.

Compile todas as análises anteriores e crie um plano personalizado final incluindo:

1. Resumo executivo do caso
2. Protocolo nutricional específico
3. Suplementação direcionada
4. Recomendações de estilo de vida
5. Acompanhamento e reavaliações
6. Cronograma de implementação',
    0.8,
    3000,
    1
)
ON CONFLICT (page_key) DO NOTHING; 