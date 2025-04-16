# Guia de Migração de Domínio para o Sistema Lyz

Este documento detalha todas as configurações e arquivos que precisam ser modificados quando for necessário alterar os domínios do sistema Lyz.

## Configurações Atuais

Atualmente, o sistema utiliza os seguintes domínios:
- **Frontend**: `lyz.marcussviniciusa.cloud`
- **Backend/API**: `apilyz.marcussviniciusa.cloud`

## Arquivos que Precisam ser Modificados

### 1. Arquivo de Configuração do Stack (`lyz-stack.yml`)

#### Backend (lyz-backend):

```yaml
environment:
  - DOMAIN=apilyz.marcussviniciusa.cloud
  - FRONTEND_URL=https://lyz.marcussviniciusa.cloud
```

#### Traefik Labels para o Backend:

```yaml
labels:
  - "traefik.http.routers.lyz-api.rule=Host(`apilyz.marcussviniciusa.cloud`)"
  - "traefik.http.middlewares.cors-lyz.headers.accesscontrolalloworiginlist=*"
```

> **Nota**: Atualmente, o CORS está configurado para permitir qualquer origem (`*`). Para aumentar a segurança em produção, considere restringir para domínios específicos.

#### Traefik Labels para o Frontend:

```yaml
labels:
  - "traefik.http.routers.lyz-frontend.rule=Host(`lyz.marcussviniciusa.cloud`)"
```

### 2. Dockerfile do Frontend (`/frontend/Dockerfile`)

```dockerfile
# Variáveis públicas incorporadas durante o build
ARG NEXT_PUBLIC_API_URL=https://apilyz.marcussviniciusa.cloud/api
ARG NEXT_PUBLIC_SITE_NAME=Lyz-Healthcare
ARG NEXT_PUBLIC_APP_URL=https://lyz.marcussviniciusa.cloud
ARG NEXT_PUBLIC_APP_DOMAIN=lyz.marcussviniciusa.cloud
```

### 3. Configuração do Nginx no Dockerfile

Ainda no `/frontend/Dockerfile`, atualize a configuração de proxy para transcrição:

```dockerfile
# API proxy para transcrição
&& echo '    location /api/transcribe {' >> /etc/nginx/conf.d/default.conf \
&& echo '        proxy_pass https://apilyz.marcussviniciusa.cloud/api/transcribe;' >> /etc/nginx/conf.d/default.conf \
```

### 4. Arquivo de Ambiente do Frontend (`/frontend/.env`)

```
# Para desenvolvimento local
NEXT_PUBLIC_API_URL=http://localhost:3001/api

# Para produção
#NEXT_PUBLIC_API_URL=https://apilyz.marcussviniciusa.cloud/api
```

### 5. Componente AudioRecorder (`/frontend/src/components/AudioRecorder.tsx`)

```typescript
// Obter a URL base da API do backend
const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://apilyz.marcussviniciusa.cloud/api';
```

## Procedimento para Migração de Domínio

Siga estas etapas para migrar o sistema para novos domínios:

1. **Substituição Global de Domínios**:
   - Substitua todas as ocorrências de `apilyz.marcussviniciusa.cloud` pelo novo domínio da API
   - Substitua todas as ocorrências de `lyz.marcussviniciusa.cloud` pelo novo domínio do frontend

2. **Reconstrua a Imagem do Frontend**:
   ```bash
   cd /home/m/lyz_aiv2/frontend
   docker build -t [seu-username]/lyz-frontend:nginx .
   docker push [seu-username]/lyz-frontend:nginx
   ```

3. **Atualize o Stack.yml**:
   - Edite o arquivo `lyz-stack.yml` com os novos domínios
   - Se necessário, atualize também o nome da imagem Docker

4. **Reimplante o Stack**:
   ```bash
   docker stack deploy -c lyz-stack.yml lyz
   ```
   ou use o Portainer para reimplantar o stack.

5. **Configure o DNS**:
   - Atualize os registros DNS para que os novos domínios apontem para o servidor

6. **Atualize Certificados SSL**:
   - Certifique-se de que o Traefik esteja configurado para obter certificados SSL para os novos domínios

## Verificações Pós-Migração

Após a migração, verifique os seguintes elementos:

1. **Frontend**:
   - Login e autenticação funcionando
   - Navegação entre páginas
   - Formulários e uploads funcionando corretamente

2. **Backend**:
   - API acessível pelo novo domínio
   - Endpoints respondendo corretamente
   - Funcionalidade de transcrição operando sem erros

3. **Funcionalidades Específicas**:
   - Análise TCM (depende do prompt com `step_key='tcm_analysis'` no banco de dados)
   - Upload e processamento de áudio
   - Geração de planos e relatórios

## Observações Importantes

- **Backup**: Sempre faça um backup completo do sistema antes de iniciar uma migração
- **Banco de Dados**: Verifique se existem referências aos domínios antigos no banco de dados
- **Prompt TCM**: O prompt para análise de Medicina Tradicional Chinesa é essencial e deve existir no banco de dados
- **Estrutura de Dados para API**: A API espera dados em formatos específicos:
  - Observações TCM: `{ tcm_observations: data }`
  - Linha do tempo: `{ timeline_data: data }`
  - Matriz IFM: `{ ifm_matrix: data }`
  - Plano final: `{ final_plan: data }`

## Problemas Comuns

1. **Erro CORS**: Se após a migração ocorrerem erros de CORS, verifique a configuração CORS no arquivo `lyz-stack.yml`

2. **Erro 405 (Method Not Allowed)** na transcrição: Verifique se o proxy do Nginx para `/api/transcribe` está configurado corretamente no Dockerfile do frontend

3. **Certificados SSL inválidos**: Certifique-se de que o Traefik obteve novos certificados para os domínios

---

*Última atualização: 7 de abril de 2025*
