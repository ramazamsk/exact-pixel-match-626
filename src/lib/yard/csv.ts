import type { YardState } from "./store";
import { fmtTime } from "./data";
import { statusLabel } from "@/components/yard/common";

const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

export function exportCsv(s: YardState) {
  const lines: string[] = [];
  const row = (...c: unknown[]) => lines.push(c.map(esc).join(";"));
  row("SMART YARD — отчёт", `Модельное время ${fmtTime(s.clock)}`, new Date().toLocaleString("ru-RU"));
  row();
  row("ОПЕРАЦИИ");
  row("ID", "Тип", "Из пути", "На путь", "Вагоны", "Локомотив", "Начало", "Окончание", "Длительность, мин", "Приоритет", "Статус");
  [...s.ops].sort((a, b) => a.start - b.start).forEach((o) =>
    row(o.id, o.type, o.from, o.to, o.wagons.map((id) => s.wagons.find((w) => w.id === id)?.number).join(" "), o.loco, fmtTime(o.start), fmtTime(o.start + o.duration), o.duration, o.priority, statusLabel[o.status]));
  row();
  row("ПУТИ");
  row("Путь", "Вместимость", "Вагонов", "Загрузка, %", "Состояние");
  s.tracks.forEach((t) => { const n = s.wagons.filter((w) => w.track === t.id).length; row(t.name, t.capacity, n, Math.round((n / t.capacity) * 100), t.closed ? "Закрыт" : "Открыт"); });
  row();
  row("ЛОКОМОТИВЫ");
  row("ID", "Доступен", "Путь", "Операций", "Занятость, мин");
  s.locos.forEach((l) => { const ops = s.ops.filter((o) => o.loco === l.id); row(l.id, l.available ? "Да" : "Нет", l.track, ops.length, ops.reduce((a, o) => a + o.duration, 0)); });
  row();
  row("СОСТАВЫ");
  row("Состав", "Назначение", "Путь", "Отправление", "Вагонов на пути", "Всего вагонов");
  s.trains.forEach((t) => { const own = s.wagons.filter((w) => w.train === t.id); row(t.id, t.destination, t.targetTrack, fmtTime(t.departure), own.filter((w) => w.track === t.targetTrack).length, own.length); });
  if (s.comparison) {
    const c = s.comparison;
    row();
    row("РЕЗУЛЬТАТЫ ОПТИМИЗАЦИИ", c.title);
    row("Показатель", "Вариант A", "Вариант B");
    row("Операций", c.a.ops, c.b.ops);
    row("Перемещений вагонов", c.a.moves, c.b.moves);
    row("Завершение", fmtTime(c.a.finish), fmtTime(c.b.finish));
    row("Простой, мин", c.a.idle, c.b.idle);
    row("Конфликтов", c.a.conflicts, c.b.conflicts);
  }
  row();
  row("ЖУРНАЛ КОНФЛИКТОВ");
  row("Время", "Тип", "Важность", "Описание", "Статус");
  s.events.forEach((e) => row(fmtTime(e.time), e.type, e.severity === "critical" ? "Критично" : "Предупреждение", e.description, e.status === "open" ? "Открыт" : "Устранён"));

  const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `smart-yard-report-${fmtTime(s.clock).replace(":", "")}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}
