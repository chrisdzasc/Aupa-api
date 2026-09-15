import { Router } from "express";
import * as authController from "../controllers/auth.controller";
import { verificarToken, RequestAutenticado } from "../middlewares/auth.middleware";
import { Response } from "express";

const router = Router();

router.post("/registro", authController.registro);
router.post("/login", authController.login);

router.get("/perfil", verificarToken, (req: RequestAutenticado, res: Response) => {
    res.json({
      mensaje: "Acceso autorizado",
      profesionistaId: req.profesionistaId,
    });
  });

export default router;