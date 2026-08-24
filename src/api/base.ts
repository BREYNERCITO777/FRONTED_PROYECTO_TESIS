/**
 * Dirección del backend, resuelta en un único sitio.
 *
 * Antes, seis archivos repetían `process.env.REACT_APP_API_BASE ||
 * "http://localhost:8000/api/v1"`. Ese "localhost" es correcto mientras se
 * abre el panel en el mismo equipo que sirve la API, pero desde otro equipo de
 * la red "localhost" es el equipo del visitante, no el servidor: el inicio de
 * sesión fallaba con un "Network Error" que no explicaba nada.
 *
 * Ahora, si no hay dirección configurada, se deduce del propio navegador.
 */
function resolver(): string {
  const configurada = (process.env.REACT_APP_API_BASE || "").trim();
  const { protocol, hostname } = window.location;
  const deducida = `${protocol}//${hostname}:8000/api/v1`;

  if (!configurada) return deducida;

  // Configuración que apunta a localhost mientras el panel se sirve desde otra
  // dirección: es siempre un despliegue mal configurado, y respetarla dejaría
  // el panel inservible. Se ignora a propósito.
  const apuntaALocal = /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/i.test(configurada);
  const estamosEnLocal = hostname === "localhost" || hostname === "127.0.0.1";
  if (apuntaALocal && !estamosEnLocal) return deducida;

  return configurada.replace(/\/+$/, "");
}

/** Base de la API, con el prefijo /api/v1 y sin barra final. */
export const API_BASE = resolver();

/** Raíz del servidor, sin el prefijo. Para las imágenes de /static. */
export const PUBLIC_BASE = API_BASE.replace(/\/api\/v1$/, "");
