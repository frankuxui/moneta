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
    const sidebar = document.querySelector<HTMLElement>('.sidebar');
    const previous = document.activeElement as HTMLElement | null;
    const focusable = () =>
      Array.from(sidebar?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])') ?? []);
    sidebar?.querySelector<HTMLElement>('.mobile-sidebar-close')?.focus();
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
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Saltar al contenido
      </a>
      {sidebarOpen && (
        <button
          className="sidebar-backdrop"
          aria-label="Cerrar navegación"
          onClick={closeSidebar}
        />
      )}
      <aside className={`sidebar ${sidebarOpen ? 'is-open' : ''}`}>
        <Link className="brand" to="/" aria-label="Moneta, inicio">
          <span className="brand-mark">
            <i />
            <i />
            <i />
          </span>
          <span>
            moneta<span className="brand-dot">.</span>
          </span>
        </Link>
        <Button
          className="mobile-sidebar-close"
          variant="ghost"
          size="icon"
          aria-label="Cerrar menú"
          onClick={closeSidebar}
        >
          <X />
        </Button>
        <div className="workspace-label">
          <span className="workspace-avatar">M</span>
          <div>
            <strong>Mi espacio personal</strong>
            <small>Finanzas en orden</small>
          </div>
          <ChevronRight size={14} />
        </div>
        <p className="nav-label">TU DINERO</p>
        <nav aria-label="Navegación principal">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === '/'}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <l.icon size={19} />
              {l.label}
              {l.to === '/' && <span className="nav-indicator" />}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="local-note">
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
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <Settings size={19} />
            Configuración
          </NavLink>
          <div className="connection-state">
            <i className={health.isSuccess ? 'connected' : health.isError ? 'disconnected' : ''} />
            {health.isSuccess
              ? 'Conectado a tu espacio'
              : health.isError
                ? 'Sin conexión con el servidor'
                : 'Conectando…'}
          </div>
        </div>
      </aside>
      <div className="app-content">
        <header className="topbar">
          <div className="breadcrumb">
            <Button
              variant="ghost"
              size="icon"
              className="mobile-menu"
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
          <div className="topbar-actions">
            <time className="header-date" dateTime={todayMadrid()}>
              {new Intl.DateTimeFormat('es-ES', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              }).format(new Date(`${todayMadrid()}T12:00:00`))}
            </time>
            <span className="topbar-divider" />
            <Button
              variant="ghost"
              size="icon"
              aria-label={theme === 'light' ? 'Activar modo oscuro' : 'Activar modo claro'}
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            >
              {theme === 'light' ? <Moon /> : <Sun />}
            </Button>
            <span className="profile-avatar" aria-label="Espacio personal">
              M
            </span>
          </div>
        </header>
        <main id="main" tabIndex={-1}>
          <Outlet />
        </main>
        <footer className="app-footer">
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
