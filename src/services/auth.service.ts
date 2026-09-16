import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../lib/prisma";
import { config } from "../lib/config";

const SALT_ROUNDS = 10;

interface DatosRegistro {
  nombre: string;
  email: string;
  password: string;
  cedulaProfesional?: string;
}

export const registrarProfesionista = async (datos: DatosRegistro) => {
  // Verificar que el email no esté registrado
  const existente = await prisma.profesionista.findUnique({
    where: { email: datos.email },
  });

  if (existente) {
    throw new Error("Ya existe una cuenta con ese correo electrónico");
  }

  // Cifrar la contraseña
  const passwordHash = await bcrypt.hash(datos.password, SALT_ROUNDS);

  // Crear el profesionista
  const profesionista = await prisma.profesionista.create({
    data: {
      nombre: datos.nombre,
      email: datos.email,
      passwordHash,
      cedulaProfesional: datos.cedulaProfesional,
    },
    select: {
      id: true,
      nombre: true,
      email: true,
      cedulaProfesional: true,
      createdAt: true,
    },
  });

  return profesionista;
};

export const loginProfesionista = async (email: string, password: string) => {
  // Buscar al profesionista
  const profesionista = await prisma.profesionista.findUnique({
    where: { email },
  });

  if (!profesionista) {
    throw new Error("Credenciales incorrectas");
  }

  if (!profesionista.activo) {
    throw new Error("La cuenta está desactivada");
  }

  // Comparar la contraseña con el hash guardado
  const passwordValida = await bcrypt.compare(
    password,
    profesionista.passwordHash,
  );

  if (!passwordValida) {
    throw new Error("Credenciales incorrectas");
  }

  // Generar el token
  const token = jwt.sign(
    { id: profesionista.id, email: profesionista.email },
    config.jwtSecret,
    { expiresIn: "8h", algorithm: "HS256" },
  );

  return {
    token,
    profesionista: {
      id: profesionista.id,
      nombre: profesionista.nombre,
      email: profesionista.email,
      cedulaProfesional: profesionista.cedulaProfesional,
    },
  };
};
