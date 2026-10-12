import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SectionTitle, statusLabel } from "@/components/yard/common";
import { useYard } from "@/lib/yard/store";
import { exportCsv } from "@/lib/yard/csv";
import type { OpStatus } from "@/lib/yard/types";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Аналитика и отчёты — SMART YARD" },
      { name: "description", content: "Загрузка путей, использование локомотивов, конфликты и выполнение плана отправления с экспортом CSV." },
      { property: "og:title", content: "Аналитика — SMART YARD" },
      { property: "og:description", content: "Графики и отчёты по маневровой работе грузового парка." },
    ],
  }),
  component: AnalyticsPage,
});

const C = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];
const tip = { contentStyle: { background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12 }, labelStyle: { color: "var(--foreground)" } };
const axis = { stroke: "var(--muted-foreground)", fontSize: 11 };

function AnalyticsPage() {
  const s = useYard();
  const [time, setTime] = useState("all");
  const [track, setTrack] = useState("all");
  const [loco, setLoco] = useState("all");
  const [status, setStatus] = useState("all");

  const ops = useMemo(() => s.ops.filter((o) =>
    (time === "all" || (time === "h1" ? o.start < 60 : time === "h2" ? o.start >= 60 && o.start < 120 : o.start >= 120)) &&
    (track === "all" || o.from === Number(track) || o.to === Number(track)) &&
    (loco === "all" || o.loco === loco) && (status === "all" || o.status === status)), [s.ops, time, track, loco, status]);

  const tracks = s.tracks.filter((t) => track === "all" || t.id === Number(track));
  const trackLoad = tracks.map((t) => {
    const n = s.wagons.filter((w) => w.track === t.id).length;
    return { name: `П${t.id}`, Загрузка: Math.round((n / t.capacity) * 100), Вагонов: n, Операций: ops.filter((o) => o.from === t.id || o.to === t.id).length };
  });
  const finish = Math.max(s.clock, ...ops.map((o) => o.start + o.duration), 1);
  const locoUse = s.locos.filter((l) => loco === "all" || l.id === loco).map((l) => {
    const busy = ops.filter((o) => o.loco === l.id).reduce((a, o) => a + o.duration, 0);
    return { name: l.id, Работа: busy, Простой: Math.max(0, Math.round(finish - busy)) };
  });
  const byStatus = (Object.keys(statusLabel) as OpStatus[]).map((k) => ({ name: statusLabel[k], value: ops.filter((o) => o.status === k).length })).filter((x) => x.value);
  const types = [...new Set(ops.map((o) => o.type))];
  const avgDur = types.map((t) => { const l = ops.filter((o) => o.type === t); return { name: t, Минут: Math.round(l.reduce((a, o) => a + o.duration, 0) / l.length) }; });
  const ctypes = [...new Set(s.events.map((e) => e.type))];
  const conflicts = ctypes.map((t) => ({ name: t.replace("Несовместимые ", "Несовм. "), Открыто: s.events.filter((e) => e.type === t && e.status === "open").length, Устранено: s.events.filter((e) => e.type === t && e.status === "resolved").length }));
  const trains = s.trains.map((t) => { const own = s.wagons.filter((w) => w.train === t.id); return { name: t.id, Готово: own.filter((w) => w.track === t.targetTrack).length, Осталось: own.filter((w) => w.track !== t.targetTrack).length }; });
  const done = ops.filter((o) => o.status === "done");
  const totalIdle = locoUse.reduce((a, l) => a + l.Простой, 0);

  const sel = (v: string, set: (v: string) => void, items: [string, string][], ph: string) => (
    <Select value={v} onValueChange={set}><SelectTrigger className="w-40" aria-label={ph}><SelectValue /></SelectTrigger>
      <SelectContent>{items.map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent></Select>
  );

  return (
    <div className="space-y-3">
      <div className="panel flex flex-wrap items-center gap-2 p-3">
        {sel(time, setTime, [["all", "Весь период"], ["h1", "08:00–09:00"], ["h2", "09:00–10:00"], ["h3", "После 10:00"]], "Время")}
        {sel(track, setTrack, [["all", "Все пути"], ...s.tracks.map((t) => [String(t.id), t.name] as [string, string])], "Путь")}
        {sel(loco, setLoco, [["all", "Все локомотивы"], ...s.locos.map((l) => [l.id, l.id] as [string, string])], "Локомотив")}
        {sel(status, setStatus, [["all", "Все статусы"], ...(Object.keys(statusLabel) as OpStatus[]).map((k) => [k, statusLabel[k]] as [string, string])], "Статус")}
        <Button size="sm" className="ml-auto" onClick={() => { exportCsv(s); toast.success("Отчёт CSV сформирован"); }}><Download />Экспорт CSV</Button>
      </div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {[["Операций в выборке", ops.length], ["Завершено", done.length], ["Средняя длительность", `${ops.length ? Math.round(ops.reduce((a, o) => a + o.duration, 0) / ops.length) : 0} мин`], ["Простой локомотивов", `${totalIdle} мин`]].map(([l, v]) => (
          <div key={l} className="panel p-3"><div className="text-[11px] uppercase text-muted-foreground">{l}</div><div className="mt-1 font-mono text-2xl font-semibold">{v}</div></div>
        ))}
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <Chart title="Загрузка путей, %"><BarChart data={trackLoad}><CartesianGrid stroke="var(--border)" vertical={false} /><XAxis dataKey="name" {...axis} /><YAxis {...axis} domain={[0, 120]} /><Tooltip {...tip} /><Bar dataKey="Загрузка" radius={[3, 3, 0, 0]}>{trackLoad.map((d) => <Cell key={d.name} fill={d.Загрузка > 100 ? C[3] : d.Загрузка === 100 ? C[2] : C[0]} />)}</Bar></BarChart></Chart>
        <Chart title="Использование локомотивов, мин"><BarChart data={locoUse} layout="vertical"><CartesianGrid stroke="var(--border)" horizontal={false} /><XAxis type="number" {...axis} /><YAxis type="category" dataKey="name" {...axis} width={60} /><Tooltip {...tip} /><Legend wrapperStyle={{ fontSize: 11 }} /><Bar dataKey="Работа" stackId="a" fill={C[0]} /><Bar dataKey="Простой" stackId="a" fill={C[4]} /></BarChart></Chart>
        <Chart title="Операции по статусам"><PieChart><Pie data={byStatus} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={2}>{byStatus.map((d, i) => <Cell key={d.name} fill={C[i % C.length]} />)}</Pie><Tooltip {...tip} /><Legend wrapperStyle={{ fontSize: 11 }} /></PieChart></Chart>
        <Chart title="Среднее время маневров по типу, мин"><BarChart data={avgDur}><CartesianGrid stroke="var(--border)" vertical={false} /><XAxis dataKey="name" {...axis} /><YAxis {...axis} /><Tooltip {...tip} /><Bar dataKey="Минут" fill={C[1]} radius={[3, 3, 0, 0]} /></BarChart></Chart>
        <Chart title="Конфликты по типам"><BarChart data={conflicts}><CartesianGrid stroke="var(--border)" vertical={false} /><XAxis dataKey="name" {...axis} fontSize={9} interval={0} /><YAxis {...axis} allowDecimals={false} /><Tooltip {...tip} /><Legend wrapperStyle={{ fontSize: 11 }} /><Bar dataKey="Открыто" fill={C[3]} /><Bar dataKey="Устранено" fill={C[1]} /></BarChart></Chart>
        <Chart title="Выполнение плана отправления"><BarChart data={trains}><CartesianGrid stroke="var(--border)" vertical={false} /><XAxis dataKey="name" {...axis} /><YAxis {...axis} allowDecimals={false} /><Tooltip {...tip} /><Legend wrapperStyle={{ fontSize: 11 }} /><Bar dataKey="Готово" stackId="t" fill={C[1]} /><Bar dataKey="Осталось" stackId="t" fill={C[4]} /></BarChart></Chart>
      </div>
    </div>
  );
}

function Chart({ title, children }: { title: string; children: React.ReactElement }) {
  return (
    <div className="panel p-4">
      <SectionTitle>{title}</SectionTitle>
      <div className="h-60"><ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer></div>
    </div>
  );
}
