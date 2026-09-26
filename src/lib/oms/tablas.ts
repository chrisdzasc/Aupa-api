import fs from "fs";
import path from "path";

export type Sexo = "M" | "F";
export type Indicador =
  | "talla-edad"
  | "peso-edad"
  | "imc-edad"
  | "peso-longitud"
  | "peso-talla"
  | "perimetro-cefalico-edad";

export type TipoIndice = "dia" | "mes" | "longitud" | "talla";

export interface TablaOMS {
  indicador: Indicador;
  sexo: Sexo;
  referencia: string;
  indice: TipoIndice;
  min: number;
  max: number;
  columnas: string[];
  filas: number[][];
}

const DIRECTORIO = path.join(__dirname, "..", "..", "data", "oms");

const cache = new Map<string, TablaOMS>();

export const cargarTabla = (archivo: string): TablaOMS => {
  const enCache = cache.get(archivo);
  if (enCache) return enCache;

  const ruta = path.join(DIRECTORIO, `${archivo}.json`);

  if (!fs.existsSync(ruta)) {
    throw new Error(
      `Falta la tabla de la OMS ${archivo}.json. Ejecuta: npm run tablas:oms`,
    );
  }

  const tabla = JSON.parse(fs.readFileSync(ruta, "utf8")) as TablaOMS;
  cache.set(archivo, tabla);
  return tabla;
};
