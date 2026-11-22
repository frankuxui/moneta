import { cn } from '@/lib/utils';
import { useEffect } from 'react';
import { NavLink, Outlet, useLocation, Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard,
  ArrowUpRight,
  ArrowDownLeft,
  Repeat2,
  ChartNoAxesCombined,
  Shapes,
  Settings,
  Menu,
  Sun,
  Moon,
  X,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';
import { todayMadrid } from '@moneta/shared';
import { api } from '@/services/api';
import { useUi } from '@/stores/ui';
import { Button } from '@/components/ui/button';
const links = [
  { to: '/', label: 'Resumen', icon: LayoutDashboard },
  { to: '/expenses', label: 'Gastos', icon: ArrowUpRight },
  { to: '/income', label: 'Ingresos', icon: ArrowDownLeft },
  { to: '/subscriptions', label: 'Suscripciones', icon: Repeat2 },
  { to: '/analytics', label: 'Analíticas', icon: ChartNoAxesCombined },
  { to: '/categories', label: 'Categorías', icon: Shapes },
];
export function Shell() {
  const { theme, setTheme, sidebarOpen, toggleSidebar, closeSidebar } = useUi();
  const location = useLocation();
  const health = useQuery({
    queryKey: ['health'],
    queryFn: () => api<{ status: string }>('/health'),
    refetchInterval: 60000,
    retry: 1,
  });
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);
  useEffect(() => {
    closeSidebar();
  }, [location.pathname, closeSidebar]);
  useEffect(() => {
    if (!sidebarOpen || !window.matchMedia('(max-width: 760px)').matches) return;
    const sidebar = document.querySelector<HTMLElement>('[data-sidebar]');
    const previous = document.activeElement as HTMLElement | null;
    const focusable = () =>
      Array.from(sidebar?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])') ?? []);
    sidebar?.querySelector<HTMLElement>('[data-sidebar-close]')?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeSidebar();
      if (e.key === 'Tab') {
        const elements = focusable();
        const first = elements[0],
          last = elements.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
        if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    window.addEventListener('keydown', key);
    return () => {
      window.removeEventListener('keydown', key);
      previous?.focus();
    };
  }, [closeSidebar, sidebarOpen]);
  const label = links.find((l) => l.to === location.pathname)?.label ?? 'Configuración';
  return (
    <div className="flex min-h-screen">
      <a
        className="fixed -top-25 left-5 z-100 rounded-sm bg-primary px-5 py-3 text-primary-foreground focus:top-3"
        href="#main"
      >
        Saltar al contenido
      </a>
      {sidebarOpen && (
        <button
          className="fixed inset-0 z-20 block border-0 bg-black/45 md:hidden"
          aria-label="Cerrar navegación"
          onClick={closeSidebar}
        />
      )}
      <aside
        data-sidebar
        data-state={sidebarOpen ? 'open' : 'closed'}
        className="fixed inset-y-0 left-0 z-30 flex w-62.5 -translate-x-full invisible flex-col border-r border-border bg-sidebar px-4.75 pt-8.75 pb-4.5 transition-transform duration-200 motion-reduce:transition-none data-[state=open]:visible data-[state=open]:translate-x-0 md:visible md:w-54 md:translate-x-0 md:px-3.5 xl:w-60.5 xl:px-4.75"
      >
        <Link
          className="flex items-center gap-2.75 px-3.75 font-heading text-brand font-bold tracking-tighter text-foreground"
          to="/"
          aria-label="Moneta, inicio"
        >
          <span className="flex -skew-y-12 items-end gap-0.75 [&>i]:block [&>i]:h-4.5 [&>i]:w-1.75 [&>i]:rounded-xs [&>i]:bg-primary [&>i:nth-child(2)]:h-7.25 [&>i:nth-child(2)]:opacity-80 [&>i:nth-child(3)]:h-5.75 [&>i:nth-child(3)]:opacity-60">
            <i />
            <i />
            <i />
          </span>
          <span>
            moneta<span className="text-primary">.</span>
          </span>
        </Link>
        <Button
          data-sidebar-close
          className="absolute top-2.5 right-2 flex md:hidden"
          variant="ghost"
          size="icon"
          aria-label="Cerrar menú"
          onClick={closeSidebar}
        >
          <X />
        </Button>
        <div className="mx-1 mt-8.5 mb-8 flex items-center gap-2.5 rounded-lg border border-border px-2.25 py-3 [&_strong]:text-xs/normal [&_strong]:font-semibold [&_small]:mt-0.75 [&_small]:block [&_small]:text-caption [&_small]:text-muted-foreground [&>svg]:ml-auto [&>svg]:text-muted-foreground">
          <span className="grid size-8 place-items-center rounded-sm border border-border bg-muted font-semibold">
            M
          </span>
          <div>
            <strong>Mi espacio personal</strong>
            <small>Finanzas en orden</small>
          </div>
          <ChevronRight size={14} />
        </div>
        <p className="mb-3 px-3.75 text-2xs font-semibold tracking-overline text-muted-foreground">
          TU DINERO
        </p>
        <nav className="flex flex-col gap-1.25" aria-label="Navegación principal">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3.25 rounded-sm px-3.75 py-3 text-body text-muted-foreground transition-colors duration-150 motion-reduce:transition-none hover:bg-muted hover:text-foreground',
                  isActive && 'bg-accent text-accent-foreground font-semibold',
                )
              }
            >
              <l.icon size={19} />
              {l.label}
              {l.to === '/' && <span className="ml-auto size-1.25 rounded-full bg-primary" />}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto pt-10">
          <div className="mx-1.25 mb-5.75 rounded-lg border border-border bg-background px-3.5 py-4.25 [&>svg]:mb-2.5 [&>svg]:text-primary [&>strong]:block [&>strong]:text-xs/normal [&>strong]:font-semibold [&>p]:mt-1.5 [&>p]:text-caption [&>p]:leading-loose [&>p]:text-muted-foreground">
            <ShieldCheck size={21} />
            <strong>Solo tú y tus finanzas.</strong>
            <p>
              Un poco de orden hoy.
              <br />
              Más tranquilidad mañana.
            </p>
          </div>
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3.25 rounded-sm px-3.75 py-3 text-body text-muted-foreground transition-colors duration-150 motion-reduce:transition-none hover:bg-muted hover:text-foreground',
                isActive && 'bg-accent text-accent-foreground font-semibold',
              )
            }
          >
            <Settings size={19} />
            Configuración
          </NavLink>
          <div className="mx-1.25 mt-4.25 flex items-center gap-1.75 border-t border-border px-1.75 pt-4.5 text-2xs text-muted-foreground">
            <i
              className={cn(
                'size-1.5 rounded-full bg-muted-foreground',
                health.isSuccess && 'bg-primary',
                health.isError && 'bg-destructive',
              )}
            />
            {health.isSuccess
              ? 'Conectado a tu espacio'
              : health.isError
                ? 'Sin conexión con el servidor'
                : 'Conectando…'}
          </div>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col md:ml-54 xl:ml-60.5">
        <header className="flex h-16.5 items-center justify-between border-b border-border bg-card px-4 md:h-19.5 md:px-6.5 xl:px-10">
          <div className="flex items-center gap-2 text-xs/normal md:gap-4 [&>span]:text-muted-foreground [&>svg]:text-muted-foreground [&>strong]:font-medium">
            <Button
              variant="ghost"
              size="icon"
              className="inline-flex md:hidden"
              aria-label="Abrir menú"
              aria-expanded={sidebarOpen}
              onClick={toggleSidebar}
            >
              <Menu />
            </Button>
            <span>Mi espacio</span>
            <ChevronRight size={14} />
            <strong>{label}</strong>
          </div>
          <div className="flex items-center gap-1.75 md:gap-2.5 lg:gap-4">
            <time
              className="hidden text-2xs text-muted-foreground md:block lg:text-xs/normal"
              dateTime={todayMadrid()}
            >
              {new Intl.DateTimeFormat('es-ES', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              }).format(new Date(`${todayMadrid()}T12:00:00`))}
            </time>
            <span className="hidden h-5 w-px bg-border md:block" />
            <Button
              variant="ghost"
              size="icon"
              aria-label={theme === 'light' ? 'Activar modo oscuro' : 'Activar modo claro'}
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            >
              {theme === 'light' ? <Moon /> : <Sun />}
            </Button>
            <span
              className="grid size-7 place-items-center rounded-full border border-input bg-secondary text-xs/normal font-semibold text-primary md:size-8"
              aria-label="Espacio personal"
            >
              M
            </span>
          </div>
        </header>
        <main
          id="main"
          tabIndex={-1}
          className="@container/main mx-auto w-full max-w-420 flex-1 px-4.5 pt-6.5 pb-5 md:px-6.5 md:pt-9.25 md:pb-6 xl:px-10 2xl:pt-11"
        >
          <Outlet />
        </main>
        <footer className="mt-5.5 flex flex-wrap justify-between gap-3.75 border-t border-border p-5 text-micro text-muted-foreground md:flex-nowrap md:px-10 md:py-5.25 md:text-2xs [&>span>span]:px-1.25 [&>span>span]:text-input">
          <span>
            moneta<span> · </span>Un lugar para tus finanzas.
          </span>
          <span>
            EUR € <span>·</span> Europe/Madrid
          </span>
        </footer>
      </div>
    </div>
  );
}
