import { Link } from "@tanstack/react-router";
import { Bell, TrainFront, UserRound, Activity } from "lucide-react";
import { useEffect, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useYard } from "@/lib/yard/store";
import { STATION, fmtTime } from "@/lib/yard/data";
import { SeverityDot } from "./common";

const nav = [
  { to: "/", label: "Панель" },
  { to: "/plan", label: "План маневров" },
  { to: "/conflicts", label: "Конфликты" },
  { to: "/analytics", label: "Аналитика" },
] as const;

export function SimRunner() {
  const running = useYard((s) => s.running);
  const speed = useYard((s) => s.speed);
  const tick = useYard((s) => s.tick);
  useEffect(() => {
    useYard.persist.rehydrate();
  }, []);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => tick(0.25 * speed), 250);
    return () => clearInterval(id);
  }, [running, speed, tick]);
  return null;
}

export function Header() {
  const clock = useYard((s) => s.clock);
  const running = useYard((s) => s.running);
  const events = useYard((s) => s.events);
  const open = events.filter((e) => e.status === "open");
  const critical = open.some((e) => e.severity === "critical");
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b bg-panel/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2.5">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-md bg-primary text-primary-foreground"><TrainFront className="size-5" /></span>
          <span className="font-mono text-base font-bold tracking-widest">SMART<span className="text-primary">YARD</span></span>
        </Link>
        <div className="hidden text-xs text-muted-foreground lg:block">{STATION}</div>
        <nav className="order-last flex w-full gap-1 overflow-x-auto md:order-none md:w-auto">
          {nav.map((n) => (
            <Link key={n.to} to={n.to} activeOptions={{ exact: true }}
              className="whitespace-nowrap rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              activeProps={{ className: "bg-accent text-foreground" }}>
              {n.label}
              {n.to === "/conflicts" && open.length > 0 && <span className="ml-1.5 rounded bg-destructive px-1.5 text-[10px] text-destructive-foreground">{open.length}</span>}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-4">
          <div className="hidden items-center gap-2 text-xs sm:flex">
            <Activity className={running ? "size-4 text-success" : "size-4 text-muted-foreground"} />
            <span className="text-muted-foreground">Модель</span>
            <span className="font-mono text-foreground">{fmtTime(clock)}</span>
          </div>
          <div className="hidden text-right font-mono text-xs leading-tight md:block">
            <div>{now ? now.toLocaleTimeString("ru-RU") : "--:--:--"}</div>
            <div className="text-muted-foreground">{now ? now.toLocaleDateString("ru-RU") : ""}</div>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <SeverityDot severity={critical ? "critical" : open.length ? "warning" : "ok"} />
            <span className="hidden sm:inline">{critical ? "Критично" : open.length ? "Внимание" : "Норма"}</span>
          </div>
          <Popover>
            <PopoverTrigger className="relative rounded-md p-1.5 hover:bg-accent" aria-label="Уведомления">
              <Bell className="size-5" />
              {open.length > 0 && <span className="absolute -right-0.5 -top-0.5 grid size-4 place-items-center rounded-full bg-destructive text-[10px] text-destructive-foreground">{open.length}</span>}
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-0">
              <div className="border-b px-3 py-2 text-sm font-semibold">Уведомления</div>
              <div className="max-h-72 overflow-auto">
                {open.length === 0 && <div className="p-3 text-sm text-muted-foreground">Активных конфликтов нет.</div>}
                {open.slice(0, 8).map((e) => (
                  <div key={e.key} className="flex gap-2 border-b px-3 py-2 text-xs last:border-0">
                    <SeverityDot severity={e.severity} className="mt-1 shrink-0" />
                    <div><div className="font-medium">{e.type}</div><div className="text-muted-foreground">{e.description}</div></div>
                  </div>
                ))}
              </div>
              <Link to="/conflicts" className="block border-t px-3 py-2 text-center text-xs text-primary hover:bg-accent">Открыть центр конфликтов</Link>
            </PopoverContent>
          </Popover>
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-full bg-secondary"><UserRound className="size-4" /></span>
            <div className="hidden text-xs leading-tight xl:block"><div>Р. Ахметов</div><div className="text-muted-foreground">Маневровый диспетчер</div></div>
          </div>
        </div>
      </div>
    </header>
  );
}
