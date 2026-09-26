import { Response } from "express";
import { RequestAutenticado } from "../middlewares/auth.middleware";
import * as citaService from "../services/cita.service";

const leerId = (valor: unknown, nombre: string): number => {
  const id = typeof valor === "string" ? Number(valor) : NaN;

  if (!Number.isInteger(id) || id <= 0) {
    throw new Error(`Identificador de ${nombre} inválido`);
  }

  return id;
};

const texto = (valor: unknown): string =>
  typeof valor === "string" ? valor : "";

const responderError = (res: Response, error: unknown, porDefecto: string) => {
  const mensaje = error instanceof Error ? error.message : porDefecto;

  if (mensaje.includes("no encontrada")) {
    return res.status(404).json({ mensaje });
  }
  if (mensaje.startsWith("Ya tienes")) {
    return res.status(409).json({ mensaje });
  }
  return res.status(400).json({ mensaje });
};

export const crear = async (req: RequestAutenticado, res: Response) => {
  try {
    const cita = await citaService.crearCita(req.profesionistaId!, {
      pacienteId: leerId(String(req.body.pacienteId), "paciente"),
      fecha: texto(req.body.fecha),
      hora: texto(req.body.hora),
      notas: texto(req.body.notas) || undefined,
    });

    return res
      .status(201)
      .json({ mensaje: "Cita agendada correctamente", cita });
  } catch (error) {
    return responderError(res, error, "Error al agendar la cita");
  }
};

export const listar = async (req: RequestAutenticado, res: Response) => {
  try {
    const desde = texto(req.query.desde);
    const hasta = texto(req.query.hasta);

    if (!desde || !hasta) {
      return res.status(400).json({
        mensaje: "Los parámetros desde y hasta son obligatorios (YYYY-MM-DD)",
      });
    }

    const citas = await citaService.listarCitas(
      req.profesionistaId!,
      desde,
      hasta,
      req.query.todas === "true",
    );

    return res.status(200).json({ citas });
  } catch (error) {
    return responderError(res, error, "Error al obtener la agenda");
  }
};

export const listarPorPaciente = async (
  req: RequestAutenticado,
  res: Response,
) => {
  try {
    const citas = await citaService.listarCitasPaciente(
      leerId(req.params.id, "paciente"),
      req.profesionistaId!,
    );

    return res.status(200).json({ citas });
  } catch (error) {
    return responderError(res, error, "Error al obtener las citas");
  }
};

export const editar = async (req: RequestAutenticado, res: Response) => {
  try {
    const cita = await citaService.editarCita(
      leerId(req.params.id, "cita"),
      req.profesionistaId!,
      {
        fecha: texto(req.body.fecha),
        hora: texto(req.body.hora),
        notas: texto(req.body.notas) || undefined,
      },
    );

    return res
      .status(200)
      .json({ mensaje: "Cita reagendada correctamente", cita });
  } catch (error) {
    return responderError(res, error, "Error al reagendar la cita");
  }
};

export const actualizarEstado = async (
  req: RequestAutenticado,
  res: Response,
) => {
  try {
    const cita = await citaService.cambiarEstado(
      leerId(req.params.id, "cita"),
      req.profesionistaId!,
      texto(req.body.estado),
    );

    return res
      .status(200)
      .json({ mensaje: "Estado actualizado correctamente", cita });
  } catch (error) {
    return responderError(res, error, "Error al actualizar el estado");
  }
};

export const eliminar = async (req: RequestAutenticado, res: Response) => {
  try {
    await citaService.eliminarCita(
      leerId(req.params.id, "cita"),
      req.profesionistaId!,
    );

    return res.status(200).json({ mensaje: "Cita eliminada correctamente" });
  } catch (error) {
    return responderError(res, error, "Error al eliminar la cita");
  }
};
