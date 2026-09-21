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
