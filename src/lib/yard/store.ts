import { create } from "zustand";
import { persist } from "zustand/middleware";
import { detectConflicts } from "./conflicts";
import { seedLocos, seedOps, seedTracks, seedTrains, seedWagons, opDuration } from "./data";
import { explain, planMetrics, planOperations } from "./planner";
import type { Comparison, Conflict, Loco, Operation, Track, TrackId, Train, Wagon, YardEvent } from "./types";

interface State {
  tracks: Track[];
  wagons: Wagon[];
  locos: Loco[];
  trains: Train[];
  ops: Operation[];
  events: YardEvent[];
  clock: number;
  running: boolean;
  speed: number;
  comparison: Comparison | null;
  highlight: { tracks: TrackId[]; ops: string[] } | null;
  log: { time: number; text: string }[];
}

interface Actions {
  moveWagon: (id: string, to: TrackId) => void;
  saveOp: (op: Operation) => void;
  deleteOp: (id: string) => void;
  reorderOp: (id: string, dir: -1 | 1) => void;
  setOpStatus: (id: string, status: Operation["status"]) => void;
  optimize: (title?: string) => void;
  toggleTrack: (id: TrackId) => void;
  toggleLoco: (id: string) => void;
  autoFix: (key: string) => void;
  tick: (dtMin: number) => void;
  setRunning: (r: boolean) => void;
  setSpeed: (s: number) => void;
  reset: () => void;
  setHighlight: (h: State["highlight"]) => void;
  closeTrack3Scenario: () => void;
}

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

const initial = (): State => {
  const s: State = {
    tracks: clone(seedTracks), wagons: clone(seedWagons), locos: clone(seedLocos), trains: clone(seedTrains),
    ops: clone(seedOps), events: [], clock: 0, running: false, speed: 2, comparison: null, highlight: null,
    log: [{ time: 0, text: "Сценарий загружен: 15 вагонов, 6 путей, 2 локомотива, 3 состава." }],
  };
  s.events = syncEvents(s, []);
  return s;
};

function syncEvents(s: Pick<State, "ops" | "tracks" | "wagons" | "locos" | "trains" | "clock">, prev: YardEvent[]): YardEvent[] {
  const cur = detectConflicts(s.ops, s.tracks, s.wagons, s.locos, s.trains);
  const curMap = new Map(cur.map((c) => [c.key, c]));
  const events = prev.map((e) => {
    if (e.status === "open" && !curMap.has(e.key)) return { ...e, status: "resolved" as const, resolvedAt: s.clock };
    return e;
  });
  for (const c of cur) {
    const open = events.find((e) => e.key === c.key && e.status === "open");
    if (open) Object.assign(open, c);
    else events.unshift({ ...c, time: s.clock, status: "open" });
  }
  return events.slice(0, 200);
}

export const currentConflicts = (s: State): Conflict[] => detectConflicts(s.ops, s.tracks, s.wagons, s.locos, s.trains);

export const useYard = create<State & Actions>()(
  persist(
    (set, get) => {
      const commit = (patch: Partial<State>, logText?: string) => {
        const next = { ...get(), ...patch };
        const ops = next.ops.map((o) => {
          const closed = next.tracks.find((t) => t.id === o.to)?.closed;
          if (o.status === "pending" && closed) return { ...o, status: "blocked" as const };
          if (o.status === "blocked" && !closed) return { ...o, status: "pending" as const };
          return o;
        });
        const log = logText ? [{ time: next.clock, text: logText }, ...next.log].slice(0, 100) : next.log;
        set({ ...patch, ops, log, events: syncEvents({ ...next, ops }, get().events) });
      };
      return {
        ...initial(),
        moveWagon: (id, to) => {
          const s = get();
          const w = s.wagons.find((x) => x.id === id);
          if (!w || w.track === to) return;
          commit({ wagons: s.wagons.map((x) => (x.id === id ? { ...x, track: to } : x)) }, `Вагон ${w.number} перемещён вручную: П${w.track} → П${to}.`);
        },
        saveOp: (op) => {
          const s = get();
          const exists = s.ops.some((o) => o.id === op.id);
          commit({ ops: exists ? s.ops.map((o) => (o.id === op.id ? op : o)) : [...s.ops, op] }, `${exists ? "Изменена" : "Создана"} операция ${op.id}.`);
        },
        deleteOp: (id) => commit({ ops: get().ops.filter((o) => o.id !== id) }, `Удалена операция ${id}.`),
        reorderOp: (id, dir) => {
          const s = get();
          const sorted = [...s.ops].sort((a, b) => a.start - b.start);
          const i = sorted.findIndex((o) => o.id === id);
          const j = i + dir;
          if (j < 0 || j >= sorted.length) return;
          const a = sorted[i], b = sorted[j];
          commit({ ops: s.ops.map((o) => (o.id === a.id ? { ...o, start: b.start } : o.id === b.id ? { ...o, start: a.start } : o)) }, `Порядок изменён: ${a.id} ↔ ${b.id}.`);
        },
        setOpStatus: (id, status) => {
          const s = get();
          const op = s.ops.find((o) => o.id === id);
          if (!op) return;
          let wagons = s.wagons;
          let locos = s.locos;
          let next: Operation = { ...op, status };
          if (status === "running") next = { ...next, start: s.clock };
          if (status === "done") {
            wagons = s.wagons.map((w) => (op.wagons.includes(w.id) ? { ...w, track: op.to } : w));
            locos = s.locos.map((l) => (l.id === op.loco ? { ...l, track: op.to } : l));
            next = { ...next, duration: Math.max(1, Math.round(s.clock - op.start)) || op.duration };
            if (op.status !== "running") next = { ...next, start: s.clock, duration: op.duration };
          }
          const label = { running: "запущена", paused: "приостановлена", done: "завершена", pending: "возвращена в ожидание", blocked: "заблокирована" }[status];
          commit({ ops: s.ops.map((o) => (o.id === id ? next : o)), wagons, locos }, `Операция ${id} ${label}.`);
        },
        optimize: (title = "Оптимизация плана") => {
          const s = get();
          const model = { tracks: s.tracks, wagons: s.wagons, locos: s.locos, trains: s.trains };
          const bOps = planOperations(model, s.ops, Math.ceil(s.clock));
          const a = planMetrics(model, s.ops, s.clock);
          const b = planMetrics(model, bOps, s.clock);
          const comparison: Comparison = { title, a, b, aOps: s.ops, bOps, explanation: explain(a, b, s.tracks.filter((t) => t.closed)), at: s.clock };
          commit({ ops: bOps, comparison }, `${title}: ${a.ops} → ${b.ops} операций, конфликтов ${a.conflicts} → ${b.conflicts}.`);
        },
        toggleTrack: (id) => {
          const s = get();
          const t = s.tracks.find((x) => x.id === id)!;
          commit({ tracks: s.tracks.map((x) => (x.id === id ? { ...x, closed: !x.closed } : x)) }, `${t.name} ${t.closed ? "открыт" : "закрыт"}.`);
        },
        toggleLoco: (id) => {
          const s = get();
          const l = s.locos.find((x) => x.id === id)!;
          commit({ locos: s.locos.map((x) => (x.id === id ? { ...x, available: !x.available } : x)) }, `${id} ${l.available ? "выведен из работы" : "возвращён в работу"}.`);
        },
        autoFix: (key) => {
          const s = get();
          const c = currentConflicts(s).find((x) => x.key === key);
          if (!c) return;
          if ((c.type === "Конфликт локомотива" || c.type === "Несовместимые маршруты") && c.ops.length === 2) {
            const [a, b] = c.ops.map((id) => s.ops.find((o) => o.id === id)!).sort((x, y) => x.start - y.start);
            if (b.status === "pending" || b.status === "paused") {
              commit({ ops: s.ops.map((o) => (o.id === b.id ? { ...o, start: a.start + a.duration } : o)) }, `Автоисправление: ${b.id} сдвинута на ${a.start + a.duration - b.start} мин.`);
              return;
            }
          }
          if (c.type === "Ресурс недоступен") {
            const alt = s.locos.find((l) => l.available);
            if (alt) {
              commit({ ops: s.ops.map((o) => (c.ops.includes(o.id) ? { ...o, loco: alt.id } : o)) }, `Автоисправление: ${c.ops.join(", ")} переданы ${alt.id}.`);
              return;
            }
          }
          if (c.type === "Переполнение пути" && !c.ops.length) {
            const t = s.tracks.find((x) => x.id === c.tracks[0])!;
            const over = s.wagons.filter((w) => w.track === t.id);
            const extra = over.slice(t.capacity);
            let wagons = s.wagons;
            for (const w of extra) {
              const dest = s.tracks.find((x) => !x.closed && x.id !== t.id && wagons.filter((y) => y.track === x.id).length < x.capacity);
              if (dest) wagons = wagons.map((y) => (y.id === w.id ? { ...y, track: dest.id } : y));
            }
            commit({ wagons }, `Автоисправление: с ${t.name} выведено ${extra.length} ваг.`);
            return;
          }
          get().optimize("Автоисправление (перепланирование)");
        },
        tick: (dt) => {
          const s = get();
          const clock = s.clock + dt;
          let wagons = s.wagons, locos = s.locos;
          const logs: string[] = [];
          const busy = new Set(s.ops.filter((o) => o.status === "running").map((o) => o.loco));
          const ops = [...s.ops].sort((a, b) => a.start - b.start).map((o) => {
            if (o.status === "running" && clock >= o.start + o.duration) {
              wagons = wagons.map((w) => (o.wagons.includes(w.id) ? { ...w, track: o.to } : w));
              locos = locos.map((l) => (l.id === o.loco ? { ...l, track: o.to } : l));
              busy.delete(o.loco);
              logs.push(`${o.id} завершена: ${o.wagons.length} ваг. на Пути ${o.to}.`);
              return { ...o, status: "done" as const };
            }
            return o;
          }).map((o) => {
            if (o.status === "pending" && clock >= o.start) {
              const loco = locos.find((l) => l.id === o.loco);
              if (!loco?.available || busy.has(o.loco)) return { ...o, start: Math.round(clock) };
              busy.add(o.loco);
              locos = locos.map((l) => (l.id === o.loco ? { ...l, track: o.from } : l));
              logs.push(`${o.id} начата: ${o.loco} П${o.from} → П${o.to}.`);
              return { ...o, status: "running" as const };
            }
            return o;
          });
          const allDone = ops.every((o) => o.status === "done" || o.status === "blocked");
          set({ clock, ops, wagons, locos, running: allDone ? false : s.running });
          if (logs.length || allDone) {
            const log = [...logs.reverse().map((text) => ({ time: clock, text })), ...(allDone && s.running ? [{ time: clock, text: "Симуляция завершена." }] : []), ...get().log].slice(0, 100);
            set({ log, events: syncEvents({ ...get() }, get().events) });
          }
        },
        setRunning: (running) => set({ running }),
        setSpeed: (speed) => set({ speed }),
        reset: () => set({ ...initial() }),
        setHighlight: (highlight) => set({ highlight }),
        closeTrack3Scenario: () => {
          const s = get();
          if (s.tracks.find((t) => t.id === 3)!.closed) return;
          commit({ tracks: s.tracks.map((t) => (t.id === 3 ? { ...t, closed: true } : t)) }, "НЕШТАТНАЯ СИТУАЦИЯ: Путь 3 внезапно закрыт (неисправность стрелочного перевода).");
        },
      };
    },
    {
      name: "smart-yard-v1",
      skipHydration: true,
      partialize: (s) => ({ tracks: s.tracks, wagons: s.wagons, locos: s.locos, trains: s.trains, ops: s.ops, events: s.events, clock: s.clock, speed: s.speed, comparison: s.comparison, log: s.log }),
    },
  ),
);

export { opDuration };
export type { State as YardState };
