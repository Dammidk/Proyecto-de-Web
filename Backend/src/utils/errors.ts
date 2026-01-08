// Errores de dominio con código HTTP asociado
// Los servicios lanzan estos errores y el manejador central los traduce a la respuesta HTTP

export class AppError extends Error {
    constructor(
        message: string,
        public readonly statusCode: number = 400,
        public readonly detalles?: unknown
    ) {
        super(message);
        this.name = this.constructor.name;
    }
}

// 400 - Datos de entrada inválidos
export class ValidationError extends AppError {
    constructor(message: string, detalles?: unknown) {
        super(message, 400, detalles);
    }
}

// 404 - El recurso no existe
export class NotFoundError extends AppError {
    constructor(message = 'Recurso no encontrado') {
        super(message, 404);
    }
}

// 409 - Conflicto con el estado actual (duplicados, transiciones inválidas)
export class ConflictError extends AppError {
    constructor(message: string) {
        super(message, 409);
    }
}

// 422 - Regla de negocio violada (documentos vencidos, licencia no apta...)
export class BusinessRuleError extends AppError {
    constructor(message: string, detalles?: unknown) {
        super(message, 422, detalles);
    }
}
