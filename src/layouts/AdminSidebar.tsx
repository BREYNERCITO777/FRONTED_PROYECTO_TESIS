import {
  LayoutDashboard,
  Camera,
  AlertTriangle,
  Image,
  Bell,
  Settings,
  Shield,
  Users, // ✅ NUEVO
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "../shared/ui/sidebar";

import { Badge } from "../shared/ui/badge";
import { useAlerts } from "../app/providers/alerts-context";

// ✅ IMPORTA AUTH PARA LEER EL ROL
import { useAuth } from "../context/auth-context";
import React from "react";

interface AdminSidebarProps {
  activeModule: string;
  onModuleChange: (module: string) => void;
}

type MenuItem = {
  title: string;
  icon: any;
  id: string;
  badge: string | null;
  description: string;
  roles: Array<"admin" | "operator">; // ✅ quién puede verlo
};

export function AdminSidebar({ activeModule, onModuleChange }: AdminSidebarProps) {
  const { unreadCount } = useAlerts();
  const { user } = useAuth();

  const role: "admin" | "operator" = user?.role ?? "operator";
  const isAdmin = role === "admin";

  const menuItems: MenuItem[] = [
    {
      title: "Dashboard",
      icon: LayoutDashboard,
      id: "dashboard",
      badge: null,
      description: "Panel principal",
      roles: ["admin", "operator"],
    },
    {
      title: "Cámaras",
      icon: Camera,
      id: "cameras",
      badge: null,
      description: "Gestión de cámaras",
      roles: ["admin", "operator"],
    },
    {
      title: "Incidentes",
      icon: AlertTriangle,
      id: "incidents",
      badge: null,
      description: "Detecciones registradas",
      roles: ["admin", "operator"],
    },
    {
      title: "Evidencias",
      icon: Image,
      id: "evidence",
      badge: null,
      description: "Galería de capturas",
      roles: ["admin", "operator"],
    },
    {
      title: "Alertas",
      icon: Bell,
      id: "alerts",
      badge: unreadCount > 0 ? String(unreadCount > 99 ? "99+" : unreadCount) : null,
      description: "Centro de alertas",
      roles: ["admin", "operator"],
    },

    // ✅ SOLO ADMIN
    {
      title: "Usuarios",
      icon: Users,
      id: "users",
      badge: null,
      description: "Crear y gestionar usuarios",
      roles: ["admin"],
    },
    {
      title: "Configuración",
      icon: Settings,
      id: "settings",
      badge: null,
      description: "Parámetros del sistema",
      roles: ["admin"],
    },
  ];

  const visibleItems = menuItems.filter((item) => item.roles.includes(role));

  // ✅ Si operator cae en un módulo admin-only, lo regresamos a dashboard
  React.useEffect(() => {
    const adminOnly = new Set(["settings", "users"]);
    if (!isAdmin && adminOnly.has(activeModule)) {
      onModuleChange("dashboard");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, activeModule]);

  return (
    <Sidebar className="border-r bg-white shadow-sm h-svh">
      {/* HEADER */}
      <SidebarHeader className="border-b px-5 py-4 bg-gradient-to-br from-blue-600 via-blue-600 to-blue-700">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 backdrop-blur-sm p-2.5 rounded-2xl shadow-lg ring-2 ring-white/30">
            <Shield className="h-6 w-6 text-white" />
          </div>
          <div className="min-w-0">
            <h2 className="font-extrabold text-lg text-white leading-tight">
              Sentinel AI
            </h2>
            <p className="text-xs text-blue-100 font-medium truncate">
              Sistema de Detección Inteligente
            </p>

            {/* ✅ ROL visible */}
            <p className="text-[10px] text-blue-100/90 mt-1 font-semibold tracking-widest uppercase">
              Rol: {role}
            </p>
          </div>
        </div>
      </SidebarHeader>

      {/* CONTENT */}
      <SidebarContent className="flex-1 overflow-y-auto overflow-x-hidden py-6">
        <SidebarGroup>
          <SidebarGroupLabel className="px-5 text-xs uppercase tracking-wider text-slate-500 font-extrabold">
            Módulos del Sistema
          </SidebarGroupLabel>

          <SidebarGroupContent className="mt-4">
            <SidebarMenu className="gap-2 px-3">
              {visibleItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeModule === item.id;

                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      onClick={() => onModuleChange(item.id)}
                      isActive={isActive}
                      className={[
                        "h-[62px] w-full px-4 rounded-2xl",
                        "flex items-center gap-3",
                        "transition-all duration-200",
                        isActive
                          ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg"
                          : "bg-white hover:bg-slate-50 text-slate-800 border border-transparent hover:border-slate-200",
                      ].join(" ")}
                    >
                      {/* Icono */}
                      <div
                        className={[
                          "h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
                          isActive ? "bg-white/20" : "bg-slate-100",
                        ].join(" ")}
                      >
                        <Icon
                          className={[
                            "h-5 w-5",
                            isActive ? "text-white" : "text-slate-700",
                          ].join(" ")}
                        />
                      </div>

                      {/* Textos */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-sm truncate">
                            {item.title}
                          </span>

                          {item.badge && (
                            <Badge
                              className={[
                                "shrink-0 font-extrabold text-xs px-2 py-0.5 rounded-lg",
                                isActive
                                  ? "bg-white/25 text-white border-0"
                                  : "bg-rose-100 text-rose-700 border-0",
                              ].join(" ")}
                            >
                              {item.badge}
                            </Badge>
                          )}
                        </div>

                        <p
                          className={[
                            "text-xs mt-0.5 truncate",
                            isActive ? "text-blue-100" : "text-slate-500",
                          ].join(" ")}
                        >
                          {item.description}
                        </p>
                      </div>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>

            <div className="mt-6 mx-5 h-px bg-slate-200/70" />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* FOOTER */}
      <SidebarFooter className="border-t px-5 py-4 bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="space-y-3">
          <div className="flex items-center justify-between px-4 py-3 bg-white rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse shadow-lg shadow-emerald-500/40" />
              <p className="text-xs text-slate-800 font-bold">Sistema Operativo</p>
            </div>
          </div>

          <div className="text-center">
            <p className="text-xs text-slate-400 font-semibold">© 2026 Sentinel AI</p>
            <p className="text-xs text-slate-400">Versión 2.1.0</p>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}