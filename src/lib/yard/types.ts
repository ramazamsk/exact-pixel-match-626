export type TrackId = 1 | 2 | 3 | 4 | 5 | 6;

export interface Track {
  id: TrackId;
  name: string;
  capacity: number;
  closed: boolean;
  role: string;
}

export interface Wagon {
  id: string;
  number: string;
  track: TrackId;
  cargo: string;
  destination: string;
  train: string | null;
}

export interface Loco {
  id: string;
  track: TrackId;
  available: boolean;
}

export interface Train {
  id: string;
  name: string;
  destination: string;
  targetTrack: TrackId;
  departure: number; // minutes from 08:00
  priority: number;
}

export type OpStatus = "pending" | "running" | "paused" | "done" | "blocked";
export type OpType = "Подача" | "Перестановка" | "Сортировка" | "Вывод";

export interface Operation {
  id: string;
  type: OpType;
  from: TrackId;
  to: TrackId;
  wagons: string[];
  loco: string;
  start: number;
  duration: number;
  priority: number;
  status: OpStatus;
}

export type Severity = "critical" | "warning";
export type ConflictType =
  | "Конфликт локомотива"
  | "Несовместимые маршруты"
  | "Переполнение пути"
  | "Закрытие пути"
  | "Задержка отправления"
  | "Ресурс недоступен";

export interface Conflict {
  key: string;
  type: ConflictType;
  severity: Severity;
  description: string;
  solution: string;
  ops: string[];
  tracks: TrackId[];
}

export interface YardEvent extends Conflict {
  time: number;
  status: "open" | "resolved";
  resolvedAt?: number;
}

export interface PlanMetrics {
  ops: number;
  finish: number;
  idle: number;
  conflicts: number;
  moves: number;
}

export interface Comparison {
  title: string;
  a: PlanMetrics;
  b: PlanMetrics;
  aOps: Operation[];
  bOps: Operation[];
  explanation: string[];
  at: number;
}
