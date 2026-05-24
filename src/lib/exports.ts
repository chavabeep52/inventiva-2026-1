import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { computeScores, TIPO_LABEL, type VotoLite, type TipoVotante } from "./scoring";

export interface ExportContext {
  proyectos: any[];
  votos: any[];
  pregrados: { id: string; nombre: string }[];
  days: { id: string; nombre: string; fecha: string; orden: number }[];
  audit?: any[];
  dayId?: string | null; // null = all days
}

const fmt = (n: number) => Math.round(n * 100) / 100;

function buildRows(ctx: ExportContext) {
  const dayName = (id?: string) => ctx.days.find(d => d.id === id)?.nombre ?? "";
  const pregName = (id?: string) => ctx.pregrados.find(p => p.id === id)?.nombre ?? "";
  const projName = (id?: string) => ctx.proyectos.find(p => p.id === id)?.nombre ?? "";

  // votos crudos
  const votos_crudos = ctx.votos
    .filter(v => !ctx.dayId || v.event_day_id === ctx.dayId)
    .map(v => ({
      Fecha: new Date(v.created_at).toLocaleString("es-CO"),
      Día: dayName(v.event_day_id),
      Pregrado: pregName(v.pregrado_id),
      Proyecto: projName(v.proyecto_id),
      "Nombre votante": v.nombre_votante,
      "Tipo de votante": TIPO_LABEL[v.tipo_votante as TipoVotante],
      Estado: v.estado,
      Observación: v.observacion ?? "",
    }));

  // resultados por pregrado (current day filter)
  const scores = computeScores(
    ctx.votos as VotoLite[],
    ctx.proyectos.map(p => ({ id: p.id, pregrado_id: p.pregrado_id, event_day_id: p.event_day_id })),
    { dayId: ctx.dayId ?? null }
  );

  const resultados_por_pregrado = scores.map(s => ({
    Día: dayName(s.event_day_id),
    Pregrado: pregName(s.pregrado_id),
    Proyecto: projName(s.proyecto_id),
    "Votos populares": s.votos_popular,
    "Votos profesores": s.votos_profesor,
    "Votos jurado": s.votos_jurado,
    "% Popular": fmt(s.pct_popular),
    "% Profesor": fmt(s.pct_profesor),
    "% Jurado": fmt(s.pct_jurado),
    "Puntaje popular": fmt(s.puntaje_popular),
    "Puntaje profesor": fmt(s.puntaje_profesor),
    "Puntaje jurado": fmt(s.puntaje_jurado),
    "Puntaje final": fmt(s.puntaje_final),
  })).sort((a, b) =>
    (a.Pregrado + a.Día).localeCompare(b.Pregrado + b.Día) || b["Puntaje final"] - a["Puntaje final"]
  );

  const resultados_generales = [...resultados_por_pregrado].sort((a, b) => b["Puntaje final"] - a["Puntaje final"]);

  const resultados_por_dia = ctx.days.map(d => {
    const dayScores = computeScores(
      ctx.votos as VotoLite[],
      ctx.proyectos.map(p => ({ id: p.id, pregrado_id: p.pregrado_id, event_day_id: p.event_day_id })),
      { dayId: d.id }
    );
    return dayScores.map(s => ({
      Día: d.nombre,
      Pregrado: pregName(s.pregrado_id),
      Proyecto: projName(s.proyecto_id),
      "Puntaje final": fmt(s.puntaje_final),
      "Total votos": s.total_votos,
    }));
  }).flat();

  const votosFilt = ctx.votos.filter(v => !ctx.dayId || v.event_day_id === ctx.dayId);
  const votos_por_tipo = (["popular","profesor","jurado"] as TipoVotante[]).map(t => ({
    Tipo: TIPO_LABEL[t],
    Total: votosFilt.filter(v => v.tipo_votante === t && v.estado === "valido").length,
  }));

  const proyectos_rows = ctx.proyectos
    .filter(p => !ctx.dayId || p.event_day_id === ctx.dayId)
    .map(p => ({
      Día: dayName(p.event_day_id),
      Nombre: p.nombre,
      Descripción: p.descripcion,
      Pregrado: pregName(p.pregrado_id),
      Correo: p.correo_representante,
      Teléfono: p.telefono_representante,
      Integrantes: p.numero_integrantes,
      Estado: p.estado,
      Creado: new Date(p.created_at).toLocaleString("es-CO"),
    }));

  const auditoria = (ctx.audit ?? []).map(a => ({
    Fecha: new Date(a.created_at).toLocaleString("es-CO"),
    Usuario: a.usuario_id ?? "",
    Acción: a.accion,
    Tabla: a.tabla_afectada ?? "",
    Registro: a.registro_id ?? "",
    Descripción: a.descripcion ?? "",
  }));

  return { votos_crudos, resultados_por_pregrado, resultados_generales, resultados_por_dia, votos_por_tipo, proyectos_rows, auditoria };
}

export function exportExcel(ctx: ExportContext) {
  const sheets = buildRows(ctx);
  const wb = XLSX.utils.book_new();
  const add = (name: string, rows: any[]) => XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows.length ? rows : [{}]), name);
  add("Votos_crudos", sheets.votos_crudos);
  add("Resultados_por_pregrado", sheets.resultados_por_pregrado);
  add("Resultados_generales", sheets.resultados_generales);
  add("Resultados_por_dia", sheets.resultados_por_dia);
  add("Votos_por_tipo", sheets.votos_por_tipo);
  add("Proyectos", sheets.proyectos_rows);
  add("Auditoria", sheets.auditoria);
  const tag = ctx.dayId ? "dia" : "todos";
  XLSX.writeFile(wb, `INVENTIVA_2026-1_resultados_${tag}_${Date.now()}.xlsx`);
}

export function exportCSV(ctx: ExportContext, which: "votos" | "resultados" | "proyectos") {
  const sheets = buildRows(ctx);
  const map: Record<string, any[]> = {
    votos: sheets.votos_crudos,
    resultados: sheets.resultados_por_pregrado,
    proyectos: sheets.proyectos_rows,
  };
  const ws = XLSX.utils.json_to_sheet(map[which].length ? map[which] : [{}]);
  const csv = XLSX.utils.sheet_to_csv(ws);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `INVENTIVA_2026-1_${which}_${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportPDF(ctx: ExportContext, votacionAbierta: boolean) {
  const doc = new jsPDF({ orientation: "portrait" });
  const sheets = buildRows(ctx);
  const dayTag = ctx.dayId ? ctx.days.find(d => d.id === ctx.dayId)?.nombre : "Todos los días";
  doc.setFontSize(18);
  doc.text("Acta de resultados — INVENTIVA EAFIT 2026-1", 14, 18);
  doc.setFontSize(10);
  doc.text(`Generada: ${new Date().toLocaleString("es-CO")}`, 14, 26);
  doc.text(`Día exportado: ${dayTag}`, 14, 32);
  doc.text(`Estado de votación: ${votacionAbierta ? "Abierta" : "Cerrada"}`, 14, 38);
  doc.text("Ponderación: Estudiantes/visitantes 30% · Profesores 30% · Empresas/jurado 40%", 14, 44);

  // Ganadores por pregrado
  doc.setFontSize(13);
  doc.text("Ganadores por pregrado", 14, 54);
  const winners: any[] = [];
  const byGroup = new Map<string, any[]>();
  for (const r of sheets.resultados_por_pregrado) {
    const k = `${r.Día}::${r.Pregrado}`;
    if (!byGroup.has(k)) byGroup.set(k, []);
    byGroup.get(k)!.push(r);
  }
  for (const [, list] of byGroup) {
    list.sort((a, b) => b["Puntaje final"] - a["Puntaje final"]);
    list.slice(0, 3).forEach((r, idx) => {
      winners.push([`${idx + 1}°`, r.Día, r.Pregrado, r.Proyecto, r["Puntaje final"]]);
    });
  }
  autoTable(doc, {
    startY: 58,
    head: [["Pos", "Día", "Pregrado", "Proyecto", "Puntaje"]],
    body: winners,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [30, 31, 121] },
  });

  const totalVotos = sheets.votos_crudos.filter(v => v.Estado === "valido").length;
  const startY2 = (doc as any).lastAutoTable.finalY + 8;
  doc.setFontSize(11);
  doc.text(`Total de votos válidos: ${totalVotos}`, 14, startY2);
  autoTable(doc, {
    startY: startY2 + 4,
    head: [["Tipo de votante", "Total"]],
    body: sheets.votos_por_tipo.map(r => [r.Tipo, r.Total]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [97, 69, 170] },
  });

  doc.save(`INVENTIVA_2026-1_acta_${Date.now()}.pdf`);
}
