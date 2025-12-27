/*
  Warnings:

  - You are about to drop the column `url_comprobante` on the `gastos_viaje` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "TipoComprobante" AS ENUM ('GASTO_VIAJE', 'MANTENIMIENTO', 'PAGO_CHOFER');

-- AlterEnum
ALTER TYPE "MetodoPago" ADD VALUE 'TARJETA';

-- AlterTable
ALTER TABLE "gastos_viaje" DROP COLUMN "url_comprobante",
ADD COLUMN     "comprobante_id" INTEGER;

-- CreateTable
CREATE TABLE "comprobantes" (
    "id" SERIAL NOT NULL,
    "tipo" "TipoComprobante" NOT NULL,
    "referencia_id" INTEGER,
    "url" TEXT NOT NULL,
    "public_id" TEXT NOT NULL,
    "nombre_archivo_original" TEXT NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comprobantes_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "gastos_viaje" ADD CONSTRAINT "gastos_viaje_comprobante_id_fkey" FOREIGN KEY ("comprobante_id") REFERENCES "comprobantes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
