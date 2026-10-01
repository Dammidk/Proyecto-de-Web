# ==========================================
# Etapa 1: Builder
# ==========================================
FROM node:22-alpine AS builder

WORKDIR /app

# Copiar manifiestos e instalar dependencias
COPY package*.json ./
RUN npm ci

# Copiar código fuente
COPY . ./

# Argumento para la URL de la API (por defecto /api para usar el proxy interno de Nginx)
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

# Compilar la aplicación para producción
RUN npm run build

# ==========================================
# Etapa 2: Servidor Nginx de Producción
# ==========================================
FROM nginx:1.27-alpine AS runner

# Copiar configuración personalizada de Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar artefactos compilados desde la etapa de construcción
COPY --from=builder /app/dist /usr/share/nginx/html

# Puerto HTTP expuesto
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
