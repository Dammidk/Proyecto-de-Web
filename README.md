# FleetMaster · Sistema de Control de Transporte de Carga Pesada

Mini-ERP web para empresas de transporte pesado: flota, choferes, clientes, viajes, gastos con comprobantes, mantenimientos, pagos, rentabilidad y auditoría.

- **Backend:** Node.js 22, Express, TypeScript, Prisma 5, PostgreSQL 17, Zod, JWT
- **Frontend:** React 19, Vite 7, Tailwind CSS 4, Recharts
- **Infraestructura:** Docker Compose (PostgreSQL + API + Nginx)

## Funcionalidades

| Módulo | Qué hace |
| --- | --- |
| Viajes | Máquina de estados `PLANIFICADO → EN_CURSO → COMPLETADO / CANCELADO`. Al iniciar, el vehículo pasa a `EN_RUTA`; al completar, vuelve a `ACTIVO` y su odómetro suma los km reales. |
| Asignación segura | No se puede asignar un vehículo en taller, inactivo o con SOAT, seguro, matrícula o RTV vencidos a la fecha de salida, ni un chofer inactivo o con la licencia vencida. Una carga peligrosa exige licencia tipo E. |
| Gastos y combustible | Gastos con foto o PDF de la factura. Los de combustible registran galones, precio por galón, estación y odómetro. |
| Rentabilidad | Por viaje: ganancia, margen, costo por km (CPK) y rendimiento (km/gal). |
| Liquidación de viaje | Anticipos entregados al chofer frente a gastos pagados en efectivo. Calcula quién le debe a quién y se imprime con espacio para firmas. |
| Mantenimientos | Actualiza odómetro y estado del vehículo y emite alertas por fecha o kilometraje. |
| Pagos a choferes | Sueldo, por viaje, anticipo o liquidación, con comprobante adjunto. |
| Analítica | Ingresos frente a costos de 12 meses, distribución del costo, CPK, consumo de combustible (alerta si un vehículo rinde menos del 80 % de lo esperado), utilización de flota y rentabilidad por vehículo, cliente, ruta y chofer. |
| Documentos | Semáforo de vencimientos a 30, 15 y 5 días para vehículos y licencias. |
| Exportación | CSV listos para Excel: viajes, gastos, mantenimientos y pagos. |
| Seguridad | Roles ADMIN y AUDITOR, JWT, bcrypt, límite de intentos de login, cabeceras de seguridad (helmet), validación con Zod, archivos restringidos a imagen o PDF y auditoría con el antes y el después de cada cambio. |

## Desarrollo local

Requisitos: Node.js 22+ y PostgreSQL 17.

```bash
# Backend
cd Backend
npm install
cp ../.env.example .env        # ajuste DATABASE_URL y JWT_SECRET
npx prisma migrate deploy      # crea las tablas
npm run seed:demo              # usuarios + 6 meses de datos de ejemplo (o "npm run seed" solo usuarios)
npm run dev                    # http://localhost:3001

# Frontend (otra terminal)
cd Frontend
npm install
npm run dev                    # http://localhost:5173 (proxy de /api y /uploads al backend)
```

Usuarios del seed: `admin / admin123` (administrador) y `auditor / auditor123` (solo lectura). **Cámbielos antes de usar el sistema en producción.**

## Pruebas

```bash
cd Backend
npm test        # 61 pruebas: reglas de negocio, finanzas, cumplimiento, CSV e integración de la API
```

## Producción con Docker

```bash
cp .env.example .env    # defina POSTGRES_PASSWORD y JWT_SECRET (mínimo 32 caracteres)
docker compose up -d --build
docker compose exec backend npm run seed:prod   # solo la primera vez
```

El backend ejecuta `prisma migrate deploy` al arrancar y no inicia en producción si `JWT_SECRET` falta o es débil.

### Migrar una instalación existente

Las versiones anteriores creaban las tablas con `prisma db push`, sin historial de migraciones. En una base de datos que ya tiene datos, marque una sola vez como aplicadas las migraciones que ya existen y luego aplique la nueva:

```bash
docker compose exec backend prisma migrate resolve --applied 20251206184023_primera_entrega
docker compose exec backend prisma migrate resolve --applied 20251206193614_add_observaciones
docker compose exec backend prisma migrate resolve --applied 20251227091421_add_comprobantes
docker compose exec backend prisma migrate deploy
```

Si esa base ya tenía las tablas de mantenimientos y pagos creadas con `db push`, marque también `20261002120000_mantenimientos_pagos_combustible_cumplimiento` como aplicada y ejecute `prisma db push` una última vez para añadir las columnas nuevas.

## API

Todas las rutas están bajo `/api` y requieren `Authorization: Bearer <token>`, salvo `POST /auth/login` y `GET /health`.

| Ruta | Descripción |
| --- | --- |
| `GET /viajes/:id` | Detalle con resumen económico (CPK, rendimiento, diagnóstico de combustible) |
| `PATCH /viajes/:id/estado` | Cambio de estado (sincroniza el vehículo) |
| `GET /viajes/:id/liquidacion` | Hoja de liquidación |
| `GET /analitica?desde&hasta` | Indicadores de gestión del período (por defecto, 12 meses) |
| `GET /cumplimiento` | Semáforo documental de vehículos y choferes |
| `GET /exportar/:tipo?desde&hasta` | CSV de `viajes`, `gastos`, `mantenimientos` o `pagos` |

Los errores siempre responden con JSON `{ error, mensaje, detalles? }` y el código adecuado: 400 datos inválidos, 401 sin sesión, 403 sin permiso, 404 no existe, 409 conflicto, 413 archivo grande, 415 tipo de archivo, 422 regla de negocio.

## Modulos de la fase empresarial

| Modulo | Ruta | Descripcion |
|---|---|---|
| Neumaticos | /neumaticos | Control por posicion con vista 3D, inspecciones, reencauche, costo por km |
| Cuentas por cobrar | /cuentas-cobrar | Facturacion desde viajes, cobros parciales, antiguedad de cartera |
| Repuestos | /repuestos | Inventario con kardex, costo promedio ponderado, alertas de reposicion |
| Empresa | /empresa | Perfil de la organizacion, plan y cupo de vehiculos |

Reglas de negocio: se bloquean nuevos viajes a clientes con facturas vencidas por mas de 60 dias; al completar un viaje se acreditan kilometros a los neumaticos montados; el rol AUDITOR es de solo lectura; toda operacion de escritura queda en la bitacora de auditoria.

Limitacion conocida: el sistema opera como una sola organizacion; las columnas empresaId existen pero los datos no se aislan por inquilino.
