import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { storageService, ensureUploadDirs } from '../src/services/storage.service';
import fs from 'fs';
import path from 'path';

describe('TDD - Servicio de Almacenamiento Local (VPS / Dokploy)', () => {
    const uploadsDir = storageService.getUploadsDir();
    const testFilePath = path.join(uploadsDir, 'gastos', 'test-comprobante.txt');

    beforeAll(() => {
        ensureUploadDirs();
    });

    afterAll(() => {
        if (fs.existsSync(testFilePath)) {
            fs.unlinkSync(testFilePath);
        }
    });

    it('debe inicializar y asegurar la existencia de los directorios de subida', () => {
        expect(fs.existsSync(uploadsDir)).toBe(true);
        expect(fs.existsSync(path.join(uploadsDir, 'gastos'))).toBe(true);
        expect(fs.existsSync(path.join(uploadsDir, 'mantenimientos'))).toBe(true);
        expect(fs.existsSync(path.join(uploadsDir, 'pagos'))).toBe(true);
    });

    it('debe estructurar correctamente la URL y el publicId relativo para comprobantes', () => {
        const mockFile = {
            filename: '174000-uuid-test.pdf',
            originalname: 'factura_diesel_001.pdf',
            mimetype: 'application/pdf',
            size: 102400,
        } as Express.Multer.File;

        const resultado = storageService.procesarArchivoSubido(mockFile, 'gastos');

        expect(resultado.url).toBe('/uploads/gastos/174000-uuid-test.pdf');
        expect(resultado.publicId).toBe('gastos/174000-uuid-test.pdf');
        expect(resultado.nombreOriginal).toBe('factura_diesel_001.pdf');
    });

    it('debe bloquear cualquier intento de Directory Traversal al eliminar archivos', async () => {
        const maliciousPath = '../../../../etc/passwd';
        const eliminado = await storageService.eliminarArchivo(maliciousPath);
        expect(eliminado).toBe(false);
    });

    it('debe eliminar exitosamente un archivo real almacenado en el disco', async () => {
        // Crear un archivo temporal
        fs.writeFileSync(testFilePath, 'CONTENIDO_COMPROBANTE_PRUEBA', 'utf8');
        expect(fs.existsSync(testFilePath)).toBe(true);

        const eliminado = await storageService.eliminarArchivo('gastos/test-comprobante.txt');
        expect(eliminado).toBe(true);
        expect(fs.existsSync(testFilePath)).toBe(false);
    });
});
