import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/index';

describe('TDD - Integración de API y Seguridad RBAC', () => {
  const secret = process.env.JWT_SECRET || 'secreto_seguro_transporte_jwt_2025';

  it('GET /api/health debe responder con estado 200 y mensaje ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.estado).toBe('ok');
    expect(res.body.mensaje).toBe('Servidor funcionando correctamente');
  });

  it('Debe rechazar solicitudes a rutas protegidas sin encabezado de autorización', async () => {
    const res = await request(app).get('/api/vehiculos');
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/Token|autenticado|No se proporcionó token/i);
  });

  it('Debe rechazar con 403 Forbidden a usuarios con rol AUDITOR que intenten mutar datos (POST /api/mantenimientos)', async () => {
    const auditorToken = jwt.sign(
      { id: 2, rol: 'AUDITOR' },
      secret,
      { expiresIn: '1h' }
    );

    const res = await request(app)
      .post('/api/mantenimientos')
      .set('Authorization', `Bearer ${auditorToken}`)
      .send({
        vehiculoId: 1,
        tipo: 'PREVENTIVO',
        descripcion: 'Intento de creación por auditor',
        taller: 'Taller',
        costoTotal: 100,
        fecha: new Date(),
      });

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/administrador|Acceso denegado/i);
  });

  const adminToken = () => jwt.sign({ id: 1, nombreUsuario: 'admin', rol: 'ADMIN' }, secret, { expiresIn: '1h' });

  it('Debe responder 400 con un mensaje claro si el id de la ruta no es numérico', async () => {
    const res = await request(app)
      .get('/api/viajes/abc')
      .set('Authorization', `Bearer ${adminToken()}`);

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/id debe ser un número/);
  });

  it('Debe rechazar con 415 archivos que no sean imagen o PDF (antes de tocar la base de datos)', async () => {
    const res = await request(app)
      .post('/api/viajes/1/gastos')
      .set('Authorization', `Bearer ${adminToken()}`)
      .attach('comprobante', Buffer.from('<script>alert(1)</script>'), { filename: 'factura.html', contentType: 'text/html' });

    expect(res.status).toBe(415);
    expect(res.body.error).toMatch(/Tipo de archivo no permitido/);
  });

  it('Debe responder 400 si el JSON enviado está mal formado', async () => {
    const res = await request(app)
      .post('/api/viajes')
      .set('Authorization', `Bearer ${adminToken()}`)
      .set('Content-Type', 'application/json')
      .send('{"tarifa": ');

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/JSON/);
  });

  it('Debe validar los datos de un viaje antes de llegar al servicio', async () => {
    const res = await request(app)
      .post('/api/viajes')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ vehiculoId: 1, choferId: 1, clienteId: 1, materialId: 1, origen: 'Quito', destino: 'Guayaquil', fechaSalida: '2026-10-10', tarifa: -5 });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/tarifa/);
  });

  it('Debe incluir cabeceras de seguridad HTTP (helmet)', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('Debe responder 404 en JSON para rutas inexistentes', async () => {
    const res = await request(app).get('/api/no-existe');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Ruta no encontrada');
  });
});
