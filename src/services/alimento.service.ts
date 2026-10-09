import prisma from "../lib/prisma";
import { Aceptacion } from "@prisma/client";
import {
  aFechaISO,
  aFechaMexico,
  edadEnMeses,
  hoyEnMexico,
} from "../lib/fechas";

export interface DatosRegistro {
  alimentoId: number;
  fecha?: string; // "2026-10-09"; si no viene, se usa hoy
  aceptacion: string;
  tuvoReaccion?: boolean;
  descripcionReaccion?: string;
}

const ACEPTACIONES: Aceptacion[] = ["ACEPTADO", "PARCIAL", "RECHAZADO"];

// El tutor solo toca a sus propios hijos, y solo si siguen activos
const buscarPacienteDelTutor = async (pacienteId: number, tutorId: number) => {
  const paciente = await prisma.paciente.findFirst({
    where: { id: pacienteId, tutorId, activo: true },
    select: { id: true, nombre: true, fechaNacimiento: true },
  });

  if (!paciente) {
    throw new Error("Paciente no encontrado");
  }

  return paciente;
};

type ResumenAlimento = {
  veces: number;
  ultimo: { fecha: string; aceptacion: Aceptacion };
  tuvoReaccion: boolean;
};

// Checklist completo de un niño
export const obtenerChecklist = async (pacienteId: number, tutorId: number) => {
  const paciente = await buscarPacienteDelTutor(pacienteId, tutorId);
  const edadMeses = edadEnMeses(paciente.fechaNacimiento, hoyEnMexico());

  const [alimentos, registros] = await Promise.all([
    prisma.alimento.findMany({
      where: { activo: true },
      orderBy: [
        { categoria: "asc" },
        { edadMinimaMeses: "asc" },
        { nombre: "asc" },
      ],
    }),
    prisma.registroAlimento.findMany({
      where: { pacienteId },
      orderBy: [{ fecha: "asc" }, { id: "asc" }],
      select: {
        alimentoId: true,
        fecha: true,
        aceptacion: true,
        tuvoReaccion: true,
      },
    }),
  ]);

  // Resume los intentos por alimento en una sola pasada
  const porAlimento = new Map<number, ResumenAlimento>();

  for (const r of registros) {
    const actual = porAlimento.get(r.alimentoId);
    const ultimo = { fecha: aFechaISO(r.fecha), aceptacion: r.aceptacion };

    if (actual) {
      actual.veces++;
      actual.ultimo = ultimo;
      // Basta una reacción en cualquier intento para marcar el alimento
      actual.tuvoReaccion = actual.tuvoReaccion || r.tuvoReaccion;
    } else {
      porAlimento.set(r.alimentoId, {
        veces: 1,
        ultimo,
        tuvoReaccion: r.tuvoReaccion,
      });
    }
  }

  const lista = alimentos.map((a) => {
    const resumen = porAlimento.get(a.id);

    return {
      id: a.id,
      nombre: a.nombre,
      categoria: a.categoria,
      edadMinimaMeses: a.edadMinimaMeses,
      esAlergenoComun: a.esAlergenoComun,
      // Si el niño ya tiene la edad recomendada para probarlo
      apto: edadMeses >= a.edadMinimaMeses,
      vecesOfrecido: resumen?.veces ?? 0,
      ultimoIntento: resumen?.ultimo ?? null,
      tuvoReaccion: resumen?.tuvoReaccion ?? false,
    };
  });

  return {
    paciente: {
      id: paciente.id,
      nombre: paciente.nombre,
      edadMeses,
    },
    resumen: {
      total: lista.length,
      aptos: lista.filter((a) => a.apto).length,
      probados: lista.filter((a) => a.vecesOfrecido > 0).length,
    },
    alimentos: lista,
  };
};

// Registra que se le ofreció un alimento al niño. Cada intento es un renglón nuevo, nunca se actualiza el anterior
export const registrarIntento = async (
  pacienteId: number,
  tutorId: number,
  datos: DatosRegistro,
) => {
  const paciente = await buscarPacienteDelTutor(pacienteId, tutorId);

  if (!ACEPTACIONES.includes(datos.aceptacion as Aceptacion)) {
    throw new Error(
      `Aceptación inválida. Valores permitidos: ${ACEPTACIONES.join(", ")}`,
    );
  }

  const alimento = await prisma.alimento.findFirst({
    where: { id: datos.alimentoId, activo: true },
    select: { id: true, nombre: true },
  });

  if (!alimento) {
    throw new Error("Alimento no encontrado");
  }

  const fechaTexto = datos.fecha || aFechaMexico(new Date());

  if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaTexto)) {
    throw new Error("La fecha debe tener el formato YYYY-MM-DD");
  }

  const fecha = new Date(`${fechaTexto}T00:00:00.000Z`);

  if (isNaN(fecha.getTime())) {
    throw new Error("La fecha no es válida");
  }

  if (fecha > hoyEnMexico()) {
    throw new Error("No se puede registrar un alimento en una fecha futura");
  }

  if (fecha < paciente.fechaNacimiento) {
    throw new Error("La fecha es anterior al nacimiento del paciente");
  }

  const tuvoReaccion = datos.tuvoReaccion === true;
  const descripcion = datos.descripcionReaccion?.trim() || null;

  if (descripcion && descripcion.length > 300) {
    throw new Error("La descripción no puede exceder los 300 caracteres");
  }

  if (descripcion && !tuvoReaccion) {
    throw new Error(
      "Llegó una descripción de reacción pero no se marcó que hubiera una",
    );
  }

  const registro = await prisma.registroAlimento.create({
    data: {
      pacienteId,
      alimentoId: alimento.id,
      fecha,
      aceptacion: datos.aceptacion as Aceptacion,
      tuvoReaccion,
      descripcionReaccion: tuvoReaccion ? descripcion : null,
    },
  });

  const vecesOfrecido = await prisma.registroAlimento.count({
    where: { pacienteId, alimentoId: alimento.id },
  });

  return {
    id: registro.id,
    alimentoId: alimento.id,
    alimento: alimento.nombre,
    fecha: aFechaISO(registro.fecha),
    aceptacion: registro.aceptacion,
    tuvoReaccion: registro.tuvoReaccion,
    descripcionReaccion: registro.descripcionReaccion,
    vecesOfrecido,
  };
};
