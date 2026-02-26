import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "../../../shared/ui/card";
import { Button } from "../../../shared/ui/button";
import { Badge } from "../../../shared/ui/badge";
import { Input } from "../../../shared/ui/input";
import { Label } from "../../../shared/ui/label";
import { Switch } from "../../../shared/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../../../shared/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../shared/ui/table";

import { Plus, RefreshCw, Pencil, Trash2, Shield, User, ChevronLeft, ChevronRight } from "lucide-react";

import { useAuth } from "../../../context/auth-context";
import {
  listUsers,
  createUser,
  updateUser,
  setUserRole,
  setUserEstado,
  deleteUser,
  type UserOut,
} from "../../../api/users";

type Role = "admin" | "operator";

function isActive(u: UserOut) {
  return (u.estado ?? 1) === 1;
}

// ✅ valida ObjectId (Mongo) 24 hex
function isMongoObjectId(id: string) {
  return /^[a-fA-F0-9]{24}$/.test(id);
}

// ✅ saca id aunque venga raro (por si backend devuelve {_id: {$oid:"..."}} en algún caso viejo)
function getUserId(u: any): string {
  const raw = u?._id;
  if (typeof raw === "string") return raw;
  if (raw && typeof raw === "object") {
    // casos comunes
    if (typeof raw.$oid === "string") return raw.$oid;
    if (typeof raw.oid === "string") return raw.oid;
  }
  return "";
}

// ✅ convierte FastAPI detail (string | object | array) en texto
function toErrorMessage(err: any): string {
  const detail = err?.response?.data?.detail;
  if (!detail) return err?.message || "Error";

  if (typeof detail === "string") return detail;

  if (Array.isArray(detail)) {
    const first = detail[0];
    if (first?.loc && first?.msg) return `${String(first.loc.join("."))}: ${String(first.msg)}`;
    return detail.map((x) => (x?.msg ? String(x.msg) : JSON.stringify(x))).join(" | ");
  }

  if (typeof detail === "object") {
    if (detail?.loc && detail?.msg) return `${String(detail.loc.join("."))}: ${String(detail.msg)}`;
    return JSON.stringify(detail);
  }

  return String(detail);
}

export function Users() {
  const { user: me } = useAuth();
  const isAdmin = me?.role === "admin";
  const myId = me?._id ?? "";

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<UserOut[]>([]);
  const [search, setSearch] = useState("");

  // dialog
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<UserOut | null>(null);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "operator" as Role,
  });

  // ✅ paginación
  const pageSize = 5;
  const [page, setPage] = useState(1);

  const resetForm = () => {
    setForm({ name: "", email: "", password: "", role: "operator" });
    setEditing(null);
  };

  async function refresh() {
    setLoading(true);
    try {
      const data = await listUsers(500);
      const arr = Array.isArray(data) ? data : [];

      // normaliza ids por seguridad (evita undefined)
      const normalized = arr.map((u: any) => ({ ...u, _id: getUserId(u) || "" }));

      normalized.sort((a, b) => {
        const ra = a.role === "admin" ? 0 : 1;
        const rb = b.role === "admin" ? 0 : 1;
        if (ra !== rb) return ra - rb;
        return String(a.email || "").localeCompare(String(b.email || ""));
      });

      setItems(normalized);
      setPage(1); // vuelve a la página 1 al refrescar
    } catch (e: any) {
      console.error(e?.response?.status, e?.message);
      toast.error("No se pudieron cargar los usuarios");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isAdmin) return;
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((u: any) => {
      return (
        String(u.email || "").toLowerCase().includes(q) ||
        String(u.name || "").toLowerCase().includes(q) ||
        String(u.role || "").toLowerCase().includes(q) ||
        String(u._id || "").toLowerCase().includes(q)
      );
    });
  }, [items, search]);

  // ✅ total páginas
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  useEffect(() => {
    setPage((p) => Math.min(p, totalPages));
  }, [totalPages]);

  const pageData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page]);

  const canPrev = page > 1;
  const canNext = page < totalPages;
  const goPrev = () => setPage((p) => Math.max(1, p - 1));
  const goNext = () => setPage((p) => Math.min(totalPages, p + 1));

  const stats = useMemo(() => {
    const total = items.length;
    const admins = items.filter((u) => u.role === "admin").length;
    const active = items.filter((u) => isActive(u)).length;
    const inactive = total - active;
    return { total, admins, active, inactive };
  }, [items]);

  const openCreate = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (u: UserOut) => {
    setEditing(u);
    setForm({
      name: u.name ?? "",
      email: u.email ?? "",
      password: "",
      role: (u.role as Role) ?? "operator",
    });
    setOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();

    if (name.length < 2) return toast.error("Nombre mínimo 2 caracteres");

    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!emailOk) return toast.error("Email inválido (ej: usuario@dominio.com)");

    try {
      if (editing) {
        const id = getUserId(editing);
        if (!id) return toast.error("ID inválido (no se puede editar)");

        await updateUser(id, { name, email });

        if (form.role !== editing.role) {
          await setUserRole(id, form.role);
        }

        toast.success("Usuario actualizado");
      } else {
        if (!form.password || form.password.length < 6) {
          return toast.error("Password mínimo 6 caracteres");
        }
        await createUser({ name, email, password: form.password, role: form.role });
        toast.success("Usuario creado");
      }

      setOpen(false);
      resetForm();
      await refresh();
    } catch (e: any) {
      console.error(e?.response?.status, e?.message);
      toast.error(toErrorMessage(e));
    }
  };

  const toggleEstado = async (u: UserOut) => {
    const id = getUserId(u);
    if (!id) return toast.error("ID inválido");
    if (id === myId) return toast.error("No puedes desactivarte a ti mismo");

    const next: 0 | 1 = isActive(u) ? 0 : 1;

    setItems((prev) => prev.map((x: any) => (getUserId(x) === id ? { ...x, estado: next } : x)));

    try {
      await setUserEstado(id, next);
      toast.success(next === 1 ? "Usuario activado" : "Usuario desactivado");
    } catch (e: any) {
      toast.error(toErrorMessage(e));
      await refresh();
    }
  };

  const changeRole = async (u: UserOut, role: Role) => {
    const id = getUserId(u);
    if (!id) return toast.error("ID inválido");
    if (id === myId && role !== "admin") return toast.error("No puedes quitarte el rol admin");

    const prevRole = u.role;
    setItems((prev) => prev.map((x: any) => (getUserId(x) === id ? { ...x, role } : x)));

    try {
      await setUserRole(id, role);
      toast.success("Rol actualizado");
    } catch (e: any) {
      toast.error(toErrorMessage(e));
      setItems((prev) => prev.map((x: any) => (getUserId(x) === id ? { ...x, role: prevRole } : x)));
    }
  };

  const remove = async (u: UserOut) => {
    const id = getUserId(u);
    if (!id) return toast.error("ID inválido");
    if (id === myId) return toast.error("No puedes eliminar tu propio usuario");

    // ✅ si tu backend SOLO acepta ObjectId y este no lo es, te avisamos claro
    if (!isMongoObjectId(id)) {
      return toast.error("No se puede eliminar: el ID no es ObjectId (24 caracteres).");
    }

    if (!window.confirm(`¿Eliminar usuario "${u.email}"?`)) return;

    const prev = items;
    setItems((p) => p.filter((x: any) => getUserId(x) !== id));

    try {
      await deleteUser(id);
      toast.success("Usuario eliminado");
      await refresh();
    } catch (e: any) {
      toast.error(toErrorMessage(e));
      setItems(prev);
    }
  };

  if (!isAdmin) {
    return (
      <div className="p-6">
        <div className="p-4 rounded-lg border bg-muted/30 text-muted-foreground">
          No tienes permisos para ver este módulo.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Usuarios</h1>
          <p className="text-sm text-slate-600">Crear, editar, activar/desactivar y gestionar roles</p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={refresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refrescar
          </Button>
          <Button onClick={openCreate}>
            <Plus className="h-5 w-5 mr-2" />
            Crear Usuario
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500">TOTAL</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
            <User className="h-5 w-5 text-slate-500" />
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="pt-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500">ADMINS</p>
              <p className="text-2xl font-bold">{stats.admins}</p>
            </div>
            <Shield className="h-5 w-5 text-indigo-600" />
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="pt-4">
            <p className="text-xs font-bold text-slate-500">ACTIVOS</p>
            <p className="text-2xl font-bold">{stats.active}</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="pt-4">
            <p className="text-xs font-bold text-slate-500">INACTIVOS</p>
            <p className="text-2xl font-bold">{stats.inactive}</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-4">
          <Label>Buscar</Label>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="email, nombre, rol o id..."
          />
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="bg-slate-50/50 border-b">
          <CardTitle className="text-sm">Listado</CardTitle>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 text-sm text-slate-500">Cargando usuarios...</div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead className="text-center">Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {pageData.map((u: any) => (
                    <TableRow key={getUserId(u) || `${u.email}-${Math.random()}`}>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-semibold text-slate-900">
                            {u.name || "—"}{" "}
                            {getUserId(u) === myId && (
                              <Badge variant="outline" className="ml-2 text-xs font-bold">
                                tú
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-slate-600 font-mono">{u.email}</div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge
                            className={
                              u.role === "admin"
                                ? "bg-indigo-100 text-indigo-700"
                                : "bg-slate-100 text-slate-700"
                            }
                          >
                            {String(u.role || "").toUpperCase()}
                          </Badge>

                          <select
                            className="text-xs border rounded-md px-2 py-1 bg-white"
                            value={u.role}
                            onChange={(e) => changeRole(u, e.target.value as Role)}
                            disabled={getUserId(u) === myId}
                          >
                            <option value="admin">admin</option>
                            <option value="operator">operator</option>
                          </select>
                        </div>
                      </TableCell>

                      <TableCell className="text-center">
                        <div className="inline-flex items-center gap-2">
                          <Switch
                            checked={isActive(u)}
                            onCheckedChange={() => toggleEstado(u)}
                            disabled={getUserId(u) === myId}
                          />
                          <Badge
                            className={
                              isActive(u)
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-rose-100 text-rose-700"
                            }
                          >
                            {isActive(u) ? "ACTIVO" : "INACTIVO"}
                          </Badge>
                        </div>
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="inline-flex gap-2 justify-end">
                          <Button size="sm" variant="outline" onClick={() => openEdit(u)}>
                            <Pencil className="h-4 w-4" />
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            className="text-rose-600"
                            onClick={() => remove(u)}
                            disabled={getUserId(u) === myId}
                            title={getUserId(u) === myId ? "No puedes eliminarte" : "Eliminar"}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}

                  {pageData.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="py-10 text-center text-sm text-slate-500">
                        No hay resultados.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              {/* ✅ Paginación */}
              <div className="p-4 border-t flex items-center justify-between bg-slate-50/30">
                <span className="text-xs text-slate-500">
                  Página {page} de {totalPages} • Mostrando {pageData.length} de {filtered.length}
                </span>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={goPrev} disabled={!canPrev}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={goNext} disabled={!canNext}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Dialog Create/Edit */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-blue-600" />
              {editing ? "Editar Usuario" : "Crear Usuario"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={submit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                placeholder="usuario@dominio.com"
                required
              />
            </div>

            {!editing && (
              <div className="space-y-2">
                <Label>Contraseña</Label>
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                  placeholder="mínimo 6 caracteres"
                  required
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Rol</Label>
              <select
                className="w-full border rounded-md px-3 py-2 bg-white text-sm"
                value={form.role}
                onChange={(e) => setForm((p) => ({ ...p, role: e.target.value as Role }))}
              >
                <option value="operator">operator</option>
                <option value="admin">admin</option>
              </select>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setOpen(false);
                  resetForm();
                }}
              >
                Cancelar
              </Button>
              <Button type="submit">{editing ? "Guardar cambios" : "Crear"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}