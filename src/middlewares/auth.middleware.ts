import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../lib/config";

// Extiende el tipo Request para incluir el profesionista autenticado
export interface RequestAutenticado extends Request {
  profesionistaId?: number;
}

export const verificarToken = (
  req: RequestAutenticado,
  res: Response,
  next: NextFunction,
) => {
  // El token viaja en el encabezado Authorization con el formato "Bearer <token>"
  const encabezado = req.headers.authorization;

  if (!encabezado || !encabezado.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ mensaje: "No autorizado. Token no proporcionado" });
  }

  const token = encabezado.split(" ")[1];

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
