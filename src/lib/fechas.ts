// Convierte una fecha de calendario a texto "YYYY-MM-DD".
// Se usa para los campos @db.Date (fechaNacimiento, fechaConsulta),
// que representan un día y no un momento exacto.
export const aFechaISO = (fecha: Date): string => {
  return fecha.toISOString().slice(0, 10);
};

// Edad en meses cumplidos entre dos fechas de calendario.
// Usa métodos UTC porque los campos @db.Date se leen como medianoche UTC.
export const edadEnMeses = (nacimiento: Date, fecha: Date): number => {
  let meses =
    (fecha.getUTCFullYear() - nacimiento.getUTCFullYear()) * 12 +
    (fecha.getUTCMonth() - nacimiento.getUTCMonth());

  if (fecha.getUTCDate() < nacimiento.getUTCDate()) {
    meses--;
  }

  return Math.max(0, meses);
};

// La fecha de hoy en México, como medianoche UTC, para compararla con
// campos @db.Date sin que la zona horaria del servidor la mueva
export const hoyEnMexico = (): Date => {
  return new Date(`${aFechaMexico(new Date())}T00:00:00.000Z`);
};

const ZONA_MEXICO = "America/Mexico_City";

// Día de calendario en México de un momento exacto: "2026-10-20"
export const aFechaMexico = (momento: Date): string => {
  // en-CA formatea como YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA_MEXICO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(momento);
};

// Hora en México de un momento exacto: "17:30"
export const aHoraMexico = (momento: Date): string => {
  return new Intl.DateTimeFormat("es-MX", {
    timeZone: ZONA_MEXICO,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(momento);
};
