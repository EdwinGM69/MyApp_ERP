-- CreateTable
CREATE TABLE "Pais" (
    "id" SERIAL NOT NULL,
    "empresa_id" INTEGER NOT NULL,
    "descripcion" TEXT NOT NULL,
    "abreviatura" TEXT NOT NULL,
    "prefijo_telefonico" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" INTEGER,
    "updated_by" INTEGER,

    CONSTRAINT "Pais_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Pais_empresa_id_descripcion_key" ON "Pais"("empresa_id", "descripcion");

-- AddForeignKey
ALTER TABLE "Pais" ADD CONSTRAINT "Pais_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pais" ADD CONSTRAINT "Pais_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pais" ADD CONSTRAINT "Pais_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
