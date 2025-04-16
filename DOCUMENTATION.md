# Documentação Técnica do Lyz Health System

## Visão Geral
O Lyz é um sistema web especializado para profissionais de saúde na criação de planos personalizados baseados em ciclicidade feminina. O sistema utiliza inteligência artificial para processar dados e gerar recomendações personalizadas, oferecendo dois níveis de acesso: Superadmin e Usuário.

## Arquitetura do Sistema

### Stack Tecnológico

#### Frontend
- **Framework**: Next.js 15.2.4 com TypeScript
- **Estilização**: TailwindCSS 3.3.0 com PostCSS 8.4.23 e Autoprefixer 10.4.14
- **Gerenciamento de Estado**: Context API do React
- **Formulários**: Formik e Yup para validação
- **Requisições HTTP**: Axios
- **Autenticação**: JWT armazenado em cookies

#### Backend
- **Framework**: Node.js com Express
- **Linguagem**: TypeScript
- **Banco de Dados**: PostgreSQL
- **ORM**: Sequelize
- **Autenticação**: JWT
- **Processamento de IA**: Integração com OpenAI API
- **Upload de Arquivos**: Multer com armazenamento MinIO

### Estrutura de Diretórios

```
/frontend
  /src
    /components      # Componentes React reutilizáveis
    /contexts        # Context API para gerenciamento de estado (AuthContext)
    /lib             # Utilitários, APIs e funções auxiliares
    /pages           # Páginas da aplicação organizadas por rotas
      /auth          # Páginas de autenticação
      /plans         # Páginas de planos
        /[id]        # Detalhes e subpáginas de um plano específico
    /styles          # Estilos globais com Tailwind

/backend
  /src
    /controllers     # Controladores para lógica de negócios
    /models          # Modelos do Sequelize para dados
    /routes          # Definição das rotas da API
    /middleware      # Middlewares para autenticação e validação
    /services        # Serviços para processamento com IA
    /config          # Configurações do sistema
    /scripts         # Scripts utilitários (criação de usuários, etc.)
    /types           # Definições de tipos TypeScript
    /utils           # Funções utilitárias
```

## Fluxo de Trabalho Principal

O sistema implementa um fluxo de trabalho sequencial para a criação de planos:

1. **Cadastro de Paciente**: Informações básicas do paciente
2. **Questionário**: Coleta detalhada de informações de saúde
3. **Resultados Laboratoriais**: Upload e processamento de exames
4. **Observações TCM**: Registro de observações de medicina tradicional chinesa
5. **Linha do Tempo**: Criação de timeline de eventos relevantes
6. **Matriz IFM**: Preenchimento da matriz do Instituto de Medicina Funcional
7. **Plano Final**: Geração e personalização do plano terapêutico com IA

Cada etapa salva dados parciais, permitindo que o profissional interrompa e retome o processo quando conveniente.

## Autenticação e Autorização

### Sistema de Login
- JWT para gerenciamento de sessões
- Tokens armazenados em cookies HttpOnly
- Middleware de autenticação no backend (`authMiddleware`)
- Hook personalizado no frontend (`useAuth`) para gerenciar o estado de autenticação

### Níveis de Acesso
- **Usuários**: Acesso às funcionalidades de criação de planos
- **Superadmin**: Acesso administrativo completo

## Detalhes das APIs

### Endpoints Principais

#### API de Usuários
- `POST /api/auth/login`: Autenticação de usuários
- `POST /api/auth/register`: Registro de novos usuários
- `GET /api/auth/me`: Informações do usuário autenticado

#### API de Planos
- `GET /api/plans`: Lista os planos do usuário
- `POST /api/plans`: Cria um novo plano
- `GET /api/plans/:id`: Obtém detalhes de um plano
- `PUT /api/plans/:id`: Atualiza dados básicos do plano
- `POST /api/plans/:id/questionnaire`: Atualiza o questionário
- `POST /api/plans/:id/lab`: Processa resultados laboratoriais
- `POST /api/plans/:id/tcm`: Atualiza observações TCM
- `POST /api/plans/:id/timeline`: Atualiza dados da linha do tempo
- `POST /api/plans/:id/ifm`: Atualiza a matriz IFM
- `POST /api/plans/:id/final`: Atualiza o plano final
- `GET /api/plans/:id/export`: Exporta o plano em PDF

## Processamento com IA

O sistema utiliza a API da OpenAI para processar dados e gerar:
- Análises de resultados laboratoriais
- Correlações entre sintomas e resultados
- Planos terapêuticos personalizados

A lógica de processamento está encapsulada em serviços dedicados no backend.

## Configuração de Ambiente

### Variáveis de Ambiente

#### Backend (.env)
```
PORT=3001
NODE_ENV=development
DATABASE_URL=postgres://user:password@localhost:5432/lyz
JWT_SECRET=your_jwt_secret
JWT_EXPIRATION=1d
OPENAI_API_KEY=your_openai_key
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=lyz
```

#### Frontend (.env)
```
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### Configuração do Tailwind CSS
O projeto utiliza versões específicas compatíveis com Next.js 15.2.4:
- tailwindcss@3.3.0
- postcss@8.4.23
- autoprefixer@10.4.14

O arquivo `postcss.config.js` segue a configuração padrão:
```js
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

O `tailwind.config.js` está configurado com cores personalizadas:
```js
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          // tons de roxo
          50: '#f3e5f5',
          // outros tons...
          900: '#4a148c',
        },
        secondary: {
          // tons de verde
          50: '#f1f8e9',
          // outros tons...
          900: '#33691e',
        },
      },
    },
  },
  plugins: [],
}
```

## Componentes Principais

### Frontend
- **Layout.tsx**: Template base para todas as páginas
- **AuthContext.tsx**: Gerencia estado de autenticação
- **api.ts**: Client para comunicação com o backend
- **PlanDetailsPage**: Visualização de dados do plano
- **QuestionnaireForm**: Formulário para coleta de informações de saúde

### Backend
- **planController.ts**: Controla operações relacionadas a planos
- **authController.ts**: Gerencia autenticação
- **planModel.ts**: Define estrutura de dados dos planos
- **middleware/auth.ts**: Middleware de autenticação

## Banco de Dados

### Principais Tabelas
- **users**: Armazena dados dos usuários
- **plans**: Armazena metadados dos planos
- **files**: Registra arquivos enviados (resultados laboratoriais, etc.)

## Upload e Processamento de Arquivos

O sistema utiliza Multer para upload de arquivos no backend, com um tipo personalizado em `types/express.d.ts` para integração com TypeScript.

## Recentes Atualizações e Próximos Passos

### Atualizações Recentes
- Implementação do controlador `updateFinalPlan` para permitir atualizações no plano final
- Ajustes na interface do usuário para melhorar a visibilidade dos textos em campos de entrada
- Correção de problemas de contraste em elementos visuais
- Implementação de suporte a modo escuro em componentes chave

### Próximos Passos Recomendados
1. **Testes Automatizados**: Implementar testes unitários e de integração
2. **Documentação de API**: Finalizar a documentação Swagger
3. **Melhorias de UX**: Adicionar feedback visual durante operações assíncronas
4. **Otimização de Performance**: Análise e otimização de consultas ao banco de dados
5. **Funcionalidade de Exportação**: Concluir a implementação da exportação de planos em diferentes formatos

## Problemas Conhecidos e Soluções

### Problemas Conhecidos
- Avisos de lint relacionados às diretivas do Tailwind CSS no VSCode
- Ocasionalmente o processamento de IA pode demorar mais que o esperado

### Soluções Implementadas
- Configuração do VSCode para ignorar avisos relacionados ao Tailwind
- Comentários nas diretivas Tailwind para suprimir avisos
- Melhorias no contraste e visibilidade de elementos da UI

## Considerações de Segurança
- Tokens JWT com expiração curta
- Validação de entrada em todos os endpoints da API
- Verificação de propriedade de recursos antes de permitir modificações
- Controle de acesso baseado em funções

## Desenvolvimento Local

### Configuração Inicial
1. Clone o repositório
2. Configure as variáveis de ambiente conforme descrito acima
3. Instale as dependências em ambos diretórios (frontend e backend)
4. Execute as migrações do banco de dados
5. Inicie os servidores de desenvolvimento

### Comandos Comuns
```bash
# Backend
cd backend
npm install
npm run dev

# Frontend
cd frontend
npm install
npm run dev
```

## Implantação
O projeto está configurado para implantação via Docker Compose, conforme detalhado no README principal.

## Contatos e Recursos
- Documentação adicional: `README.md` na raiz do projeto
- Repositório de código: [URL do repositório]

---

Documentação criada em 04/04/2025.
