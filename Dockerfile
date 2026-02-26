# Usamos Node.js para correr React
FROM node:18-alpine

WORKDIR /app

# Copiamos el package.json que acabas de crear
COPY package*.json ./

# Esto instalará REACT y sus dependencias
RUN npm install

# Copiamos el resto de los archivos
COPY . .

# Exponemos el puerto de React
EXPOSE 3000

# Iniciamos la aplicación
CMD ["npm", "start"]