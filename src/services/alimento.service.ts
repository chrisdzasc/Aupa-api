import prisma from "../lib/prisma";
import { Aceptacion, CategoriaAlimento } from "@prisma/client";
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

type AlimentoCatalogo = {
  id: number;
  nombre: string;
  categoria: CategoriaAlimento;
  edadMinimaMeses: number;
  esAlergenoComun: boolean;
};

type RegistroConAlimento = {
  id: number;
  alimentoId: number;
  fecha: Date;
  aceptacion: Aceptacion;
  tuvoReaccion: boolean;
  descripcionReaccion: string | null;
  alimento: { nombre: string };
};

const comoIntento = (r: RegistroConAlimento) => ({
  id: r.id,
  alimentoId: r.alimentoId,
  alimento: r.alimento.nombre,
  fecha: aFechaISO(r.fecha),
  aceptacion: r.aceptacion,
  tuvoReaccion: r.tuvoReaccion,
  descripcionReaccion: r.descripcionReaccion,
});

// Resume los intentos por alimento en una sola pasada. Los registros llegan de la más antigua a la más reciente, así que el último que se escribe es el vigente.
const resumirPorAlimento = (
  registros: {
    alimentoId: number;
    fecha: Date;
    aceptacion: Aceptacion;
    tuvoReaccion: boolean;
  }[],
) => {
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

  return porAlimento;
};

// Cruza el catálogo con lo que el niño ya probó
const construirLista = (
  alimentos: AlimentoCatalogo[],
  porAlimento: Map<number, ResumenAlimento>,
  edadMeses: number,
) =>
  alimentos.map((a) => {
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

  const porAlimento = resumirPorAlimento(registros);
  const lista = construirLista(alimentos, porAlimento, edadMeses);

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

// Lo que comparten el detalle del tutor y el del nutriólogo: el alimento y todos sus intentos. Lo único distinto es quién tiene permiso de pedirlo, así que la verificación se queda afuera.
const construirDetalle = async (
  pacienteId: number,
  alimentoId: number,
  fechaNacimiento: Date,
) => {
  const alimento = await prisma.alimento.findUnique({
    where: { id: alimentoId },
    select: {
      id: true,
      nombre: true,
      categoria: true,
      edadMinimaMeses: true,
      esAlergenoComun: true,
    },
  });

  if (!alimento) {
    throw new Error("Alimento no encontrado");
  }

  const registros = await prisma.registroAlimento.findMany({
    where: { pacienteId, alimentoId },
    orderBy: [{ fecha: "desc" }, { id: "desc" }],
    select: {
      id: true,
      fecha: true,
      aceptacion: true,
      tuvoReaccion: true,
      descripcionReaccion: true,
    },
  });

  const edadMeses = edadEnMeses(fechaNacimiento, hoyEnMexico());

  return {
    alimento: {
      ...alimento,
      apto: edadMeses >= alimento.edadMinimaMeses,
    },
    vecesOfrecido: registros.length,
    tuvoReaccion: registros.some((r) => r.tuvoReaccion),
    intentos: registros.map((r) => ({
      id: r.id,
      fecha: aFechaISO(r.fecha),
      aceptacion: r.aceptacion,
      tuvoReaccion: r.tuvoReaccion,
      descripcionReaccion: r.descripcionReaccion,
    })),
  };
};

// Detalle para el tutor: solo sobre sus propios hijos
export const obtenerDetalleAlimento = async (
  pacienteId: number,
  tutorId: number,
  alimentoId: number,
) => {
  const paciente = await buscarPacienteDelTutor(pacienteId, tutorId);
  return construirDetalle(pacienteId, alimentoId, paciente.fechaNacimiento);
};

// El profesionista sí puede consultar pacientes que dio de baja.
const buscarPacienteDelProfesionista = async (
  pacienteId: number,
  profesionistaId: number,
) => {
  const paciente = await prisma.paciente.findFirst({
    where: { id: pacienteId, profesionistaId },
    select: {
      id: true,
      nombre: true,
      numeroExpediente: true,
      fechaNacimiento: true,
    },
  });

  if (!paciente) {
    throw new Error("Paciente no encontrado");
  }

  return paciente;
};

// Orden fijo para que el avance por categoría siempre se pinte igual
const CATEGORIAS: CategoriaAlimento[] = [
  "FRUTA",
  "VERDURA",
  "CEREAL_TUBERCULO",
  "LEGUMINOSA",
  "ORIGEN_ANIMAL",
  "LACTEO",
  "GRASA_OLEAGINOSA",
];

// Panel de alimentación del expediente: los cuatro bloques de la pestaña derivados de las mismas consultas.
export const obtenerPanelAlimentacion = async (
  pacienteId: number,
  profesionistaId: number,
) => {
  const paciente = await buscarPacienteDelProfesionista(
    pacienteId,
    profesionistaId,
  );
  const edadMeses = edadEnMeses(paciente.fechaNacimiento, hoyEnMexico());

  // Medianoche de hoy en México, como momento exacto
  const inicioDeHoy = new Date(`${aFechaMexico(new Date())}T00:00:00-06:00`);

  const [alimentos, registros, consultaAnterior] = await Promise.all([
    prisma.alimento.findMany({
      where: { activo: true },
      orderBy: [
        { categoria: "asc" },
        { edadMinimaMeses: "asc" },
        { nombre: "asc" },
      ],
    }),
    // A diferencia del checklist del tutor, aquí se traen el nombre del alimento y la descripción de la reacción
    prisma.registroAlimento.findMany({
      where: { pacienteId },
      orderBy: [{ fecha: "asc" }, { id: "asc" }],
      include: { alimento: { select: { nombre: true } } },
    }),
    // La última consulta terminada ANTES de hoy: si la consulta es hoy, lo que el nutriólogo quiere ver es lo registrado desde la visita anterior, no desde esta mañana.
    prisma.cita.findFirst({
      where: {
        pacienteId,
        profesionistaId,
        estado: "COMPLETADA",
        fechaHora: { lt: inicioDeHoy },
      },
      orderBy: { fechaHora: "desc" },
      select: { fechaHora: true },
    }),
  ]);

  const porAlimento = resumirPorAlimento(registros);
  const lista = construirLista(alimentos, porAlimento, edadMeses);

  // Todas las reacciones del historial, de la más reciente a la más antigua
  const reacciones = registros
    .filter((r) => r.tuvoReaccion)
    .reverse()
    .map(comoIntento);

  const avancePorCategoria = CATEGORIAS.map((categoria) => {
    const deCategoria = lista.filter((a) => a.categoria === categoria);
    const aptos = deCategoria.filter((a) => a.apto);

    return {
      categoria,
      total: deCategoria.length,
      aptos: aptos.length,
      // Cuenta solo entre los que ya le corresponden por edad, para que la fracción nunca salga mayor que su total. Un alimento probado antes de tiempo sí aparece en el listado completo.
      probados: aptos.filter((a) => a.vecesOfrecido > 0).length,
    };
  });

  const desde = consultaAnterior
    ? aFechaMexico(consultaAnterior.fechaHora)
    : null;

  // Se incluye el día de la consulta anterior: un registro de ese mismo día pudo capturarse después de la cita.
  const recientes = registros
    .filter((r) => (desde ? aFechaISO(r.fecha) >= desde : true))
    .reverse()
    .map(comoIntento);

  return {
    paciente: {
      id: paciente.id,
      nombre: paciente.nombre,
      numeroExpediente: paciente.numeroExpediente,
      edadMeses,
    },
    resumen: {
      total: lista.length,
      aptos: lista.filter((a) => a.apto).length,
      probados: lista.filter((a) => a.vecesOfrecido > 0).length,
    },
    reacciones,
    avancePorCategoria,
    // desde en null significa que no hay consulta previa: se muestra todo
    actividadReciente: { desde, intentos: recientes },
    alimentos: lista,
  };
};

// Detalle para el nutriólogo, al expandir la fila de un alimento
export const obtenerDetalleParaProfesionista = async (
  pacienteId: number,
  profesionistaId: number,
  alimentoId: number,
) => {
  const paciente = await buscarPacienteDelProfesionista(
    pacienteId,
    profesionistaId,
  );
  return construirDetalle(pacienteId, alimentoId, paciente.fechaNacimiento);
};

const INTENTOS_POR_PAGINA = 15;

// Historial completo de intentos, paginado, para el botón de "ver todo" del bloque de actividad reciente.
export const obtenerHistorialAlimentos = async (
  pacienteId: number,
  profesionistaId: number,
  pagina: number,
) => {
  await buscarPacienteDelProfesionista(pacienteId, profesionistaId);

  const [total, registros] = await Promise.all([
    prisma.registroAlimento.count({ where: { pacienteId } }),
    prisma.registroAlimento.findMany({
      where: { pacienteId },
      orderBy: [{ fecha: "desc" }, { id: "desc" }],
      skip: (pagina - 1) * INTENTOS_POR_PAGINA,
      take: INTENTOS_POR_PAGINA,
      include: { alimento: { select: { nombre: true } } },
    }),
  ]);

  return {
    intentos: registros.map(comoIntento),
    paginacion: {
      pagina,
      porPagina: INTENTOS_POR_PAGINA,
      total,
      totalPaginas: Math.max(1, Math.ceil(total / INTENTOS_POR_PAGINA)),
    },
  };
};
