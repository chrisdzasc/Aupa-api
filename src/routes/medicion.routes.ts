import { Router } from "express";
import * as medicionController from "../controllers/medicion.controller";
import { verificarToken } from "../middlewares/auth.middleware";

const router = Router();

// Todas las rutas de mediciones requieren autenticación de profesionista
router.use(verificarToken);

router.get("/:id", medicionController.obtener);
router.put("/:id", medicionController.editar);
router.delete("/:id", medicionController.eliminar);

export default router;
