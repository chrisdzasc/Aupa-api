import { config } from "./lib/config";
import express, { Request, Response } from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes";
import pacienteRoutes from "./routes/paciente.routes";

const app = express();
const PORT = config.port;

app.use(cors());
app.use(express.json());

app.get("/", (req: Request, res: Response) => {
  res.json({ mensaje: "API de Aúpa funcionando correctamente" });
});

// Rutas de la API
app.use("/api/auth", authRoutes);
app.use("/api/pacientes", pacienteRoutes);

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
