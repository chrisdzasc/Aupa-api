// Convierte una fecha de calendario a texto "YYYY-MM-DD".
// Se usa para los campos @db.Date (fechaNacimiento, fechaConsulta),
// que representan un día y no un momento exacto.
export const aFechaISO = (fecha: Date): string => {
  return fecha.toISOString().slice(0, 10);
};
