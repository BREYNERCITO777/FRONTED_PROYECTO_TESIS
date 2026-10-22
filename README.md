# Sentinel AI — Panel del operador

Panel web de Sentinel AI, el sistema de detección de armas en cámaras de videovigilancia.
Muestra las alertas en tiempo real, los incidentes con su evidencia y permite administrar
cámaras, usuarios y la configuración de detección.

El backend (API FastAPI, agente de detección y modelo) está en
<https://github.com/BREYNERCITO777/BACKEND_PROYECTO_TESIS>.

## Requisitos

- Node.js 18 o superior y npm.
- El backend corriendo y accesible desde el navegador.

## Instalación y uso

```bash
npm ci          # instala las versiones exactas de package-lock.json
npm start       # desarrollo, en http://localhost:3000
npm run build   # versión de producción en build/
```

## Configuración

Variables de entorno (en un `.env` en la raíz, o en el panel de Vercel):

| Variable | Para qué | Por defecto |
|---|---|---|
| `REACT_APP_API_BASE` | URL de la API, con el prefijo `/api/v1` | Se deduce del navegador: el mismo host en el puerto 8000 |
| `REACT_APP_WS_BASE` | URL del WebSocket de alertas (completa o solo el host) | Se deriva de `REACT_APP_API_BASE` cambiando `http` por `ws` |

Ejemplo para producción:

```bash
REACT_APP_API_BASE=https://mi-backend.example.com/api/v1
```

Si `REACT_APP_API_BASE` apunta a `localhost` pero el panel se abre desde otro equipo, se
ignora a propósito (ver `src/api/base.ts`): desde otro equipo, `localhost` sería el equipo del
visitante y el inicio de sesión fallaría.

## Cómo funciona

1. El usuario inicia sesión (`/auth/login`); el token JWT se guarda en el navegador y viaja
   en cada petición (`src/api/http.ts`).
2. `AlertsProvider` (`src/app/providers/alerts-context.tsx`) carga el historial de alertas y
   abre el WebSocket `/api/v1/ws/alerts`. Cuando llega una alerta nueva, aparece una ventana
   con la imagen de evidencia (`src/components/AlertaEntranteModal.tsx`).
3. El operador revisa la alerta y decide qué hacer; el sistema nunca actúa solo. Al marcarla
   como leída desaparece del contador.

Roles:

| Rol | Puede |
|---|---|
| `operator` | Ver panel, cámaras, alertas, incidentes y evidencias; marcar alertas como leídas |
| `admin` | Todo lo anterior, más crear y editar cámaras, borrar incidentes, gestionar usuarios y cambiar la configuración |

El backend aplica estos permisos; el panel solo oculta lo que el rol no puede usar.

## Estructura

```
src/
  api/            Clientes de la API (http, alertas, cámaras, incidentes, usuarios)
  app/providers/  Estado global de alertas y WebSocket
  context/        Sesión y rol del usuario
  websocket/      Conexión al WebSocket de alertas
  layouts/        Menú lateral y barra superior
  components/     Ventana de alerta entrante
  modules/        Un módulo por sección: dashboard, cameras, alerts, incidents,
                  evidence, settings, users
  pages/          Pantalla de inicio de sesión
  shared/ui/      Componentes de interfaz (shadcn/ui, Radix); varios no se usan aún
```

## Despliegue

En Vercel: `vercel.json` redirige todas las rutas a `index.html`, así funcionan los
enlaces directos a cada sección. El `Dockerfile` levanta el servidor de desarrollo para
pruebas locales con Docker.

## Licencia

MIT, ver `LICENSE`.
