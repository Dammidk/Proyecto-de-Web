-- CreateEnum
CREATE TYPE "TipoLicencia" AS ENUM ('C', 'D', 'E', 'G');

-- CreateEnum
CREATE TYPE "EstadoMantenimiento" AS ENUM ('PROGRAMADO', 'EN_PROCESO', 'COMPLETADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "TipoPagoChofer" AS ENUM ('SUELDO_MENSUAL', 'POR_VIAJE', 'ANTICIPO', 'LIQUIDACION');

-- AlterTable
ALTER TABLE "vehiculos" ADD COLUMN     "fecha_vencimiento_revision_tecnica" TIMESTAMP(3),
ADD COLUMN     "rendimiento_esperado_km_gal" DECIMAL(6,2);

-- AlterTable
ALTER TABLE "choferes" ADD COLUMN     "fecha_vencimiento_licencia" TIMESTAMP(3),
ADD COLUMN     "licencia_tipo" "TipoLicencia";

-- AlterTable
ALTER TABLE "gastos_viaje" ADD COLUMN     "estacion_servicio" TEXT,
ADD COLUMN     "galones" DECIMAL(10,3),
ADD COLUMN     "kilometraje_al_cargar" INTEGER,
ADD COLUMN     "precio_por_galon" DECIMAL(10,3);

-- AlterTable
ALTER TABLE "mantenimientos" ADD COLUMN     "estado" "EstadoMantenimiento" NOT NULL DEFAULT 'COMPLETADO',
ADD COLUMN     "observaciones" TEXT;

-- AlterTable
ALTER TABLE "pagos_choferes" ADD COLUMN     "tipo_pago" "TipoPagoChofer" NOT NULL DEFAULT 'POR_VIAJE',
ADD COLUMN     "viaje_id" INTEGER;

-- CreateIndex
CREATE INDEX "viajes_estado_idx" ON "viajes"("estado");

-- CreateIndex
CREATE INDEX "viajes_fecha_salida_idx" ON "viajes"("fecha_salida");

-- CreateIndex
CREATE INDEX "viajes_vehiculo_id_idx" ON "viajes"("vehiculo_id");

-- CreateIndex
CREATE INDEX "viajes_chofer_id_idx" ON "viajes"("chofer_id");

-- CreateIndex
CREATE INDEX "viajes_cliente_id_idx" ON "viajes"("cliente_id");

-- CreateIndex
CREATE INDEX "gastos_viaje_viaje_id_idx" ON "gastos_viaje"("viaje_id");

-- CreateIndex
CREATE INDEX "gastos_viaje_fecha_idx" ON "gastos_viaje"("fecha");

-- CreateIndex
CREATE INDEX "mantenimientos_vehiculo_id_fecha_idx" ON "mantenimientos"("vehiculo_id", "fecha");

-- CreateIndex
CREATE INDEX "pagos_choferes_chofer_id_fecha_idx" ON "pagos_choferes"("chofer_id", "fecha");

-- CreateIndex
CREATE INDEX "pagos_choferes_viaje_id_idx" ON "pagos_choferes"("viaje_id");

-- AddForeignKey
ALTER TABLE "pagos_choferes" ADD CONSTRAINT "pagos_choferes_viaje_id_fkey" FOREIGN KEY ("viaje_id") REFERENCES "viajes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

