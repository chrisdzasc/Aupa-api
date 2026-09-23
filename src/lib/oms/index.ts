import { cargarTabla, Indicador, Sexo } from "./tablas";
import { buscarLMS } from "./buscar";
import { calcularZ, requiereAjuste } from "./lms";

// Límites de edad de cada referencia, en días
const DIAS_5_ANIOS = 1856; // último día de los estándares 2006
const DIAS_2_ANIOS = 730;
const DIAS_10_ANIOS = 3652;
const DIAS_19_ANIOS = 6939; // mes 228

export interface DatosCalculo {
  sexo: Sexo;
  edadDias: number;
  pesoKg: number;
  tallaCm: number;
}

export interface PuntuacionesZ {
  tallaEdad: number | null;
  pesoEdad: number | null;
  imcEdad: number | null;
  pesoTalla: number | null;
}

// Redondea a dos decimales
const redondear = (z: number): number => Math.round(z * 100) / 100;

/**
 * Calcula una puntuación Z para un indicador.
 * Devuelve null si el paciente queda fuera del rango de la tabla.
 */
const calcularIndicador = (
  indicador: Indicador,
  archivo: string,
  sexo: Sexo,
  valorIndice: number,
  medicion: number,
): number | null => {
  const tabla = cargarTabla(`${archivo}-${sexo}`);
  const lms = buscarLMS(tabla, valorIndice);

  if (!lms) return null;

  const z = calcularZ(medicion, lms.l, lms.m, lms.s, requiereAjuste(indicador));

  return Number.isFinite(z) ? redondear(z) : null;
};

/**
 * Calcula las puntuaciones Z de una medición según los estándares de la
 * OMS: patrones de crecimiento 2006 (0 a 5 años) y referencias 2007
 * (5 a 19 años). Cada indicador devuelve null cuando el paciente queda
 * fuera del rango que publica la OMS.
 */
export const calcularPuntuacionesZ = (datos: DatosCalculo): PuntuacionesZ => {
  const { sexo, edadDias, pesoKg, tallaCm } = datos;

  const edadMeses = Math.floor(edadDias / 30.4375);
  const esMenorDe5 = edadDias <= DIAS_5_ANIOS;

  // Talla para la edad: 0 a 19 años
  let tallaEdad: number | null = null;
  if (esMenorDe5) {
    tallaEdad = calcularIndicador(
      "talla-edad",
      "talla-edad-0-5",
      sexo,
      edadDias,
      tallaCm,
    );
  } else if (edadDias <= DIAS_19_ANIOS) {
    tallaEdad = calcularIndicador(
      "talla-edad",
      "talla-edad-5-19",
      sexo,
      edadMeses,
      tallaCm,
    );
  }

  // IMC para la edad: 0 a 19 años
  const imc = pesoKg / Math.pow(tallaCm / 100, 2);
  let imcEdad: number | null = null;
  if (esMenorDe5) {
    imcEdad = calcularIndicador(
      "imc-edad",
      "imc-edad-0-5",
      sexo,
      edadDias,
      imc,
    );
  } else if (edadDias <= DIAS_19_ANIOS) {
    imcEdad = calcularIndicador(
      "imc-edad",
      "imc-edad-5-19",
      sexo,
      edadMeses,
      imc,
    );
  }

  // Peso para la edad: 0 a 10 años
  let pesoEdad: number | null = null;
  if (esMenorDe5) {
    pesoEdad = calcularIndicador(
      "peso-edad",
      "peso-edad-0-5",
      sexo,
      edadDias,
      pesoKg,
    );
  } else if (edadDias <= DIAS_10_ANIOS) {
    pesoEdad = calcularIndicador(
      "peso-edad",
      "peso-edad-5-10",
      sexo,
      edadMeses,
      pesoKg,
    );
  }

  // Peso según la talla: hasta los 2 años se mide acostado (longitud),
  // de los 2 a los 5 de pie (talla)
  let pesoTalla: number | null = null;
  if (edadDias < DIAS_2_ANIOS) {
    pesoTalla = calcularIndicador(
      "peso-longitud",
      "peso-longitud-0-2",
      sexo,
      tallaCm,
      pesoKg,
    );
  } else if (esMenorDe5) {
    pesoTalla = calcularIndicador(
      "peso-talla",
      "peso-talla-2-5",
      sexo,
      tallaCm,
      pesoKg,
    );
  }

  return { tallaEdad, pesoEdad, imcEdad, pesoTalla };
};
