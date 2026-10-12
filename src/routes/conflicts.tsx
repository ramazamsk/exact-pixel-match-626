import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, Info, RefreshCw, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SectionTitle, SeverityDot, StatusPill } from "@/components/yard/common";
import { useYard } from "@/lib/yard/store";
import { fmtTime } from "@/lib/yard/data";
import type { YardEvent } from "@/lib/yard/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/conflicts")({
  head: () => ({
    meta: [
      { title: "Конфликты и предупреждения — SMART YARD" },
      { name: "description", content: "Центр конфликтов: локомотивы, маршруты, переполнение и закрытие путей с автоисправлением." },
      { property: "og:title", content: "Конфликты — SMART YARD" },
      { property: "og:description", content: "Обнаружение и автоматическое устранение конфликтов маневровых работ." },
    ],
  }),
  component: ConflictsPage,
});

function ConflictsPage() {
  const s = useYard();
  const nav = useNavigate();
  const [filter, setFilter] = useState<"open" | "resolved" | "all">("open");
  const [detail, setDetail] = useState<YardEvent | null>(null);
  const list = s.events.filter((e) => filter === "all" || e.status === filter);
  const openCount = s.events.filter((e) => e.status === "open").length;

  return (
    <div className="space-y-3">
      <div className="panel flex flex-wrap items-center gap-2 p-3">
        {(["open", "resolved", "all"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={cn("rounded-md px-3 py-1.5 text-sm", filter === f ? "bg-accent" : "text-muted-foreground hover:bg-accent")}>
            {{ open: `Активные (${openCount})`, resolved: "Устранённые", all: "Все" }[f]}
          </button>
        ))}
        <Button size="sm" className="ml-auto" onClick={() => { s.optimize("Пересчёт плана"); toast.success("План пересчитан"); }}><RefreshCw />Пересчитать план</Button>
      </div>
      <div className="panel p-4">
        <SectionTitle>Конфликты и предупреждения</SectionTitle>
        {!list.length && <p className="py-6 text-center text-sm text-muted-foreground">Нет событий в этой категории.</p>}
        <div className="space-y-2">
          {list.map((e) => (
            <div key={e.key + e.time} className={cn("rounded-md border p-3", e.status === "resolved" && "opacity-60")}>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <SeverityDot severity={e.severity} />
                <span className="font-semibold">{e.type}</span>
                <span className={cn("rounded px-1.5 text-[11px]", e.severity === "critical" ? "bg-destructive/20 text-destructive" : "bg-warning/15 text-warning")}>{e.severity === "critical" ? "Критично" : "Предупреждение"}</span>
                <span className={cn("rounded px-1.5 text-[11px]", e.status === "open" ? "bg-muted" : "bg-success/15 text-success")}>{e.status === "open" ? "Открыт" : `Устранён в ${fmtTime(e.resolvedAt ?? e.time)}`}</span>
                <span className="ml-auto font-mono text-xs text-muted-foreground">{fmtTime(e.time)}</span>
              </div>
              <p className="mt-1 text-sm">{e.description}</p>
              <p className="text-xs text-muted-foreground">Решение: {e.solution}</p>
              {e.status === "open" && (
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => { s.setHighlight({ tracks: e.tracks, ops: e.ops }); nav({ to: "/" }); setTimeout(() => s.setHighlight(null), 6000); }}><Eye />Показать на схеме</Button>
                  <Button size="sm" onClick={() => { s.autoFix(e.key); toast.success("Исправление применено"); }}><Wand2 />Исправить автоматически</Button>
                  <Button size="sm" variant="ghost" onClick={() => setDetail(e)}><Info />Открыть детали</Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent>
          {detail && (<>
            <DialogHeader><DialogTitle>{detail.type}</DialogTitle><DialogDescription>{fmtTime(detail.time)} · {detail.severity === "critical" ? "Критично" : "Предупреждение"}</DialogDescription></DialogHeader>
            <p className="text-sm">{detail.description}</p>
            <div className="text-sm"><span className="text-muted-foreground">Затронутые пути: </span>{[...new Set(detail.tracks)].map((t) => `П${t}`).join(", ") || "—"}</div>
            <div className="space-y-1">
              {detail.ops.map((id) => { const o = s.ops.find((x) => x.id === id); return o && (
                <div key={id} className="flex items-center justify-between rounded bg-muted px-2 py-1 font-mono text-xs">{o.id} · {o.loco} · П{o.from}→П{o.to} · {fmtTime(o.start)}–{fmtTime(o.start + o.duration)}<StatusPill status={o.status} /></div>
              ); })}
            </div>
            <p className="rounded bg-accent p-2 text-sm">Рекомендация: {detail.solution}</p>
            <Button onClick={() => { s.autoFix(detail.key); setDetail(null); toast.success("Исправление применено"); }}><Wand2 />Исправить автоматически</Button>
          </>)}
        </DialogContent>
      </Dialog>
    </div>
  );
}
