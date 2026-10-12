import { AlertTriangle, Clock, Gauge, Rows3, TrainFront, TramFront, Boxes } from "lucide-react";
import { useYard } from "@/lib/yard/store";
import { fmtTime } from "@/lib/yard/data";
import { cn } from "@/lib/utils";

export function Kpis() {
  const s = useYard();
  const active = s.ops.filter((o) => o.status === "running").length;
  const pending = s.ops.filter((o) => o.status !== "done").length;
  const conflicts = s.events.filter((e) => e.status === "open").length;
  const finish = s.ops.length ? Math.max(s.clock, ...s.ops.filter((o) => o.status !== "blocked").map((o) => o.start + o.duration)) : s.clock;
  const items = [
    { icon: Boxes, label: "Всего вагонов", value: s.wagons.length },
    { icon: Rows3, label: "Путей", value: s.tracks.length, sub: `${s.tracks.filter((t) => t.closed).length} закрыто` },
    { icon: TramFront, label: "Локомотивов", value: s.locos.length, sub: `${s.locos.filter((l) => l.available).length} в работе` },
    { icon: TrainFront, label: "Формируемых составов", value: s.trains.length },
    { icon: Gauge, label: "Активных операций", value: active, sub: `${pending} в плане` },
    { icon: AlertTriangle, label: "Конфликтов", value: conflicts, tone: conflicts ? "text-destructive" : "text-success" },
    { icon: Clock, label: "Завершение манёвров", value: fmtTime(finish), sub: `через ${Math.max(0, Math.round(finish - s.clock))} мин` },
  ];
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7">
      {items.map((it) => (
        <div key={it.label} className="panel p-3">
          <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground"><it.icon className="size-3.5" />{it.label}</div>
          <div className={cn("mt-1 font-mono text-2xl font-semibold", it.tone)}>{it.value}</div>
          {it.sub && <div className="text-[11px] text-muted-foreground">{it.sub}</div>}
        </div>
      ))}
    </div>
  );
}
