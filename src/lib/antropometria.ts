// IMC = peso (kg) / talla (m)². Redondeado a un decimal.
export const calcularIMC = (pesoKg: number, tallaCm: number): number | null => {
  if (!pesoKg || !tallaCm) return null;

  const tallaM = tallaCm / 100;
  return Math.round((pesoKg / (tallaM * tallaM)) * 10) / 10;
};

// Convierte un Decimal de Prisma a número, conservando null
export const aNumero = (valor: { toString(): string } | null): number | null =>
  valor === null ? null : Number(valor.toString());
