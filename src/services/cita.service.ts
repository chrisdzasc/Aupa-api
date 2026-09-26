import prisma from "../lib/prisma";
import { EstadoCita } from "@prisma/client";
import { aFechaMexico, aHoraMexico } from "../lib/fechas";

export interface DatosCita {
  pacienteId: number;
  fecha: string; // "2026-10-20"
  hora: string; // "17:30"
  notas?: string;
}

// Une fecha y hora locales de México en el momento exacto que se guarda. UTC-6 en el centro del país.
const DESFASE_MEXICO = "-06:00";

const aMomento = (fecha: string, hora: string): Date => {
  const momento = new Date(`${fecha}T${hora}:00${DESFASE_MEXICO}`);

  if (isNaN(momento.getTime())) {
    throw new Error("La fecha o la hora de la cita no son válidas");
  }

  return momento;
};

// Da a la respuesta la forma que esperan el web y la app
const formatearCita = <
  T extends { fechaHora: Date; paciente?: { nombre: string } | null },
>(
  cita: T,
) => {
  const { fechaHora, ...resto } = cita;

  return {
    ...resto,
    fecha: aFechaMexico(fechaHora),
    hora: aHoraMexico(fechaHora),
  };
};

const validarDatos = (datos: DatosCita) => {
  if (!datos.fecha || !datos.hora) {
    throw new Error("La fecha y la hora son obligatorias");
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(datos.fecha)) {
    throw new Error("La fecha debe tener el formato YYYY-MM-DD");
  }

  if (!/^\d{2}:\d{2}$/.test(datos.hora)) {
    throw new Error("La hora debe tener el formato HH:MM");
  }

  if (datos.notas && datos.notas.length > 300) {
    throw new Error("Las notas no pueden exceder los 300 caracteres");
  }
};

// Verifica que el paciente sea del profesionista
const verificarPaciente = async (
  pacienteId: number,
  profesionistaId: number,
) => {
  const paciente = await prisma.paciente.findFirst({
    where: { id: pacienteId, profesionistaId },
    select: { id: true },
  });

  if (!paciente) {
    throw new Error("Paciente no encontrado");
  }
};

// Evita dos citas pendientes del mismo nutriólogo en el mismo horario.
const verificarHorarioLibre = async (
  profesionistaId: number,
  fechaHora: Date,
  excluirId?: number,
) => {
  const ocupada = await prisma.cita.findFirst({
    where: {
      profesionistaId,
      fechaHora,
      estado: "PENDIENTE",
      ...(excluirId ? { id: { not: excluirId } } : {}),
    },
    select: { id: true },
  });

  if (ocupada) {
    throw new Error("Ya tienes una cita agendada en ese horario");
  }
};

const buscarCitaDelProfesionista = async (
  id: number,
  profesionistaId: number,
) => {
  const cita = await prisma.cita.findFirst({
    where: { id, profesionistaId },
  });

  if (!cita) {
    throw new Error("Cita no encontrada");
  }

  return cita;
};

export const crearCita = async (profesionistaId: number, datos: DatosCita) => {
  validarDatos(datos);
  await verificarPaciente(datos.pacienteId, profesionistaId);

  const fechaHora = aMomento(datos.fecha, datos.hora);
  await verificarHorarioLibre(profesionistaId, fechaHora);

  const cita = await prisma.cita.create({
    data: {
      fechaHora,
      notas: datos.notas?.trim() || null,
      pacienteId: datos.pacienteId,
      profesionistaId,
    },
    include: {
      paciente: { select: { nombre: true, numeroExpediente: true } },
    },
  });

  return formatearCita(cita);
};

/* Agenda del profesionista en un rango de fechas. Por defecto solo muestra las pendientes, porque las canceladas ya no ocupan lugar en la agenda. */
export const listarCitas = async (
  profesionistaId: number,
  desde: string,
  hasta: string,
  incluirTodas = false,
) => {
  const inicio = aMomento(desde, "00:00");
  const fin = aMomento(hasta, "23:59");

  const citas = await prisma.cita.findMany({
    where: {
      profesionistaId,
      fechaHora: { gte: inicio, lte: fin },
      ...(incluirTodas ? {} : { estado: "PENDIENTE" as EstadoCita }),
    },
    orderBy: { fechaHora: "asc" },
    include: {
      paciente: { select: { id: true, nombre: true, numeroExpediente: true } },
    },
  });

  return citas.map(formatearCita);
};

/* Citas de un paciente, de la más próxima a la más lejana */
export const listarCitasPaciente = async (
  pacienteId: number,
  profesionistaId: number,
) => {
  await verificarPaciente(pacienteId, profesionistaId);

  const citas = await prisma.cita.findMany({
    where: { pacienteId },
    orderBy: { fechaHora: "desc" },
  });

  return citas.map(formatearCita);
};

/* Reagendar: cambia la fecha o la hora  */
export const editarCita = async (
  id: number,
  profesionistaId: number,
  datos: Omit<DatosCita, "pacienteId">,
) => {
  await buscarCitaDelProfesionista(id, profesionistaId);
  validarDatos({ ...datos, pacienteId: 0 });

  const fechaHora = aMomento(datos.fecha, datos.hora);
  await verificarHorarioLibre(profesionistaId, fechaHora, id);

  const cita = await prisma.cita.update({
    where: { id },
    data: { fechaHora, notas: datos.notas?.trim() || null },
    include: {
      paciente: { select: { nombre: true, numeroExpediente: true } },
    },
  });

  return formatearCita(cita);
};

const ESTADOS_VALIDOS: EstadoCita[] = [
  "PENDIENTE",
  "EN_CURSO",
  "COMPLETADA",
  "CANCELADA",
];

export const cambiarEstado = async (
  id: number,
  profesionistaId: number,
  estado: string,
) => {
  if (!ESTADOS_VALIDOS.includes(estado as EstadoCita)) {
    throw new Error(
      `Estado inválido. Valores permitidos: ${ESTADOS_VALIDOS.join(", ")}`,
    );
  }

  await buscarCitaDelProfesionista(id, profesionistaId);

  const cita = await prisma.cita.update({
    where: { id },
    data: { estado: estado as EstadoCita },
    include: {
      paciente: { select: { nombre: true, numeroExpediente: true } },
    },
  });

  return formatearCita(cita);
};

/* Borrado real, para errores de captura. Cancelar es lo normal. */
export const eliminarCita = async (id: number, profesionistaId: number) => {
  await buscarCitaDelProfesionista(id, profesionistaId);
  await prisma.cita.delete({ where: { id } });
};
