// Configuración de Multer para manejo de archivos
import multer from 'multer';

// Almacenamiento en memoria para enviar directamente a Cloudinary
const storage = multer.memoryStorage();

// Filtro para validar tipos de archivo permitidos
const fileFilter = (
    req: Express.Request,
    file: Express.Multer.File,
    cb: multer.FileFilterCallback
) => {
    // Tipos de archivo permitidos
    const allowedMimes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'application/pdf',
    ];

    if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Tipo de archivo no permitido. Solo se permiten imágenes (JPEG, PNG, GIF, WebP) y PDF.'));
    }
};

// Configuración de Multer
export const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // Límite de 5MB
    },
});

export default upload;
