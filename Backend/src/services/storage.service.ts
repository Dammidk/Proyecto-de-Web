// Servicio de Almacenamiento Local de Archivos (VPS / Filesystem Persistente)
// Sustituto de alta eficiencia para almacenamiento de comprobantes y facturas
import fs from 'fs';
import path from 'path';

// Directorio base de subidas configurable (por defecto ./uploads en la raíz del backend o /app/uploads en Docker)
const UPLOADS_DIR = process.env.UPLOAD_DIR
    ? path.resolve(process.env.UPLOAD_DIR)
    : path.resolve(process.cwd(), 'uploads');

// Subdirectorios organizacionales para el ERP
const SUBFOLDERS = ['gastos', 'mantenimientos', 'pagos', 'general'] as const;
type Subfolder = (typeof SUBFOLDERS)[number];

/**
 * Asegura la existencia de las carpetas de subida al iniciar el servidor
 */
export const ensureUploadDirs = () => {
    try {
        if (!fs.existsSync(UPLOADS_DIR)) {
            fs.mkdirSync(UPLOADS_DIR, { recursive: true });
        }
        for (const subfolder of SUBFOLDERS) {
            const folderPath = path.join(UPLOADS_DIR, subfolder);
            if (!fs.existsSync(folderPath)) {
                fs.mkdirSync(folderPath, { recursive: true });
            }
        }
        console.log(`[STORAGE] Directorio de uploads listo en: ${UPLOADS_DIR}`);
    } catch (error) {
        console.error('[STORAGE] Error inicializando directorios de almacenamiento:', error);
    }
};

// Inicialización inmediata al importar
ensureUploadDirs();

export interface StorageUploadResult {
    url: string;        // Ruta pública relativa para el cliente (ej. /uploads/gastos/1740-abc.pdf)
    publicId: string;   // Identificador interno / ruta relativa en disco (ej. gastos/1740-abc.pdf)
    nombreOriginal: string;
    filename: string;
    mimetype?: string;
    tamanio?: number;
}

export const storageService = {
    /**
     * Obtiene la ruta física absoluta de uploads
     */
    getUploadsDir(): string {
        return UPLOADS_DIR;
    },

    /**
     * Procesa un archivo que ya fue transmitido a disco por Multer
     * @param file Archivo procesado por Multer diskStorage
     * @param subfolder Subdirectorio organizacional
     */
    procesarArchivoSubido(
        file: Express.Multer.File,
        subfolder: Subfolder = 'gastos'
    ): StorageUploadResult {
        // En diskStorage, file.filename ya es único y sanitizado
        const relativePath = `${subfolder}/${file.filename}`;
        const url = `/uploads/${relativePath}`;

        return {
            url,
            publicId: relativePath,
            nombreOriginal: file.originalname,
            filename: file.filename,
            mimetype: file.mimetype,
            tamanio: file.size,
        };
    },

    /**
     * Elimina un archivo del disco de forma segura previniendo Directory Traversal
     * @param publicIdOrPath Ruta relativa o URL del comprobante
     */
    async eliminarArchivo(publicIdOrPath: string): Promise<boolean> {
        try {
            if (!publicIdOrPath) return false;

            // Limpiar posibles prefijos como '/uploads/' o 'uploads/'
            const cleanedRelative = publicIdOrPath.replace(/^\/?uploads\//, '');

            // Resolver ruta absoluta canónica
            const resolvedPath = path.resolve(UPLOADS_DIR, cleanedRelative);

            // Verificación de seguridad anti Directory Traversal:
            // Asegurar que la ruta final esté estrictamente dentro de UPLOADS_DIR
            // (se compara contra UPLOADS_DIR + separador para que "/app/uploads-otro" no pase el filtro)
            if (!resolvedPath.startsWith(UPLOADS_DIR + path.sep)) {
                console.error(`[STORAGE] Intento de acceso inseguro / path traversal bloqueado: ${publicIdOrPath}`);
                return false;
            }

            if (fs.existsSync(resolvedPath)) {
                await fs.promises.unlink(resolvedPath);
                console.log(`[STORAGE] Archivo eliminado: ${cleanedRelative}`);
                return true;
            }

            return false;
        } catch (error: any) {
            console.error(`[STORAGE] Error al eliminar archivo (${publicIdOrPath}):`, error.message);
            return false;
        }
    },

    /**
     * Elimina un archivo recién subido por Multer (por ejemplo, cuando la petición falla la validación)
     */
    async eliminarArchivoSubido(file: Pick<Express.Multer.File, 'path'>): Promise<boolean> {
        if (!file?.path) return false;
        const relativo = path.relative(UPLOADS_DIR, path.resolve(file.path)).split(path.sep).join('/');
        return this.eliminarArchivo(relativo);
    },
};

export default storageService;
