import { Router } from "express";
import * as tutorController from "../controllers/tutor.controller";
import {
  verificarTokenTutor,
  exigirPasswordCambiada,
} from "../middlewares/auth.middleware";
import { limitarLogin } from "../middlewares/rateLimit.middleware";

const router = Router();

// Middlewares de las rutas del tutor que ya cambió su contraseña
const tutorActivo = [verificarTokenTutor, exigirPasswordCambiada];

// Pública
router.post("/auth/login", limitarLogin, tutorController.login);

// Requiere token de tutor, pero NO exige haber cambiado la contraseña,
// porque esta es justamente la ruta para cambiarla
router.post(
  "/auth/cambiar-password",
  verificarTokenTutor,
  tutorController.cambiarPassword,
);

// Requiere token de tutor y contraseña ya cambiada
router.get(
  "/perfil",
  verificarTokenTutor,
  exigirPasswordCambiada,
  tutorController.perfil,
);

// Hijos del tutor
router.get("/pacientes", ...tutorActivo, tutorController.hijos);
router.get("/pacientes/:id", ...tutorActivo, tutorController.hijo);
router.get(
  "/pacientes/:id/mediciones",
  ...tutorActivo,
  tutorController.medicionesHijo,
);

export default router;
