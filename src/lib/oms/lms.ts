/**
 * Cálculo de puntuación Z con el método LMS de la OMS.
 * Referencia: WHO Child Growth Standards: Methods and development (2006),
 */

// Fórmula LMS estándar:  Z = ((X/M)^L - 1) / (L * S)
// Cuando L es 0 la fórmula se indefine y la OMS usa:  Z = ln(X/M) / S
const zEstandar = (x: number, l: number, m: number, s: number): number => {
  if (l === 0) {
    return Math.log(x / m) / s;
  }
  return (Math.pow(x / m, l) - 1) / (l * s);
};

// Valor de la medición que corresponde a una puntuación Z dada.
const valorEnZ = (z: number, l: number, m: number, s: number): number => {
  if (l === 0) {
    return m * Math.exp(s * z);
  }
  return m * Math.pow(1 + l * s * z, 1 / l);
};

export const calcularZ = (
  x: number,
  l: number,
  m: number,
  s: number,
  aplicarAjuste: boolean,
): number => {
  const z = zEstandar(x, l, m, s);

  if (!aplicarAjuste || (z >= -3 && z <= 3)) {
    return z;
  }

  if (z > 3) {
    const sd3 = valorEnZ(3, l, m, s);
    const sd2 = valorEnZ(2, l, m, s);
    return 3 + (x - sd3) / (sd3 - sd2);
  }

  const sd3neg = valorEnZ(-3, l, m, s);
  const sd2neg = valorEnZ(-2, l, m, s);
  return -3 + (x - sd3neg) / (sd2neg - sd3neg);
};

// El ajuste no aplica a los indicadores de distribución simétrica
export const requiereAjuste = (indicador: string): boolean =>
  indicador !== "talla-edad" && indicador !== "perimetro-cefalico-edad";
