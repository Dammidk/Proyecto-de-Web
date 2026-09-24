// Utilidades para enviar comprobantes (foto de factura o PDF) junto con un formulario

export const TIPOS_COMPROBANTE = 'image/jpeg,image/png,image/gif,image/webp,application/pdf';

// Arma el cuerpo de la petición: multipart si hay archivo, JSON si no
export const conArchivo = (datos: Record<string, unknown>, archivo: File | null): Record<string, unknown> | FormData => {
    if (!archivo) return datos;
    const formData = new FormData();
    Object.entries(datos).forEach(([clave, valor]) => {
        if (valor !== undefined && valor !== null) formData.append(clave, String(valor));
    });
    formData.append('comprobante', archivo);
    return formData;
};
