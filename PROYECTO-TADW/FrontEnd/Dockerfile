# Imagen base
FROM node:16

# Crear el directorio de la aplicación
WORKDIR /usr/src/app

# Copiar el archivo index y otros recursos
COPY . .

# Instalar un servidor HTTP simple para servir el frontend
RUN npm install -g http-server

# Exponer el puerto 3001
EXPOSE 3001

# Comando para correr el servidor HTTP
CMD ["http-server", "-p", "3001"]