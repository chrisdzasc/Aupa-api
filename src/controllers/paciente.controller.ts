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
