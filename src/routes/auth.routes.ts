import { Router, Response } from "express";
import * as authController from "../controllers/auth.controller";
import {
  verificarToken,
  RequestAutenticado,
} from "../middlewares/auth.middleware";
import { limitarLogin } from "../middlewares/rateLimit.middleware";

const router = Router();

router.post("/registro", authController.registro);
router.post("/login", limitarLogin, authController.login);

router.get(
  "/perfil",
  verificarToken,
  (req: RequestAutenticado, res: Response) => {
    res.json({
      mensaje: "Acceso autorizado",
      profesionistaId: req.profesionistaId,
    });
  },
);

export default router;
