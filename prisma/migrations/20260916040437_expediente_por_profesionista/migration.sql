/*
  Warnings:

  - A unique constraint covering the columns `[profesionistaId,numeroExpediente]` on the table `Paciente` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX `Paciente_numeroExpediente_key` ON `Paciente`;

-- AlterTable
ALTER TABLE `Profesionista` ADD COLUMN `ultimoExpediente` INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX `Paciente_profesionistaId_numeroExpediente_key` ON `Paciente`(`profesionistaId`, `numeroExpediente`);

-- Inicializa el contador de cada profesionista con el número más alto
-- de expediente que ya tiene, para que los nuevos no choquen
UPDATE `Profesionista` p
SET `ultimoExpediente` = (
  SELECT COALESCE(MAX(CAST(SUBSTRING(`numeroExpediente`, 5) AS UNSIGNED)), 0)
  FROM `Paciente`
  WHERE `profesionistaId` = p.`id`
);