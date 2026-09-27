/*
  Warnings:

  - The values [EN_CURSO] on the enum `Cita_estado` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterTable
ALTER TABLE `Cita` MODIFY `estado` ENUM('PENDIENTE', 'COMPLETADA', 'NO_ASISTIO', 'CANCELADA') NOT NULL DEFAULT 'PENDIENTE';
