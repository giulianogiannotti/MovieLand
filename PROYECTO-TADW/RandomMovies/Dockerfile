# Imagen base
FROM node:18

# Directorio de trabajo
WORKDIR /app

# Copiar archivos necesarios
COPY package.json package-lock.json ./
COPY server.js ./

# Instalar dependencias
RUN npm install

# Puerto expuesto
EXPOSE 4000

# Comando para iniciar el servidor
CMD ["node", "server.js"]