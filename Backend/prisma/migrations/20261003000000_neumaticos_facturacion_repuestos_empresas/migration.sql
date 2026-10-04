-- Crear enums si no existen
DO $$ BEGIN
    CREATE TYPE "EstadoNeumatico" AS ENUM ('NUEVO', 'EN_USO', 'EN_REPARACION', 'DESECHO');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE "EstadoFactura" AS ENUM ('PENDIENTE', 'PAGADA_PARCIAL', 'PAGADA', 'ANULADA');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE "PlanEmpresa" AS ENUM ('STARTER', 'PRO', 'ENTERPRISE');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE "CategoriaRepuesto" AS ENUM ('FILTROS', 'LUBRICANTES', 'FRENOS', 'SUSPENSION', 'NEUMATICOS', 'ELECTRICO', 'OTRO');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 1. Tabla empresas
CREATE TABLE IF NOT EXISTS "empresas" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "ruc" TEXT NOT NULL,
    "email" TEXT,
    "telefono" TEXT,
    "direccion" TEXT,
    "logo_url" TEXT,
    "plan" "PlanEmpresa" NOT NULL DEFAULT 'PRO',
    "limite_vehiculos" INTEGER NOT NULL DEFAULT 20,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "empresas_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "empresas_ruc_key" ON "empresas"("ruc");

-- Columnas empresa_id en usuarios, vehiculos, clientes
ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "empresa_id" INTEGER;
ALTER TABLE "vehiculos" ADD COLUMN IF NOT EXISTS "empresa_id" INTEGER;
ALTER TABLE "clientes" ADD COLUMN IF NOT EXISTS "empresa_id" INTEGER;

-- Foreign keys seguras
DO $$ BEGIN
    ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "vehiculos" ADD CONSTRAINT "vehiculos_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "clientes" ADD CONSTRAINT "clientes_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2. Tabla neumaticos
CREATE TABLE IF NOT EXISTS "neumaticos" (
    "id" SERIAL NOT NULL,
    "codigo_serie" TEXT NOT NULL,
    "marca" TEXT NOT NULL,
    "modelo" TEXT NOT NULL,
    "medida" TEXT NOT NULL,
    "estado" "EstadoNeumatico" NOT NULL DEFAULT 'EN_USO',
    "posicion_actual" TEXT,
    "profundidad_inicial_mm" DECIMAL(5,2) NOT NULL,
    "profundidad_actual_mm" DECIMAL(5,2) NOT NULL,
    "presion_recomendada_psi" INTEGER NOT NULL DEFAULT 110,
    "presion_actual_psi" INTEGER,
    "costo_compra" DECIMAL(10,2) NOT NULL,
    "kilometros_recorridos" INTEGER NOT NULL DEFAULT 0,
    "numero_reencauches" INTEGER NOT NULL DEFAULT 0,
    "fecha_instalacion" TIMESTAMP(3),
    "observaciones" TEXT,
    "vehiculo_id" INTEGER,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "neumaticos_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "neumaticos_codigo_serie_key" ON "neumaticos"("codigo_serie");
CREATE INDEX IF NOT EXISTS "neumaticos_vehiculo_id_idx" ON "neumaticos"("vehiculo_id");

DO $$ BEGIN
    ALTER TABLE "neumaticos" ADD CONSTRAINT "neumaticos_vehiculo_id_fkey" FOREIGN KEY ("vehiculo_id") REFERENCES "vehiculos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 3. Tabla inspecciones_neumaticos
CREATE TABLE IF NOT EXISTS "inspecciones_neumaticos" (
    "id" SERIAL NOT NULL,
    "neumatico_id" INTEGER NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "kilometraje_vehiculo" INTEGER,
    "profundidad_mm" DECIMAL(5,2) NOT NULL,
    "presion_psi" INTEGER NOT NULL,
    "desgaste_irregular" BOOLEAN NOT NULL DEFAULT false,
    "observaciones" TEXT,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "inspecciones_neumaticos_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "inspecciones_neumaticos_neumatico_id_fecha_idx" ON "inspecciones_neumaticos"("neumatico_id", "fecha");

DO $$ BEGIN
    ALTER TABLE "inspecciones_neumaticos" ADD CONSTRAINT "inspecciones_neumaticos_neumatico_id_fkey" FOREIGN KEY ("neumatico_id") REFERENCES "neumaticos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 4. Tabla facturas_clientes
CREATE TABLE IF NOT EXISTS "facturas_clientes" (
    "id" SERIAL NOT NULL,
    "numero_factura" TEXT NOT NULL,
    "cliente_id" INTEGER NOT NULL,
    "viaje_id" INTEGER,
    "fecha_emision" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_vencimiento" TIMESTAMP(3) NOT NULL,
    "dias_credito" INTEGER NOT NULL DEFAULT 30,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "iva" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(10,2) NOT NULL,
    "saldo_pendiente" DECIMAL(10,2) NOT NULL,
    "estado" "EstadoFactura" NOT NULL DEFAULT 'PENDIENTE',
    "observaciones" TEXT,
    "empresa_id" INTEGER,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "facturas_clientes_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "facturas_clientes_numero_factura_key" ON "facturas_clientes"("numero_factura");
CREATE INDEX IF NOT EXISTS "facturas_clientes_cliente_id_estado_idx" ON "facturas_clientes"("cliente_id", "estado");
CREATE INDEX IF NOT EXISTS "facturas_clientes_fecha_vencimiento_idx" ON "facturas_clientes"("fecha_vencimiento");

DO $$ BEGIN
    ALTER TABLE "facturas_clientes" ADD CONSTRAINT "facturas_clientes_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "facturas_clientes" ADD CONSTRAINT "facturas_clientes_viaje_id_fkey" FOREIGN KEY ("viaje_id") REFERENCES "viajes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "facturas_clientes" ADD CONSTRAINT "facturas_clientes_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 5. Tabla cobros_facturas
CREATE TABLE IF NOT EXISTS "cobros_facturas" (
    "id" SERIAL NOT NULL,
    "factura_id" INTEGER NOT NULL,
    "monto" DECIMAL(10,2) NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metodo_pago" "MetodoPago" NOT NULL DEFAULT 'TRANSFERENCIA',
    "referencia" TEXT,
    "url_comprobante" TEXT,
    "observaciones" TEXT,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "cobros_facturas_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "cobros_facturas_factura_id_fecha_idx" ON "cobros_facturas"("factura_id", "fecha");

DO $$ BEGIN
    ALTER TABLE "cobros_facturas" ADD CONSTRAINT "cobros_facturas_factura_id_fkey" FOREIGN KEY ("factura_id") REFERENCES "facturas_clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 6. Tabla repuestos
CREATE TABLE IF NOT EXISTS "repuestos" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "categoria" "CategoriaRepuesto" NOT NULL DEFAULT 'FILTROS',
    "unidad_medida" TEXT NOT NULL DEFAULT 'UNIDAD',
    "stock_actual" INTEGER NOT NULL DEFAULT 0,
    "stock_minimo" INTEGER NOT NULL DEFAULT 2,
    "costo_unitario" DECIMAL(10,2) NOT NULL,
    "ubicacion" TEXT,
    "empresa_id" INTEGER,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "repuestos_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "repuestos_codigo_key" ON "repuestos"("codigo");

DO $$ BEGIN
    ALTER TABLE "repuestos" ADD CONSTRAINT "repuestos_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
