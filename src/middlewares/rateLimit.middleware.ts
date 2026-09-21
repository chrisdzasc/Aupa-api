import rateLimit from "express-rate-limit";

// Limita los intentos de inicio de sesión para frenar ataques de fuerza
// bruta: 5 intentos fallidos por IP cada 15 minutos.
export const limitarLogin = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  skipSuccessfulRequests: true,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    mensaje:
      "Demasiados intentos de inicio de sesión. Intenta de nuevo en 15 minutos",
  },
});
