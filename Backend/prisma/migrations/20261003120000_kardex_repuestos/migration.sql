-- Kardex de repuestos: historial de entradas, salidas y ajustes con saldo resultante

DO $$ BEGIN
    CREATE TYPE "TipoMovimientoRepuesto" AS ENUM ('ENTRADA', 'SALIDA', 'AJUSTE');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS "movimientos_repuestos" (
    "id" SERIAL NOT NULL,
    "repuesto_id" INTEGER NOT NULL,
    "tipo" "TipoMovimientoRepuesto" NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "costo_unitario" DECIMAL(10,2) NOT NULL,
    "stock_resultante" INTEGER NOT NULL,
    "motivo" TEXT,
    "referencia" TEXT,
    "vehiculo_id" INTEGER,
    "usuario_id" INTEGER NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "movimientos_repuestos_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "movimientos_repuestos_repuesto_id_fecha_idx" ON "movimientos_repuestos"("repuesto_id", "fecha");

DO $$ BEGIN
    ALTER TABLE "movimientos_repuestos" ADD CONSTRAINT "movimientos_repuestos_repuesto_id_fkey" FOREIGN KEY ("repuesto_id") REFERENCES "repuestos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "movimientos_repuestos" ADD CONSTRAINT "movimientos_repuestos_vehiculo_id_fkey" FOREIGN KEY ("vehiculo_id") REFERENCES "vehiculos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "movimientos_repuestos" ADD CONSTRAINT "movimientos_repuestos_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
