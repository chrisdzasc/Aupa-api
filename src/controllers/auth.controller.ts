import { Request, Response } from "express";
import * as authService from "../services/auth.service";

export const registro = async (req: Request, res: Response) => {
  try {
    const { nombre, email, password, cedulaProfesional } = req.body;

    // Validaciones básicas
    if (!nombre || !email || !password) {
      return res.status(400).json({
        mensaje: "Nombre, correo electrónico y contraseña son obligatorios",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        mensaje: "La contraseña debe tener al menos 8 caracteres",
      });
    }

    const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!emailValido) {
      return res.status(400).json({
        mensaje: "Ingresa un correo electrónico válido",
      });
    }

    const profesionista = await authService.registrarProfesionista({
      nombre,
      email,
      password,
      cedulaProfesional,
    });

    return res.status(201).json({
      mensaje: "Cuenta creada correctamente",
      profesionista,
    });
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : "Error al registrar";
    return res.status(400).json({ mensaje });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        mensaje: "Correo electrónico y contraseña son obligatorios",
      });
    }

    const resultado = await authService.loginProfesionista(email, password);

    return res.status(200).json({
      mensaje: "Inicio de sesión correcto",
      ...resultado,
    });
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : "Error al iniciar sesión";
    return res.status(401).json({ mensaje });
  }
};