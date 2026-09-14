-- CreateTable
CREATE TABLE `Profesionista` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(100) NOT NULL,
    `email` VARCHAR(100) NOT NULL,
    `passwordHash` VARCHAR(255) NOT NULL,
    `cedulaProfesional` VARCHAR(20) NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Profesionista_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Tutor` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(100) NOT NULL,
    `parentesco` ENUM('MADRE', 'PADRE', 'ABUELO', 'TUTOR_LEGAL', 'OTRO') NOT NULL,
    `telefono` VARCHAR(15) NOT NULL,
    `email` VARCHAR(100) NOT NULL,
    `passwordHash` VARCHAR(255) NULL,
    `tieneAcceso` BOOLEAN NOT NULL DEFAULT true,
    `cuentaConfirmada` BOOLEAN NOT NULL DEFAULT false,
    `debeCambiarPassword` BOOLEAN NOT NULL DEFAULT true,
    `tokenConfirmacion` VARCHAR(255) NULL,
    `tokenExpira` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Tutor_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Paciente` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `numeroExpediente` VARCHAR(20) NOT NULL,
    `nombre` VARCHAR(100) NOT NULL,
    `sexo` ENUM('M', 'F') NOT NULL,
    `fechaNacimiento` DATE NOT NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `semanasGestacion` INTEGER NULL,
    `tipoParto` ENUM('VAGINAL', 'CESAREA') NULL,
    `pesoNacerKg` DECIMAL(5, 3) NULL,
    `tallaNacerCm` DECIMAL(4, 1) NULL,
    `perimetroCefalicoNacerCm` DECIMAL(4, 1) NULL,
    `tipoAlimentacion` VARCHAR(60) NULL,
    `inicioComplementaria` VARCHAR(60) NULL,
    `observaciones` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `profesionistaId` INTEGER NOT NULL,
    `tutorId` INTEGER NOT NULL,

    UNIQUE INDEX `Paciente_numeroExpediente_key`(`numeroExpediente`),
    INDEX `Paciente_profesionistaId_idx`(`profesionistaId`),
    INDEX `Paciente_tutorId_idx`(`tutorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AlertaMedica` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `descripcion` VARCHAR(60) NOT NULL,
    `tipo` ENUM('ALERGIA', 'CONDICION_CRONICA') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `pacienteId` INTEGER NOT NULL,

    INDEX `AlertaMedica_pacienteId_idx`(`pacienteId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AntecedenteFamiliar` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `condicion` VARCHAR(60) NOT NULL,
    `detalle` VARCHAR(300) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `pacienteId` INTEGER NOT NULL,

    INDEX `AntecedenteFamiliar_pacienteId_idx`(`pacienteId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Medicion` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `fechaConsulta` DATE NOT NULL,
    `pesoKg` DECIMAL(6, 3) NOT NULL,
    `tallaCm` DECIMAL(5, 1) NOT NULL,
    `perimetroCefalicoCm` DECIMAL(4, 1) NULL,
    `perimetroBraquialCm` DECIMAL(4, 1) NULL,
    `cinturaCm` DECIMAL(5, 1) NULL,
    `abdomenCm` DECIMAL(5, 1) NULL,
    `caderaCm` DECIMAL(5, 1) NULL,
    `pantorrillaCm` DECIMAL(4, 1) NULL,
    `tricipitalMm` DECIMAL(4, 1) NULL,
    `notas` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `pacienteId` INTEGER NOT NULL,

    INDEX `Medicion_pacienteId_idx`(`pacienteId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Cita` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `fechaHora` DATETIME(3) NOT NULL,
    `estado` ENUM('PENDIENTE', 'EN_CURSO', 'COMPLETADA', 'CANCELADA') NOT NULL DEFAULT 'PENDIENTE',
    `notas` VARCHAR(300) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `pacienteId` INTEGER NOT NULL,
    `profesionistaId` INTEGER NOT NULL,

    INDEX `Cita_pacienteId_idx`(`pacienteId`),
    INDEX `Cita_profesionistaId_idx`(`profesionistaId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Paciente` ADD CONSTRAINT `Paciente_profesionistaId_fkey` FOREIGN KEY (`profesionistaId`) REFERENCES `Profesionista`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Paciente` ADD CONSTRAINT `Paciente_tutorId_fkey` FOREIGN KEY (`tutorId`) REFERENCES `Tutor`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AlertaMedica` ADD CONSTRAINT `AlertaMedica_pacienteId_fkey` FOREIGN KEY (`pacienteId`) REFERENCES `Paciente`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AntecedenteFamiliar` ADD CONSTRAINT `AntecedenteFamiliar_pacienteId_fkey` FOREIGN KEY (`pacienteId`) REFERENCES `Paciente`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Medicion` ADD CONSTRAINT `Medicion_pacienteId_fkey` FOREIGN KEY (`pacienteId`) REFERENCES `Paciente`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Cita` ADD CONSTRAINT `Cita_pacienteId_fkey` FOREIGN KEY (`pacienteId`) REFERENCES `Paciente`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Cita` ADD CONSTRAINT `Cita_profesionistaId_fkey` FOREIGN KEY (`profesionistaId`) REFERENCES `Profesionista`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
