import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "../shared/ui/card";
import { Button } from "../shared/ui/button";
import { Badge } from "../shared/ui/badge";
import { Input } from "../shared/ui/input";
import { Label } from "../shared/ui/label";
import { Switch } from "../shared/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../shared/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../shared/ui/table";

import { Plus, RefreshCw, UserPlus, Shield, User, Trash2, Pencil, CheckCircle2, XCircle } from "lucide-react";

import { useAuth } from "../context/auth-context";
import { listUsers, createUser, updateUser, setUserRole, setUserEstado, deleteUser, type Role, type UserOut } from "../api/users";

const OID_RE = /^[a-f0-9]{24}$/i;

function isActive(u: any) {
  return (u.estado ?? 1) === 1;
}

function errorToText(e: any): string {
  const detail = e?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((x: any) => {
        const loc = Array.isArray(x?.loc) ? x.loc.join(".") : String(x?.loc ?? "");
        const msg = String(x?.msg ?? "Error");
        return loc ? `${loc}: ${msg}` : msg;
      })
      .join(" | ");
  }
  if (detail && typeof detail === "object") return JSON.stringify(detail);
  return e?.message || "Error";
}

export default function Users() {
  const { user: me } = useAuth();
  const isAdmin = me?.role === "admin";
  const myId = String((me as any)?._id ?? "");

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "operator" as Role,
  });

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

      const arr = (Array.isArray(data) ? data : []).map((u: any) => ({
        ...u,
        id: String(u?.id ?? ""),           // ✅ siempre string
        name: String(u?.name ?? ""),
        email: String(u?.email ?? ""),
        role: (u?.role === "admin" ? "admin" : "operator") as Role,
        estado: typeof u?.estado === "number" ? u.estado : 1,
      }));

      // DEBUG: avisa si hay IDs raros
      const bad = arr.filter((x: any) => !OID_RE.test(x.id));
      if (bad.length) {
        console.warn("USERS con id inválido:", bad.map((x: any) => ({ id: x.id, email: x.email })));
      }

      arr.sort((a: any, b: any) => {
        const ra = a.role === "admin" ? 0 : 1;
        const rb = b.role === "admin" ? 0 : 1;
        if (ra !== rb) return ra - rb;
        return String(a.email || "").localeCompare(String(b.email || ""));
      });

      setItems(arr);
      setPage(1);
    } catch (e: any) {
      toast.error(errorToText(e));
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
    return items.filter((u: any) =>
      String(u.email || "").toLowerCase().includes(q) ||
      String(u.name || "").toLowerCase().includes(q) ||
      String(u.role || "").toLowerCase().includes(q) ||
      String(u.id || "").toLowerCase().includes(q)
    );
  }, [items, search]);

  useEffect(() => setPage(1), [search]);

  const stats = useMemo(() => {
    const total = items.length;
    const admins = items.filter((u: any) => u.role === "admin").length;
    const active = items.filter((u: any) => isActive(u)).length;
    return { total, admins, active, inactive: total - active };
  }, [items]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const pageItems = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, safePage]);

  const openCreate = () => {
    resetForm();
    setOpenForm(true);
  };

  const openEdit = (u: any) => {
    const id = String(u?.id ?? "");
    if (!OID_RE.test(id)) {
      toast.error(`ID inválido (no se puede editar): ${id}`);
      return;
    }
    setEditing(u);
    setForm({
      name: u.name ?? "",
      email: u.email ?? "",
      password: "",
      role: (u.role as Role) ?? "operator",
    });
    setOpenForm(true);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();

    if (name.length < 2) return toast.error("Nombre mínimo 2 caracteres");
    if (!email) return toast.error("Email requerido");

    try {
      if (editing) {
        const id = String(editing?.id ?? "");
        if (!OID_RE.test(id)) return toast.error(`ID inválido: ${id}`);

        await updateUser(id, { name, email });
        if (form.role !== editing.role) {
          await setUserRole(id, form.role);
        }
        toast.success("Usuario actualizado");
      } else {
        if (!form.password || form.password.length < 6) {
          return toast.error("Password mínimo 6 caracteres");
        }
        await createUser({ name, email, password: form.password, role: form.role, estado: 1 });
        toast.success("Usuario creado");
      }

      setOpenForm(false);
      resetForm();
      await refresh();
    } catch (e: any) {
      toast.error(errorToText(e));
    }
  };

  const toggleEstado = async (u: any) => {
    const id = String(u?.id ?? "");
    if (!OID_RE.test(id)) return toast.error(`ID inválido: ${id}`);
    if (id === myId) return toast.error("No puedes desactivarte a ti mismo");

    const next: 0 | 1 = isActive(u) ? 0 : 1;
    setItems((prev) => prev.map((x: any) => (x.id === id ? { ...x, estado: next } : x)));

    try {
      await setUserEstado(id, next);
    } catch (e: any) {
      toast.error(errorToText(e));
      await refresh();
    }
  };

  const changeRoleQuick = async (u: any, role: Role) => {
    const id = String(u?.id ?? "");
    if (!OID_RE.test(id)) return toast.error(`ID inválido: ${id}`);
    if (id === myId && role !== "admin") return toast.error("No puedes quitarte el rol admin");

    const prevRole = u.role;
    setItems((prev) => prev.map((x: any) => (x.id === id ? { ...x, role } : x)));

    try {
      await setUserRole(id, role);
    } catch (e: any) {
      toast.error(errorToText(e));
      setItems((prev) => prev.map((x: any) => (x.id === id ? { ...x, role: prevRole } : x)));
    }
  };

  const removeUser = async (u: any) => {
    const id = String(u?.id ?? "");
    if (!OID_RE.test(id)) return toast.error(`ID inválido: ${id}`);
    if (id === myId) return toast.error("No puedes eliminar tu propio usuario");

    if (!window.confirm(`¿Eliminar usuario "${u.email}"?`)) return;

    const prev = items;
    setItems((p) => p.filter((x: any) => x.id !== id));

    try {
      await deleteUser(id);
      toast.success("Usuario eliminado");
      await refresh();
    } catch (e: any) {
      toast.error(errorToText(e));
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
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Usuarios</h1>
          <p className="text-sm text-slate-600">Crear, editar, activar/desactivar y gestionar roles</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={refresh}>
            <RefreshCw className="h-4 w-4 mr-2" /> Refrescar
          </Button>
          <Button onClick={openCreate}>
            <Plus className="h-5 w-5 mr-2" /> Crear Usuario
          </Button>
        </div>
      </div>

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
          <CardContent className="pt-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500">ACTIVOS</p>
              <p className="text-2xl font-bold">{stats.active}</p>
            </div>
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500">INACTIVOS</p>
              <p className="text-2xl font-bold">{stats.inactive}</p>
            </div>
            <XCircle className="h-5 w-5 text-rose-600" />
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="pt-4">
          <Label>Buscar</Label>
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="email, nombre, rol o id..." />
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader className="bg-slate-50/50 border-b">
          <CardTitle className="text-sm flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-slate-500" />
            Listado
          </CardTitle>
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
                  {pageItems.map((u: any) => (
                    <TableRow key={u.id || u.email}>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-semibold text-slate-900">
                            {u.name || "—"}{" "}
                            {u.id === myId && (
                              <Badge variant="outline" className="ml-2 text-xs font-bold">tú</Badge>
                            )}
                          </div>
                          <div className="text-xs text-slate-600 font-mono">{u.email}</div>
                          <div className="text-[10px] text-slate-500 font-mono">ID: {u.id}</div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge className={u.role === "admin" ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-700"}>
                            {String(u.role).toUpperCase()}
                          </Badge>
                          <select
                            className="text-xs border rounded-md px-2 py-1 bg-white"
                            value={u.role}
                            onChange={(e) => changeRoleQuick(u, e.target.value as Role)}
                            disabled={u.id === myId}
                          >
                            <option value="admin">admin</option>
                            <option value="operator">operator</option>
                          </select>
                        </div>
                      </TableCell>

                      <TableCell className="text-center">
                        <div className="inline-flex items-center gap-2">
                          <Switch checked={isActive(u)} onCheckedChange={() => toggleEstado(u)} disabled={u.id === myId} />
                          <Badge className={isActive(u) ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}>
                            {isActive(u) ? "ACTIVO" : "INACTIVO"}
                          </Badge>
                        </div>
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="inline-flex gap-2 justify-end">
                          <Button size="sm" variant="outline" onClick={() => openEdit(u)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline" className="text-rose-600" onClick={() => removeUser(u)} disabled={u.id === myId}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}

                  {pageItems.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="py-10 text-center text-sm text-slate-500">
                        No hay resultados.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              <div className="flex items-center justify-between px-4 py-3 border-t text-sm">
                <div className="text-slate-500">
                  Página {safePage} de {totalPages} • Mostrando {pageItems.length} de {filtered.length}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage <= 1}>←</Button>
                  <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages}>→</Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={openForm} onOpenChange={setOpenForm}>
        <DialogContent className="sm:max-w-[520px]" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-blue-600" />
              {editing ? "Editar Usuario" : "Crear Usuario"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={onSubmit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} required />
            </div>
            {!editing && (
              <div className="space-y-2">
                <Label>Contraseña</Label>
                <Input type="password" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} required />
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
              <Button type="button" variant="outline" onClick={() => { setOpenForm(false); resetForm(); }}>
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