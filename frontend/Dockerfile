# Estágio de construção
FROM node:18-alpine AS builder
WORKDIR /app

# Configurar variáveis de ambiente
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Variáveis públicas que serão incorporadas no build
ARG NEXT_PUBLIC_API_URL=https://apilyz.marcussviniciusa.cloud/api
ARG NEXT_PUBLIC_SITE_NAME=Lyz-Healthcare
ARG NEXT_PUBLIC_APP_URL=https://lyz.marcussviniciusa.cloud
ARG NEXT_PUBLIC_APP_DOMAIN=lyz.marcussviniciusa.cloud

# Usar as ARG como ENV para que sejam incorporadas no build
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_SITE_NAME=${NEXT_PUBLIC_SITE_NAME}
ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}
ENV NEXT_PUBLIC_APP_DOMAIN=${NEXT_PUBLIC_APP_DOMAIN}

# Copiar arquivos de package e dependências primeiro (melhor caching)
COPY package.json package-lock.json* ./
RUN npm ci

# Copiar o restante do código fonte
COPY . .

# Construir a aplicação
RUN npm run build

# Estágio final - Nginx
FROM nginx:alpine
WORKDIR /usr/share/nginx/html

# Remover os arquivos padrão do nginx
RUN rm -rf ./*

# Copiar os arquivos estáticos do build
COPY --from=builder /app/out .

# Configurar o nginx com proxy para o backend
# Primeiro, configurar um bloco server para redirecionar URLs com porta 3000
RUN echo 'server {' > /etc/nginx/conf.d/default.conf \
    && echo '    listen 3000;' >> /etc/nginx/conf.d/default.conf \
    && echo '    server_name lyz.marcussviniciusa.cloud:3000;' >> /etc/nginx/conf.d/default.conf \
    && echo '' >> /etc/nginx/conf.d/default.conf \
    && echo '    # Redirecionar todas as solicitações para a versão sem porta' >> /etc/nginx/conf.d/default.conf \
    && echo '    location / {' >> /etc/nginx/conf.d/default.conf \
    && echo '        return 301 https://lyz.marcussviniciusa.cloud$request_uri;' >> /etc/nginx/conf.d/default.conf \
    && echo '    }' >> /etc/nginx/conf.d/default.conf \
    && echo '}' >> /etc/nginx/conf.d/default.conf \
    && echo '' >> /etc/nginx/conf.d/default.conf \
    && echo '# Servidor principal' >> /etc/nginx/conf.d/default.conf \
    && echo 'server {' >> /etc/nginx/conf.d/default.conf \
    && echo '    listen 3000 default_server;' >> /etc/nginx/conf.d/default.conf \
    && echo '    server_name localhost;' >> /etc/nginx/conf.d/default.conf \
    && echo '    root /usr/share/nginx/html;' >> /etc/nginx/conf.d/default.conf \
    && echo '    index index.html;' >> /etc/nginx/conf.d/default.conf \
    && echo '' >> /etc/nginx/conf.d/default.conf \
    && echo '    # Proxy específico para a API de transcrição' >> /etc/nginx/conf.d/default.conf \
    && echo '    location = /api/transcribe {' >> /etc/nginx/conf.d/default.conf \
    && echo '        proxy_pass https://apilyz.marcussviniciusa.cloud/api/transcribe;' >> /etc/nginx/conf.d/default.conf \
    && echo '        proxy_http_version 1.1;' >> /etc/nginx/conf.d/default.conf \
    && echo '        proxy_set_header Host apilyz.marcussviniciusa.cloud;' >> /etc/nginx/conf.d/default.conf \
    && echo '        proxy_set_header X-Real-IP $remote_addr;' >> /etc/nginx/conf.d/default.conf \
    && echo '        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;' >> /etc/nginx/conf.d/default.conf \
    && echo '        proxy_set_header X-Forwarded-Proto $scheme;' >> /etc/nginx/conf.d/default.conf \
    && echo '        proxy_set_header Origin "https://apilyz.marcussviniciusa.cloud";' >> /etc/nginx/conf.d/default.conf \
    && echo '    }' >> /etc/nginx/conf.d/default.conf \
    && echo '' >> /etc/nginx/conf.d/default.conf \
    && echo '    # Todas as outras solicitações para a API' >> /etc/nginx/conf.d/default.conf \
    && echo '    location /api/ {' >> /etc/nginx/conf.d/default.conf \
    && echo '        proxy_pass https://apilyz.marcussviniciusa.cloud/api/;' >> /etc/nginx/conf.d/default.conf \
    && echo '        proxy_http_version 1.1;' >> /etc/nginx/conf.d/default.conf \
    && echo '        proxy_set_header Host apilyz.marcussviniciusa.cloud;' >> /etc/nginx/conf.d/default.conf \
    && echo '        proxy_set_header X-Real-IP $remote_addr;' >> /etc/nginx/conf.d/default.conf \
    && echo '        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;' >> /etc/nginx/conf.d/default.conf \
    && echo '        proxy_set_header X-Forwarded-Proto $scheme;' >> /etc/nginx/conf.d/default.conf \
    && echo '        proxy_set_header Origin "https://apilyz.marcussviniciusa.cloud";' >> /etc/nginx/conf.d/default.conf \
    && echo '    }' >> /etc/nginx/conf.d/default.conf \
    && echo '' >> /etc/nginx/conf.d/default.conf \
    && echo '    # Todas as outras solicitações normais' >> /etc/nginx/conf.d/default.conf \
    && echo '    location / {' >> /etc/nginx/conf.d/default.conf \
    && echo '        try_files $uri $uri.html $uri/ /index.html;' >> /etc/nginx/conf.d/default.conf \
    && echo '    }' >> /etc/nginx/conf.d/default.conf \
    && echo '}' >> /etc/nginx/conf.d/default.conf

# Verificar a configuração
RUN cat /etc/nginx/conf.d/default.conf

# Expor a porta que o nginx vai escutar
EXPOSE 3000

# Iniciar o nginx
CMD ["nginx", "-g", "daemon off;"]
