# Lyz - Sistema de Planos Cíclicos Personalizados

Lyz é um sistema web completo especializado em assistência para profissionais de saúde na criação de planos personalizados baseados em ciclicidade feminina. O sistema oferece dois níveis de acesso (Superadmin e Usuário) e utiliza inteligência artificial para processar dados e gerar recomendações personalizadas.

## Stack Tecnológico

### Frontend
- React/Next.js com TypeScript
- TailwindCSS para estilização
- Formik e Yup para validação de formulários
- Axios para requisições HTTP

### Backend
- Node.js com Express
- TypeScript
- PostgreSQL como banco de dados
- JWT para autenticação
- OpenAI API para integração com IA
- Minio para armazenamento de arquivos

## Estrutura do Projeto

```
/frontend           # Aplicação Next.js
  /src
    /components     # Componentes React
    /pages          # Páginas da aplicação
    /contexts       # Contextos React (autenticação, etc.)
    /hooks          # Custom hooks
    /lib            # Utilitários e configurações
    /styles         # Estilos globais

/backend            # API Node.js com Express
  /src
    /controllers    # Controladores da API
    /models         # Modelos do banco de dados
    /routes         # Rotas da API
    /middleware     # Middlewares
    /services       # Serviços
    /config         # Configurações
    /utils          # Utilitários

/traefik            # Configuração do proxy reverso
  /config           # Arquivos de configuração
  /acme             # Certificados SSL

```

## Requisitos

- Node.js 18+
- PostgreSQL 14+
- Docker e Docker Compose (para implantação)
- Chave de API da OpenAI

## Configuração do Ambiente de Desenvolvimento

### Backend

1. Navegue até o diretório do backend:
   ```bash
   cd backend
   ```

2. Instale as dependências:
   ```bash
   npm install
   ```

3. Copie o arquivo `.env.example` para `.env` e configure as variáveis de ambiente:
   ```bash
   cp .env.example .env
   ```

4. Configure o banco de dados PostgreSQL e atualize as variáveis de ambiente correspondentes.

5. Execute as migrações do banco de dados:
   ```bash
   npm run seed
   ```

6. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

### Frontend

1. Navegue até o diretório do frontend:
   ```bash
   cd frontend
   ```

2. Instale as dependências:
   ```bash
   npm install
   ```

3. Copie o arquivo `.env.example` para `.env.local` e configure as variáveis de ambiente:
   ```bash
   cp .env.example .env.local
   ```

4. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

## Implantação com Docker

O projeto pode ser implantado usando Docker e Docker Compose.

1. Configure as variáveis de ambiente no arquivo `docker-compose.env`:
   ```bash
   cp docker-compose.env.example docker-compose.env
   ```

2. Edite o arquivo `docker-compose.env` com suas configurações.

3. Inicie os containers com Docker Compose:
   ```bash
   docker-compose --env-file docker-compose.env up -d
   ```

4. O sistema estará disponível nos seguintes endereços:
   - Frontend: https://seu-dominio.com
   - API: https://api.seu-dominio.com
   - Minio: https://minio.seu-dominio.com
   - Console Minio: https://minio-console.seu-dominio.com
   - Traefik Dashboard: https://traefik.seu-dominio.com

## Configuração do Traefik para SSL

O Traefik está configurado para obter certificados SSL automaticamente através do Let's Encrypt. Certifique-se de configurar corretamente o domínio e o email no arquivo `docker-compose.env`.

## Funcionalidades Principais

### Fluxo da Ferramenta Lyz

1. **Seleção de Profissão**
   - Interface para selecionar: "Médico/Nutricionista" ou "Outro Profissional"
   - Personalização do plano final com base na escolha

2. **Formulário de Dados da Paciente**
   - Coleta de informações completas da paciente
   - Upload de questionário preenchido
   - Processamento automático dos dados

3. **Upload e Análise de Exames**
   - Interface para upload de PDFs de exames laboratoriais
   - Extração e análise de dados dos exames

4. **Observações de Medicina Chinesa**
   - Campos para registro de observações sobre face/língua
   - Análise energética baseada nos dados fornecidos

5. **Linha do Tempo Funcional**
   - Interface para criação de linha do tempo cronológica
   - Preenchimento assistido ou upload de linha existente

6. **Matriz IFM**
   - Interface para preenchimento da matriz do Instituto de Medicina Funcional
   - Preenchimento automático baseado nos dados anteriores

7. **Geração do Plano Personalizado**
   - Geração de plano geral e cíclico via IA
   - Adaptação baseada no tipo de profissional

8. **Visualização e Exportação**
   - Visualização completa do plano
   - Opções de download em PDF/DOCX
   - Compartilhamento via email

### Funcionalidades do Superadmin

- Dashboard executivo com métricas de uso
- Gerenciamento de empresas e usuários
- Gestão de prompts e modelos de IA
- Controle de tokens e recursos
- Auditoria e logs

## Autenticação e Segurança

O sistema utiliza dois níveis de autenticação:

1. **Superadmin**
   - Criado diretamente no sistema sem validação externa
   - Acesso a todas as funcionalidades de administração

2. **Usuários Regulares**
   - Validados na API do Curseduca antes da criação da conta
   - Acesso às funcionalidades de criação de planos

## Licença

Este projeto é proprietário e de uso exclusivo.
