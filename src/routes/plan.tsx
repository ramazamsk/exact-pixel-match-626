import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowDown, ArrowUp, CheckCheck, Pause, Pencil, Play, Plus, RefreshCw, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Gantt } from "@/components/yard/Gantt";
import { OpEditor } from "@/components/yard/OpEditor";
import { ComparisonPanel } from "@/components/yard/ComparisonPanel";
import { SimControls } from "@/components/yard/SimControls";
import { SectionTitle, StatusPill } from "@/components/yard/common";
import { useYard } from "@/lib/yard/store";
import { fmtTime } from "@/lib/yard/data";
import { cn } from "@/lib/utils";
import type { Operation } from "@/lib/yard/types";

export const Route = createFileRoute("/plan")({
  head: () => ({
    meta: [
      { title: "План маневров — SMART YARD" },
      { name: "description", content: "Временная шкала маневровых операций, редактирование и автоматический пересчёт плана." },
      { property: "og:title", content: "План маневров — SMART YARD" },
      { property: "og:description", content: "Диаграмма Ганта и управление маневровыми операциями." },
    ],
  }),
  component: PlanPage,
});

function PlanPage() {
  const s = useYard();
  const [edit, setEdit] = useState<Operation | null>(null);
  const [open, setOpen] = useState(false);
  const sorted = [...s.ops].sort((a, b) => a.start - b.start);
  const conflictOps = new Set(s.events.filter((e) => e.status === "open").flatMap((e) => e.ops));
  const num = (id: string) => s.wagons.find((w) => w.id === id)?.number.slice(-4);

  return (
    <div className="space-y-3">
      <SimControls />
      <div className="panel p-4">
        <SectionTitle right={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => { setEdit(null); setOpen(true); }}><Plus />Добавить операцию</Button>
            <Button size="sm" variant="secondary" onClick={() => { s.optimize("Пересчёт плана"); toast.success("План пересчитан"); }}><RefreshCw />Пересчитать</Button>
          </div>
        }>Временная шкала (Gantt)</SectionTitle>
        <Gantt onSelect={(id) => { setEdit(s.ops.find((o) => o.id === id) ?? null); setOpen(true); }} />
      </div>
      <div className="grid gap-3 xl:grid-cols-[1fr_380px]">
        <div className="panel overflow-x-auto p-4">
          <SectionTitle>Операции ({s.ops.length})</SectionTitle>
          <table className="w-full min-w-[820px] text-sm">
            <thead><tr className="text-left text-[11px] uppercase text-muted-foreground">
              {["ID", "Тип", "Маршрут", "Вагоны", "Локомотив", "Начало", "Мин", "Пр.", "Статус", ""].map((h) => <th key={h} className="pb-2 font-medium">{h}</th>)}
            </tr></thead>
            <tbody>
              {sorted.map((o, i) => (
                <tr key={o.id} className={cn("border-t", conflictOps.has(o.id) && "bg-destructive/10")}>
                  <td className="py-1.5 font-mono text-xs">{o.id}</td>
                  <td>{o.type}</td>
                  <td className="font-mono text-xs">П{o.from} → П{o.to}</td>
                  <td className="max-w-40 truncate font-mono text-xs text-muted-foreground">{o.wagons.map(num).join(", ")}</td>
                  <td className="font-mono text-xs">{o.loco}</td>
                  <td className="font-mono text-xs">{fmtTime(o.start)}</td>
                  <td className="font-mono text-xs">{o.duration}</td>
                  <td className="font-mono text-xs">{o.priority}</td>
                  <td><StatusPill status={o.status} /></td>
                  <td className="whitespace-nowrap text-right">
                    <IconBtn title="Выше" disabled={i === 0} onClick={() => s.reorderOp(o.id, -1)}><ArrowUp /></IconBtn>
                    <IconBtn title="Ниже" disabled={i === sorted.length - 1} onClick={() => s.reorderOp(o.id, 1)}><ArrowDown /></IconBtn>
                    {(o.status === "pending" || o.status === "paused") && <IconBtn title="Запустить" onClick={() => s.setOpStatus(o.id, "running")}><Play /></IconBtn>}
                    {o.status === "running" && <IconBtn title="Приостановить" onClick={() => s.setOpStatus(o.id, "paused")}><Pause /></IconBtn>}
                    {o.status !== "done" && o.status !== "blocked" && <IconBtn title="Завершить" onClick={() => s.setOpStatus(o.id, "done")}><CheckCheck /></IconBtn>}
                    {o.status !== "done" && <IconBtn title="Редактировать" onClick={() => { setEdit(o); setOpen(true); }}><Pencil /></IconBtn>}
                    <IconBtn title="Удалить" onClick={() => s.deleteOp(o.id)}><Trash2 /></IconBtn>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="space-y-3">
          <ComparisonPanel />
          <div className="panel p-4">
            <SectionTitle>Как работает алгоритм</SectionTitle>
            <ol className="list-decimal space-y-1 pl-4 text-xs text-muted-foreground">
              <li>Составы упорядочиваются по времени отправления и приоритету.</li>
              <li>Вагоны каждого состава группируются по исходному пути — одна подача на группу.</li>
              <li>Проверяется свободная вместимость целевого пути; закрытые пути исключаются.</li>
              <li>Выбирается локомотив с самым ранним окончанием с учётом подхода.</li>
              <li>Пути и локомотив резервируются на время операции — пересечения исключены.</li>
            </ol>
            <Button size="sm" className="mt-3 w-full" onClick={() => { s.optimize(); toast.success("План оптимизирован"); }}><Sparkles />Оптимизировать план</Button>
          </div>
        </div>
      </div>
      <OpEditor op={edit} open={open} onClose={() => setOpen(false)} />
    </div>
  );
}

function IconBtn({ children, ...p }: React.ComponentProps<"button">) {
  return <button {...p} className="inline-grid size-7 place-items-center rounded text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-30 [&_svg]:size-3.5">{children}</button>;
}
