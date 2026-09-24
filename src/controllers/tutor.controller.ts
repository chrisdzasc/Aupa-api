import { Request, Response } from "express";
import { RequestTutor } from "../middlewares/auth.middleware";
import * as tutorService from "../services/tutor.service";

// Traduce el mensaje del error a un código HTTP
const responderError = (res: Response, error: unknown, porDefecto: string) => {
  const mensaje = error instanceof Error ? error.message : porDefecto;

  if (
    mensaje === "Correo o contraseña incorrectos" ||
    mensaje.startsWith("Tu cuenta no tiene acceso") ||
    mensaje === "La contraseña actual es incorrecta"
  ) {
    return res.status(401).json({ mensaje });
  }

  if (mensaje.includes("no encontrad")) {
    return res.status(404).json({ mensaje });
  }

  return res.status(400).json({ mensaje });
};

// Toma un campo de texto del body, o cadena vacía si no es texto
const texto = (valor: unknown): string =>
  typeof valor === "string" ? valor : "";

export const login = async (req: Request, res: Response) => {
  try {
    const resultado = await tutorService.loginTutor(
      texto(req.body.email),
      texto(req.body.password),
    );
    return res.status(200).json(resultado);
  } catch (error) {
    return responderError(res, error, "Error al iniciar sesión");
  }
};

// Convierte el id de la URL a número o lanza un error
const leerId = (valor: string | string[] | undefined): number => {
  const id = typeof valor === "string" ? Number(valor) : NaN;

  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Identificador de paciente inválido");
  }

  return id;
};

export const cambiarPassword = async (req: RequestTutor, res: Response) => {
  try {
    const resultado = await tutorService.cambiarPassword(
      req.tutorId!,
      texto(req.body.passwordActual),
      texto(req.body.passwordNueva),
    );
    return res.status(200).json({
      mensaje: "Contraseña actualizada correctamente",
      ...resultado,
    });
  } catch (error) {
    return responderError(res, error, "Error al cambiar la contraseña");
  }
};

export const perfil = async (req: RequestTutor, res: Response) => {
  try {
    const tutor = await tutorService.obtenerPerfil(req.tutorId!);
    return res.status(200).json({ tutor });
  } catch (error) {
    return responderError(res, error, "Error al obtener el perfil");
  }
};

export const hijos = async (req: RequestTutor, res: Response) => {
  try {
    const pacientes = await tutorService.listarHijos(req.tutorId!);
    return res.status(200).json({ pacientes });
  } catch (error) {
    return responderError(res, error, "Error al obtener los pacientes");
  }
};

export const hijo = async (req: RequestTutor, res: Response) => {
  try {
    const paciente = await tutorService.obtenerHijo(
      leerId(req.params.id),
      req.tutorId!,
    );
    return res.status(200).json({ paciente });
  } catch (error) {
    return responderError(res, error, "Error al obtener el paciente");
  }
};

export const medicionesHijo = async (req: RequestTutor, res: Response) => {
  try {
    const mediciones = await tutorService.listarMedicionesHijo(
      leerId(req.params.id),
      req.tutorId!,
    );
    return res.status(200).json({ mediciones });
  } catch (error) {
    return responderError(res, error, "Error al obtener las mediciones");
  }
};

export const curvas = async (req: RequestTutor, res: Response) => {
  try {
    const indicador = texto(req.query.indicador);

    if (!tutorService.esIndicadorValido(indicador)) {
      return res.status(400).json({
        mensaje:
          "Indicador inválido. Valores permitidos: talla-edad, peso-edad, imc-edad, peso-talla",
      });
    }

    const curva = await tutorService.obtenerCurva(
      leerId(req.params.id),
      req.tutorId!,
      indicador,
    );

    return res.status(200).json(curva);
  } catch (error) {
    return responderError(res, error, "Error al obtener la curva");
  }
};
