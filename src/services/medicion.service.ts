import prisma from "../lib/prisma";
import { aFechaISO } from "../lib/fechas";

export interface DatosMedicion {
  fechaConsulta: string;
  pesoKg: number;
  tallaCm: number;
  perimetroCefalicoCm?: number;
  perimetroBraquialCm?: number;
  cinturaCm?: number;
  abdomenCm?: number;
  caderaCm?: number;
  pantorrillaCm?: number;
  tricipitalMm?: number;
  notas?: string;
}

// Formatea la fecha de calendario y deja el resto igual
const formatearMedicion = <T extends { fechaConsulta: Date }>(medicion: T) => ({
  ...medicion,
  fechaConsulta: aFechaISO(medicion.fechaConsulta),
});

// Busca un paciente del profesionista. Si no es suyo, es como si no existiera.
const buscarPacienteDelProfesionista = async (
  pacienteId: number,
  profesionistaId: number,
) => {
  const paciente = await prisma.paciente.findFirst({
    where: { id: pacienteId, profesionistaId },
    select: { id: true, fechaNacimiento: true },
  });

  if (!paciente) {
    throw new Error("Paciente no encontrado");
  }

  return paciente;
};

// Valida los datos clínicos. Las mismas reglas del formulario, pero en el
// servidor, porque las del navegador se pueden saltar con Postman o la app.
const validarDatos = (datos: DatosMedicion, fechaNacimiento: Date) => {
  if (!datos.fechaConsulta) {
    throw new Error("La fecha de consulta es obligatoria");
  }

  const fechaConsulta = new Date(datos.fechaConsulta);

  if (isNaN(fechaConsulta.getTime())) {
    throw new Error("La fecha de consulta no es válida");
  }

  const hoy = new Date();
  hoy.setUTCHours(23, 59, 59, 999);

  if (fechaConsulta > hoy) {
    throw new Error("La fecha de consulta no puede ser futura");
  }

  if (fechaConsulta < fechaNacimiento) {
    throw new Error(
      "La fecha de consulta no puede ser anterior al nacimiento del paciente",
    );
  }

  if (!datos.pesoKg || datos.pesoKg <= 0 || datos.pesoKg > 250) {
    throw new Error("El peso debe estar entre 0 y 250 kg");
  }

  if (!datos.tallaCm || datos.tallaCm <= 0 || datos.tallaCm > 250) {
    throw new Error("La talla debe estar entre 0 y 250 cm");
  }

  if (
    datos.perimetroCefalicoCm !== undefined &&
    (datos.perimetroCefalicoCm <= 0 || datos.perimetroCefalicoCm > 70)
  ) {
    throw new Error("El perímetro cefálico debe estar entre 0 y 70 cm");
  }

  return fechaConsulta;
};

// Evita dos mediciones del mismo paciente en la misma fecha.
// excluirId sirve al editar, para no chocar consigo misma.
const verificarFechaDisponible = async (
  pacienteId: number,
  fechaConsulta: Date,
  excluirId?: number,
) => {
  const existente = await prisma.medicion.findFirst({
    where: {
      pacienteId,
      fechaConsulta,
      ...(excluirId ? { id: { not: excluirId } } : {}),
    },
    select: { id: true },
  });

  if (existente) {
    throw new Error(
      "Ya existe una medición registrada para este paciente en esa fecha",
    );
  }
};

// Crear una medición para un paciente del profesionista
export const crearMedicion = async (
  pacienteId: number,
  profesionistaId: number,
  datos: DatosMedicion,
) => {
  const paciente = await buscarPacienteDelProfesionista(
    pacienteId,
    profesionistaId,
  );

  const fechaConsulta = validarDatos(datos, paciente.fechaNacimiento);
  await verificarFechaDisponible(pacienteId, fechaConsulta);

  const medicion = await prisma.medicion.create({
    data: {
      pacienteId,
      fechaConsulta,
      pesoKg: datos.pesoKg,
      tallaCm: datos.tallaCm,
      perimetroCefalicoCm: datos.perimetroCefalicoCm,
      perimetroBraquialCm: datos.perimetroBraquialCm,
      cinturaCm: datos.cinturaCm,
      abdomenCm: datos.abdomenCm,
      caderaCm: datos.caderaCm,
      pantorrillaCm: datos.pantorrillaCm,
      tricipitalMm: datos.tricipitalMm,
      notas: datos.notas,
    },
  });

  return formatearMedicion(medicion);
};

// Listar las mediciones de un paciente, de la más reciente a la más antigua
export const listarMediciones = async (
  pacienteId: number,
  profesionistaId: number,
) => {
  await buscarPacienteDelProfesionista(pacienteId, profesionistaId);

  const mediciones = await prisma.medicion.findMany({
    where: { pacienteId },
    orderBy: { fechaConsulta: "desc" },
  });

  return mediciones.map(formatearMedicion);
};

// Busca una medición cuyo paciente pertenezca al profesionista
const buscarMedicionDelProfesionista = async (
  id: number,
  profesionistaId: number,
) => {
  const medicion = await prisma.medicion.findFirst({
    where: { id, paciente: { profesionistaId } },
    include: {
      paciente: { select: { id: true, fechaNacimiento: true } },
    },
  });

  if (!medicion) {
    throw new Error("Medición no encontrada");
  }

  return medicion;
};

// Obtener una medición
export const obtenerMedicion = async (id: number, profesionistaId: number) => {
  const { paciente, ...medicion } = await buscarMedicionDelProfesionista(
    id,
    profesionistaId,
  );

  return formatearMedicion(medicion);
};

// Editar una medición
export const editarMedicion = async (
  id: number,
  profesionistaId: number,
  datos: DatosMedicion,
) => {
  const existente = await buscarMedicionDelProfesionista(id, profesionistaId);

  const fechaConsulta = validarDatos(datos, existente.paciente.fechaNacimiento);
  await verificarFechaDisponible(existente.pacienteId, fechaConsulta, id);

  const medicion = await prisma.medicion.update({
    where: { id },
    data: {
      fechaConsulta,
      pesoKg: datos.pesoKg,
      tallaCm: datos.tallaCm,
      perimetroCefalicoCm: datos.perimetroCefalicoCm ?? null,
      perimetroBraquialCm: datos.perimetroBraquialCm ?? null,
      cinturaCm: datos.cinturaCm ?? null,
      abdomenCm: datos.abdomenCm ?? null,
      caderaCm: datos.caderaCm ?? null,
      pantorrillaCm: datos.pantorrillaCm ?? null,
      tricipitalMm: datos.tricipitalMm ?? null,
      notas: datos.notas ?? null,
    },
  });

  return formatearMedicion(medicion);
};

// Eliminar una medición (borrado real)
export const eliminarMedicion = async (id: number, profesionistaId: number) => {
  await buscarMedicionDelProfesionista(id, profesionistaId);
  await prisma.medicion.delete({ where: { id } });
};
