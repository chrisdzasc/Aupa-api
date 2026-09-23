import prisma from "../lib/prisma";
import { Sexo, TipoParto, Parentesco, TipoAlerta } from "@prisma/client";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { aFechaISO } from "../lib/fechas";
import { normalizarEmail } from "../lib/texto";
import { puntuacionesDeMedicion } from "../lib/antropometria";

interface DatosAlerta {
  descripcion: string;
  tipo: TipoAlerta;
}

interface DatosMedicionInicial {
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

interface DatosNuevoPaciente {
  // Paciente
  nombre: string;
  sexo: Sexo;
  fechaNacimiento: string;
  semanasGestacion?: number;
  tipoParto?: TipoParto;
  pesoNacerKg?: number;
  tallaNacerCm?: number;
  perimetroCefalicoNacerCm?: number;
  tipoAlimentacion?: string;
  inicioComplementaria?: string;
  observaciones?: string;

  // Tutor
  tutor: {
    nombre: string;
    parentesco: Parentesco;
    telefono: string;
    email: string;
    generarAcceso?: boolean;
  };

  // Alertas y antecedentes
  alertas?: DatosAlerta[];
  antecedentesFamiliares?: { condicion: string; detalle?: string }[];

  // Primera consulta
  medicionInicial?: DatosMedicionInicial;
}

// Da formato al número de expediente (4 → "EXP-0004")
const formatearNumeroExpediente = (numero: number): string => {
  return `EXP-${String(numero).padStart(4, "0")}`;
};

// Genera una contraseña temporal legible (ej. "Aupa-4F7B2K")
const generarPasswordTemporal = (): string => {
  const caracteres = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sin caracteres ambiguos
  let aleatorio = "";
  for (let i = 0; i < 6; i++) {
    aleatorio += caracteres[crypto.randomInt(0, caracteres.length)];
  }
  return `Aupa-${aleatorio}`;
};

// Genera el token de confirmación de cuenta
const generarTokenConfirmacion = (): string => {
  return crypto.randomBytes(32).toString("hex");
};

export const crearPaciente = async (
  profesionistaId: number,
  datos: DatosNuevoPaciente,
) => {
  const generarAcceso = datos.tutor.generarAcceso ?? true;

  // Preparar las credenciales ANTES de la transacción.
  // bcrypt es lento a propósito, y una transacción debe durar lo menos posible.
  // Si el tutor ya existe, estos valores simplemente no se usan.
  let passwordTemporal: string | null = null;
  let passwordHash: string | undefined = undefined;
  let tokenConfirmacion: string | undefined = undefined;
  let tokenExpira: Date | undefined = undefined;

  if (generarAcceso) {
    passwordTemporal = generarPasswordTemporal();
    passwordHash = await bcrypt.hash(passwordTemporal, 10);
    tokenConfirmacion = generarTokenConfirmacion();

    // El token expira en 7 días
    tokenExpira = new Date();
    tokenExpira.setDate(tokenExpira.getDate() + 7);
  }

  const emailTutor = normalizarEmail(datos.tutor.email);

  // Todo lo que ocurre dentro se guarda completo o no se guarda nada
  const { paciente, tutor, tutorEsNuevo } = await prisma.$transaction(
    async (tx) => {
      // 1. Buscar al tutor por email o crearlo si no existe
      const tutorExistente = await tx.tutor.findUnique({
        where: { email: emailTutor },
      });

      const tutor =
        tutorExistente ??
        (await tx.tutor.create({
          data: {
            nombre: datos.tutor.nombre,
            parentesco: datos.tutor.parentesco,
            telefono: datos.tutor.telefono,
            email: emailTutor,
            tieneAcceso: generarAcceso,
            passwordHash,
            tokenConfirmacion,
            tokenExpira,
            cuentaConfirmada: false,
            debeCambiarPassword: true,
          },
        }));

      // 2. Incrementar el contador del profesionista de forma atómica.
      //    MySQL bloquea su fila hasta que termine la transacción.
      const profesionista = await tx.profesionista.update({
        where: { id: profesionistaId },
        data: { ultimoExpediente: { increment: 1 } },
        select: { ultimoExpediente: true },
      });

      const numeroExpediente = formatearNumeroExpediente(
        profesionista.ultimoExpediente,
      );

      // 3. Crear el paciente con todo lo relacionado
      const paciente = await tx.paciente.create({
        data: {
          numeroExpediente,
          nombre: datos.nombre,
          sexo: datos.sexo,
          fechaNacimiento: new Date(datos.fechaNacimiento),
          semanasGestacion: datos.semanasGestacion,
          tipoParto: datos.tipoParto,
          pesoNacerKg: datos.pesoNacerKg,
          tallaNacerCm: datos.tallaNacerCm,
          perimetroCefalicoNacerCm: datos.perimetroCefalicoNacerCm,
          tipoAlimentacion: datos.tipoAlimentacion,
          inicioComplementaria: datos.inicioComplementaria,
          observaciones: datos.observaciones,
          profesionistaId,
          tutorId: tutor.id,

          alertas: datos.alertas?.length
            ? { create: datos.alertas }
            : undefined,

          antecedentesFamiliares: datos.antecedentesFamiliares?.length
            ? { create: datos.antecedentesFamiliares }
            : undefined,

          mediciones: datos.medicionInicial
            ? {
                create: {
                  fechaConsulta: new Date(datos.medicionInicial.fechaConsulta),
                  pesoKg: datos.medicionInicial.pesoKg,
                  tallaCm: datos.medicionInicial.tallaCm,
                  perimetroCefalicoCm:
                    datos.medicionInicial.perimetroCefalicoCm,
                  perimetroBraquialCm:
                    datos.medicionInicial.perimetroBraquialCm,
                  cinturaCm: datos.medicionInicial.cinturaCm,
                  abdomenCm: datos.medicionInicial.abdomenCm,
                  caderaCm: datos.medicionInicial.caderaCm,
                  pantorrillaCm: datos.medicionInicial.pantorrillaCm,
                  tricipitalMm: datos.medicionInicial.tricipitalMm,
                  notas: datos.medicionInicial.notas,
                },
              }
            : undefined,
        },
        include: {
          tutor: {
            select: {
              id: true,
              nombre: true,
              parentesco: true,
              telefono: true,
              email: true,
              tieneAcceso: true,
              cuentaConfirmada: true,
            },
          },
          alertas: true,
          antecedentesFamiliares: true,
          mediciones: true,
        },
      });

      return { paciente, tutor, tutorEsNuevo: !tutorExistente };
    },
  );

  return {
    paciente: {
      ...paciente,
      fechaNacimiento: aFechaISO(paciente.fechaNacimiento),
      mediciones: paciente.mediciones.map((medicion) => ({
        ...medicion,
        fechaConsulta: aFechaISO(medicion.fechaConsulta),
      })),
    },
    credencialesTutor:
      tutorEsNuevo && passwordTemporal
        ? {
            email: tutor.email,
            passwordTemporal,
            mensaje:
              "Estas credenciales solo se muestran una vez. Cuando se implemente el envío de correo, se enviarán automáticamente al tutor.",
          }
        : null,
  };
};

export const listarPacientes = async (profesionistaId: number) => {
  const pacientes = await prisma.paciente.findMany({
    where: { profesionistaId },
    include: {
      tutor: {
        select: { nombre: true, telefono: true, email: true, parentesco: true },
      },
      mediciones: {
        orderBy: { fechaConsulta: "desc" },
        take: 1,
        select: { fechaConsulta: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return pacientes.map((paciente) => ({
    ...paciente,
    fechaNacimiento: aFechaISO(paciente.fechaNacimiento),
    mediciones: paciente.mediciones.map((medicion) => ({
      ...medicion,
      fechaConsulta: aFechaISO(medicion.fechaConsulta),
    })),
  }));
};

export const obtenerPaciente = async (id: number, profesionistaId: number) => {
  const paciente = await prisma.paciente.findFirst({
    where: { id, profesionistaId },
    include: {
      tutor: {
        select: {
          id: true,
          nombre: true,
          parentesco: true,
          telefono: true,
          email: true,
          tieneAcceso: true,
          cuentaConfirmada: true,
        },
      },
      alertas: true,
      antecedentesFamiliares: true,
      mediciones: { orderBy: { fechaConsulta: "desc" } },
    },
  });

  if (!paciente) {
    throw new Error("Paciente no encontrado");
  }

  return {
    ...paciente,
    fechaNacimiento: aFechaISO(paciente.fechaNacimiento),
    mediciones: paciente.mediciones.map((medicion) => ({
      ...medicion,
      fechaConsulta: aFechaISO(medicion.fechaConsulta),
      puntuacionZ: puntuacionesDeMedicion(paciente, medicion),
    })),
  };
};
