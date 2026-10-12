import { LayoutGroup, motion } from "motion/react";
import { ArrowRight, Lock, TramFront } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useYard } from "@/lib/yard/store";
import { fmtTime } from "@/lib/yard/data";
import type { TrackId } from "@/lib/yard/types";
import { cn } from "@/lib/utils";
import { StatusPill, SectionTitle } from "./common";

export const trainColor: Record<string, string> = {
  "Д-1": "bg-chart-1 text-primary-foreground",
  "Д-2": "bg-chart-2 text-primary-foreground",
  "Д-3": "bg-chart-3 text-primary-foreground",
};
const wagonCls = (train: string | null) => trainColor[train ?? ""] ?? "bg-chart-5 text-primary-foreground";

export function YardScheme() {
  const s = useYard();
  const [wagonId, setWagonId] = useState<string | null>(null);
  const [trackId, setTrackId] = useState<TrackId | null>(null);
  const [dragOver, setDragOver] = useState<TrackId | null>(null);
  const runningOps = s.ops.filter((o) => o.status === "running");
  const moving = new Set(runningOps.flatMap((o) => o.wagons));
  const wagon = s.wagons.find((w) => w.id === wagonId);
  const track = s.tracks.find((t) => t.id === trackId);

  return (
    <div className="panel p-4">
      <SectionTitle right={
        <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
          {s.trains.map((t) => <span key={t.id} className="flex items-center gap-1"><span className={cn("size-2.5 rounded-sm", wagonCls(t.id))} />{t.id} → {t.destination} · {fmtTime(t.departure)}</span>)}
          <span className="flex items-center gap-1"><span className={cn("size-2.5 rounded-sm", wagonCls(null))} />Прочие</span>
        </div>
      }>Схема грузового парка</SectionTitle>

      <LayoutGroup>
        <div className="space-y-2">
          {s.tracks.map((t) => {
            const ws = s.wagons.filter((w) => w.track === t.id);
            const locos = s.locos.filter((l) => l.track === t.id);
            const over = ws.length > t.capacity;
            const hl = s.highlight?.tracks.includes(t.id);
            const train = s.trains.find((x) => x.targetTrack === t.id);
            return (
              <div key={t.id}
                onDragOver={(e) => { e.preventDefault(); setDragOver(t.id); }}
                onDragLeave={() => setDragOver(null)}
                onDrop={(e) => { e.preventDefault(); setDragOver(null); const id = e.dataTransfer.getData("text/wagon"); if (id) s.moveWagon(id, t.id); }}
                className={cn("grid grid-cols-[84px_1fr] items-center gap-3 rounded-md border border-transparent p-1.5 transition-colors sm:grid-cols-[140px_1fr]",
                  dragOver === t.id && "border-primary bg-primary/10", hl && "border-warning bg-warning/10", t.closed && "bg-destructive/5")}>
                <button onClick={() => setTrackId(t.id)} className="text-left">
                  <div className="flex items-center gap-1.5 text-sm font-semibold">{t.closed && <Lock className="size-3.5 text-destructive" />}{t.name}</div>
                  <div className="hidden text-[11px] text-muted-foreground sm:block">{t.role}</div>
                  <div className="mt-1 h-1 overflow-hidden rounded bg-muted">
                    <div className={cn("h-full transition-all", over ? "bg-destructive" : ws.length === t.capacity ? "bg-warning" : "bg-success")} style={{ width: `${Math.min(100, (ws.length / t.capacity) * 100)}%` }} />
                  </div>
                  <div className={cn("font-mono text-[11px]", over ? "text-destructive" : "text-muted-foreground")}>{ws.length}/{t.capacity}{train ? ` · ${train.id}` : ""}</div>
                </button>
                <div className={cn("relative flex min-h-12 items-center gap-1.5 overflow-x-auto px-2 py-2", t.closed && "opacity-60")}>
                  <div className="rail pointer-events-none absolute inset-x-0 top-1/2 h-2 -translate-y-1/2" />
                  {t.closed && <div className="pointer-events-none absolute inset-0 rounded bg-[repeating-linear-gradient(45deg,transparent_0_8px,var(--color-destructive)_8px_10px)] opacity-25" />}
                  {locos.map((l) => (
                    <motion.div layout layoutId={l.id} key={l.id} transition={{ type: "spring", stiffness: 120, damping: 18 }}
                      className={cn("relative z-10 flex h-8 shrink-0 items-center gap-1 rounded-md border-2 px-2 font-mono text-[11px] font-bold",
                        l.available ? "border-primary bg-background text-primary" : "border-muted-foreground bg-muted text-muted-foreground line-through")}>
                      <TramFront className="size-3.5" />{l.id}
                    </motion.div>
                  ))}
                  {ws.map((w) => (
                    <motion.div layout layoutId={w.id} key={w.id} transition={{ type: "spring", stiffness: 110, damping: 18 }} className="relative z-10 shrink-0">
                      <button draggable onDragStart={(e) => e.dataTransfer.setData("text/wagon", w.id)}
                        onClick={() => setWagonId(w.id)} title={`${w.number} · ${w.train ?? "—"}`}
                        className={cn("flex h-8 w-[58px] cursor-grab flex-col items-center justify-center rounded-sm font-mono text-[10px] leading-none shadow-sm active:cursor-grabbing",
                          wagonCls(w.train), moving.has(w.id) && "ring-2 ring-foreground animate-blink")}>
                        <span className="font-bold">{w.number.slice(-4)}</span>
                        <span className="opacity-75">{w.train ?? "рем"}</span>
                      </button>
                    </motion.div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </LayoutGroup>

      <div className="mt-3 flex flex-wrap gap-2 border-t pt-3 text-xs">
        <span className="text-muted-foreground">Маршруты сейчас:</span>
        {runningOps.length === 0 && <span className="text-muted-foreground">нет активных манёвров</span>}
        {runningOps.map((o) => (
          <span key={o.id} className="flex items-center gap-1 rounded bg-primary/15 px-2 py-0.5 font-mono text-primary">
            {o.loco}: П{o.from} <ArrowRight className="size-3" /> П{o.to} · {o.wagons.length} ваг. · до {fmtTime(o.start + o.duration)}
          </span>
        ))}
        <span className="ml-auto text-muted-foreground">Перетащите вагон на другой путь или нажмите на него</span>
      </div>

      <Dialog open={!!wagon} onOpenChange={(o) => !o && setWagonId(null)}>
        <DialogContent>
          {wagon && (() => {
            const op = s.ops.find((o) => o.status !== "done" && o.wagons.includes(wagon.id));
            const tr = s.trains.find((t) => t.id === wagon.train);
            const status = moving.has(wagon.id) ? "В движении" : tr && wagon.track === tr.targetTrack ? "На пути отправления" : op ? "Ожидает подачи" : "Стоянка";
            return (<>
              <DialogHeader>
                <DialogTitle className="font-mono">Вагон № {wagon.number}</DialogTitle>
                <DialogDescription>{wagon.cargo}</DialogDescription>
              </DialogHeader>
              <dl className="grid grid-cols-2 gap-y-2 text-sm">
                <dt className="text-muted-foreground">Текущий путь</dt><dd>Путь {wagon.track}</dd>
                <dt className="text-muted-foreground">Назначение</dt><dd>{wagon.destination}</dd>
                <dt className="text-muted-foreground">Статус</dt><dd>{status}</dd>
                <dt className="text-muted-foreground">Состав</dt><dd>{tr ? `${tr.name} · Путь ${tr.targetTrack} · ${fmtTime(tr.departure)}` : "Не включён"}</dd>
                <dt className="text-muted-foreground">Операция</dt><dd>{op ? <span className="flex items-center gap-2">{op.id} <StatusPill status={op.status} /></span> : "—"}</dd>
              </dl>
              <div>
                <div className="mb-2 text-xs text-muted-foreground">Переместить на путь:</div>
                <div className="flex flex-wrap gap-1.5">
                  {s.tracks.map((t) => (
                    <Button key={t.id} size="sm" variant={t.id === wagon.track ? "secondary" : "outline"} disabled={t.id === wagon.track || t.closed}
                      onClick={() => { s.moveWagon(wagon.id, t.id); setWagonId(null); }}>П{t.id}</Button>
                  ))}
                </div>
              </div>
            </>);
          })()}
        </DialogContent>
      </Dialog>

      <Dialog open={!!track} onOpenChange={(o) => !o && setTrackId(null)}>
        <DialogContent>
          {track && (() => {
            const ws = s.wagons.filter((w) => w.track === track.id);
            const ops = s.ops.filter((o) => o.status !== "done" && (o.from === track.id || o.to === track.id));
            return (<>
              <DialogHeader>
                <DialogTitle>{track.name} {track.closed && <span className="ml-2 text-sm text-destructive">закрыт</span>}</DialogTitle>
                <DialogDescription>{track.role} · вместимость {track.capacity} ваг. · загрузка {Math.round((ws.length / track.capacity) * 100)}%</DialogDescription>
              </DialogHeader>
              <div>
                <div className="mb-1 text-xs text-muted-foreground">Вагоны ({ws.length}/{track.capacity})</div>
                <div className="flex flex-wrap gap-1">{ws.map((w) => <span key={w.id} className={cn("rounded-sm px-1.5 py-0.5 font-mono text-[11px]", wagonCls(w.train))}>{w.number}</span>)}{!ws.length && <span className="text-sm text-muted-foreground">Свободен</span>}</div>
              </div>
              <div>
                <div className="mb-1 text-xs text-muted-foreground">Запланированные операции</div>
                <div className="space-y-1">
                  {ops.map((o) => <div key={o.id} className="flex items-center justify-between rounded bg-muted px-2 py-1 text-xs"><span className="font-mono">{o.id} · П{o.from}→П{o.to} · {fmtTime(o.start)}</span><StatusPill status={o.status} /></div>)}
                  {!ops.length && <div className="text-sm text-muted-foreground">Нет операций</div>}
                </div>
              </div>
              <Button variant={track.closed ? "default" : "destructive"} onClick={() => s.toggleTrack(track.id)}>{track.closed ? "Открыть путь" : "Закрыть путь"}</Button>
            </>);
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
