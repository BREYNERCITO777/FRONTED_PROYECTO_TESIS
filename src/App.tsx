import { useEffect, useState } from "react";

import { AdminSidebar } from "./layouts/AdminSidebar";
import { Topbar } from "./layouts/Topbar";


import { Dashboard } from "./modules/dashboard/ui/Dashboard";
import { Cameras } from "./modules/cameras/ui/Cameras";
import { Incidents } from "./modules/incidents/ui/Incidents";
import { Evidence } from "./modules/evidence/ui/Evidence";
import { Alerts } from "./modules/alerts/ui/Alerts";
import { Settings } from "./modules/settings/ui/Settings";
import { Users } from "./modules/users/ui/Users"; // ✅ NUEVO

import { Toaster } from "./shared/ui/sonner";
import { SidebarProvider, SidebarInset } from "./shared/ui/sidebar";

import { AlertsProvider } from "./app/providers/alerts-context";

// ✅ Auth
import { useAuth } from "./context/auth-context";
import Login from "./pages/Login";

import { toast } from "sonner";

import "./styles/globals.css";

const ADMIN_ONLY_MODULES = new Set(["settings", "users"]); // ✅ AGREGADO users

export default function App() {
  const { user, loading } = useAuth();

  const [activeModule, setActiveModule] = useState("dashboard");

  const role = user?.role ?? "operator";
  const isAdmin = role === "admin";

  useEffect(() => {
    if (!user) return;

    if (!isAdmin && ADMIN_ONLY_MODULES.has(activeModule)) {
      toast.error("Acceso denegado", {
        description: "No tienes permisos para acceder a este módulo.",
      });
      setActiveModule("dashboard");
    }
  }, [activeModule, isAdmin, user]);

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center text-slate-600">
        Cargando sesión...
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <Login />
        <Toaster />
      </>
    );
  }

  const renderContent = () => {
    switch (activeModule) {
      case "dashboard":
        return <Dashboard />;

      case "cameras":
        return <Cameras />;

      case "incidents":
        return <Incidents />;

      case "evidence":
        return <Evidence />;

      case "alerts":
        return <Alerts />;

      case "settings":
        if (!isAdmin) return <Dashboard />;
        return <Settings />;

      case "users":
        if (!isAdmin) return <Dashboard />;
        return <Users />; // ✅ NUEVO

      default:
        return <Dashboard />;
    }
  };

  return (
    <AlertsProvider>
      <SidebarProvider>
        <AdminSidebar activeModule={activeModule} onModuleChange={setActiveModule} />

        <SidebarInset>
          <div className="min-h-svh flex flex-col">
            <Topbar />
            <main className="flex-1 overflow-hidden">
              <div className="p-8 max-w-[1600px] mx-auto w-full h-full">{renderContent()}</div>
            </main>
          </div>
        </SidebarInset>

        <Toaster />
      </SidebarProvider>
    </AlertsProvider>
  );
}