import "dotenv/config";

// Lee una variable de entorno obligatoria. Si no existe o está vacía,
// detiene el arranque con un mensaje claro en lugar de fallar después.
const obtenerVariable = (nombre: string): string => {
  const valor = process.env[nombre];

  if (!valor || valor.trim() === "") {
    throw new Error(
      `Falta la variable de entorno ${nombre}. Revisa tu archivo .env`,
    );
  }

  return valor;
};

// Secreto para firmar los tokens JWT
const jwtSecret = obtenerVariable("JWT_SECRET");

if (jwtSecret.length < 32) {
  throw new Error(
    "JWT_SECRET debe tener al menos 32 caracteres para ser seguro",
  );
}

// Puerto de la base de datos
const dbPort = Number(obtenerVariable("DB_PORT"));

if (!Number.isInteger(dbPort) || dbPort <= 0) {
  throw new Error("DB_PORT debe ser un número de puerto válido");
}

export const config = {
  port: Number(process.env.PORT) || 3001,
  jwtSecret,
  db: {
    host: obtenerVariable("DB_HOST"),
    port: dbPort,
    user: obtenerVariable("DB_USER"),
    password: obtenerVariable("DB_PASSWORD"),
    name: obtenerVariable("DB_NAME"),
  },
} as const;
