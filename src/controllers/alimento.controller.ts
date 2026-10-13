import { Response } from "express";
import { RequestAutenticado } from "../middlewares/auth.middleware";
import * as alimentoService from "../services/alimento.service";

const leerId = (valor: unknown, nombre: string): number => {
  const id = typeof valor === "string" ? Number(valor) : NaN;

  if (!Number.isInteger(id) || id <= 0) {
    throw new Error(`Identificador de ${nombre} inválido`);
  }

  return id;
};

const responderError = (res: Response, error: unknown, porDefecto: string) => {
  const mensaje = error instanceof Error ? error.message : porDefecto;

  if (mensaje.includes("no encontrad")) {
    return res.status(404).json({ mensaje });
  }

  return res.status(400).json({ mensaje });
};

export const panel = async (req: RequestAutenticado, res: Response) => {
  try {
    const datos = await alimentoService.obtenerPanelAlimentacion(
      leerId(req.params.id, "paciente"),
      req.profesionistaId!,
    );
    return res.status(200).json(datos);
  } catch (error) {
    return responderError(
      res,
      error,
      "Error al obtener la alimentación del paciente",
    );
  }
};

export const detalle = async (req: RequestAutenticado, res: Response) => {
  try {
    const datos = await alimentoService.obtenerDetalleParaProfesionista(
      leerId(req.params.id, "paciente"),
      req.profesionistaId!,
      leerId(req.params.alimentoId, "alimento"),
    );
    return res.status(200).json(datos);
  } catch (error) {
    return responderError(res, error, "Error al obtener el detalle");
  }
};

export const historial = async (req: RequestAutenticado, res: Response) => {
  try {
    const pagina = Number(req.query.pagina ?? 1);

    if (!Number.isInteger(pagina) || pagina < 1) {
      return res
        .status(400)
        .json({ mensaje: "La página debe ser un número entero mayor a cero" });
    }

    const datos = await alimentoService.obtenerHistorialAlimentos(
      leerId(req.params.id, "paciente"),
      req.profesionistaId!,
      pagina,
    );
    return res.status(200).json(datos);
  } catch (error) {
    return responderError(res, error, "Error al obtener el historial");
  }
};
