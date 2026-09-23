import { edadEnDias } from "./fechas";
import { calcularPuntuacionesZ } from "./oms";

// IMC = peso (kg) / talla (m)². Redondeado a un decimal.
export const calcularIMC = (pesoKg: number, tallaCm: number): number | null => {
  if (!pesoKg || !tallaCm) return null;

  const tallaM = tallaCm / 100;
  return Math.round((pesoKg / (tallaM * tallaM)) * 10) / 10;
};

// Convierte un Decimal de Prisma a número, conservando null
export const aNumero = (valor: { toString(): string } | null): number | null =>
  valor === null ? null : Number(valor.toString());

// Calcula las puntuaciones Z de una medición a partir de los datos del paciente.
export const puntuacionesDeMedicion = (
  paciente: { sexo: "M" | "F"; fechaNacimiento: Date },
  medicion: { fechaConsulta: Date; pesoKg: unknown; tallaCm: unknown },
) => {
  const pesoKg = Number(medicion.pesoKg);
  const tallaCm = Number(medicion.tallaCm);

  const z = calcularPuntuacionesZ({
    sexo: paciente.sexo,
    edadDias: edadEnDias(paciente.fechaNacimiento, medicion.fechaConsulta),
    pesoKg,
    tallaCm,
  });

  return {
    pesoEdad: z.pesoEdad,
    tallaEdad: z.tallaEdad,
    imcEdad: z.imcEdad,
    pesoTalla: z.pesoTalla,
  };
};
