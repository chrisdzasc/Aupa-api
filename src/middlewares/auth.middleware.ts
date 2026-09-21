import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../lib/config";

// Extiende el tipo Request para incluir el profesionista autenticado
export interface RequestAutenticado extends Request {
  profesionistaId?: number;
}

// Extrae el token del encabezado "Authorization: Bearer <token>"
const leerToken = (req: Request): string | null => {
  const encabezado = req.headers.authorization;

  if (!encabezado || !encabezado.startsWith("Bearer ")) {
    return null;
  }

  return encabezado.split(" ")[1] || null;
};

export const verificarToken = (
  req: RequestAutenticado,
  res: Response,
  next: NextFunction,
) => {
  const token = leerToken(req);

  if (!token) {
    return res
      .status(401)
      .json({ mensaje: "No autorizado. Token no proporcionado" });
  }

  try {
    const decodificado = jwt.verify(token, config.jwtSecret, {
      algorithms: ["HS256"],
    }) as { id: number; email: string; rol?: string };

    // Esta ruta es exclusiva del profesionista. Un token de tutor, o uno
    // antiguo sin rol, no debe pasar aunque esté correctamente firmado.
    if (decodificado.rol !== "profesionista") {
      return res
        .status(403)
        .json({ mensaje: "No tienes permiso para acceder a este recurso" });
    }

    req.profesionistaId = decodificado.id;
    next();
  } catch (error) {
    return res.status(401).json({ mensaje: "Token inválido o expirado" });
  }
};

// Extiende Request para incluir los datos del tutor autenticado
export interface RequestTutor extends Request {
  tutorId?: number;
  debeCambiarPassword?: boolean;
}

// Verifica que el token sea válido y pertenezca a un tutor
export const verificarTokenTutor = (
  req: RequestTutor,
  res: Response,
  next: NextFunction,
) => {
  const token = leerToken(req);

  if (!token) {
    return res
      .status(401)
      .json({ mensaje: "No autorizado. Token no proporcionado" });
  }

  try {
    const decodificado = jwt.verify(token, config.jwtSecret, {
      algorithms: ["HS256"],
    }) as {
      id: number;
      email: string;
      rol?: string;
      debeCambiarPassword?: boolean;
    };

    if (decodificado.rol !== "tutor") {
      return res
        .status(403)
        .json({ mensaje: "No tienes permiso para acceder a este recurso" });
    }

    req.tutorId = decodificado.id;
    req.debeCambiarPassword = decodificado.debeCambiarPassword === true;
    next();
  } catch (error) {
    return res.status(401).json({ mensaje: "Token inválido o expirado" });
  }
};

// Bloquea las rutas del tutor hasta que cambie su contraseña temporal.
// Se usa DESPUÉS de verificarTokenTutor.
export const exigirPasswordCambiada = (
  req: RequestTutor,
  res: Response,
  next: NextFunction,
) => {
  if (req.debeCambiarPassword) {
    return res.status(403).json({
      mensaje: "Debes cambiar tu contraseña temporal antes de continuar",
      codigo: "CAMBIO_PASSWORD_REQUERIDO",
    });
  }

  next();
};
