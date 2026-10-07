import prisma from "../src/lib/prisma";
import { CategoriaAlimento } from "@prisma/client";

// Catálogo base del checklist de alimentación complementaria.

type Semilla = {
  nombre: string;
  categoria: CategoriaAlimento;
  edadMinimaMeses: number;
  esAlergenoComun?: boolean;
};

const ALIMENTOS: Semilla[] = [
  // Frutas
  { nombre: "Plátano", categoria: "FRUTA", edadMinimaMeses: 6 },
  { nombre: "Manzana", categoria: "FRUTA", edadMinimaMeses: 6 },
  { nombre: "Pera", categoria: "FRUTA", edadMinimaMeses: 6 },
  { nombre: "Papaya", categoria: "FRUTA", edadMinimaMeses: 6 },
  { nombre: "Guayaba", categoria: "FRUTA", edadMinimaMeses: 6 },
  { nombre: "Durazno", categoria: "FRUTA", edadMinimaMeses: 6 },
  { nombre: "Mango", categoria: "FRUTA", edadMinimaMeses: 6 },
  { nombre: "Melón", categoria: "FRUTA", edadMinimaMeses: 6 },
  { nombre: "Sandía", categoria: "FRUTA", edadMinimaMeses: 7 },
  { nombre: "Ciruela", categoria: "FRUTA", edadMinimaMeses: 7 },
  { nombre: "Piña", categoria: "FRUTA", edadMinimaMeses: 8 },
  { nombre: "Naranja", categoria: "FRUTA", edadMinimaMeses: 8 },
  { nombre: "Mandarina", categoria: "FRUTA", edadMinimaMeses: 8 },
  { nombre: "Fresa", categoria: "FRUTA", edadMinimaMeses: 8 },
  { nombre: "Kiwi", categoria: "FRUTA", edadMinimaMeses: 8 },
  { nombre: "Zarzamora", categoria: "FRUTA", edadMinimaMeses: 9 },
  { nombre: "Uva", categoria: "FRUTA", edadMinimaMeses: 10 },

  // Verduras
  { nombre: "Calabacita", categoria: "VERDURA", edadMinimaMeses: 6 },
  { nombre: "Chayote", categoria: "VERDURA", edadMinimaMeses: 6 },
  { nombre: "Zanahoria", categoria: "VERDURA", edadMinimaMeses: 6 },
  { nombre: "Chícharo", categoria: "VERDURA", edadMinimaMeses: 6 },
  { nombre: "Calabaza de Castilla", categoria: "VERDURA", edadMinimaMeses: 6 },
  { nombre: "Espinaca", categoria: "VERDURA", edadMinimaMeses: 8 },
  { nombre: "Acelga", categoria: "VERDURA", edadMinimaMeses: 8 },
  { nombre: "Brócoli", categoria: "VERDURA", edadMinimaMeses: 8 },
  { nombre: "Ejote", categoria: "VERDURA", edadMinimaMeses: 8 },
  { nombre: "Coliflor", categoria: "VERDURA", edadMinimaMeses: 8 },
  { nombre: "Betabel", categoria: "VERDURA", edadMinimaMeses: 8 },
  { nombre: "Jitomate", categoria: "VERDURA", edadMinimaMeses: 8 },
  { nombre: "Poro", categoria: "VERDURA", edadMinimaMeses: 10 },
  { nombre: "Cebolla", categoria: "VERDURA", edadMinimaMeses: 10 },
  { nombre: "Nopal", categoria: "VERDURA", edadMinimaMeses: 10 },
  { nombre: "Pepino", categoria: "VERDURA", edadMinimaMeses: 10 },
  { nombre: "Lechuga", categoria: "VERDURA", edadMinimaMeses: 10 },

  // Cereales y tubérculos
  { nombre: "Arroz", categoria: "CEREAL_TUBERCULO", edadMinimaMeses: 6 },
  { nombre: "Avena", categoria: "CEREAL_TUBERCULO", edadMinimaMeses: 6 },
  { nombre: "Papa", categoria: "CEREAL_TUBERCULO", edadMinimaMeses: 6 },
  { nombre: "Camote", categoria: "CEREAL_TUBERCULO", edadMinimaMeses: 6 },
  {
    nombre: "Pan de trigo",
    categoria: "CEREAL_TUBERCULO",
    edadMinimaMeses: 6,
    esAlergenoComun: true,
  },
  {
    nombre: "Tortilla de maíz",
    categoria: "CEREAL_TUBERCULO",
    edadMinimaMeses: 8,
  },
  {
    nombre: "Pasta",
    categoria: "CEREAL_TUBERCULO",
    edadMinimaMeses: 8,
    esAlergenoComun: true,
  },
  { nombre: "Amaranto", categoria: "CEREAL_TUBERCULO", edadMinimaMeses: 8 },
  { nombre: "Quinoa", categoria: "CEREAL_TUBERCULO", edadMinimaMeses: 8 },
  {
    nombre: "Plátano macho",
    categoria: "CEREAL_TUBERCULO",
    edadMinimaMeses: 8,
  },

  // Leguminosas
  { nombre: "Frijol", categoria: "LEGUMINOSA", edadMinimaMeses: 7 },
  { nombre: "Lenteja", categoria: "LEGUMINOSA", edadMinimaMeses: 7 },
  { nombre: "Garbanzo", categoria: "LEGUMINOSA", edadMinimaMeses: 8 },
  {
    nombre: "Tofu",
    categoria: "LEGUMINOSA",
    edadMinimaMeses: 8,
    esAlergenoComun: true,
  },
  { nombre: "Alubia", categoria: "LEGUMINOSA", edadMinimaMeses: 10 },
  { nombre: "Haba", categoria: "LEGUMINOSA", edadMinimaMeses: 10 },

  // Origen animal
  { nombre: "Pollo", categoria: "ORIGEN_ANIMAL", edadMinimaMeses: 6 },
  { nombre: "Res", categoria: "ORIGEN_ANIMAL", edadMinimaMeses: 6 },
  {
    nombre: "Pescado blanco",
    categoria: "ORIGEN_ANIMAL",
    edadMinimaMeses: 6,
    esAlergenoComun: true,
  },
  { nombre: "Cerdo", categoria: "ORIGEN_ANIMAL", edadMinimaMeses: 8 },
  { nombre: "Pavo", categoria: "ORIGEN_ANIMAL", edadMinimaMeses: 8 },
  { nombre: "Hígado de pollo", categoria: "ORIGEN_ANIMAL", edadMinimaMeses: 8 },
  {
    nombre: "Salmón",
    categoria: "ORIGEN_ANIMAL",
    edadMinimaMeses: 8,
    esAlergenoComun: true,
  },
  {
    nombre: "Atún",
    categoria: "ORIGEN_ANIMAL",
    edadMinimaMeses: 9,
    esAlergenoComun: true,
  },
  {
    nombre: "Yema de huevo",
    categoria: "ORIGEN_ANIMAL",
    edadMinimaMeses: 10,
    esAlergenoComun: true,
  },
  {
    nombre: "Huevo completo",
    categoria: "ORIGEN_ANIMAL",
    edadMinimaMeses: 12,
    esAlergenoComun: true,
  },
  {
    nombre: "Camarón",
    categoria: "ORIGEN_ANIMAL",
    edadMinimaMeses: 12,
    esAlergenoComun: true,
  },

  // Lácteos
  {
    nombre: "Yogur natural",
    categoria: "LACTEO",
    edadMinimaMeses: 8,
    esAlergenoComun: true,
  },
  {
    nombre: "Queso fresco",
    categoria: "LACTEO",
    edadMinimaMeses: 8,
    esAlergenoComun: true,
  },
  {
    nombre: "Requesón",
    categoria: "LACTEO",
    edadMinimaMeses: 8,
    esAlergenoComun: true,
  },
  {
    nombre: "Leche entera",
    categoria: "LACTEO",
    edadMinimaMeses: 12,
    esAlergenoComun: true,
  },

  // Grasas y oleaginosas
  {
    nombre: "Aceite de oliva",
    categoria: "GRASA_OLEAGINOSA",
    edadMinimaMeses: 6,
  },
  { nombre: "Aguacate", categoria: "GRASA_OLEAGINOSA", edadMinimaMeses: 6 },
  {
    nombre: "Crema de cacahuate",
    categoria: "GRASA_OLEAGINOSA",
    edadMinimaMeses: 6,
    esAlergenoComun: true,
  },
  {
    nombre: "Crema de almendra",
    categoria: "GRASA_OLEAGINOSA",
    edadMinimaMeses: 6,
    esAlergenoComun: true,
  },
  {
    nombre: "Ajonjolí",
    categoria: "GRASA_OLEAGINOSA",
    edadMinimaMeses: 6,
    esAlergenoComun: true,
  },
  {
    nombre: "Nuez molida",
    categoria: "GRASA_OLEAGINOSA",
    edadMinimaMeses: 8,
    esAlergenoComun: true,
  },
  {
    nombre: "Semilla de girasol",
    categoria: "GRASA_OLEAGINOSA",
    edadMinimaMeses: 8,
  },
];

// Actualiza los que ya existen y crea los que no.
const sembrar = async () => {
  let creados = 0;
  let actualizados = 0;

  for (const alimento of ALIMENTOS) {
    const existente = await prisma.alimento.findUnique({
      where: { nombre: alimento.nombre },
      select: { id: true },
    });

    await prisma.alimento.upsert({
      where: { nombre: alimento.nombre },
      update: {
        categoria: alimento.categoria,
        edadMinimaMeses: alimento.edadMinimaMeses,
        esAlergenoComun: alimento.esAlergenoComun ?? false,
      },
      create: {
        nombre: alimento.nombre,
        categoria: alimento.categoria,
        edadMinimaMeses: alimento.edadMinimaMeses,
        esAlergenoComun: alimento.esAlergenoComun ?? false,
      },
    });

    existente ? actualizados++ : creados++;
  }

  const total = await prisma.alimento.count();

  console.log(`✓ ${creados} creados, ${actualizados} actualizados`);
  console.log(`  El catálogo tiene ${total} alimentos.`);
};

sembrar()
  .catch((error) => {
    console.error("✗ Error al sembrar el catálogo:", error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
