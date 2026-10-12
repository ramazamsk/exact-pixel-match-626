import { CheckCircle2 } from "lucide-react";
import { useYard } from "@/lib/yard/store";
import { fmtTime } from "@/lib/yard/data";
import { cn } from "@/lib/utils";
import { SectionTitle } from "./common";

export function ComparisonPanel() {
  const c = useYard((s) => s.comparison);
  if (!c) return (
    <div className="panel p-4">
      <SectionTitle>Сравнение планов</SectionTitle>
      <p className="text-sm text-muted-foreground">Нажмите «Оптимизировать план», чтобы сравнить Вариант A (текущий) и Вариант B (после перепланирования).</p>
    </div>
  );
  const rows: { label: string; a: string | number; b: string | number; better: boolean; worse: boolean }[] = [
    { label: "Операций", a: c.a.ops, b: c.b.ops, better: c.b.ops < c.a.ops, worse: c.b.ops > c.a.ops },
    { label: "Перемещений вагонов", a: c.a.moves, b: c.b.moves, better: c.b.moves < c.a.moves, worse: c.b.moves > c.a.moves },
    { label: "Завершение", a: fmtTime(c.a.finish), b: fmtTime(c.b.finish), better: c.b.finish < c.a.finish, worse: c.b.finish > c.a.finish },
    { label: "Простой локомотивов, мин", a: c.a.idle, b: c.b.idle, better: c.b.idle < c.a.idle, worse: c.b.idle > c.a.idle },
    { label: "Конфликтов", a: c.a.conflicts, b: c.b.conflicts, better: c.b.conflicts < c.a.conflicts, worse: c.b.conflicts > c.a.conflicts },
  ];
  return (
    <div className="panel p-4">
      <SectionTitle right={<span className="font-mono text-xs text-muted-foreground">в {fmtTime(c.at)}</span>}>{c.title}: A ⟶ B</SectionTitle>
      <table className="w-full text-sm">
        <thead><tr className="text-left text-[11px] uppercase text-muted-foreground"><th className="py-1 font-medium">Показатель</th><th className="font-medium">Вариант A</th><th className="font-medium">Вариант B</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} className="border-t">
              <td className="py-1.5 text-muted-foreground">{r.label}</td>
              <td className="font-mono">{r.a}</td>
              <td className={cn("font-mono font-semibold", r.better && "text-success", r.worse && "text-warning")}>{r.b}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <ul className="mt-3 space-y-1.5">
        {c.explanation.map((e) => <li key={e} className="flex gap-2 text-xs"><CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-success" />{e}</li>)}
      </ul>
    </div>
  );
}
