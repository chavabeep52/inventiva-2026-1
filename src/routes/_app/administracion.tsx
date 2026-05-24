import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { exportExcel, exportCSV, exportPDF } from "@/lib/exports";
import { FileSpreadsheet, FileDown, FileText, Lock, Unlock, Ban } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/administracion")({ component: AdminPage });

function AdminPage() {
  const { user, isAdmin } = useAuth();
  const [cfg, setCfg] = useState<any>(null);
  const [proyectos, setProyectos] = useState<any[]>([]);
  const [votos, setVotos] = useState<any[]>([]);
  const [pregrados, setPregrados] = useState<{ id: string; nombre: string }[]>([]);
  const [days, setDays] = useState<{ id: string; nombre: string; orden: number; fecha: string }[]>([]);
  const [audit, setAudit] = useState<any[]>([]);
  const [exportDay, setExportDay] = useState<string>("all");

  const load = async () => {
    const [c, p, v, pr, ds, a] = await Promise.all([
      supabase.from("configuracion").select("*").limit(1).maybeSingle(),
      supabase.from("proyectos").select("*"),
      supabase.from("votos").select("*").order("created_at", { ascending: false }),
      supabase.from("pregrados").select("id,nombre"),
      supabase.from("event_days").select("id,nombre,orden,fecha").order("orden"),
      supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(200),
    ]);
    setCfg(c.data); setProyectos(p.data ?? []); setVotos(v.data ?? []);
    setPregrados(pr.data ?? []); setDays(ds.data ?? []); setAudit(a.data ?? []);
  };

  useEffect(() => {
    load();
    const ch = supabase.channel("admin-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "votos" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "configuracion" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  if (!isAdmin) return <div className="text-muted-foreground">Esta sección es solo para administradores.</div>;

  const toggleVotacion = async () => {
    if (!cfg) return;
    const nuevo = !cfg.votacion_abierta;
    const { error } = await supabase.from("configuracion").update({ votacion_abierta: nuevo }).eq("id", cfg.id);
    if (error) return toast.error(error.message);
    await supabase.from("audit_logs").insert({ usuario_id: user!.id, accion: nuevo ? "abrir_votacion" : "cerrar_votacion", tabla_afectada: "configuracion", registro_id: cfg.id, descripcion: `Votación ${nuevo ? "reabierta" : "cerrada"}` });
    toast.success(`Votación ${nuevo ? "reabierta" : "cerrada"}`);
  };

  const anular = async (voto: any) => {
    const { error } = await supabase.from("votos").update({ estado: "anulado" }).eq("id", voto.id);
    if (error) return toast.error(error.message);
    await supabase.from("audit_logs").insert({
      usuario_id: user!.id, accion: "anular_voto", tabla_afectada: "votos", registro_id: voto.id,
      descripcion: `Anuló voto de ${voto.nombre_votante}`,
      metadata: { tipo_votante: voto.tipo_votante, proyecto_id: voto.proyecto_id, pregrado_id: voto.pregrado_id, event_day_id: voto.event_day_id },
    });
    toast.success("Voto anulado");
  };

  const exportCtx = () => ({
    proyectos, votos, pregrados, days, audit, dayId: exportDay === "all" ? null : exportDay,
  });

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-3xl font-bold">Administración</h1>
        <p className="text-muted-foreground">Control del evento INVENTIVA EAFIT 2026-1.</p>
      </header>

      <Card>
        <CardContent className="p-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm text-muted-foreground">Estado de votación</div>
            <div className="font-display text-2xl font-bold mt-1">
              {cfg?.votacion_abierta ? "Abierta" : "Cerrada"}
            </div>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="lg" variant={cfg?.votacion_abierta ? "destructive" : "default"}>
                {cfg?.votacion_abierta ? <><Lock className="h-5 w-5 mr-2" /> Cerrar votaciones</> : <><Unlock className="h-5 w-5 mr-2" /> Reabrir votaciones</>}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{cfg?.votacion_abierta ? "Cerrar" : "Reabrir"} votaciones</AlertDialogTitle>
                <AlertDialogDescription>¿Confirmas esta acción? Quedará registrada en auditoría.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={toggleVotacion}>Confirmar</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-4">
          <h2 className="font-display text-xl font-semibold">Exportaciones</h2>
          <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto_auto_auto] sm:items-end">
            <div>
              <Label className="text-xs">Día a exportar</Label>
              <Select value={exportDay} onValueChange={setExportDay}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los días</SelectItem>
                  {days.map(d => <SelectItem key={d.id} value={d.id}>{d.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => exportExcel(exportCtx())}><FileSpreadsheet className="h-4 w-4 mr-2" /> Exportar Excel</Button>
            <Button variant="secondary" onClick={() => exportCSV(exportCtx(), "votos")}><FileDown className="h-4 w-4 mr-2" /> CSV votos</Button>
            <Button variant="secondary" onClick={() => exportCSV(exportCtx(), "resultados")}><FileDown className="h-4 w-4 mr-2" /> CSV resultados</Button>
            <Button variant="secondary" onClick={() => exportCSV(exportCtx(), "proyectos")}><FileDown className="h-4 w-4 mr-2" /> CSV proyectos</Button>
            <Button variant="outline" onClick={() => exportPDF(exportCtx(), cfg?.votacion_abierta ?? true)}><FileText className="h-4 w-4 mr-2" /> Acta PDF</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="p-5 border-b border-border"><h2 className="font-display text-xl font-semibold">Votos recientes</h2></div>
          <div className="overflow-x-auto max-h-[400px]">
            <table className="w-full text-sm">
              <thead className="bg-muted text-xs uppercase tracking-wider text-muted-foreground sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left">Fecha</th>
                  <th className="px-3 py-2 text-left">Día</th>
                  <th className="px-3 py-2 text-left">Proyecto</th>
                  <th className="px-3 py-2 text-left">Votante</th>
                  <th className="px-3 py-2 text-left">Tipo</th>
                  <th className="px-3 py-2 text-left">Estado</th>
                  <th className="px-3 py-2 text-right"></th>
                </tr>
              </thead>
              <tbody>
                {votos.slice(0, 100).map(v => (
                  <tr key={v.id} className="border-t border-border">
                    <td className="px-3 py-2 text-xs">{new Date(v.created_at).toLocaleString("es-CO")}</td>
                    <td className="px-3 py-2 text-xs">{days.find(d => d.id === v.event_day_id)?.nombre}</td>
                    <td className="px-3 py-2">{proyectos.find(p => p.id === v.proyecto_id)?.nombre}</td>
                    <td className="px-3 py-2">{v.nombre_votante}</td>
                    <td className="px-3 py-2 text-xs">{v.tipo_votante}</td>
                    <td className="px-3 py-2"><Badge variant={v.estado === "valido" ? "default" : "destructive"}>{v.estado}</Badge></td>
                    <td className="px-3 py-2 text-right">
                      {v.estado === "valido" && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="ghost"><Ban className="h-3.5 w-3.5 mr-1" /> Anular</Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Anular voto</AlertDialogTitle>
                              <AlertDialogDescription>¿Seguro que deseas anular este voto? Esta acción quedará registrada en auditoría.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => anular(v)}>Anular</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="p-5 border-b border-border"><h2 className="font-display text-xl font-semibold">Auditoría</h2></div>
          <div className="overflow-x-auto max-h-[400px]">
            <table className="w-full text-sm">
              <thead className="bg-muted text-xs uppercase tracking-wider text-muted-foreground sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left">Fecha</th>
                  <th className="px-3 py-2 text-left">Acción</th>
                  <th className="px-3 py-2 text-left">Tabla</th>
                  <th className="px-3 py-2 text-left">Descripción</th>
                </tr>
              </thead>
              <tbody>
                {audit.map(a => (
                  <tr key={a.id} className="border-t border-border">
                    <td className="px-3 py-2 text-xs">{new Date(a.created_at).toLocaleString("es-CO")}</td>
                    <td className="px-3 py-2 text-xs font-medium">{a.accion}</td>
                    <td className="px-3 py-2 text-xs">{a.tabla_afectada}</td>
                    <td className="px-3 py-2 text-xs">{a.descripcion}</td>
                  </tr>
                ))}
                {audit.length === 0 && <tr><td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">Sin registros aún.</td></tr>}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
