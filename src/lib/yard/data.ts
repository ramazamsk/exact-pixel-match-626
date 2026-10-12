import type { Loco, Operation, Track, Train, Wagon } from "./types";

export const STATION = "Кызылорда-Сортировочная · Парк Б";

export const seedTracks: Track[] = [
  { id: 1, name: "Путь 1", capacity: 5, closed: false, role: "Отправление Д-1" },
  { id: 2, name: "Путь 2", capacity: 5, closed: false, role: "Отправление Д-2" },
  { id: 3, name: "Путь 3", capacity: 6, closed: false, role: "Сортировочный" },
  { id: 4, name: "Путь 4", capacity: 4, closed: false, role: "Приёмный" },
  { id: 5, name: "Путь 5", capacity: 5, closed: false, role: "Приёмный" },
  { id: 6, name: "Путь 6", capacity: 4, closed: false, role: "Отправление Д-3" },
];

export const seedTrains: Train[] = [
  { id: "Д-1", name: "Состав Д-1", destination: "Алматы-1", targetTrack: 1, departure: 90, priority: 1 },
  { id: "Д-2", name: "Состав Д-2", destination: "Астана", targetTrack: 2, departure: 135, priority: 2 },
  { id: "Д-3", name: "Состав Д-3", destination: "Шымкент", targetTrack: 6, departure: 180, priority: 3 },
];

const w = (id: string, number: string, track: Wagon["track"], train: string | null, cargo: string, destination: string): Wagon => ({ id, number, track, train, cargo, destination });

export const seedWagons: Wagon[] = [
  w("w1", "52417836", 3, "Д-1", "Зерно", "Алматы-1"),
  w("w2", "52418102", 3, "Д-2", "Уголь", "Астана"),
  w("w3", "52419577", 3, "Д-1", "Зерно", "Алматы-1"),
  w("w4", "61203448", 3, "Д-3", "Цемент", "Шымкент"),
  w("w5", "61204015", 4, "Д-1", "Нефтепродукты", "Алматы-1"),
  w("w6", "61205570", 4, "Д-2", "Металл", "Астана"),
  w("w7", "61206231", 4, "Д-3", "Цемент", "Шымкент"),
  w("w8", "73310894", 5, "Д-2", "Уголь", "Астана"),
  w("w9", "73311207", 5, "Д-1", "Зерно", "Алматы-1"),
  w("w10", "73312560", 5, "Д-3", "Удобрения", "Шымкент"),
  w("w11", "73313019", 5, "Д-2", "Металл", "Астана"),
  w("w12", "58820146", 1, "Д-1", "Зерно", "Алматы-1"),
  w("w13", "58821733", 2, "Д-2", "Уголь", "Астана"),
  w("w14", "58822480", 6, "Д-3", "Удобрения", "Шымкент"),
  w("w15", "94450017", 4, null, "Порожний", "Депо (ремонт)"),
];

export const seedLocos: Loco[] = [
  { id: "ТЭМ-01", track: 5, available: true },
  { id: "ТЭМ-02", track: 4, available: true },
];

/** Первоначальный (ручной) план диспетчера — содержит лишние перестановки и пересечения. */
export const seedOps: Operation[] = [
  { id: "OP-101", type: "Сортировка", from: 5, to: 3, wagons: ["w9"], loco: "ТЭМ-01", start: 0, duration: 10, priority: 2, status: "pending" },
  { id: "OP-102", type: "Подача", from: 3, to: 1, wagons: ["w1", "w3", "w9"], loco: "ТЭМ-01", start: 8, duration: 14, priority: 1, status: "pending" },
  { id: "OP-103", type: "Подача", from: 4, to: 1, wagons: ["w5"], loco: "ТЭМ-02", start: 5, duration: 9, priority: 1, status: "pending" },
  { id: "OP-104", type: "Подача", from: 3, to: 2, wagons: ["w2"], loco: "ТЭМ-02", start: 16, duration: 9, priority: 2, status: "pending" },
  { id: "OP-105", type: "Подача", from: 5, to: 2, wagons: ["w8", "w11"], loco: "ТЭМ-01", start: 25, duration: 12, priority: 2, status: "pending" },
  { id: "OP-106", type: "Подача", from: 4, to: 2, wagons: ["w6"], loco: "ТЭМ-02", start: 28, duration: 9, priority: 2, status: "pending" },
  { id: "OP-107", type: "Перестановка", from: 4, to: 3, wagons: ["w7"], loco: "ТЭМ-02", start: 40, duration: 8, priority: 3, status: "pending" },
  { id: "OP-108", type: "Подача", from: 3, to: 6, wagons: ["w4", "w7"], loco: "ТЭМ-01", start: 44, duration: 13, priority: 3, status: "pending" },
  { id: "OP-109", type: "Подача", from: 5, to: 6, wagons: ["w10"], loco: "ТЭМ-01", start: 62, duration: 10, priority: 3, status: "pending" },
];

export const fmtTime = (min: number) => {
  const t = Math.round(8 * 60 + min);
  const h = Math.floor(t / 60) % 24;
  const m = ((t % 60) + 60) % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

export const opDuration = (n: number, from: number, to: number) => Math.round(4 + 2 * n + 1.5 * Math.abs(from - to));
