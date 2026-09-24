import { Router } from "express";
import { verificarToken } from "../middlewares/auth.middleware";
import * as pacienteController from "../controllers/paciente.controller";
import * as medicionController from "../controllers/medicion.controller";

const router = Router();

// Todas las rutas de pacientes requieren autenticación
router.use(verificarToken);

router.post("/", pacienteController.crear);
router.get("/", pacienteController.listar);
router.get("/:id", pacienteController.obtener);

// Mediciones de un paciente
router.post("/:id/mediciones", medicionController.crear);
router.get("/:id/mediciones", medicionController.listar);
router.get("/:id/curvas", pacienteController.curvas);

export default router;
