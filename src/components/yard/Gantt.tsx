import { useYard } from "@/lib/yard/store";
import { fmtTime } from "@/lib/yard/data";
import type { Operation } from "@/lib/yard/types";
import { cn } from "@/lib/utils";
import { opBarCls } from "./common";

export function Gantt({ ops, onSelect, compact }: { ops?: Operation[]; onSelect?: (id: string) => void; compact?: boolean }) {
  const s = useYard();
  const list = ops ?? s.ops;
  const highlight = s.highlight?.ops ?? [];
  const max = Math.max(60, ...list.map((o) => o.start + o.duration), ...s.trains.map((t) => t.departure)) + 10;
  const scale = (m: number) => `${(m / max) * 100}%`;
  const ticks = Array.from({ length: Math.floor(max / 15) + 1 }, (_, i) => i * 15);
  const lanes = s.locos.map((l) => ({ id: l.id, ops: list.filter((o) => o.loco === l.id) }));

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[640px]">
        <div className="relative ml-20 h-5 border-b text-[10px] text-muted-foreground">
          {ticks.map((t) => <span key={t} className="absolute -translate-x-1/2 font-mono" style={{ left: scale(t) }}>{fmtTime(t)}</span>)}
        </div>
        {lanes.map((lane) => {
          // stack overlapping ops into rows
          const rows: Operation[][] = [];
          [...lane.ops].sort((a, b) => a.start - b.start).forEach((o) => {
            const r = rows.find((row) => row.every((x) => x.start + x.duration <= o.start || o.start + o.duration <= x.start));
            if (r) r.push(o); else rows.push([o]);
          });
          if (!rows.length) rows.push([]);
          return (
            <div key={lane.id} className="flex border-b">
              <div className="flex w-20 shrink-0 items-center font-mono text-xs font-semibold">{lane.id}</div>
              <div className="relative flex-1 py-1">
                {ticks.map((t) => <div key={t} className="absolute inset-y-0 border-l border-border/40" style={{ left: scale(t) }} />)}
                {s.trains.map((t) => <div key={t.id} title={`Отправление ${t.id}`} className="absolute inset-y-0 border-l-2 border-dashed border-warning/60" style={{ left: scale(t.departure) }} />)}
                <div className="absolute inset-y-0 z-20 w-0.5 bg-foreground" style={{ left: scale(s.clock) }} />
                {rows.map((row, ri) => (
                  <div key={ri} className={cn("relative", compact ? "h-6" : "h-8")}>
                    {row.map((o) => (
                      <button key={o.id} onClick={() => onSelect?.(o.id)}
                        title={`${o.id}: П${o.from}→П${o.to}, ${o.wagons.length} ваг., ${fmtTime(o.start)}–${fmtTime(o.start + o.duration)}`}
                        className={cn("absolute inset-y-0.5 z-10 overflow-hidden truncate rounded border px-1 text-left font-mono text-[10px] text-foreground", opBarCls[o.status], highlight.includes(o.id) && "ring-2 ring-warning")}
                        style={{ left: scale(o.start), width: scale(o.duration) }}>
                        {o.id.replace("OP-", "")} П{o.from}→{o.to}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        <div className="mt-2 flex flex-wrap gap-3 text-[10px] text-muted-foreground">
          <span>— текущее время</span><span className="text-warning">┆ отправление составов</span>
        </div>
      </div>
    </div>
  );
}
