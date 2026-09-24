import { cargarTabla, Indicador, Sexo, TablaOMS } from "./tablas";

// Posiciones de las columnas en cada fila del JSON
const COL_X = 0;
const COL_SD = { "-3": 4, "-2": 5, "-1": 6, "0": 7, "1": 8, "2": 9, "3": 10 };
const VALORES_Z = [-3, -2, -1, 0, 1, 2, 3] as const;

const DIAS_POR_MES = 30.4375;

export interface PuntoBanda {
  x: number;
  valor: number;
}

export interface Banda {
  z: number;
  puntos: PuntoBanda[];
}

export interface DatosCurva {
  eje: {
    tipo: "edad" | "talla";
    unidad: "meses" | "cm";
    min: number;
    max: number;
  };
  bandas: Banda[];
}

/* Extrae las bandas de una tabla, recortadas al rango pedido y con un punto cada cierto intervalo */
const extraerBandas = (
  tabla: TablaOMS,
  desde: number,
  hasta: number,
  puntosDeseados: number,
): Banda[] => {
  const filas = tabla.filas;
  const paso = (tabla.max - tabla.min) / (filas.length - 1);

  const indiceDesde = Math.max(0, Math.floor((desde - tabla.min) / paso));
  const indiceHasta = Math.min(
    filas.length - 1,
    Math.ceil((hasta - tabla.min) / paso),
  );

  const totalFilas = indiceHasta - indiceDesde + 1;
  const salto = Math.max(1, Math.floor(totalFilas / puntosDeseados));

  // Convierte el índice de la tabla al valor del eje de la gráfica
  const aEje = (x: number) =>
    tabla.indice === "dia" ? Math.round((x / DIAS_POR_MES) * 10) / 10 : x;

  return VALORES_Z.map((z) => {
    const columna = COL_SD[String(z) as keyof typeof COL_SD];
    const puntos: PuntoBanda[] = [];

    for (let i = indiceDesde; i <= indiceHasta; i += salto) {
      puntos.push({ x: aEje(filas[i][COL_X]), valor: filas[i][columna] });
    }

    // Asegurar que el último punto del rango siempre esté incluido
    const ultimo = filas[indiceHasta];
    if (puntos[puntos.length - 1]?.x !== aEje(ultimo[COL_X])) {
      puntos.push({ x: aEje(ultimo[COL_X]), valor: ultimo[columna] });
    }

    return { z, puntos };
  });
};

/* Bandas de un indicador por edad, recortadas de 0 hasta unos meses después de la última consulta, para que se vea hacia dónde va el niño */
export const bandasPorEdad = (
  indicador: Indicador,
  archivo: string,
  sexo: Sexo,
  edadMaximaMeses: number,
): DatosCurva => {
  const tabla = cargarTabla(`${archivo}-${sexo}`);

  const enUnidadTabla = (meses: number) =>
    tabla.indice === "dia" ? meses * DIAS_POR_MES : meses;

  const desde = tabla.min;
  const hasta = Math.min(tabla.max, enUnidadTabla(edadMaximaMeses));

  const bandas = extraerBandas(tabla, desde, hasta, 40);

  return {
    eje: {
      tipo: "edad",
      unidad: "meses",
      min: bandas[0].puntos[0].x,
      max: bandas[0].puntos[bandas[0].puntos.length - 1].x,
    },
    bandas,
  };
};

/* Bandas de peso según la talla */
export const bandasPorTalla = (
  archivo: string,
  sexo: Sexo,
  tallaCm: number,
): DatosCurva => {
  const tabla = cargarTabla(`${archivo}-${sexo}`);

  const margen = 15;
  const desde = Math.max(tabla.min, tallaCm - margen);
  const hasta = Math.min(tabla.max, tallaCm + margen);

  const bandas = extraerBandas(tabla, desde, hasta, 40);

  return {
    eje: {
      tipo: "talla",
      unidad: "cm",
      min: bandas[0].puntos[0].x,
      max: bandas[0].puntos[bandas[0].puntos.length - 1].x,
    },
    bandas,
  };
};
