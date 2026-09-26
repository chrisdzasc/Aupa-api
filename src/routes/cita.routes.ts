import { Router } from "express";
import * as citaController from "../controllers/cita.controller";
import { verificarToken } from "../middlewares/auth.middleware";

const router = Router();

router.use(verificarToken);

router.post("/", citaController.crear);
router.get("/", citaController.listar);
router.put("/:id", citaController.editar);
router.patch("/:id/estado", citaController.actualizarEstado);
router.delete("/:id", citaController.eliminar);

export default router;
