# ==========================================
# Etapa 1: Builder
# ==========================================
FROM node:22-alpine AS builder

WORKDIR /app

# Instalar dependencias del sistema para Prisma en Alpine
RUN apk add --no-cache openssl libc6-compat

# Copiar manifiestos de dependencias
COPY package*.json ./
COPY prisma ./prisma/

# Instalar dependencias completas y generar cliente Prisma
RUN npm ci
RUN npx prisma generate

# Copiar código fuente y compilar TypeScript
COPY tsconfig.json ./
COPY src ./src/
RUN npm run build

# ==========================================
# Etapa 2: Runner de Producción
# ==========================================
FROM node:22-alpine AS runner

WORKDIR /app

# Instalar dependencias del sistema para Prisma en Alpine
RUN apk add --no-cache openssl libc6-compat

ENV NODE_ENV=production
ENV PORT=3001
ENV UPLOAD_DIR=/app/uploads

# Crear directorio para persistencia de archivos subidos
RUN mkdir -p /app/uploads

# Copiar manifiestos
COPY package*.json ./

# Instalar dependencias de producción y prisma CLI para migraciones
RUN npm ci --omit=dev && npm install -g prisma@5.22.0

# Copiar binarios y esquemas de Prisma generados
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client

# Copiar código compilado (incluye dist/prisma/seed.js para "npm run seed:prod")
COPY --from=builder /app/dist ./dist

# Puerto expuesto
EXPOSE 3001

# Script de arranque: aplica las migraciones versionadas pendientes y levanta el servidor.
# "migrate deploy" solo ejecuta migraciones ya revisadas: nunca borra columnas por diferencias de esquema.
CMD ["sh", "-c", "prisma migrate deploy && node dist/src/index.js"]
