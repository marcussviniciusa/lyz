# Funcionalidades do Sistema Lyz

## Visão Geral

O Lyz é um sistema especializado para profissionais de saúde que permite a criação de planos personalizados baseados na ciclicidade feminina. O sistema processa dados de pacientes, resultados de exames e observações clínicas para gerar recomendações personalizadas para cada paciente.

## Níveis de Acesso

O sistema possui dois níveis de acesso principais:

### Acesso Superadministrador

- Visualização de dashboard executivo com métricas e estatísticas
- Gerenciamento de empresas parceiras
- Gerenciamento de usuários
- Configuração de prompts para processamento com IA
- Monitoramento de uso de tokens e recursos
- Visualização de logs e auditoria

### Acesso Usuário

- Criação e gerenciamento de planos para pacientes
- Upload e processamento de documentos
- Geração de planos personalizados
- Exportação de documentos
- Compartilhamento de planos com pacientes

## Funcionalidades do Superadministrador

### Dashboard Executivo

- Métricas de uso do sistema
- Estatísticas de planos gerados
- Consumo de recursos por empresa
- Gráficos de uso por período

### Gerenciamento de Empresas

- Listagem de empresas cadastradas
- Cadastro de novas empresas com:
  - Nome da empresa
  - CNPJ
  - Endereço
  - Contato principal
  - Data de contrato
  - Plano contratado
  - Limites de uso
- Edição de informações de empresas
- Desativação/ativação de empresas

### Gerenciamento de Usuários

- Listagem de usuários cadastrados
- Filtro por empresa
- Cadastro de novos usuários com:
  - Nome completo
  - Email
  - Empresa associada
  - Nível de acesso
  - Status (ativo/inativo)
  - Profissão
- Edição de informações de usuários
- Reset de senha
- Desativação/ativação de usuários

### Configuração de Prompts

- Listagem de prompts do sistema
- Edição de templates de prompts para diferentes análises:
  - Análise de exames laboratoriais
  - Análise de medicina tradicional chinesa
  - Geração de matriz IFM
  - Plano final

### Monitoramento de Tokens

- Visualização de uso de tokens por período
- Visualização de uso por empresa
- Configuração de limites
- Alertas de uso excessivo

## Funcionalidades do Usuário

### Gerenciamento de Planos

- Listagem de planos criados
- Filtros por status, data e paciente
- Visualização de detalhes dos planos
- Exportação de planos em PDF/DOCX
- Compartilhamento de planos via email

### Fluxo de Criação de Planos

O sistema implementa um fluxo de trabalho sequencial para a criação de planos personalizados:

#### 1. Seleção de Profissão e Dados Iniciais da Paciente

**Campos do formulário:**
- Seleção de profissão: "Médico/Nutricionista" ou "Outro Profissional"
- Nome completo da paciente
- Data de nascimento
- Email da paciente
- Telefone
- Endereço completo
- Profissão da paciente
- Motivo principal da consulta
- Observações iniciais

Após preencher estes dados, o sistema salva as informações básicas e permite avançar para o próximo passo.

#### 2. Questionário Detalhado

**Campos do formulário:**
- **Histórico menstrual:**
  - Idade da menarca
  - Regularidade do ciclo
  - Duração do ciclo
  - Duração do fluxo
  - Características do fluxo (quantidade, cor, coágulos)
  - Sintomas pré-menstruais
  - Data da última menstruação

- **Histórico gestacional:**
  - Número de gestações
  - Número de partos
  - Tipos de parto
  - Complicações gestacionais
  - Amamentação (duração)

- **Histórico de saúde:**
  - Doenças prévias
  - Cirurgias realizadas
  - Medicamentos em uso
  - Suplementos em uso
  - Alergias conhecidas

- **Histórico familiar:**
  - Doenças cardiovasculares
  - Diabetes
  - Câncer
  - Doenças autoimunes
  - Outras condições relevantes

- **Hábitos de vida:**
  - Padrão alimentar
  - Prática de atividade física
  - Qualidade do sono
  - Níveis de estresse
  - Consumo de álcool
  - Tabagismo

Alternativamente, o profissional pode fazer upload de um questionário preenchido em formato PDF, que será processado pelo sistema.

#### 3. Upload e Análise de Exames

**Funcionalidades da tela:**
- Upload de múltiplos arquivos de exames (PDF)
- Campo para data de realização do exame
- Seleção do tipo de exame
- Botão para processamento automático
- Exibição dos resultados extraídos
- Editor para correção manual dos dados extraídos
- Campos para observações sobre cada resultado
- Botão para análise integrada dos resultados

O sistema processa automaticamente os PDFs para extrair os resultados dos exames e apresenta os valores encontrados, permitindo correções e ajustes.

#### 4. Observações de Medicina Tradicional Chinesa (TCM)

**Campos do formulário:**
- **Observações Faciais:**
  - Cor da face
  - Brilho da pele
  - Manchas ou alterações
  - Características dos olhos
  - Lábios e boca

- **Observações da Língua:**
  - Cor do corpo da língua
  - Espessura da saburra
  - Cor da saburra
  - Formato da língua
  - Marcas ou fissuras
  - Umidade/secura

- **Pulsologia:**
  - Qualidade do pulso
  - Força
  - Ritmo
  - Observações específicas dos 6 posições

- **Observações Energéticas:**
  - Sinais de deficiência/excesso
  - Desequilíbrios nos 5 elementos
  - Outros sinais relevantes

Após o preenchimento, o sistema processa essas informações e gera uma análise energética baseada nos princípios da medicina chinesa.

#### 5. Linha do Tempo Funcional

**Funcionalidades da tela:**
- Interface interativa para criação de linha do tempo
- Adição de eventos com:
  - Data do evento
  - Tipo (doença, cirurgia, tratamento, sintoma, etc.)
  - Descrição detalhada
  - Duração
  - Impacto na qualidade de vida (escala 1-10)
  - Relação com ciclo menstrual

- Upload de linha do tempo existente (opcional)
- Organização cronológica automática
- Visualização gráfica da linha do tempo

Esta etapa permite mapear os eventos significativos da história de saúde do paciente de forma cronológica.

#### 6. Matriz do Instituto de Medicina Funcional (IFM)

**Funcionalidades da tela:**
- Preenchimento guiado dos sete sistemas da matriz IFM:
  - Assimilação (digestão, absorção, microbioma)
  - Defesa e Reparação (imunidade, inflamação)
  - Energia (produção e manejo de energia)
  - Biotransformação e Eliminação (desintoxicação)
  - Transporte (sistema cardiovascular e linfático)
  - Comunicação (hormônios e neurotransmissores)
  - Estrutura (dos sistemas corporais)

- Para cada sistema, campos para:
  - Antecedentes (genética, experiências de vida)
  - Gatilhos (alergias, toxinas, estresse)
  - Mediadores (dieta, exercícios, estresse, relações)

- Preenchimento automático sugerido baseado em dados anteriores
- Possibilidade de edição manual
- Visualização gráfica da matriz completa

O sistema sugere automaticamente o preenchimento da matriz com base nos dados já informados nas etapas anteriores.

#### 7. Geração do Plano Personalizado

**Funcionalidades da tela:**
- Visualização do resumo de dados coletados
- Botão para geração automática do plano
- Editor para personalização do plano gerado
- Divisão do plano em seções:
  - Resumo do caso
  - Correlações entre sintomas e resultados
  - Plano nutricional geral
  - Plano nutricional cíclico (específico para cada fase do ciclo)
  - Suplementação recomendada
  - Exames adicionais sugeridos
  - Orientações de estilo de vida
  - Cronograma de acompanhamento

- Adaptação automática baseada no tipo de profissional

#### 8. Visualização e Exportação

**Funcionalidades da tela:**
- Visualização completa do plano formatado
- Opções de download:
  - PDF (alta qualidade)
  - DOCX (editável)
- Compartilhamento via email:
  - Campo para email do destinatário
  - Campo para mensagem personalizada
  - Opção de incluir materiais educativos
- Geração de link temporário para acesso
- Estatísticas de visualização do plano

## Outras Funcionalidades

### Transcrição de Áudio

- Gravação de áudio diretamente na plataforma
- Transcrição automática para texto
- Edição do texto transcrito
- Inclusão do conteúdo em campos específicos do fluxo

### Suporte a Múltiplos Idiomas

- Interface disponível em português e inglês
- Processamento de documentos em ambos os idiomas

### Gestão de Planos

- Duplicação de planos existentes
- Criação de templates personalizados
- Arquivamento de planos antigos
- Histórico de versões

### Segurança e Privacidade

- Anonimização de dados para análise
- Conformidade com regulamentos de privacidade
- Backup automático de dados
- Rastreamento de acessos
