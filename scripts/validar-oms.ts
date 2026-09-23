import { calcularPuntuacionesZ } from "../src/lib/oms";
import { cargarTabla } from "../src/lib/oms/tablas";

let pasadas = 0;
let fallidas = 0;

const revisar = (nombre: string, obtenido: number | null, esperado: number) => {
  const ok = obtenido !== null && Math.abs(obtenido - esperado) < 0.05;

  if (ok) {
    pasadas++;
    console.log(`✓ ${nombre}: ${obtenido} (esperado ${esperado})`);
  } else {
    fallidas++;
    console.log(`✗ ${nombre}: ${obtenido} (esperado ${esperado})`);
  }
};

const probarCurva = (
  archivo: string,
  indiceFila: number,
  columna: string,
  zEsperada: number,
  construir: (x: number, valor: number) => { datos: any; campo: keyof any },
) => {
  const tabla = cargarTabla(archivo);
  const posColumna = tabla.columnas.indexOf(columna);
  const fila = tabla.filas[indiceFila];
  const x = fila[0];
  const valor = fila[posColumna];

  const { datos, campo } = construir(x, valor);
  const resultado = calcularPuntuacionesZ(datos);

  revisar(
    `${archivo} fila ${x} curva ${columna}`,
    (resultado as any)[campo],
    zEsperada,
  );
};

console.log("=== Talla para la edad, 0 a 5 años ===");
for (const [columna, z] of [
  ["sd0", 0],
  ["sd2neg", -2],
  ["sd3", 3],
] as const) {
  probarCurva("talla-edad-0-5-M", 365, columna, z, (x, valor) => ({
    datos: { sexo: "M", edadDias: x, pesoKg: 10, tallaCm: valor },
    campo: "tallaEdad",
  }));
}

console.log("\n=== Peso para la edad, 0 a 5 años ===");
for (const [columna, z] of [
  ["sd0", 0],
  ["sd2neg", -2],
  ["sd2", 2],
] as const) {
  probarCurva("peso-edad-0-5-F", 730, columna, z, (x, valor) => ({
    datos: { sexo: "F", edadDias: x, pesoKg: valor, tallaCm: 87 },
    campo: "pesoEdad",
  }));
}

console.log("\n=== IMC para la edad, 5 a 19 años ===");
{
  const tabla = cargarTabla("imc-edad-5-19-M");
  for (const [columna, z] of [
    ["sd0", 0],
    ["sd1", 1],
    ["sd2neg", -2],
  ] as const) {
    const posColumna = tabla.columnas.indexOf(columna);
    const fila = tabla.filas[39]; // mes 100
    const meses = fila[0];
    const imc = fila[posColumna];

    const tallaCm = 130;
    const pesoKg = imc * Math.pow(tallaCm / 100, 2);
    const edadDias = Math.round(meses * 30.4375);

    const resultado = calcularPuntuacionesZ({
      sexo: "M",
      edadDias,
      pesoKg,
      tallaCm,
    });

    revisar(
      `imc-edad-5-19-M mes ${meses} curva ${columna}`,
      resultado.imcEdad,
      z,
    );
  }
}

console.log("\n=== Peso para la longitud, 0 a 2 años ===");
for (const [columna, z] of [
  ["sd0", 0],
  ["sd3neg", -3],
] as const) {
  probarCurva("peso-longitud-0-2-F", 200, columna, z, (x, valor) => ({
    datos: { sexo: "F", edadDias: 300, pesoKg: valor, tallaCm: x },
    campo: "pesoTalla",
  }));
}

console.log("\n=== Pacientes de prueba ===");

const pacientes = [
  {
    nombre: "Lucía (7 meses)",
    sexo: "F" as const,
    edadDias: 223,
    pesoKg: 7.6,
    tallaCm: 66.8,
  },
  {
    nombre: "Tomás (4 años)",
    sexo: "M" as const,
    edadDias: 1591,
    pesoKg: 14.8,
    tallaCm: 101.5,
  },
  {
    nombre: "Valeria (2.5 años)",
    sexo: "F" as const,
    edadDias: 924,
    pesoKg: 13.0,
    tallaCm: 90.5,
  },
  {
    nombre: "Andrés (11 años)",
    sexo: "M" as const,
    edadDias: 4173,
    pesoKg: 48.6,
    tallaCm: 145.2,
  },
];

for (const p of pacientes) {
  const z = calcularPuntuacionesZ(p);
  console.log(
    `${p.nombre.padEnd(20)} talla/edad: ${String(z.tallaEdad).padStart(6)} | ` +
      `peso/edad: ${String(z.pesoEdad).padStart(6)} | ` +
      `IMC/edad: ${String(z.imcEdad).padStart(6)} | ` +
      `peso/talla: ${String(z.pesoTalla).padStart(6)}`,
  );
}

console.log(`\n${pasadas} pasadas, ${fallidas} fallidas`);
