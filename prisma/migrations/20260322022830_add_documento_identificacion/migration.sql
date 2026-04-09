-- CreateTable
CREATE TABLE "DocumentoIdentificacion" (
    "id" SERIAL NOT NULL,
    "empresa_id" INTEGER NOT NULL,
    "descripcion" TEXT NOT NULL,
    "abreviatura" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" INTEGER,
    "updated_by" INTEGER,

    CONSTRAINT "DocumentoIdentificacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DocumentoIdentificacion_empresa_id_descripcion_key" ON "DocumentoIdentificacion"("empresa_id", "descripcion");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentoIdentificacion_empresa_id_abreviatura_key" ON "DocumentoIdentificacion"("empresa_id", "abreviatura");

-- AddForeignKey
ALTER TABLE "DocumentoIdentificacion" ADD CONSTRAINT "DocumentoIdentificacion_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentoIdentificacion" ADD CONSTRAINT "DocumentoIdentificacion_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentoIdentificacion" ADD CONSTRAINT "DocumentoIdentificacion_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
