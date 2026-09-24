// Configuración de Multer para almacenamiento eficiente en Disco Local (VPS)
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
import { storageService } from '../services/storage.service';

// Almacenamiento en disco con streaming directo (cero saturación de memoria RAM)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const baseUploads = storageService.getUploadsDir();

        // Determinar subdirectorio por contexto de la URL
        let subfolder = 'gastos';
        const url = req.baseUrl || req.originalUrl || '';

        if (url.includes('mantenimiento')) {
            subfolder = 'mantenimientos';
        } else if (url.includes('pago')) {
            subfolder = 'pagos';
        }

        const targetDir = path.join(baseUploads, subfolder);
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }

        cb(null, targetDir);
    },
    filename: (req, file, cb) => {
        // Nombre único y seguro. La extensión se deriva del tipo MIME validado, nunca del nombre
        // original: así un "factura.html" declarado como imagen no se sirve luego como HTML (XSS).
        const timestamp = Date.now();
        const uuid = crypto.randomUUID();
        const ext = Object.hasOwn(EXTENSIONES_PERMITIDAS, file.mimetype) ? EXTENSIONES_PERMITIDAS[file.mimetype] : '.bin';
        cb(null, `${timestamp}-${uuid}${ext}`);
    },
});

// Tipos de archivo permitidos y la extensión con la que se guardan
const EXTENSIONES_PERMITIDAS: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'application/pdf': '.pdf',
};

// Filtro de validación para tipos de archivo permitidos
const fileFilter = (
    req: Express.Request,
    file: Express.Multer.File,
    cb: multer.FileFilterCallback
) => {
    if (Object.hasOwn(EXTENSIONES_PERMITIDAS, file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Tipo de archivo no permitido. Solo se aceptan imágenes (JPEG, PNG, GIF, WebP) o facturas en PDF.'));
    }
};

// Instancia configurada de Multer
export const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 15 * 1024 * 1024, // 15MB para soportar fotos de alta resolución o PDFs de múltiples páginas
    },
});

export default upload;
