FROM node:18-alpine

# Diretório de trabalho
WORKDIR /app

# Copiar package.json e package-lock.json primeiro (para aproveitar o cache do Docker)
COPY package*.json ./

# Instalar todas as dependências, incluindo as de desenvolvimento (para ter o ts-node)
RUN npm install

# Copiar o código fonte
COPY ./src ./src
COPY ./tsconfig.json ./

# Verificar estrutura
RUN ls -la
RUN ls -la src

# Expor porta
EXPOSE 3001

# Usar ts-node para executar diretamente o arquivo TypeScript
CMD ["npx", "ts-node", "src/server.ts"]
