import { useEffect, type ReactNode } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";

import { AdminSidebar } from "./layouts/AdminSidebar";
import { Topbar } from "./layouts/Topbar";

import { Dashboard } from "./modules/dashboard/ui/Dashboard";
import { Cameras } from "./modules/cameras/ui/Cameras";
import { Incidents } from "./modules/incidents/ui/Incidents";
import { Evidence } from "./modules/evidence/ui/Evidence";
import { Alerts } from "./modules/alerts/ui/Alerts";
import { Settings } from "./modules/settings/ui/Settings";
import { Users } from "./modules/users/ui/Users";

import { Toaster } from "./shared/ui/sonner";
import { SidebarProvider, SidebarInset } from "./shared/ui/sidebar";

import { AlertsProvider } from "./app/providers/alerts-context";

// ✅ Auth
import { useAuth } from "./context/auth-context";
import Login from "./pages/Login";

import { toast } from "sonner";

import "./styles/globals.css";

const ADMIN_ONLY_MODULES = new Set(["settings", "users"]);

/**
 * Módulos con ruta propia. El identificador es también el segmento de la URL.
 *
 * Se tipa con ReactNode y no con JSX.Element porque, con las definiciones
 * actuales de React, JSX ya no existe como espacio de nombres global.
 */
const MODULOS: Record<string, ReactNode> = {
  dashboard: <Dashboard />,
  cameras: <Cameras />,
  incidents: <Incidents />,
  evidence: <Evidence />,
  alerts: <Alerts />,
  settings: <Settings />,
  users: <Users />,
};

export default function App() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const role = user?.role ?? "operator";
  const isAdmin = role === "admin";

  // El módulo activo se deduce de la URL y no de un estado: así un enlace
  // compartido, el botón atrás y una recarga llevan todos al mismo sitio.
  const activeModule = location.pathname.split("/")[1] || "dashboard";

  useEffect(() => {
    if (!user) return;

    if (!isAdmin && ADMIN_ONLY_MODULES.has(activeModule)) {
      toast.error("Acceso denegado", {
        description: "No tienes permisos para acceder a este módulo.",
      });
      navigate("/dashboard", { replace: true });
    }
  }, [activeModule, isAdmin, user, navigate]);

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center text-slate-600">
        Cargando sesión...
      </div>
    );
  }

  // Sin sesión solo existe /login. Se recuerda de dónde venía el usuario para
  // devolverlo ahí después de entrar.
  if (!user) {
    return (
      <>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="*"
            element={<Navigate to="/login" replace state={{ desde: location.pathname }} />}
          />
        </Routes>
        <Toaster />
      </>
    );
  }

  return (
    <AlertsProvider>
      <SidebarProvider>
        <AdminSidebar activeModule={activeModule} onModuleChange={(m) => navigate(`/${m}`)} />

        <SidebarInset>
          <div className="min-h-svh flex flex-col">
            <Topbar />
            <main className="flex-1 overflow-hidden">
              <div className="p-8 max-w-[1600px] mx-auto w-full h-full">
                <Routes>
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  {/* Con sesión iniciada, /login no tiene sentido. */}
                  <Route path="/login" element={<Navigate to="/dashboard" replace />} />

                  {Object.entries(MODULOS).map(([ruta, elemento]) => (
                    <Route
                      key={ruta}
                      path={`/${ruta}`}
                      element={
                        // El backend responde 403 igualmente; esto solo evita
                        // que la vista llegue a montarse.
                        ADMIN_ONLY_MODULES.has(ruta) && !isAdmin ? (
                          <Navigate to="/dashboard" replace />
                        ) : (
                          elemento
                        )
                      }
                    />
                  ))}

                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </div>
            </main>
          </div>
        </SidebarInset>

        <Toaster />
      </SidebarProvider>
    </AlertsProvider>
  );
}
