import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

export const Route = createFileRoute("/_app/proyectos")({ component: ProyectosPage });

const projectSchema = z.object({
  event_day_id: z.string().uuid(),
  nombre: z.string().trim().min(2).max(200),
  descripcion: z.string().trim().min(5).max(2000),
  pregrado_id: z.string().uuid(),
  correo_representante: z.string().trim().email().max(255),
  telefono_representante: z.string().trim().min(5).max(40),
  numero_integrantes: z.number().int().positive().max(50),
});

interface Project {
  id: string; event_day_id: string; nombre: string; descripcion: string;
  pregrado_id: string; correo_representante: string; telefono_representante: string;
  numero_integrantes: number; estado: "habilitado" | "deshabilitado"; creado_por: string | null; created_at: string;
}

function ProyectosPage() {
  const { isOrganizer, user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [pregrados, setPregrados] = useState<{ id: string; nombre: string }[]>([]);
  const [days, setDays] = useState<{ id: string; nombre: string; orden: number }[]>([]);
  const [profilesMap, setProfilesMap] = useState<Record<string, string>>({});
  const [filterDay, setFilterDay] = useState<string>("all");
  const [filterPreg, setFilterPreg] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [busy, setBusy] = useState(false);

  const blank = { event_day_id: "", nombre: "", descripcion: "", pregrado_id: "", correo_representante: "", telefono_representante: "", numero_integrantes: 1 };
  const [form, setForm] = useState<any>(blank);

  const load = async () => {
    const [{ data: ps }, { data: pr }, { data: ds }, { data: profs }] = await Promise.all([
      supabase.from("proyectos").select("*").order("created_at", { ascending: false }),
      supabase.from("pregrados").select("id,nombre").order("nombre"),
      supabase.from("event_days").select("id,nombre,orden").order("orden"),
      supabase.from("profiles").select("id,full_name,email"),
    ]);
    setProjects((ps as Project[]) ?? []);
    setPregrados(pr ?? []);
    setDays(ds ?? []);
    const map: Record<string, string> = {};
    (profs ?? []).forEach((p: any) => { map[p.id] = p.full_name || p.email; });
    setProfilesMap(map);
  };

  useEffect(() => {
    load();
    const ch = supabase.channel("proy-rt").on("postgres_changes", { event: "*", schema: "public", table: "proyectos" }, load).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const filtered = useMemo(() => {
    return projects.filter(p => {
      if (filterDay !== "all" && p.event_day_id !== filterDay) return false;
      if (filterPreg !== "all" && p.pregrado_id !== filterPreg) return false;
      if (search.trim() && !p.nombre.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [projects, filterDay, filterPreg, search]);

  const openCreate = () => { setEditing(null); setForm(blank); setOpen(true); };
  const openEdit = (p: Project) => {
    setEditing(p);
    setForm({
      event_day_id: p.event_day_id, nombre: p.nombre, descripcion: p.descripcion,
      pregrado_id: p.pregrado_id, correo_representante: p.correo_representante,
      telefono_representante: p.telefono_representante, numero_integrantes: p.numero_integrantes,
    });
    setOpen(true);
  };

  const save = async () => {
    if (busy) return;
    const parsed = projectSchema.safeParse({ ...form, numero_integrantes: Number(form.numero_integrantes) });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Datos inválidos");
      return;
    }
    setBusy(true);
    try {
      // Duplicate warning (same day + pregrado + name)
      if (!editing) {
        const dup = projects.find(p =>
          p.event_day_id === parsed.data.event_day_id &&
          p.pregrado_id === parsed.data.pregrado_id &&
          p.nombre.trim().toLowerCase() === parsed.data.nombre.toLowerCase()
        );
        if (dup && !window.confirm("Ya existe un proyecto con ese nombre en el mismo día y pregrado. ¿Deseas continuar?")) {
          setBusy(false); return;
        }
      }
      if (editing) {
        const { error } = await supabase.from("proyectos").update(parsed.data).eq("id", editing.id);
        if (error) throw error;
        await supabase.from("audit_logs").insert({ usuario_id: user!.id, accion: "editar_proyecto", tabla_afectada: "proyectos", registro_id: editing.id, descripcion: `Editó proyecto ${parsed.data.nombre}` });
        toast.success("Proyecto actualizado");
      } else {
        const { error } = await supabase.from("proyectos").insert({ ...parsed.data, creado_por: user!.id });
        if (error) throw error;
        await supabase.from("audit_logs").insert({ usuario_id: user!.id, accion: "crear_proyecto", tabla_afectada: "proyectos", descripcion: `Creó proyecto ${parsed.data.nombre}` });
        toast.success("Proyecto creado");
      }
      setOpen(false);
    } catch (e: any) {
      toast.error(e.message ?? "Error al guardar");
    } finally {
      setBusy(false);
    }
  };

  const toggleEstado = async (p: Project) => {
    const nuevo = p.estado === "habilitado" ? "deshabilitado" : "habilitado";
    const { error } = await supabase.from("proyectos").update({ estado: nuevo }).eq("id", p.id);
    if (error) return toast.error(error.message);
    await supabase.from("audit_logs").insert({ usuario_id: user!.id, accion: `${nuevo}_proyecto`, tabla_afectada: "proyectos", registro_id: p.id, descripcion: `${nuevo === "habilitado" ? "Habilitó" : "Deshabilitó"} proyecto ${p.nombre}` });
    toast.success(`Proyecto ${nuevo}`);
  };

  const pregName = (id: string) => pregrados.find(p => p.id === id)?.nombre ?? "";
  const dayName = (id: string) => days.find(d => d.id === id)?.nombre ?? "";

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Proyectos</h1>
          <p className="text-muted-foreground">Registro de proyectos participantes en INVENTIVA 2026-1.</p>
        </div>
        {isOrganizer && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreate} size="lg"><Plus className="h-5 w-5 mr-2" /> Registrar proyecto</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editing ? "Editar proyecto" : "Nuevo proyecto"}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Día del evento *</Label>
                  <Select value={form.event_day_id} onValueChange={v => setForm({ ...form, event_day_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecciona el día" /></SelectTrigger>
                    <SelectContent>{days.map(d => <SelectItem key={d.id} value={d.id}>{d.nombre}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Pregrado *</Label>
                  <Select value={form.pregrado_id} onValueChange={v => setForm({ ...form, pregrado_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecciona el pregrado" /></SelectTrigger>
                    <SelectContent>{pregrados.map(p => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Nombre del proyecto *</Label>
                  <Input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} maxLength={200} />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Descripción *</Label>
                  <Textarea value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} rows={4} maxLength={2000} />
                </div>
                <div className="space-y-1.5">
                  <Label>Correo del representante *</Label>
                  <Input type="email" value={form.correo_representante} onChange={e => setForm({ ...form, correo_representante: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Teléfono *</Label>
                  <Input value={form.telefono_representante} onChange={e => setForm({ ...form, telefono_representante: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Número de integrantes *</Label>
                  <Input type="number" min={1} value={form.numero_integrantes} onChange={e => setForm({ ...form, numero_integrantes: e.target.value })} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>Cancelar</Button>
                <Button onClick={save} disabled={busy}>{busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Guardar cambios</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </header>

      <Card>
        <CardContent className="p-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label className="text-xs">Día</Label>
              <Select value={filterDay} onValueChange={setFilterDay}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los días</SelectItem>
                  {days.map(d => <SelectItem key={d.id} value={d.id}>{d.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Pregrado</Label>
              <Select value={filterPreg} onValueChange={setFilterPreg}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {pregrados.map(p => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Buscar</Label>
              <Input placeholder="Nombre del proyecto" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted text-muted-foreground text-xs uppercase tracking-wider">
              <tr>
                <th className="px-3 py-3 text-left">Día</th>
                <th className="px-3 py-3 text-left">Proyecto</th>
                <th className="px-3 py-3 text-left">Pregrado</th>
                <th className="px-3 py-3 text-left">Representante</th>
                <th className="px-3 py-3 text-left">Integrantes</th>
                <th className="px-3 py-3 text-left">Estado</th>
                <th className="px-3 py-3 text-left">Creado</th>
                <th className="px-3 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="px-3 py-10 text-center text-muted-foreground">
                  <AlertTriangle className="h-5 w-5 mx-auto mb-2" />No hay proyectos para los filtros.
                </td></tr>
              )}
              {filtered.map(p => (
                <tr key={p.id} className="border-t border-border hover:bg-accent/30">
                  <td className="px-3 py-3 whitespace-nowrap">{dayName(p.event_day_id)}</td>
                  <td className="px-3 py-3">
                    <div className="font-medium">{p.nombre}</div>
                    <div className="text-xs text-muted-foreground line-clamp-1">{p.descripcion}</div>
                  </td>
                  <td className="px-3 py-3">{pregName(p.pregrado_id)}</td>
                  <td className="px-3 py-3">
                    <div className="text-xs">{p.correo_representante}</div>
                    <div className="text-xs text-muted-foreground">{p.telefono_representante}</div>
                  </td>
                  <td className="px-3 py-3 text-center">{p.numero_integrantes}</td>
                  <td className="px-3 py-3">
                    <Badge variant={p.estado === "habilitado" ? "default" : "secondary"}>
                      {p.estado}
                    </Badge>
                  </td>
                  <td className="px-3 py-3 text-xs">
                    <div>{new Date(p.created_at).toLocaleDateString("es-CO")}</div>
                    <div className="text-muted-foreground">{profilesMap[p.creado_por ?? ""] ?? ""}</div>
                  </td>
                  <td className="px-3 py-3 text-right whitespace-nowrap">
                    {isOrganizer && (
                      <div className="inline-flex gap-2">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(p)}><Pencil className="h-3.5 w-3.5 mr-1" />Editar</Button>
                        <Button size="sm" variant={p.estado === "habilitado" ? "outline" : "default"} onClick={() => toggleEstado(p)}>
                          {p.estado === "habilitado" ? "Deshabilitar" : "Habilitar"}
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
