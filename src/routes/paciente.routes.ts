import { Router } from "express";
import * as pacienteController from "../controllers/paciente.controller";
import { verificarToken } from "../middlewares/auth.middleware";

const router = Router();

// Todas las rutas de pacientes requieren autenticación
router.use(verificarToken);

router.post("/", pacienteController.crear);
router.get("/", pacienteController.listar);
router.get("/:id", pacienteController.obtener);

export default router;
