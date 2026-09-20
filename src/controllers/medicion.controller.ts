import { Response } from "express";
import { RequestAutenticado } from "../middlewares/auth.middleware";
import * as medicionService from "../services/medicion.service";
import { DatosMedicion } from "../services/medicion.service";

const CAMPOS_NUMERICOS = [
  "pesoKg",
  "tallaCm",
  "perimetroCefalicoCm",
  "perimetroBraquialCm",
  "cinturaCm",
  "abdomenCm",
  "caderaCm",
  "pantorrillaCm",
  "tricipitalMm",
] as const;

// Toma del body solo los campos esperados y revisa que los números
// lleguen como número. "12.8" como texto se rechaza.
const extraerDatos = (body: any): DatosMedicion => {
  for (const campo of CAMPOS_NUMERICOS) {
    const valor = body[campo];
    if (valor !== undefined && valor !== null && typeof valor !== "number") {
      throw new Error(`El campo ${campo} debe ser numérico`);
    }
  }

  return {
    fechaConsulta: body.fechaConsulta,
    pesoKg: body.pesoKg,
    tallaCm: body.tallaCm,
    perimetroCefalicoCm: body.perimetroCefalicoCm ?? undefined,
    perimetroBraquialCm: body.perimetroBraquialCm ?? undefined,
    cinturaCm: body.cinturaCm ?? undefined,
    abdomenCm: body.abdomenCm ?? undefined,
    caderaCm: body.caderaCm ?? undefined,
    pantorrillaCm: body.pantorrillaCm ?? undefined,
    tricipitalMm: body.tricipitalMm ?? undefined,
    notas:
      typeof body.notas === "string" && body.notas.trim()
        ? body.notas.trim()
        : undefined,
  };
};

// Convierte el id de la URL a número o lanza un error.
// En Express 5 un parámetro puede tiparse como arreglo, así que se valida.
const leerId = (
  valor: string | string[] | undefined,
  nombre: string,
): number => {
  if (typeof valor !== "string") {
    throw new Error(`Identificador de ${nombre} inválido`);
  }

  const id = Number(valor);
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error(`Identificador de ${nombre} inválido`);
  }
  return id;
};

// Traduce el mensaje del error a un código HTTP
const responderError = (res: Response, error: unknown, porDefecto: string) => {
  const mensaje = error instanceof Error ? error.message : porDefecto;

  if (mensaje.includes("no encontrad")) {
    return res.status(404).json({ mensaje });
  }
  if (mensaje.startsWith("Ya existe")) {
    return res.status(409).json({ mensaje });
  }
  return res.status(400).json({ mensaje });
};

export const crear = async (req: RequestAutenticado, res: Response) => {
  try {
    const pacienteId = leerId(req.params.id, "paciente");
    const medicion = await medicionService.crearMedicion(
      pacienteId,
      req.profesionistaId!,
      extraerDatos(req.body),
    );
    return res
      .status(201)
      .json({ mensaje: "Medición registrada correctamente", medicion });
  } catch (error) {
    return responderError(res, error, "Error al registrar la medición");
  }
};

export const listar = async (req: RequestAutenticado, res: Response) => {
  try {
    const pacienteId = leerId(req.params.id, "paciente");
    const mediciones = await medicionService.listarMediciones(
      pacienteId,
      req.profesionistaId!,
    );
    return res.status(200).json({ mediciones });
  } catch (error) {
    return responderError(res, error, "Error al listar las mediciones");
  }
};

export const obtener = async (req: RequestAutenticado, res: Response) => {
  try {
    const id = leerId(req.params.id, "medición");
    const medicion = await medicionService.obtenerMedicion(
      id,
      req.profesionistaId!,
    );
    return res.status(200).json({ medicion });
  } catch (error) {
    return responderError(res, error, "Error al obtener la medición");
  }
};

export const editar = async (req: RequestAutenticado, res: Response) => {
  try {
    const id = leerId(req.params.id, "medición");
    const medicion = await medicionService.editarMedicion(
      id,
      req.profesionistaId!,
      extraerDatos(req.body),
    );
    return res
      .status(200)
      .json({ mensaje: "Medición actualizada correctamente", medicion });
  } catch (error) {
    return responderError(res, error, "Error al actualizar la medición");
  }
};

export const eliminar = async (req: RequestAutenticado, res: Response) => {
  try {
    const id = leerId(req.params.id, "medición");
    await medicionService.eliminarMedicion(id, req.profesionistaId!);
    return res
      .status(200)
      .json({ mensaje: "Medición eliminada correctamente" });
  } catch (error) {
    return responderError(res, error, "Error al eliminar la medición");
  }
};
