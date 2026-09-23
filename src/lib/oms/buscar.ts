import { TablaOMS } from "./tablas";

export interface ParametrosLMS {
  l: number;
  m: number;
  s: number;
}

// Posición de cada columna dentro de una fila
const X = 0;
const L = 1;
const M = 2;
const S = 3;

/**
 * Busca los parámetros L, M y S para un valor del índice (edad en días,
 * edad en meses, longitud o talla). Si el valor cae entre dos filas de
 * la tabla, se interpola linealmente entre ambas.
 *
 * Devuelve null si el valor queda fuera del rango que cubre la tabla.
 */
export const buscarLMS = (
  tabla: TablaOMS,
  valor: number,
): ParametrosLMS | null => {
  if (valor < tabla.min || valor > tabla.max) {
    return null;
  }

  const filas = tabla.filas;

  const paso = (tabla.max - tabla.min) / (filas.length - 1);
  const posicion = (valor - tabla.min) / paso;

  const indiceInferior = Math.floor(posicion);
  const indiceSuperior = Math.ceil(posicion);

  const filaInferior = filas[indiceInferior];

  // El valor coincide exactamente con una fila
  if (indiceInferior === indiceSuperior) {
    return {
      l: filaInferior[L],
      m: filaInferior[M],
      s: filaInferior[S],
    };
  }

  const filaSuperior = filas[indiceSuperior];

  const proporcion =
    (valor - filaInferior[X]) / (filaSuperior[X] - filaInferior[X]);

  const entre = (a: number, b: number) => a + (b - a) * proporcion;

  return {
    l: entre(filaInferior[L], filaSuperior[L]),
    m: entre(filaInferior[M], filaSuperior[M]),
    s: entre(filaInferior[S], filaSuperior[S]),
  };
};
