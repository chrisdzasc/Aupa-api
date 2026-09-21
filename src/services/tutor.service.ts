import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../lib/prisma";
import { config } from "../lib/config";

// Hash de una contraseña que no existe. Se compara contra él cuando el
// correo no está registrado, para que la respuesta tarde lo mismo en
// ambos casos y no revele qué correos existen.
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
    where: { email: email.trim().toLowerCase() },
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
