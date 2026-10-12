import { createFileRoute, Link } from "@tanstack/react-router";
import { Kpis } from "@/components/yard/Kpis";
import { YardScheme } from "@/components/yard/YardScheme";
import { SimControls } from "@/components/yard/SimControls";
import { Gantt } from "@/components/yard/Gantt";
import { ComparisonPanel } from "@/components/yard/ComparisonPanel";
import { SectionTitle, SeverityDot } from "@/components/yard/common";
import { useYard } from "@/lib/yard/store";
import { fmtTime } from "@/lib/yard/data";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SMART YARD — панель маневрового диспетчера" },
      { name: "description", content: "Интерактивная схема грузового парка, план маневров и автоматическое перепланирование." },
      { property: "og:title", content: "SMART YARD — панель диспетчера" },
      { property: "og:description", content: "Интеллектуальное планирование вагонов и маневровых работ на станции." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const s = useYard();
  const open = s.events.filter((e) => e.status === "open");
  return (
    <div className="space-y-3">
      <Kpis />
      <SimControls />
      <div className="grid gap-3 xl:grid-cols-[1fr_360px]">
        <YardScheme />
        <div className="space-y-3">
          <div className="panel p-4">
            <SectionTitle>Составы на отправление</SectionTitle>
            <div className="space-y-2.5">
              {s.trains.map((t) => {
                const own = s.wagons.filter((w) => w.train === t.id);
                const ready = own.filter((w) => w.track === t.targetTrack).length;
                const late = s.clock > t.departure && ready < own.length;
                return (
                  <div key={t.id}>
                    <div className="flex justify-between text-sm"><span className="font-semibold">{t.id} → {t.destination}</span><span className="font-mono text-xs text-muted-foreground">П{t.targetTrack} · {fmtTime(t.departure)}</span></div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded bg-muted"><div className={late ? "h-full bg-destructive" : ready === own.length ? "h-full bg-success" : "h-full bg-primary"} style={{ width: `${(ready / own.length) * 100}%`, transition: "width .5s" }} /></div>
                    <div className="text-[11px] text-muted-foreground">{ready}/{own.length} вагонов сформировано</div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="panel p-4">
            <SectionTitle>Локомотивы</SectionTitle>
            {s.locos.map((l) => {
              const cur = s.ops.find((o) => o.loco === l.id && o.status === "running");
              return (
                <div key={l.id} className="flex items-center justify-between border-t py-2 text-sm first:border-0">
                  <div><div className="font-mono font-semibold">{l.id}</div><div className="text-[11px] text-muted-foreground">{!l.available ? "Неисправен" : cur ? `${cur.id}: П${cur.from}→П${cur.to}` : `Свободен · Путь ${l.track}`}</div></div>
                  <Switch checked={l.available} onCheckedChange={() => s.toggleLoco(l.id)} aria-label={`Доступность ${l.id}`} />
                </div>
              );
            })}
          </div>
          <div className="panel p-4">
            <SectionTitle right={<Link to="/conflicts" className="text-xs text-primary">Все →</Link>}>Конфликты ({open.length})</SectionTitle>
            <div className="space-y-1.5">
              {open.slice(0, 4).map((e) => <div key={e.key} className="flex gap-2 text-xs"><SeverityDot severity={e.severity} className="mt-1 shrink-0" /><span>{e.description}</span></div>)}
              {!open.length && <div className="text-xs text-success">Конфликтов нет — план выполним.</div>}
            </div>
          </div>
        </div>
      </div>
      <div className="grid gap-3 xl:grid-cols-[1fr_360px]">
        <div className="panel p-4">
          <SectionTitle right={<Link to="/plan" className="text-xs text-primary">Открыть план →</Link>}>Занятость локомотивов</SectionTitle>
          <Gantt compact />
        </div>
        <ComparisonPanel />
      </div>
      <div className="panel p-4">
        <SectionTitle>Журнал событий</SectionTitle>
        <div className="max-h-48 space-y-1 overflow-auto font-mono text-xs">
          {s.log.map((l, i) => <div key={i}><span className="text-muted-foreground">{fmtTime(l.time)}</span>  {l.text}</div>)}
        </div>
      </div>
    </div>
  );
}
