-- CreateTable
CREATE TABLE `Alimento` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(80) NOT NULL,
    `categoria` ENUM('FRUTA', 'VERDURA', 'CEREAL_TUBERCULO', 'LEGUMINOSA', 'ORIGEN_ANIMAL', 'LACTEO', 'GRASA_OLEAGINOSA') NOT NULL,
    `edadMinimaMeses` INTEGER NOT NULL,
    `esAlergenoComun` BOOLEAN NOT NULL DEFAULT false,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Alimento_nombre_key`(`nombre`),
    INDEX `Alimento_edadMinimaMeses_idx`(`edadMinimaMeses`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RegistroAlimento` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `fecha` DATE NOT NULL,
    `aceptacion` ENUM('ACEPTADO', 'PARCIAL', 'RECHAZADO') NOT NULL,
    `tuvoReaccion` BOOLEAN NOT NULL DEFAULT false,
    `descripcionReaccion` VARCHAR(300) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `pacienteId` INTEGER NOT NULL,
    `alimentoId` INTEGER NOT NULL,

    INDEX `RegistroAlimento_pacienteId_alimentoId_idx`(`pacienteId`, `alimentoId`),
    INDEX `RegistroAlimento_pacienteId_fecha_idx`(`pacienteId`, `fecha`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `RegistroAlimento` ADD CONSTRAINT `RegistroAlimento_pacienteId_fkey` FOREIGN KEY (`pacienteId`) REFERENCES `Paciente`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RegistroAlimento` ADD CONSTRAINT `RegistroAlimento_alimentoId_fkey` FOREIGN KEY (`alimentoId`) REFERENCES `Alimento`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
