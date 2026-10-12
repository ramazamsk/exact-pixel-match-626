import { Pause, Play, RotateCcw, Sparkles, StepForward, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useYard } from "@/lib/yard/store";
import { fmtTime } from "@/lib/yard/data";

export function SimControls() {
  const s = useYard();
  const started = s.clock > 0;
  const t3closed = s.tracks.find((t) => t.id === 3)!.closed;
  return (
    <div className="panel flex flex-wrap items-center gap-2 p-3">
      <div className="mr-2 font-mono text-sm">
        <span className="text-muted-foreground">Симуляция · </span>{fmtTime(s.clock)}
      </div>
      {!s.running && !started && <Button size="sm" onClick={() => s.setRunning(true)}><Play />Запустить симуляцию</Button>}
      {s.running && <Button size="sm" variant="secondary" onClick={() => s.setRunning(false)}><Pause />Пауза</Button>}
      {!s.running && started && <Button size="sm" onClick={() => s.setRunning(true)}><StepForward />Продолжить</Button>}
      <Button size="sm" variant="outline" onClick={() => { s.reset(); toast.success("Сценарий сброшен"); }}><RotateCcw />Сбросить сценарий</Button>
      <div className="flex items-center gap-1 rounded-md border p-0.5">
        <span className="px-1.5 text-xs text-muted-foreground">Скорость</span>
        {[1, 2, 5, 10].map((v) => (
          <button key={v} onClick={() => s.setSpeed(v)} className={`rounded px-2 py-1 font-mono text-xs ${s.speed === v ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}>×{v}</button>
        ))}
      </div>
      <div className="ml-auto flex flex-wrap gap-2">
        <Button size="sm" variant="destructive" disabled={t3closed} onClick={() => { s.closeTrack3Scenario(); toast.error("Путь 3 закрыт — план нарушен"); }}><TriangleAlert />Закрыть Путь 3</Button>
        <Button size="sm" variant="default" onClick={() => { s.optimize(); toast.success("План оптимизирован"); }}><Sparkles />Оптимизировать план</Button>
      </div>
    </div>
  );
}
