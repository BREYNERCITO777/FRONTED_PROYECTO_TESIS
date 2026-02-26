import { Search, Bell, User, ChevronDown, AlertTriangle, LogOut } from "lucide-react";
import { Input } from "../shared/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "../shared/ui/avatar";
import { Button } from "../shared/ui/button";
import { Badge } from "../shared/ui/badge";
import { SidebarTrigger } from "../shared/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../shared/ui/dropdown-menu";

import { useAlerts } from "../app/providers/alerts-context";
import { useAuth } from "../context/auth-context";
import { toast } from "sonner";

function timeAgo(iso?: string | null) {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  const diff = Date.now() - t;
  const s = Math.max(0, Math.floor(diff / 1000));
  if (s < 60) return `Hace ${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `Hace ${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `Hace ${h}h`;
  const d = Math.floor(h / 24);
  return `Hace ${d}d`;
}

function initials(name?: string) {
  const n = (name || "").trim();
  if (!n) return "U";
  const parts = n.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "U";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  return (first + last).toUpperCase();
}

export function Topbar() {
  const { alerts, unreadCount, markAsRead, refresh } = useAlerts();
  const { user, logout } = useAuth();

  // Top 6 notificaciones más recientes
  const recent = alerts.slice(0, 6);

  const displayName =
    (user as any)?.name ||
    (user as any)?.full_name ||
    (user as any)?.username ||
    "Usuario";

  const email =
    (user as any)?.email ||
    (user as any)?.mail ||
    "";

  const role =
    (user as any)?.role ||
    (user as any)?.type ||
    "Usuario";

  const avatarUrl =
    (user as any)?.avatar_url ||
    (user as any)?.avatar ||
    "";

  const handleLogout = async () => {
    try {
      await logout(); // ✅ debe borrar token + user
      toast.success("Sesión cerrada");
    } catch (e: any) {
      console.error(e);
      toast.error("No se pudo cerrar sesión", { description: String(e?.message ?? e) });
    }
  };

  return (
    <header className="sticky top-0 z-50 border-b bg-white/95 backdrop-blur-md shadow-sm">
      <div className="max-w-[1600px] mx-auto w-full px-8 py-3">
        <div className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-3 flex-1">
            <SidebarTrigger className="lg:hidden" />

            <div className="relative flex-1 max-w-3xl">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar cámaras, incidentes, evidencias..."
                className="pl-10 pr-4 bg-slate-50 border-slate-200 focus:bg-white focus:border-blue-300 focus:ring-2 focus:ring-blue-100 transition-all h-10"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* NOTIFICACIONES */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative hover:bg-slate-100 transition-colors h-10 w-10 rounded-xl"
                  onClick={() => refresh().catch(console.error)} // refresca al abrir
                >
                  <Bell className="h-5 w-5 text-slate-600" />

                  {unreadCount > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-5 min-w-5 px-1 flex items-center justify-center p-0 text-xs bg-rose-600 hover:bg-rose-600 border-2 border-white shadow-md">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-80">
                <div className="flex items-center justify-between">
                  <DropdownMenuLabel className="font-bold text-base">
                    Notificaciones
                  </DropdownMenuLabel>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs mr-2"
                    onClick={() => refresh().catch(console.error)}
                  >
                    Refrescar
                  </Button>
                </div>

                <DropdownMenuSeparator />

                {recent.length === 0 ? (
                  <div className="p-4 text-sm text-slate-600">
                    No hay notificaciones todavía.
                  </div>
                ) : (
                  recent.map((a: any) => {
                    const isUnread = !a.read;

                    const dotColor =
                      a.severity === "critical"
                        ? "bg-rose-500"
                        : a.severity === "high"
                        ? "bg-orange-500"
                        : a.severity === "medium"
                        ? "bg-amber-500"
                        : "bg-slate-400";

                    const subtitle =
                      a.weapon_type && a.camera_id
                        ? `${a.weapon_type} detectada en ${a.camera_id}`
                        : a.weapon_type
                        ? `${a.weapon_type} detectada`
                        : a.message;

                    return (
                      <DropdownMenuItem
                        key={a._id}
                        className="flex flex-col items-start p-3 cursor-pointer"
                        onClick={() => {
                          if (isUnread) markAsRead(a._id).catch(console.error);
                        }}
                      >
                        <div className="flex items-center gap-2 mb-1 w-full">
                          <div className={`h-2 w-2 rounded-full ${dotColor}`} />
                          <span className="font-semibold text-sm line-clamp-1">
                            {a.title || "Alerta"}
                          </span>

                          {isUnread && (
                            <span className="ml-auto text-[10px] font-bold text-rose-600">
                              NUEVA
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-600 ml-4 line-clamp-2">
                          {subtitle}
                        </p>

                        <p className="text-xs text-slate-400 ml-4 mt-1">
                          {timeAgo(a.timestamp)}
                        </p>
                      </DropdownMenuItem>
                    );
                  })
                )}

                <DropdownMenuSeparator />

                <div className="px-3 py-2 text-[11px] text-slate-500 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Las alertas se actualizan en tiempo real.
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="h-6 w-px bg-slate-200 hidden sm:block" />

            {/* USUARIO */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center gap-3 hover:bg-slate-100 transition-colors rounded-xl h-10 px-2 sm:px-3"
                >
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-semibold text-slate-900">{displayName}</p>
                    <p className="text-xs text-slate-500">{role}</p>
                  </div>

                  <Avatar className="h-9 w-9 border-2 border-slate-200 shadow-sm">
                    <AvatarImage src={avatarUrl} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-600 to-blue-700 text-white font-bold">
                      {initials(displayName)}
                    </AvatarFallback>
                  </Avatar>

                  <ChevronDown className="h-4 w-4 text-slate-400 hidden sm:block" />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-semibold">{displayName}</p>
                    {email ? (
                      <p className="text-xs text-slate-500 font-normal">{email}</p>
                    ) : (
                      <p className="text-xs text-slate-400 font-normal">—</p>
                    )}
                  </div>
                </DropdownMenuLabel>

                <DropdownMenuSeparator />

                <DropdownMenuItem className="cursor-pointer">
                  <User className="h-4 w-4 mr-2" />
                  Mi Perfil
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem className="cursor-pointer text-rose-600" onClick={handleLogout}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Cerrar sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}