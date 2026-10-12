import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useYard, opDuration } from "@/lib/yard/store";
import type { Operation, OpType, TrackId } from "@/lib/yard/types";
import { statusLabel } from "./common";
import { cn } from "@/lib/utils";

const types: OpType[] = ["Подача", "Перестановка", "Сортировка", "Вывод"];

export function OpEditor({ op, open, onClose }: { op: Operation | null; open: boolean; onClose: () => void }) {
  const s = useYard();
  const [d, setD] = useState<Operation | null>(null);
  useEffect(() => {
    if (!open) return;
    const nextId = `OP-${Math.max(100, ...s.ops.map((o) => parseInt(o.id.replace("OP-", "")) || 0)) + 1}`;
    setD(op ?? { id: nextId, type: "Подача", from: 4, to: 1, wagons: [], loco: s.locos[0].id, start: Math.ceil(s.clock), duration: 6, priority: 2, status: "pending" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, op]);
  if (!d) return null;
  const upd = (p: Partial<Operation>) => setD((x) => {
    const n = { ...x!, ...p };
    if (p.wagons || p.from || p.to) n.duration = opDuration(n.wagons.length || 1, n.from, n.to);
    return n;
  });
  const available = s.wagons.filter((w) => w.track === d.from || d.wagons.includes(w.id));
  const trackSel = (v: TrackId, on: (t: TrackId) => void) => (
    <Select value={String(v)} onValueChange={(x) => on(Number(x) as TrackId)}>
      <SelectTrigger><SelectValue /></SelectTrigger>
      <SelectContent>{s.tracks.map((t) => <SelectItem key={t.id} value={String(t.id)}>{t.name}{t.closed ? " (закрыт)" : ""}</SelectItem>)}</SelectContent>
    </Select>
  );

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle className="font-mono">{op ? `Редактирование ${d.id}` : `Новая операция ${d.id}`}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1"><Label>Тип</Label>
            <Select value={d.type} onValueChange={(v) => upd({ type: v as OpType })}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{types.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select>
          </div>
          <div className="space-y-1"><Label>Локомотив</Label>
            <Select value={d.loco} onValueChange={(v) => upd({ loco: v })}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{s.locos.map((l) => <SelectItem key={l.id} value={l.id}>{l.id}{l.available ? "" : " (недоступен)"}</SelectItem>)}</SelectContent></Select>
          </div>
          <div className="space-y-1"><Label>Исходный путь</Label>{trackSel(d.from, (t) => upd({ from: t, wagons: [] }))}</div>
          <div className="space-y-1"><Label>Целевой путь</Label>{trackSel(d.to, (t) => upd({ to: t }))}</div>
          <div className="space-y-1"><Label>Начало (мин от 08:00)</Label><Input type="number" min={0} value={d.start} onChange={(e) => upd({ start: Number(e.target.value) })} /></div>
          <div className="space-y-1"><Label>Длительность, мин</Label><Input type="number" min={1} value={d.duration} onChange={(e) => setD({ ...d, duration: Number(e.target.value) })} /></div>
          <div className="space-y-1"><Label>Приоритет</Label>
            <Select value={String(d.priority)} onValueChange={(v) => upd({ priority: Number(v) })}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{[1, 2, 3].map((p) => <SelectItem key={p} value={String(p)}>{p} — {["высокий", "средний", "низкий"][p - 1]}</SelectItem>)}</SelectContent></Select>
          </div>
          <div className="space-y-1"><Label>Статус</Label>
            <Select value={d.status} onValueChange={(v) => upd({ status: v as Operation["status"] })}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{(["pending", "paused", "blocked"] as const).map((st) => <SelectItem key={st} value={st}>{statusLabel[st]}</SelectItem>)}</SelectContent></Select>
          </div>
        </div>
        <div>
          <Label>Вагоны на Пути {d.from}</Label>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {available.map((w) => {
              const on = d.wagons.includes(w.id);
              return <button key={w.id} type="button" onClick={() => upd({ wagons: on ? d.wagons.filter((x) => x !== w.id) : [...d.wagons, w.id] })}
                className={cn("rounded border px-2 py-1 font-mono text-xs", on ? "border-primary bg-primary/20 text-primary" : "hover:bg-accent")}>{w.number} · {w.train ?? "—"}</button>;
            })}
            {!available.length && <span className="text-sm text-muted-foreground">На пути нет вагонов</span>}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Отмена</Button>
          <Button disabled={!d.wagons.length || d.from === d.to} onClick={() => { s.saveOp(d); onClose(); }}>Сохранить</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
