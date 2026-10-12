import type { Conflict, Loco, Operation, Track, TrackId, Train, Wagon } from "./types";

const active = (o: Operation) => o.status !== "done";
const overlap = (a: Operation, b: Operation) => a.start < b.start + b.duration && b.start < a.start + a.duration;

export function detectConflicts(ops: Operation[], tracks: Track[], wagons: Wagon[], locos: Loco[], trains: Train[]): Conflict[] {
  const out: Conflict[] = [];
  const act = ops.filter(active);
  const tmap = new Map(tracks.map((t) => [t.id, t]));

  for (let i = 0; i < act.length; i++) {
    for (let j = i + 1; j < act.length; j++) {
      const a = act[i], b = act[j];
      if (!overlap(a, b)) continue;
      if (a.loco === b.loco) {
        out.push({
          key: `loco:${[a.id, b.id].sort().join("|")}`,
          type: "Конфликт локомотива", severity: "critical",
          description: `${a.loco} назначен одновременно на ${a.id} и ${b.id}.`,
          solution: `Сдвинуть ${b.start >= a.start ? b.id : a.id} после окончания другой операции или передать второму локомотиву.`,
          ops: [a.id, b.id], tracks: [a.from, a.to, b.from, b.to],
        });
      } else {
        const shared = [a.from, a.to].filter((t) => t === b.from || t === b.to);
        if (shared.length) {
          out.push({
            key: `route:${[a.id, b.id].sort().join("|")}`,
            type: "Несовместимые маршруты", severity: "warning",
            description: `Маршруты ${a.id} и ${b.id} пересекаются на Пути ${shared[0]} по времени.`,
            solution: `Развести операции по времени — начать ${b.start >= a.start ? b.id : a.id} после освобождения пути.`,
            ops: [a.id, b.id], tracks: shared as TrackId[],
          });
        }
      }
    }
  }

  for (const o of act) {
    const t = tmap.get(o.to);
    if (t?.closed) {
      out.push({
        key: `closed:${o.id}`, type: "Закрытие пути", severity: "critical",
        description: `${t.name} закрыт — операция ${o.id} (П${o.from}→П${o.to}) невыполнима.`,
        solution: "Перестроить план: направить вагоны на свободный путь или изменить последовательность.",
        ops: [o.id], tracks: [o.to],
      });
    }
    const l = locos.find((x) => x.id === o.loco);
    if (l && !l.available) {
      out.push({
        key: `loco-na:${o.id}`, type: "Ресурс недоступен", severity: "critical",
        description: `${o.loco} недоступен, операция ${o.id} не может быть выполнена.`,
        solution: "Переназначить операцию на доступный локомотив.",
        ops: [o.id], tracks: [o.from, o.to],
      });
    }
  }

  // projected occupancy
  const occ = new Map<TrackId, number>();
  tracks.forEach((t) => occ.set(t.id, wagons.filter((w) => w.track === t.id).length));
  const flagged = new Set<TrackId>();
  for (const t of tracks) {
    if ((occ.get(t.id) ?? 0) > t.capacity) {
      flagged.add(t.id);
      out.push({
        key: `over:${t.id}:now`, type: "Переполнение пути", severity: "critical",
        description: `${t.name}: ${occ.get(t.id)} вагонов при вместимости ${t.capacity}.`,
        solution: "Вывести лишние вагоны на путь со свободной вместимостью.",
        ops: [], tracks: [t.id],
      });
    }
  }
  const sorted = [...act].sort((a, b) => a.start - b.start);
  for (const o of sorted) {
    occ.set(o.from, (occ.get(o.from) ?? 0) - o.wagons.length);
    occ.set(o.to, (occ.get(o.to) ?? 0) + o.wagons.length);
    const t = tmap.get(o.to)!;
    if (!flagged.has(o.to) && (occ.get(o.to) ?? 0) > t.capacity) {
      flagged.add(o.to);
      out.push({
        key: `over:${o.to}:${o.id}`, type: "Переполнение пути", severity: "critical",
        description: `После ${o.id} на ${t.name} окажется ${occ.get(o.to)} вагонов (вместимость ${t.capacity}).`,
        solution: "Пересчитать план с учётом вместимости путей.",
        ops: [o.id], tracks: [o.to],
      });
    }
  }

  // departures
  for (const tr of trains) {
    const own = wagons.filter((w) => w.train === tr.id);
    const pos = new Map(own.map((w) => [w.id, w.track]));
    let lastEnd = 0;
    for (const o of sorted) {
      for (const id of o.wagons) if (pos.has(id)) { pos.set(id, o.to); lastEnd = Math.max(lastEnd, o.start + o.duration); }
    }
    const missing = own.filter((w) => pos.get(w.id) !== tr.targetTrack);
    if (missing.length) {
      out.push({
        key: `delay:${tr.id}:missing`, type: "Задержка отправления", severity: "warning",
        description: `${tr.name}: ${missing.length} ваг. не запланированы к подаче на Путь ${tr.targetTrack}.`,
        solution: "Добавить операции подачи — нажмите «Оптимизировать план».",
        ops: [], tracks: [tr.targetTrack],
      });
    } else if (lastEnd > tr.departure) {
      out.push({
        key: `delay:${tr.id}:late`, type: "Задержка отправления", severity: "warning",
        description: `${tr.name} будет сформирован на ${Math.round(lastEnd - tr.departure)} мин позже отправления.`,
        solution: "Повысить приоритет операций состава и пересчитать план.",
        ops: [], tracks: [tr.targetTrack],
      });
    }
  }
  return out;
}
