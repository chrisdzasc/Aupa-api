-- Normaliza los correos existentes a minúsculas y sin espacios,
-- para que coincidan con la regla que aplican el registro y el login
UPDATE `Tutor` SET `email` = LOWER(TRIM(`email`));
UPDATE `Profesionista` SET `email` = LOWER(TRIM(`email`));