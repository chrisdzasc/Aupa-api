import { cargarTabla, Indicador, Sexo } from "./tablas";
import { buscarLMS } from "./buscar";
import { calcularZ, requiereAjuste } from "./lms";
import { bandasPorEdad, bandasPorTalla, DatosCurva } from "./curvas";
import { aFechaISO, edadEnDias, edadEnMeses } from "../fechas";

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
  perimetroCefalicoCm?: number | null;
}

export interface PuntuacionesZ {
  tallaEdad: number | null;
  pesoEdad: number | null;
  imcEdad: number | null;
  pesoTalla: number | null;
  perimetroCefalicoEdad: number | null;
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

  // Perímetro cefálico para la edad: la OMS lo publica hasta los 5 años, pero en la práctica solo se mide de rutina en los primeros 2 años
  let perimetroCefalicoEdad: number | null = null;
  if (
    datos.perimetroCefalicoCm != null &&
    datos.perimetroCefalicoCm > 0 &&
    edadDias < DIAS_2_ANIOS
  ) {
    perimetroCefalicoEdad = calcularIndicador(
      "perimetro-cefalico-edad",
      "perimetro-cefalico-edad-0-5",
      sexo,
      edadDias,
      datos.perimetroCefalicoCm,
    );
  }

  return { tallaEdad, pesoEdad, imcEdad, pesoTalla, perimetroCefalicoEdad };
};

interface PacienteCurva {
  sexo: Sexo;
  fechaNacimiento: Date;
  mediciones: {
    fechaConsulta: Date;
    pesoKg: unknown;
    tallaCm: unknown;
    perimetroCefalicoCm?: unknown;
  }[];
}

const ETIQUETAS = {
  "talla-edad": { etiqueta: "Talla para la edad", unidad: "cm" },
  "peso-edad": { etiqueta: "Peso para la edad", unidad: "kg" },
  "imc-edad": { etiqueta: "IMC para la edad", unidad: "kg/m²" },
  "peso-talla": { etiqueta: "Peso para la talla", unidad: "kg" },
  "perimetro-cefalico-edad": {
    etiqueta: "Perímetro cefálico para la edad",
    unidad: "cm",
  },
} as const;

export const construirCurva = (
  paciente: PacienteCurva,
  indicador: keyof typeof ETIQUETAS,
) => {
  const { sexo, fechaNacimiento, mediciones } = paciente;

  if (mediciones.length === 0) {
    throw new Error("El paciente no tiene mediciones registradas");
  }

  const ultima = mediciones[mediciones.length - 1];
  const edadUltimaDias = edadEnDias(fechaNacimiento, ultima.fechaConsulta);
  const edadUltimaMeses = edadEnMeses(fechaNacimiento, ultima.fechaConsulta);

  const valorDe = (m: PacienteCurva["mediciones"][number]): number => {
    const peso = Number(m.pesoKg);
    const talla = Number(m.tallaCm);

    if (indicador === "talla-edad") return talla;
    if (indicador === "perimetro-cefalico-edad")
      return Number(m.perimetroCefalicoCm);
    if (indicador === "imc-edad")
      return Math.round((peso / Math.pow(talla / 100, 2)) * 10) / 10;
    return peso;
  };

  let datos: DatosCurva;
  let referencia: string;

  if (indicador === "peso-talla") {
    if (edadUltimaDias > DIAS_5_ANIOS) {
      throw new Error(
        "El indicador peso para la talla solo aplica hasta los 5 años",
      );
    }

    const tallaUltima = Number(ultima.tallaCm);
    const archivo =
      edadUltimaDias < DIAS_2_ANIOS ? "peso-longitud-0-2" : "peso-talla-2-5";
    datos = bandasPorTalla(archivo, sexo, tallaUltima);
    referencia = "OMS 2006";
  } else {
    const hastaMeses =
      indicador === "perimetro-cefalico-edad" ? 24 : edadUltimaMeses + 6;
    const esMenorDe5 = edadUltimaDias <= DIAS_5_ANIOS;

    if (indicador === "peso-edad" && edadUltimaDias > DIAS_10_ANIOS) {
      throw new Error(
        "El indicador peso para la edad solo aplica hasta los 10 años",
      );
    }

    if (
      indicador === "perimetro-cefalico-edad" &&
      edadUltimaDias >= DIAS_2_ANIOS
    ) {
      throw new Error("El perímetro cefálico solo se evalúa hasta los 2 años");
    }

    const archivo = esMenorDe5
      ? `${indicador}-0-5`
      : indicador === "peso-edad"
        ? "peso-edad-5-10"
        : `${indicador}-5-19`;

    datos = bandasPorEdad(indicador as Indicador, archivo, sexo, hastaMeses);
    referencia = esMenorDe5 ? "OMS 2006" : "OMS 2007";
  }

  const puntos = mediciones
    .map((m) => {
      const z = calcularPuntuacionesZ({
        sexo,
        edadDias: edadEnDias(fechaNacimiento, m.fechaConsulta),
        pesoKg: Number(m.pesoKg),
        tallaCm: Number(m.tallaCm),
        perimetroCefalicoCm:
          m.perimetroCefalicoCm != null ? Number(m.perimetroCefalicoCm) : null,
      });

      const zIndicador = {
        "talla-edad": z.tallaEdad,
        "peso-edad": z.pesoEdad,
        "imc-edad": z.imcEdad,
        "peso-talla": z.pesoTalla,
        "perimetro-cefalico-edad": z.perimetroCefalicoEdad,
      }[indicador];

      const x =
        indicador === "peso-talla"
          ? Number(m.tallaCm)
          : Math.round(
              (edadEnDias(fechaNacimiento, m.fechaConsulta) / 30.4375) * 10,
            ) / 10;

      return {
        x,
        valor: valorDe(m),
        z: zIndicador,
        fechaConsulta: aFechaISO(m.fechaConsulta),
      };
    })
    .filter((p) => p.x >= datos.eje.min && p.x <= datos.eje.max)
    .filter((p) => Number.isFinite(p.valor));

  return {
    indicador,
    etiqueta: ETIQUETAS[indicador].etiqueta,
    referencia,
    sexo,
    eje: datos.eje,
    unidadValor: ETIQUETAS[indicador].unidad,
    bandas: datos.bandas,
    paciente: puntos,
  };
};
