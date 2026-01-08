// Configuración centralizada y validada de variables de entorno
// Si falta algo crítico en producción, el servidor no arranca (fail fast)

import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const SECRETO_DESARROLLO = 'secreto_solo_para_desarrollo_local';

const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().int().positive().default(3001),
    DATABASE_URL: z.string().optional(),
    JWT_SECRET: z.string().optional(),
    JWT_EXPIRES_IN: z.string().default('24h'),
    // Orígenes permitidos para CORS separados por coma. Vacío = cualquiera (solo desarrollo)
    CORS_ORIGINS: z.string().optional(),
    UPLOAD_DIR: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
    console.error('Variables de entorno inválidas:', parsed.error.flatten().fieldErrors);
    process.exit(1);
}

const raw = parsed.data;
const esProduccion = raw.NODE_ENV === 'production';

if (esProduccion && (!raw.JWT_SECRET || raw.JWT_SECRET.length < 32)) {
    console.error('JWT_SECRET es obligatorio en producción y debe tener al menos 32 caracteres.');
    process.exit(1);
}

if (!raw.JWT_SECRET && raw.NODE_ENV === 'development') {
    console.warn(' JWT_SECRET no definido: se usa un secreto de desarrollo. Nunca use esto en producción.');
}

export const env = {
    nodeEnv: raw.NODE_ENV,
    esProduccion,
    esTest: raw.NODE_ENV === 'test',
    port: raw.PORT,
    // Un único secreto para firmar y verificar tokens
    jwtSecret: raw.JWT_SECRET || SECRETO_DESARROLLO,
    jwtExpiresIn: raw.JWT_EXPIRES_IN,
    corsOrigins: raw.CORS_ORIGINS
        ? raw.CORS_ORIGINS.split(',').map(o => o.trim()).filter(Boolean)
        : [],
};

export default env;
