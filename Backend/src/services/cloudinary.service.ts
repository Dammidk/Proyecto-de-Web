// Servicio de Cloudinary para subida de archivos
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

// Configuración de Cloudinary usando variables de entorno
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Interfaz para el resultado de subida
export interface CloudinaryUploadResult {
    url: string;
    publicId: string;
}

/**
 * Sube un archivo a Cloudinary desde un buffer
 * @param buffer - Buffer del archivo
 * @param folder - Carpeta destino en Cloudinary (ej: 'comprobantes')
 * @param originalFilename - Nombre original del archivo
 * @returns Promesa con URL y publicId
 */
export const uploadToCloudinary = async (
    buffer: Buffer,
    folder: string = 'comprobantes',
    originalFilename?: string
): Promise<CloudinaryUploadResult> => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder,
                resource_type: 'auto',
            },
            (error, result: UploadApiResponse | undefined) => {
                if (error) {
                    reject(new Error(`Error al subir archivo a Cloudinary: ${error.message}`));
                } else if (result) {
                    resolve({
                        url: result.secure_url,
                        publicId: result.public_id,
                    });
                } else {
                    reject(new Error('Respuesta vacía de Cloudinary'));
                }
            }
        );

        uploadStream.end(buffer);
    });
};

/**
 * Elimina un archivo de Cloudinary por su publicId
 * @param publicId - ID público del recurso en Cloudinary
 */
export const deleteFromCloudinary = async (publicId: string): Promise<void> => {
    try {
        await cloudinary.uploader.destroy(publicId);
    } catch (error: any) {
        throw new Error(`Error al eliminar archivo de Cloudinary: ${error.message}`);
    }
};

export default cloudinary;
