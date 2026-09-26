import * as XLSX from "xlsx";
import fs from "fs";
import path from "path";

const ORIGEN = path.join(__dirname, "..", "docs", "tablas-oms");
const DESTINO = path.join(__dirname, "..", "src", "data", "oms");

// Columnas que se conservan: L, M y S para calcular la puntuación Z,
// y las 7 curvas que se dibujan en las gráficas de la OMS
const COLUMNAS_SD = [
  "SD3neg",
  "SD2neg",
  "SD1neg",
  "SD0",
  "SD1",
  "SD2",
  "SD3",
] as const;

const COLUMNAS_SALIDA = [
  "x",
  "L",
  "M",
  "S",
  "sd3neg",
  "sd2neg",
  "sd1neg",
  "sd0",
  "sd1",
  "sd2",
  "sd3",
];

interface Definicion {
  archivo: string;
  indicador: string;
  sexo: "M" | "F";
  referencia: string;
  indice: "dia" | "mes" | "longitud" | "talla";
  columnaIndice: string;
  min: number;
  max: number;
  filas: number;
}

const TABLAS: Definicion[] = [
  // Estándares OMS 2006 (0 a 5 años), indexados por día de vida
  {
    archivo: "talla-edad-0-5",
    indicador: "talla-edad",
    referencia: "OMS 2006",
    indice: "dia",
    columnaIndice: "Day",
    min: 0,
    max: 1856,
    filas: 1857,
    sexo: "M",
  },
  {
    archivo: "peso-edad-0-5",
    indicador: "peso-edad",
    referencia: "OMS 2006",
    indice: "dia",
    columnaIndice: "Day",
    min: 0,
    max: 1856,
    filas: 1857,
    sexo: "M",
  },
  {
    archivo: "imc-edad-0-5",
    indicador: "imc-edad",
    referencia: "OMS 2006",
    indice: "dia",
    columnaIndice: "Day",
    min: 0,
    max: 1856,
    filas: 1857,
    sexo: "M",
  },
  {
    archivo: "perimetro-cefalico-edad-0-5",
    indicador: "perimetro-cefalico-edad",
    referencia: "OMS 2006",
    indice: "dia",
    columnaIndice: "Day",
    min: 0,
    max: 1856,
    filas: 1857,
    sexo: "M",
  },
  // Peso según la talla: acostado hasta los 2 años, de pie después
  {
    archivo: "peso-longitud-0-2",
    indicador: "peso-longitud",
    referencia: "OMS 2006",
    indice: "longitud",
    columnaIndice: "Length",
    min: 45,
    max: 110,
    filas: 651,
    sexo: "M",
  },
  {
    archivo: "peso-talla-2-5",
    indicador: "peso-talla",
    referencia: "OMS 2006",
    indice: "talla",
    columnaIndice: "Height",
    min: 65,
    max: 120,
    filas: 551,
    sexo: "M",
  },
  // Referencias OMS 2007 (5 a 19 años), indexadas por mes cumplido
  {
    archivo: "talla-edad-5-19",
    indicador: "talla-edad",
    referencia: "OMS 2007",
    indice: "mes",
    columnaIndice: "Month",
    min: 61,
    max: 228,
    filas: 168,
    sexo: "M",
  },
  {
    archivo: "imc-edad-5-19",
    indicador: "imc-edad",
    referencia: "OMS 2007",
    indice: "mes",
    columnaIndice: "Month",
    min: 61,
    max: 228,
    filas: 168,
    sexo: "M",
  },
  {
    archivo: "peso-edad-5-10",
    indicador: "peso-edad",
    referencia: "OMS 2007",
    indice: "mes",
    columnaIndice: "Month",
    min: 61,
    max: 120,
    filas: 60,
    sexo: "M",
  },
];

// Cada definición existe para ambos sexos
const TODAS: Definicion[] = TABLAS.flatMap((t) => [
  { ...t, sexo: "M" as const },
  { ...t, sexo: "F" as const },
]);

const convertir = (def: Definicion) => {
  const nombre = `${def.archivo}-${def.sexo}`;
  const rutaOrigen = path.join(ORIGEN, `${nombre}.xlsx`);

  if (!fs.existsSync(rutaOrigen)) {
    throw new Error(`No se encontró el archivo ${nombre}.xlsx`);
  }

  const libro = XLSX.readFile(rutaOrigen);
  const hoja = libro.Sheets[libro.SheetNames[0]];
  const datos = XLSX.utils.sheet_to_json<Record<string, number>>(hoja);

  // Verificar que el archivo sea el esperado antes de convertirlo
  if (!(def.columnaIndice in datos[0])) {
    throw new Error(
      `${nombre}.xlsx no tiene la columna "${def.columnaIndice}". ` +
        `Columnas encontradas: ${Object.keys(datos[0]).join(", ")}`,
    );
  }

  for (const columna of ["L", "M", "S", ...COLUMNAS_SD]) {
    if (!(columna in datos[0])) {
      throw new Error(`${nombre}.xlsx no tiene la columna "${columna}"`);
    }
  }

  if (datos.length !== def.filas) {
    throw new Error(
      `${nombre}.xlsx tiene ${datos.length} filas y se esperaban ${def.filas}`,
    );
  }

  const filas = datos.map((fila) => [
    fila[def.columnaIndice],
    fila.L,
    fila.M,
    fila.S,
    ...COLUMNAS_SD.map((c) => fila[c]),
  ]);

  const primerX = filas[0][0];
  const ultimoX = filas[filas.length - 1][0];

  if (primerX !== def.min || ultimoX !== def.max) {
    throw new Error(
      `${nombre}.xlsx va de ${primerX} a ${ultimoX} y se esperaba ${def.min} a ${def.max}`,
    );
  }

  const salida = {
    indicador: def.indicador,
    sexo: def.sexo,
    referencia: def.referencia,
    indice: def.indice,
    min: def.min,
    max: def.max,
    columnas: COLUMNAS_SALIDA,
    filas,
  };

  fs.writeFileSync(
    path.join(DESTINO, `${nombre}.json`),
    JSON.stringify(salida),
  );

  return { nombre, filas: filas.length };
};

const main = () => {
  fs.mkdirSync(DESTINO, { recursive: true });

  let total = 0;

  for (const def of TODAS) {
    const resultado = convertir(def);
    console.log(`✓ ${resultado.nombre}: ${resultado.filas} filas`);
    total += resultado.filas;
  }

  console.log(`\n${TODAS.length} tablas convertidas, ${total} filas en total`);
};

main();
