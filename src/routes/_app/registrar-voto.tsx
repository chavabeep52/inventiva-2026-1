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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Loader2, Vote, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

export const Route = createFileRoute("/_app/registrar-voto")({ component: RegistrarVoto });

const voteSchema = z.object({
  event_day_id: z.string().uuid(),
  pregrado_id: z.string().uuid(),
  proyecto_id: z.string().uuid(),
  nombre_votante: z.string().trim().min(2).max(120),
  tipo_votante: z.enum(["popular", "profesor", "jurado"]),
  observacion: z.string().trim().max(500).optional().or(z.literal("")),
});

function RegistrarVoto() {
  const { user, canVote } = useAuth();
  const [days, setDays] = useState<{ id: string; nombre: string; orden: number }[]>([]);
  const [pregrados, setPregrados] = useState<{ id: string; nombre: string }[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [config, setConfig] = useState<{ votacion_abierta: boolean } | null>(null);

  const [form, setForm] = useState({
    event_day_id: "", pregrado_id: "", proyecto_id: "",
    nombre_votante: "", tipo_votante: "" as "" | "popular" | "profesor" | "jurado",
    observacion: "",
  });
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [dupOpen, setDupOpen] = useState(false);
  const [stage, setStage] = useState<"idle" | "checkDup" | "confirm">("idle");

  const load = async () => {
    const [{ data: ds }, { data: pr }, { data: cfg }] = await Promise.all([
      supabase.from("event_days").select("id,nombre,orden").order("orden"),
      supabase.from("pregrados").select("id,nombre").order("nombre"),
      supabase.from("configuracion").select("*").limit(1).maybeSingle(),
    ]);
    setDays(ds ?? []);
    setPregrados(pr ?? []);
    setConfig(cfg as any);
  };

  useEffect(() => { load(); }, []);

  // Load filtered projects when day+pregrado picked
  useEffect(() => {
    if (!form.event_day_id || !form.pregrado_id) { setProjects([]); return; }
    supabase.from("proyectos")
      .select("id,nombre,estado")
      .eq("event_day_id", form.event_day_id)
      .eq("pregrado_id", form.pregrado_id)
      .eq("estado", "habilitado")
      .order("nombre")
      .then(({ data }) => setProjects(data ?? []));
  }, [form.event_day_id, form.pregrado_id]);

  const projectName = useMemo(
    () => projects.find(p => p.id === form.proyecto_id)?.nombre ?? "",
    [projects, form.proyecto_id]
  );

  const reset = () => setForm({
    event_day_id: form.event_day_id, pregrado_id: "", proyecto_id: "",
    nombre_votante: "", tipo_votante: "", observacion: "",
  });

  const tryRegister = async () => {
    if (busy || !canVote) return;
    if (config && !config.votacion_abierta) {
      toast.error("La votación está cerrada.");
      return;
    }
    const parsed = voteSchema.safeParse(form);
    if (!parsed.success) {
      toast.error("Completa todos los campos obligatorios.");
      return;
    }
    // duplicate name check (same day)
    const norm = form.nombre_votante.trim().toLowerCase();
    const { data: dup } = await supabase
      .from("votos")
      .select("id")
      .eq("event_day_id", form.event_day_id)
      .eq("nombre_votante_norm", norm)
      .eq("estado", "valido")
      .limit(1);
    if (dup && dup.length > 0) {
      setDupOpen(true);
      return;
    }
    setConfirmOpen(true);
  };

  const doSave = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const parsed = voteSchema.safeParse(form);
      if (!parsed.success) throw new Error("Datos inválidos");
      const payload = { ...parsed.data, registrado_por: user!.id, observacion: parsed.data.observacion || null };
      const { error } = await supabase.from("votos").insert(payload);
      if (error) throw error;
      toast.success(`Voto registrado correctamente para el proyecto ${projectName}.`);
      reset();
      setConfirmOpen(false);
    } catch (e: any) {
      toast.error(`No se pudo registrar el voto. ${e.message ?? ""}`);
    } finally {
      setBusy(false);
    }
  };

  if (!canVote) {
    return <div className="text-muted-foreground">Tu rol actual no permite registrar votos.</div>;
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <header>
        <h1 className="font-display text-3xl font-bold flex items-center gap-2">
          <Vote className="h-7 w-7 text-primary" /> Registrar voto
        </h1>
        <p className="text-muted-foreground mt-1">
          Mesa de votación · El operador escucha al votante y registra el voto.
        </p>
        {config && !config.votacion_abierta && (
          <div className="mt-3 rounded-md border border-destructive/40 bg-destructive/10 text-destructive px-4 py-3 text-sm">
            La votación está actualmente cerrada. No se permiten nuevos registros.
          </div>
        )}
      </header>

      <Card className="shadow-[var(--shadow-card)]">
        <CardContent className="p-6 space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Día del evento *</Label>
              <Select value={form.event_day_id} onValueChange={v => setForm({ ...form, event_day_id: v, pregrado_id: "", proyecto_id: "" })}>
                <SelectTrigger><SelectValue placeholder="Selecciona el día" /></SelectTrigger>
                <SelectContent>{days.map(d => <SelectItem key={d.id} value={d.id}>{d.nombre}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Pregrado *</Label>
              <Select value={form.pregrado_id} disabled={!form.event_day_id} onValueChange={v => setForm({ ...form, pregrado_id: v, proyecto_id: "" })}>
                <SelectTrigger><SelectValue placeholder="Selecciona pregrado" /></SelectTrigger>
                <SelectContent>{pregrados.map(p => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Proyecto *</Label>
            <Select value={form.proyecto_id} disabled={!form.pregrado_id} onValueChange={v => setForm({ ...form, proyecto_id: v })}>
              <SelectTrigger><SelectValue placeholder={form.pregrado_id ? "Selecciona el proyecto" : "Primero elige día y pregrado"} /></SelectTrigger>
              <SelectContent>
                {projects.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-muted-foreground">No hay proyectos habilitados para esta selección.</div>
                ) : projects.map(p => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Nombre del votante *</Label>
              <Input value={form.nombre_votante} onChange={e => setForm({ ...form, nombre_votante: e.target.value })} maxLength={120} placeholder="Nombre completo" />
            </div>
            <div className="space-y-1.5">
              <Label>Tipo de votante *</Label>
              <Select value={form.tipo_votante} onValueChange={(v: any) => setForm({ ...form, tipo_votante: v })}>
                <SelectTrigger><SelectValue placeholder="Selecciona el tipo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="popular">Estudiante / familiar / visitante</SelectItem>
                  <SelectItem value="profesor">Profesor</SelectItem>
                  <SelectItem value="jurado">Empresa / jurado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Observación (opcional)</Label>
            <Textarea value={form.observacion} onChange={e => setForm({ ...form, observacion: e.target.value })} rows={2} maxLength={500} />
          </div>

          <Button onClick={tryRegister} disabled={busy || (config && !config.votacion_abierta) || false}
            size="lg" className="w-full h-12 text-base">
            {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <CheckCircle2 className="h-5 w-5 mr-2" /> Registrar voto
          </Button>
        </CardContent>
      </Card>

      {/* Duplicate alert */}
      <AlertDialog open={dupOpen} onOpenChange={setDupOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Posible votante repetido</AlertDialogTitle>
            <AlertDialogDescription>
              Este nombre de votante ya tiene un voto registrado en este día. Verifica si
              corresponde a la misma persona antes de continuar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setDupOpen(false); setConfirmOpen(true); }}>Continuar de todas formas</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar voto</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Confirmas registrar este voto para el proyecto <strong>{projectName}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={doSave} disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
