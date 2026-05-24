import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { computeScores, type VotoLite } from "@/lib/scoring";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { Trophy } from "lucide-react";

export const Route = createFileRoute("/_app/resultados")({ component: ResultadosPage });

const COLORS = ["#1E1F79", "#6145AA", "#3C9DE8", "#F7D46C", "#22a06b"];

function ResultadosPage() {
  const [votos, setVotos] = useState<any[]>([]);
  const [proyectos, setProyectos] = useState<any[]>([]);
  const [pregrados, setPregrados] = useState<{ id: string; nombre: string }[]>([]);
  const [days, setDays] = useState<{ id: string; nombre: string; orden: number }[]>([]);
  const [filterDay, setFilterDay] = useState<string>("all");
  const [filterPreg, setFilterPreg] = useState<string>("all");

  const load = async () => {
    const [{ data: v }, { data: p }, { data: pr }, { data: ds }] = await Promise.all([
      supabase.from("votos").select("*"),
      supabase.from("proyectos").select("*"),
      supabase.from("pregrados").select("id,nombre").order("nombre"),
      supabase.from("event_days").select("id,nombre,orden").order("orden"),
    ]);
    setVotos(v ?? []); setProyectos(p ?? []); setPregrados(pr ?? []); setDays(ds ?? []);
  };

  useEffect(() => {
    load();
    const ch = supabase.channel("res-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "votos" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "proyectos" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const dayId = filterDay === "all" ? null : filterDay;
  const pregId = filterPreg === "all" ? null : filterPreg;

  const scores = useMemo(() => {
    return computeScores(
      votos as VotoLite[],
      proyectos.map(p => ({ id: p.id, pregrado_id: p.pregrado_id, event_day_id: p.event_day_id })),
      { dayId, pregradoId: pregId }
    ).sort((a, b) => b.puntaje_final - a.puntaje_final);
  }, [votos, proyectos, dayId, pregId]);

  const projName = (id: string) => proyectos.find(p => p.id === id)?.nombre ?? "";
  const pregName = (id: string) => pregrados.find(p => p.id === id)?.nombre ?? "";
  const dayName = (id: string) => days.find(d => d.id === id)?.nombre ?? "";

  // Podium when a pregrado is selected
  const podium = pregId ? scores.slice(0, 3) : [];

  const totalVotos = votos.filter(v =>
    v.estado === "valido" &&
    (!dayId || v.event_day_id === dayId) &&
    (!pregId || v.pregrado_id === pregId)
  ).length;

  const votosPorTipo = ["popular", "profesor", "jurado"].map(t => ({
    name: t === "popular" ? "Popular" : t === "profesor" ? "Profesor" : "Jurado",
    value: votos.filter(v => v.estado === "valido" && v.tipo_votante === t && (!dayId || v.event_day_id === dayId) && (!pregId || v.pregrado_id === pregId)).length,
  }));

  const votosPorPreg = pregrados.map(p => ({
    name: p.nombre,
    value: votos.filter(v => v.estado === "valido" && v.pregrado_id === p.id && (!dayId || v.event_day_id === dayId)).length,
  })).filter(x => x.value > 0);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Resultados en vivo</h1>
          <p className="text-muted-foreground">Ponderación 30% popular · 30% profesor · 40% jurado.</p>
        </div>
        <Badge variant="secondary" className="self-start">Total votos: {totalVotos}</Badge>
      </header>

      <Card>
        <CardContent className="p-5 grid gap-3 sm:grid-cols-2">
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
                <SelectItem value="all">Ranking general</SelectItem>
                {pregrados.map(p => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {podium.length > 0 && (
        <section>
          <h2 className="font-display text-xl font-semibold mb-4 flex items-center gap-2"><Trophy className="h-5 w-5 text-[var(--brand-yellow)]" /> Podio · {pregName(pregId!)}</h2>
          <div className="grid gap-4 sm:grid-cols-3 items-end">
            {[1, 0, 2].map(orderIdx => {
              const s = podium[orderIdx];
              if (!s) return <div key={orderIdx} />;
              const place = orderIdx + 1;
              const heights = ["h-44", "h-56", "h-36"];
              const colors = ["bg-[var(--brand-sky)]", "bg-[var(--brand-yellow)]", "bg-[var(--brand-purple)]"];
              return (
                <Card key={s.proyecto_id} className={`${heights[orderIdx]} ${colors[orderIdx]} text-primary border-none shadow-[var(--shadow-elevated)] flex flex-col justify-end`}>
                  <CardContent className="p-5">
                    <div className="text-5xl font-display font-bold">{place === 0 ? 1 : place === 1 ? 1 : place === 2 ? 3 : place}</div>
                    <div className="font-display font-bold text-lg mt-2 line-clamp-2">{projName(s.proyecto_id)}</div>
                    <div className="text-xs mt-1 opacity-80">{dayName(s.event_day_id)}</div>
                    <div className="mt-3 text-sm">Puntaje: <strong>{s.puntaje_final.toFixed(2)}</strong></div>
                    <div className="text-xs opacity-80">{s.total_votos} votos</div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted text-muted-foreground text-xs uppercase tracking-wider">
              <tr>
                <th className="px-3 py-3 text-left">#</th>
                <th className="px-3 py-3 text-left">Día</th>
                <th className="px-3 py-3 text-left">Proyecto</th>
                <th className="px-3 py-3 text-left">Pregrado</th>
                <th className="px-3 py-3 text-right">Pop</th>
                <th className="px-3 py-3 text-right">Prof</th>
                <th className="px-3 py-3 text-right">Jurado</th>
                <th className="px-3 py-3 text-right">P.Pop</th>
                <th className="px-3 py-3 text-right">P.Prof</th>
                <th className="px-3 py-3 text-right">P.Jur</th>
                <th className="px-3 py-3 text-right">Final</th>
              </tr>
            </thead>
            <tbody>
              {scores.map((s, i) => (
                <tr key={s.proyecto_id} className="border-t border-border hover:bg-accent/30">
                  <td className="px-3 py-2.5 font-semibold">{i + 1}</td>
                  <td className="px-3 py-2.5 text-xs">{dayName(s.event_day_id)}</td>
                  <td className="px-3 py-2.5 font-medium">{projName(s.proyecto_id)}</td>
                  <td className="px-3 py-2.5 text-xs">{pregName(s.pregrado_id)}</td>
                  <td className="px-3 py-2.5 text-right">{s.votos_popular}</td>
                  <td className="px-3 py-2.5 text-right">{s.votos_profesor}</td>
                  <td className="px-3 py-2.5 text-right">{s.votos_jurado}</td>
                  <td className="px-3 py-2.5 text-right">{s.puntaje_popular.toFixed(1)}</td>
                  <td className="px-3 py-2.5 text-right">{s.puntaje_profesor.toFixed(1)}</td>
                  <td className="px-3 py-2.5 text-right">{s.puntaje_jurado.toFixed(1)}</td>
                  <td className="px-3 py-2.5 text-right font-bold text-primary">{s.puntaje_final.toFixed(2)}</td>
                </tr>
              ))}
              {scores.length === 0 && <tr><td colSpan={11} className="px-3 py-10 text-center text-muted-foreground">Aún no hay resultados.</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card><CardContent className="p-5">
          <h3 className="font-display font-semibold mb-3">Puntaje final por proyecto</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={scores.slice(0, 10).map(s => ({ name: projName(s.proyecto_id).slice(0, 18), Puntaje: +s.puntaje_final.toFixed(2) }))}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-20} height={60} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="Puntaje" fill="#1E1F79" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent></Card>

        <Card><CardContent className="p-5">
          <h3 className="font-display font-semibold mb-3">Distribución de votos por tipo</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={votosPorTipo} dataKey="value" nameKey="name" outerRadius={90} label>
                {votosPorTipo.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Legend /><Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent></Card>

        <Card className="lg:col-span-2"><CardContent className="p-5">
          <h3 className="font-display font-semibold mb-3">Total de votos por pregrado</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={votosPorPreg}>
              <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-25} height={80} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="value" fill="#6145AA" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent></Card>
      </section>
    </div>
  );
}
