# Guia para Edição de Prompts do Sistema Lyz

Este documento fornece instruções detalhadas sobre como editar os prompts de IA utilizados nas diferentes etapas de análise do sistema Lyz.

## Índice

1. [Visão Geral do Sistema de Prompts](#visão-geral-do-sistema-de-prompts)
2. [Análise de Medicina Tradicional Chinesa (TCM)](#análise-de-medicina-tradicional-chinesa-tcm)
3. [Análise de Resultados Laboratoriais (Texto)](#análise-de-resultados-laboratoriais-texto)
4. [Análise de Resultados Laboratoriais (PDF)](#análise-de-resultados-laboratoriais-pdf)
5. [Análise da Matriz IFM](#análise-da-matriz-ifm)
6. [Recomendações para Criação de Prompts Eficazes](#recomendações-para-criação-de-prompts-eficazes)
7. [Armazenamento de Prompts no Banco de Dados](#armazenamento-de-prompts-no-banco-de-dados)

## Visão Geral do Sistema de Prompts

O sistema Lyz utiliza a API OpenAI para gerar análises em diferentes etapas do fluxo de trabalho. Os prompts são instruções fornecidas ao modelo de IA que determinam como a análise será realizada e formatada.

Existem dois métodos para editar prompts no sistema:

1. **Edição direta no código-fonte**: Os prompts estão definidos nos arquivos controladores do backend
2. **Sistema de banco de dados**: Alguns prompts podem ser armazenados e recuperados de uma tabela `prompts` no banco de dados

## Análise de Medicina Tradicional Chinesa (TCM)

### Localização do Código

**Arquivo**: `/home/m/lyz/backend/src/controllers/analysisController.ts`  
**Função**: `analyzeTCMData` (aproximadamente linha 1011)  
**Prompt System**: Linhas 1043-1085  
**Prompt User**: Linhas 1087-1114

### Prompt Atual (Sistema)

```typescript
const systemPrompt = `Você é um especialista em Medicina Tradicional Chinesa (MTC) com amplo conhecimento em diagnóstico e tratamento.
  Analise os dados fornecidos pelo usuário e gere uma análise completa incluindo:
  1. Um resumo da condição do paciente
  2. Identificação dos padrões de desequilíbrio
  3. Recomendações específicas de tratamento
  
  IMPORTANTE: Analise cuidadosamente todas as informações fornecidas. Não indique "dados não fornecidos" se os dados 
  estiverem presentes na requisição. Se os dados estiverem vazios, indique especificamente quais informações 
  estão faltando e use apenas os dados disponíveis para sua análise.
  
  INSTRUÇÕES ESPECÍFICAS:
  - Utilize quaisquer dados fornecidos, mesmo que pareçam limitados
  - Se dados específicos da língua e pulso estiverem disponíveis, dê ênfase a eles na análise
  - Se o diagnóstico de padrão já estiver fornecido, valide-o e expanda-o
  - Sempre forneça recomendações específicas baseadas nos dados disponíveis
  - Não use frases genéricas como "Não foram fornecidas informações" a menos que realmente não existam dados
  
  Formate o resultado em JSON com as seguintes propriedades:
  - summary: resumo geral da condição
  - patterns: array de objetos contendo os padrões identificados, cada um com name e description
  - recommendations: array de strings com recomendações específicas`;
```

### Como Editar

1. Abra o arquivo `/home/m/lyz/backend/src/controllers/analysisController.ts`
2. Localize a função `analyzeTCMData` (linha 1011)
3. Edite a variável `systemPrompt` conforme necessário
4. Se desejar modificar o formato dos dados enviados à API, também edite a variável `userPrompt`
5. Salve o arquivo e reinicie o servidor backend

## Análise de Resultados Laboratoriais (Texto)

### Localização do Código

**Arquivo**: `/home/m/lyz/backend/src/controllers/analysisController.ts`  
**Função**: `analyzeLabTextData` (aproximadamente linha 300)  
**Prompt**: Linhas 302-315

### Prompt Atual

```typescript
const prompt = `Você é um especialista em análise de resultados laboratoriais com amplo conhecimento médico.
Analise os resultados laboratoriais fornecidos e gere uma análise detalhada incluindo:

1. RESUMO: Um resumo detalhado da condição geral do paciente com base nos resultados, destacando pontos importantes e possíveis áreas de preocupação. Seja específico e detalhado, não genérico.

2. VALORES FORA DA FAIXA: Liste TODOS os valores que estão fora da faixa de referência, incluindo: nome do marcador, valor, unidade, faixa de referência, e uma breve interpretação do significado. Inclua TODOS os marcadores alterados que puder identificar no texto, mesmo os mais sutis.

3. RECOMENDAÇÕES: Forneça recomendações personalizadas baseadas nos resultados, incluindo sugestões para acompanhamento médico, exames adicionais, e possíveis intervenções de estilo de vida.

Formate a resposta como um objeto JSON contendo os campos: "summary", "outOfRange" (array de objetos), e "recommendations" (array de strings).

IMPORTANTE: Evite respostas genéricas. Sua análise deve ser específica para os resultados fornecidos e clinicamente relevante.`;
```

### Como Editar

1. Abra o arquivo `/home/m/lyz/backend/src/controllers/analysisController.ts`
2. Localize a função `analyzeLabTextData` (linha 300)
3. Edite a variável `prompt` conforme necessário
4. Salve o arquivo e reinicie o servidor backend

## Análise de Resultados Laboratoriais (PDF)

### Localização do Código

**Arquivo**: `/home/m/lyz/backend/src/controllers/analysisController.ts`  
**Função**: `analyzeLabPdfData` (aproximadamente linha 430)  
**Prompt**: Linhas 500-515 (aproximadamente)

### Como Editar

1. Abra o arquivo `/home/m/lyz/backend/src/controllers/analysisController.ts`
2. Localize a função `analyzeLabPdfData` 
3. Procure pela definição do `prompt` (similar ao usado na análise de texto)
4. Edite o prompt conforme necessário
5. Salve o arquivo e reinicie o servidor backend

## Análise da Matriz IFM

### Localização do Código

**Arquivo**: `/home/m/lyz/backend/src/controllers/analysisController.ts`  
**Função**: `analyzeIFMMatrixData` (se existir)

### Como Editar

1. Procure no arquivo `analysisController.ts` pela função relacionada à análise IFM
2. Localize a definição do prompt, seguindo padrão similar aos outros
3. Edite conforme necessário
4. Salve o arquivo e reinicie o servidor backend

## Recomendações para Criação de Prompts Eficazes

Ao editar os prompts, considere as seguintes diretrizes:

### Estrutura Recomendada

1. **Definição do papel**: Comece definindo o papel e expertise do assistente
   ```
   Você é um especialista em [especialidade] com amplo conhecimento em [áreas específicas].
   ```

2. **Objetivo principal**: Explique claramente o que deve ser analisado
   ```
   Analise os [dados específicos] fornecidos e gere uma análise detalhada incluindo:
   ```

3. **Componentes da análise**: Liste numericamente os componentes esperados
   ```
   1. [Componente 1]: [Descrição detalhada]
   2. [Componente 2]: [Descrição detalhada]
   3. [Componente 3]: [Descrição detalhada]
   ```

4. **Instruções específicas**: Forneça diretrizes para casos particulares
   ```
   INSTRUÇÕES ESPECÍFICAS:
   - [Instrução 1]
   - [Instrução 2]
   ```

5. **Formato de saída**: Especifique claramente o formato JSON esperado
   ```
   Formate a resposta como um objeto JSON contendo os campos: "[campo1]", "[campo2]" (array de objetos), e "[campo3]" (array de strings).
   ```

6. **Avisos importantes**: Adicione restrições ou preferências específicas
   ```
   IMPORTANTE: [Avisos críticos para o modelo seguir]
   ```

### Dicas Adicionais

- **Seja específico**: Quanto mais específico o prompt, melhores serão os resultados
- **Evite ambiguidades**: Use linguagem clara e direta
- **Forneça exemplos**: Se possível, inclua exemplos do formato de saída esperado
- **Teste iterativamente**: Após modificações, teste com diferentes conjuntos de dados

## Armazenamento de Prompts no Banco de Dados

O sistema Lyz também suporta o armazenamento de prompts no banco de dados, permitindo modificações sem alterar o código-fonte.

### Como Utilizar

1. **Busca de prompts no código**:
   ```typescript
   const prompt = await Prompt.findOne({ where: { step_key: 'tcm_analysis' } });
   ```

2. **Edição via SQL**:
   ```sql
   UPDATE prompts SET 
     content='Seu novo prompt aqui',
     temperature=0.7,
     max_tokens=1000
   WHERE step_key='tcm_analysis';
   ```

3. **Criação de novos prompts**:
   ```sql
   INSERT INTO prompts (step_key, content, temperature, max_tokens)
   VALUES ('novo_tipo_analise', 'Seu prompt aqui', 0.7, 1000);
   ```

### Chaves de Prompt Conhecidas

- `tcm_analysis`: Análise de Medicina Tradicional Chinesa
- `lab_text_analysis`: Análise de resultados laboratoriais em texto
- `lab_pdf_analysis`: Análise de resultados laboratoriais em PDF
- `ifm_matrix_analysis`: Análise da matriz IFM (se implementada)

---

## Considerações Finais

Após editar os prompts, sempre reinicie o servidor backend para garantir que as alterações entrem em vigor. Recomenda-se realizar testes abrangentes com diferentes conjuntos de dados para verificar se as modificações estão produzindo os resultados esperados.

Para suporte adicional, consulte a documentação da OpenAI sobre práticas recomendadas para engenharia de prompts: [OpenAI Prompt Engineering Guide](https://platform.openai.com/docs/guides/prompt-engineering).
