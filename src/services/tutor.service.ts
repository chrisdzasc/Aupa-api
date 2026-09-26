import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../lib/prisma";
import { config } from "../lib/config";
import { normalizarEmail } from "../lib/texto";
import {
  aFechaISO,
  edadEnMeses,
  hoyEnMexico,
  aFechaMexico,
  aHoraMexico,
} from "../lib/fechas";
import { calcularIMC, aNumero } from "../lib/antropometria";
import { edadEnDias } from "../lib/fechas";
import { calcularPuntuacionesZ } from "../lib/oms";
import { construirCurva } from "../lib/oms";

// Hash de una contraseña que no existe.
// Se compara contra él cuando el correo no está registrado, para que la respuesta tarde lo mismo en ambos casos y no revele qué correos existen.
const HASH_FALSO = bcrypt.hashSync("contrasena-que-no-existe", 10);

const MENSAJE_CREDENCIALES = "Correo o contraseña incorrectos";

// Firma el token del tutor. Dura 7 días porque se usa desde el celular
// y se guarda en almacenamiento cifrado (expo-secure-store).
const generarTokenTutor = (tutor: {
  id: number;
  email: string;
  debeCambiarPassword: boolean;
}) => {
  return jwt.sign(
    {
      id: tutor.id,
      email: tutor.email,
      rol: "tutor",
      debeCambiarPassword: tutor.debeCambiarPassword,
    },
    config.jwtSecret,
    { expiresIn: "7d", algorithm: "HS256" },
  );
};

export const loginTutor = async (email: string, password: string) => {
  if (!email || !password) {
    throw new Error("El correo y la contraseña son obligatorios");
  }

  const tutor = await prisma.tutor.findUnique({
    where: { email: normalizarEmail(email) },
  });

  // Siempre se ejecuta bcrypt.compare, exista o no el tutor
  const passwordValida = await bcrypt.compare(
    password,
    tutor?.passwordHash ?? HASH_FALSO,
  );

  if (!tutor || !tutor.passwordHash || !passwordValida) {
    throw new Error(MENSAJE_CREDENCIALES);
  }

  // Se revisa DESPUÉS de la contraseña, para no revelar el estado de la
  // cuenta a quien no conoce la contraseña
  if (!tutor.tieneAcceso) {
    throw new Error(
      "Tu cuenta no tiene acceso a la app. Contacta a tu nutriólogo",
    );
  }

  return {
    token: generarTokenTutor(tutor),
    debeCambiarPassword: tutor.debeCambiarPassword,
    tutor: {
      id: tutor.id,
      nombre: tutor.nombre,
      email: tutor.email,
    },
  };
};

export const cambiarPassword = async (
  tutorId: number,
  passwordActual: string,
  passwordNueva: string,
) => {
  if (!passwordActual || !passwordNueva) {
    throw new Error("La contraseña actual y la nueva son obligatorias");
  }

  if (passwordNueva.length < 8) {
    throw new Error("La contraseña nueva debe tener al menos 8 caracteres");
  }

  // bcrypt solo toma en cuenta los primeros 72 bytes
  if (Buffer.byteLength(passwordNueva, "utf8") > 72) {
    throw new Error("La contraseña nueva es demasiado larga");
  }

  if (passwordNueva === passwordActual) {
    throw new Error("La contraseña nueva debe ser distinta a la actual");
  }

  const tutor = await prisma.tutor.findUnique({ where: { id: tutorId } });

  if (!tutor || !tutor.passwordHash) {
    throw new Error("Tutor no encontrado");
  }

  const passwordValida = await bcrypt.compare(
    passwordActual,
    tutor.passwordHash,
  );

  if (!passwordValida) {
    throw new Error("La contraseña actual es incorrecta");
  }

  const passwordHash = await bcrypt.hash(passwordNueva, 10);

  const actualizado = await prisma.tutor.update({
    where: { id: tutorId },
    data: {
      passwordHash,
      debeCambiarPassword: false,
      // Si entró con la temporal y la cambió, recibió sus credenciales
      cuentaConfirmada: true,
      tokenConfirmacion: null,
      tokenExpira: null,
    },
  });

  return {
    token: generarTokenTutor(actualizado),
    debeCambiarPassword: false,
  };
};

export const obtenerPerfil = async (tutorId: number) => {
  const tutor = await prisma.tutor.findUnique({
    where: { id: tutorId },
    select: {
      id: true,
      nombre: true,
      email: true,
      telefono: true,
      parentesco: true,
    },
  });

  if (!tutor) {
    throw new Error("Tutor no encontrado");
  }

  return tutor;
};

// Rango de edad del checklist de alimentos, confirmado con la nutrióloga
const CHECKLIST_EDAD_MIN_MESES = 6;
const CHECKLIST_EDAD_MAX_MESES = 24;

// Lista de hijos del tutor, con su última medición
export const listarHijos = async (tutorId: number) => {
  const pacientes = await prisma.paciente.findMany({
    where: { tutorId, activo: true },
    orderBy: { nombre: "asc" },
    include: {
      profesionista: { select: { nombre: true } },
      mediciones: {
        orderBy: { fechaConsulta: "desc" },
        take: 1,
        select: { fechaConsulta: true, pesoKg: true, tallaCm: true },
      },
    },
  });

  return pacientes.map((p) => {
    const ultima = p.mediciones[0];

    return {
      id: p.id,
      nombre: p.nombre,
      sexo: p.sexo,
      fechaNacimiento: aFechaISO(p.fechaNacimiento),
      nutriologo: p.profesionista.nombre,
      ultimaMedicion: ultima
        ? {
            fechaConsulta: aFechaISO(ultima.fechaConsulta),
            pesoKg: Number(ultima.pesoKg),
            tallaCm: Number(ultima.tallaCm),
          }
        : null,
    };
  });
};

// Detalle de un hijo del tutor
export const obtenerHijo = async (pacienteId: number, tutorId: number) => {
  const p = await prisma.paciente.findFirst({
    where: { id: pacienteId, tutorId, activo: true },
    include: {
      profesionista: {
        select: { nombre: true, email: true, telefonoContacto: true },
      },
      alertas: { select: { descripcion: true, tipo: true } },
      mediciones: { orderBy: { fechaConsulta: "desc" }, take: 1 },
      citas: {
        where: { estado: "PENDIENTE", fechaHora: { gte: new Date() } },
        orderBy: { fechaHora: "asc" },
        take: 1,
        select: { id: true, fechaHora: true },
      },
    },
  });

  if (!p) {
    throw new Error("Paciente no encontrado");
  }

  const edadHoy = edadEnMeses(p.fechaNacimiento, hoyEnMexico());
  const ultima = p.mediciones[0];
  const cita = p.citas[0];

  return {
    id: p.id,
    nombre: p.nombre,
    sexo: p.sexo,
    fechaNacimiento: aFechaISO(p.fechaNacimiento),
    numeroExpediente: p.numeroExpediente,
    aplicaChecklistAlimentos:
      edadHoy >= CHECKLIST_EDAD_MIN_MESES && edadHoy < CHECKLIST_EDAD_MAX_MESES,
    nutriologo: {
      nombre: p.profesionista.nombre,
      email: p.profesionista.email,
      telefonoContacto: p.profesionista.telefonoContacto,
    },
    alertas: p.alertas,
    estadoActual: ultima
      ? (() => {
          const pesoKg = Number(ultima.pesoKg);
          const tallaCm = Number(ultima.tallaCm);
          const z = calcularPuntuacionesZ({
            sexo: p.sexo,
            edadDias: edadEnDias(p.fechaNacimiento, ultima.fechaConsulta),
            pesoKg,
            tallaCm,
            perimetroCefalicoCm: aNumero(ultima.perimetroCefalicoCm),
          });

          return {
            fechaConsulta: aFechaISO(ultima.fechaConsulta),
            edadMeses: edadEnMeses(p.fechaNacimiento, ultima.fechaConsulta),
            pesoKg,
            tallaCm,
            imc: calcularIMC(pesoKg, tallaCm),
            perimetroCefalicoCm: aNumero(ultima.perimetroCefalicoCm),
            puntuacionZ: {
              pesoEdad: z.pesoEdad,
              tallaEdad: z.tallaEdad,
              imcEdad: z.imcEdad,
              pesoTalla: z.pesoTalla,
              perimetroCefalicoEdad: z.perimetroCefalicoEdad,
            },
            estadoNutricional: null,
          };
        })()
      : null,
    proximaCita: cita
      ? {
          id: cita.id,
          fecha: aFechaMexico(cita.fechaHora),
          hora: aHoraMexico(cita.fechaHora),
        }
      : null,
  };
};

// Historial de mediciones de un hijo, sin notas clínicas
export const listarMedicionesHijo = async (
  pacienteId: number,
  tutorId: number,
) => {
  const paciente = await prisma.paciente.findFirst({
    where: { id: pacienteId, tutorId, activo: true },
    select: { fechaNacimiento: true, sexo: true },
  });

  if (!paciente) {
    throw new Error("Paciente no encontrado");
  }

  const mediciones = await prisma.medicion.findMany({
    where: { pacienteId },
    orderBy: { fechaConsulta: "desc" },
  });

  return mediciones.map((m) => {
    const pesoKg = Number(m.pesoKg);
    const tallaCm = Number(m.tallaCm);

    const z = calcularPuntuacionesZ({
      sexo: paciente.sexo,
      edadDias: edadEnDias(paciente.fechaNacimiento, m.fechaConsulta),
      pesoKg,
      tallaCm,
      perimetroCefalicoCm: aNumero(m.perimetroCefalicoCm),
    });

    return {
      id: m.id,
      fechaConsulta: aFechaISO(m.fechaConsulta),
      edadMeses: edadEnMeses(paciente.fechaNacimiento, m.fechaConsulta),
      pesoKg,
      tallaCm,
      imc: calcularIMC(pesoKg, tallaCm),
      perimetroCefalicoCm: aNumero(m.perimetroCefalicoCm),
      puntuacionZ: {
        pesoEdad: z.pesoEdad,
        tallaEdad: z.tallaEdad,
        imcEdad: z.imcEdad,
        pesoTalla: z.pesoTalla,
        perimetroCefalicoEdad: z.perimetroCefalicoEdad,
      },
      estadoNutricional: null,
    };
  });
};

const INDICADORES_CURVA = {
  "talla-edad": { etiqueta: "Talla para la edad", unidad: "cm" },
  "peso-edad": { etiqueta: "Peso para la edad", unidad: "kg" },
  "imc-edad": { etiqueta: "IMC para la edad", unidad: "kg/m²" },
  "peso-talla": { etiqueta: "Peso para la talla", unidad: "kg" },
  "perimetro-cefalico-edad": {
    etiqueta: "Perímetro cefálico para la edad",
    unidad: "cm",
  },
} as const;

export type IndicadorCurva = keyof typeof INDICADORES_CURVA;

export const esIndicadorValido = (valor: string): valor is IndicadorCurva =>
  valor in INDICADORES_CURVA;

export const obtenerCurva = async (
  pacienteId: number,
  tutorId: number,
  indicador: IndicadorCurva,
) => {
  const paciente = await prisma.paciente.findFirst({
    where: { id: pacienteId, tutorId, activo: true },
    select: {
      sexo: true,
      fechaNacimiento: true,
      mediciones: { orderBy: { fechaConsulta: "asc" } },
    },
  });

  if (!paciente) {
    throw new Error("Paciente no encontrado");
  }

  return construirCurva(paciente, indicador);
};
