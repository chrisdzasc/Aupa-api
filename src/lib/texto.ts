// Normaliza un correo: sin espacios alrededor y en minúsculas.
export const normalizarEmail = (email: string): string =>
  email.trim().toLowerCase();
