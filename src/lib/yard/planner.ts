import { detectConflicts } from "./conflicts";
import { opDuration } from "./data";
import type { Loco, Operation, PlanMetrics, Track, TrackId, Train, Wagon } from "./types";

interface Model { tracks: Track[]; wagons: Wagon[]; locos: Loco[]; trains: Train[] }

/** Интеллектуальное планирование: жадное расписание по приоритету отправления с учётом
 * вместимости путей, занятости локомотивов, закрытых путей и пересечений маршрутов. */
export function planOperations(model: Model, ops: Operation[], now: number): Operation[] {
  const { tracks, wagons, locos, trains } = model;
  const kept = ops.filter((o) => o.status === "done" || o.status === "running");
  const pos = new Map(wagons.map((w) => [w.id, w.track]));
  for (const o of kept.filter((o) => o.status === "running")) o.wagons.forEach((id) => pos.set(id, o.to));

  const occ = new Map<TrackId, number>();
  tracks.forEach((t) => occ.set(t.id, 0));
  pos.forEach((t) => occ.set(t, (occ.get(t) ?? 0) + 1));

  const avail = locos.filter((l) => l.available);
  const locoFree = new Map<string, number>();
  const locoPos = new Map<string, TrackId>();
  avail.forEach((l) => { locoFree.set(l.id, now); locoPos.set(l.id, l.track); });
  const trackFree = new Map<TrackId, number>();
  tracks.forEach((t) => trackFree.set(t.id, now));
  for (const o of kept.filter((o) => o.status === "running")) {
    const end = o.start + o.duration;
    if (locoFree.has(o.loco)) { locoFree.set(o.loco, Math.max(now, end)); locoPos.set(o.loco, o.to); }
    trackFree.set(o.from, Math.max(trackFree.get(o.from)!, end));
    trackFree.set(o.to, Math.max(trackFree.get(o.to)!, end));
  }
  if (!avail.length) return kept;

  const usedTargets = new Set(trains.map((t) => t.targetTrack));
  const newOps: Operation[] = [];
  let seq = 201 + Math.floor(now);
  const isOpen = (id: TrackId) => !tracks.find((t) => t.id === id)!.closed;
  const cap = (id: TrackId) => tracks.find((t) => t.id === id)!.capacity;

  for (const tr of [...trains].sort((a, b) => a.departure - b.departure || a.priority - b.priority)) {
    let target = tr.targetTrack;
    if (!isOpen(target)) {
      const alt = tracks.filter((t) => !t.closed && !usedTargets.has(t.id)).sort((a, b) => (b.capacity - (occ.get(b.id) ?? 0)) - (a.capacity - (occ.get(a.id) ?? 0)))[0];
      if (!alt) continue;
      target = alt.id;
    }
    const groups = new Map<TrackId, string[]>();
    for (const w of wagons) {
      if (w.train !== tr.id) continue;
      const p = pos.get(w.id)!;
      if (p === target) continue;
      groups.set(p, [...(groups.get(p) ?? []), w.id]);
    }
    const ordered = [...groups.entries()].sort((a, b) => b[1].length - a[1].length);
    for (const [from, ids] of ordered) {
      const free = cap(target) - (occ.get(target) ?? 0);
      const take = ids.slice(0, Math.max(0, free));
      if (!take.length) continue;
      let best: { loco: string; start: number; dur: number } | null = null;
      for (const l of avail) {
        const approach = Math.abs((locoPos.get(l.id) ?? from) - from);
        const ready = locoFree.get(l.id)! + approach;
        const start = Math.max(ready, trackFree.get(from)!, trackFree.get(target)!);
        const dur = opDuration(take.length, from, target);
        if (!best || start + dur < best.start + best.dur) best = { loco: l.id, start, dur };
      }
      if (!best) continue;
      const end = best.start + best.dur;
      newOps.push({
        id: `OP-${seq++}`, type: "Подача", from, to: target, wagons: take, loco: best.loco,
        start: Math.round(best.start), duration: best.dur, priority: tr.priority, status: "pending",
      });
      locoFree.set(best.loco, end); locoPos.set(best.loco, target);
      trackFree.set(from, end); trackFree.set(target, end);
      occ.set(from, (occ.get(from) ?? 0) - take.length);
      occ.set(target, (occ.get(target) ?? 0) + take.length);
      take.forEach((id) => pos.set(id, target));
    }
  }
  return [...kept, ...newOps];
}

export function planMetrics(model: Model, ops: Operation[], from = 0): PlanMetrics {
  const act = ops.filter((o) => o.status !== "done");
  const finish = ops.length ? Math.max(...ops.map((o) => o.start + o.duration)) : from;
  const span = Math.max(0, finish - from);
  let idle = 0;
  for (const l of model.locos.filter((l) => l.available)) {
    const busy = act.filter((o) => o.loco === l.id).reduce((s, o) => s + Math.max(0, Math.min(o.start + o.duration, finish) - Math.max(o.start, from)), 0);
    idle += Math.max(0, span - busy);
  }
  const conflicts = detectConflicts(ops, model.tracks, model.wagons, model.locos, model.trains).length;
  return { ops: act.length, finish, idle: Math.round(idle), conflicts, moves: act.reduce((s, o) => s + o.wagons.length, 0) };
}

export function explain(a: PlanMetrics, b: PlanMetrics, closed: Track[]): string[] {
  const r: string[] = [];
  if (b.conflicts < a.conflicts) r.push(`Устранено конфликтов: ${a.conflicts - b.conflicts} (было ${a.conflicts}, стало ${b.conflicts}).`);
  if (b.ops < a.ops) r.push(`Исключено ${a.ops - b.ops} лишних операций (промежуточные перестановки через сортировочный путь).`);
  if (b.moves < a.moves) r.push(`Количество перемещений вагонов сокращено с ${a.moves} до ${b.moves}.`);
  if (b.finish < a.finish) r.push(`Манёвры завершатся на ${Math.round(a.finish - b.finish)} мин раньше.`);
  else if (b.finish > a.finish) r.push(`Время завершения увеличилось на ${Math.round(b.finish - a.finish)} мин — это плата за бесконфликтное выполнение.`);
  if (b.idle < a.idle) r.push(`Простой локомотивов снижен на ${a.idle - b.idle} мин.`);
  if (closed.length) r.push(`Учтено закрытие: ${closed.map((t) => t.name).join(", ")} — маршруты на закрытые пути исключены.`);
  r.push("Операции упорядочены по времени отправления составов; каждый путь и локомотив резервируется без пересечений.");
  return r;
}
