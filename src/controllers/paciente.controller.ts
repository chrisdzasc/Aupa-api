import { Response } from "express";
import { RequestAutenticado } from "../middlewares/auth.middleware";
import * as pacienteService from "../services/paciente.service";

export const crear = async (req: RequestAutenticado, res: Response) => {
  try {
    const profesionistaId = req.profesionistaId!;
    const datos = req.body;

    // Validaciones básicas
    if (!datos.nombre || !datos.sexo || !datos.fechaNacimiento) {
      return res.status(400).json({
        mensaje: "Nombre, sexo y fecha de nacimiento son obligatorios",
      });
    }

    if (!datos.tutor?.nombre || !datos.tutor?.email || !datos.tutor?.telefono) {
      return res.status(400).json({
        mensaje: "Los datos del tutor son obligatorios",
      });
    }

    const resultado = await pacienteService.crearPaciente(
      profesionistaId,
      datos,
    );

    return res.status(201).json({
      mensaje: "Paciente registrado correctamente",
      ...resultado,
    });
  } catch (error) {
    const mensaje =
      error instanceof Error ? error.message : "Error al crear el paciente";
    return res.status(400).json({ mensaje });
  }
};

export const listar = async (req: RequestAutenticado, res: Response) => {
  try {
    const profesionistaId = req.profesionistaId!;
    const pacientes = await pacienteService.listarPacientes(profesionistaId);

    return res.status(200).json({ pacientes });
  } catch (error) {
    const mensaje =
      error instanceof Error ? error.message : "Error al listar pacientes";
    return res.status(500).json({ mensaje });
  }
};

export const obtener = async (req: RequestAutenticado, res: Response) => {
  try {
    const profesionistaId = req.profesionistaId!;
    const id = Number(req.params.id);

    if (isNaN(id)) {
      return res
        .status(400)
        .json({ mensaje: "Identificador de paciente inválido" });
    }

    const paciente = await pacienteService.obtenerPaciente(id, profesionistaId);

    return res.status(200).json({ paciente });
  } catch (error) {
    const mensaje =
      error instanceof Error ? error.message : "Error al obtener el paciente";
    return res.status(404).json({ mensaje });
  }
};

const INDICADORES = [
  "talla-edad",
  "peso-edad",
  "imc-edad",
  "peso-talla",
  "perimetro-cefalico-edad",
] as const;

type IndicadorCurva = (typeof INDICADORES)[number];

const esIndicadorValido = (valor: unknown): valor is IndicadorCurva =>
  typeof valor === "string" && INDICADORES.includes(valor as IndicadorCurva);

export const curvas = async (req: RequestAutenticado, res: Response) => {
  try {
    const indicador = req.query.indicador;

    if (!esIndicadorValido(indicador)) {
      return res.status(400).json({
        mensaje: `Indicador inválido. Valores permitidos: ${INDICADORES.join(", ")}`,
      });
    }

    const curva = await pacienteService.obtenerCurva(
      Number(req.params.id),
      req.profesionistaId!,
      indicador,
    );

    return res.status(200).json(curva);
  } catch (error) {
    const mensaje =
      error instanceof Error ? error.message : "Error al obtener la curva";
    const estado = mensaje.includes("no encontrado") ? 404 : 400;
    return res.status(estado).json({ mensaje });
  }
};
