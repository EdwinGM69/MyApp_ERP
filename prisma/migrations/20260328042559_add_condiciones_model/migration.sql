-- CreateTable
CREATE TABLE "Condiciones" (
    "id" SERIAL NOT NULL,
    "empresa_id" INTEGER NOT NULL,
    "tipo_condicion_id" INTEGER NOT NULL,
    "material_id" INTEGER NOT NULL,
    "moneda_id" INTEGER NOT NULL,
    "porcentaje" BOOLEAN NOT NULL DEFAULT false,
    "valor" DECIMAL(18,4) NOT NULL,
    "fecha_desde" TIMESTAMP(3) NOT NULL,
    "fecha_hasta" TIMESTAMP(3),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" INTEGER,
    "updated_by" INTEGER,

    CONSTRAINT "Condiciones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Condiciones_empresa_id_material_id_idx" ON "Condiciones"("empresa_id", "material_id");

-- CreateIndex
CREATE INDEX "Condiciones_fecha_desde_fecha_hasta_idx" ON "Condiciones"("fecha_desde", "fecha_hasta");

-- AddForeignKey
ALTER TABLE "Condiciones" ADD CONSTRAINT "Condiciones_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Condiciones" ADD CONSTRAINT "Condiciones_tipo_condicion_id_fkey" FOREIGN KEY ("tipo_condicion_id") REFERENCES "TipoCondicion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Condiciones" ADD CONSTRAINT "Condiciones_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Condiciones" ADD CONSTRAINT "Condiciones_moneda_id_fkey" FOREIGN KEY ("moneda_id") REFERENCES "Moneda"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
