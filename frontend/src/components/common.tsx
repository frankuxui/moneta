import { useState } from 'react';
import { AlertCircle, ArrowRight, Inbox, Info } from 'lucide-react';
import {
  autoUpdate,
  offset,
  shift,
  useDismiss,
  useFloating,
  useFocus,
  useHover,
  useInteractions,
  useRole,
} from '@floating-ui/react';
import { periodRange, formatMoney, todayMadrid } from '@moneta/shared';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export function ErrorState({ error, retry }: { error: Error; retry?: () => void }) {
  return (
    <Alert variant="destructive" role="alert">
      <AlertCircle />
      <AlertTitle>No se pudieron cargar los datos</AlertTitle>
      <AlertDescription>
        {error.message}
        {retry && (
          <Button variant="outline" size="sm" onClick={retry}>
            Volver a intentar
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
export function Loading() {
  return (
    <div aria-label="Cargando datos" role="status" className="grid gap-5">
      <div className="grid grid-cols-2 gap-5">
        <Skeleton className="h-36" />
        <Skeleton className="h-36" />
      </div>
      <Skeleton className="h-72" />
      <span className="sr-only">Cargando…</span>
    </div>
  );
}
export function EmptyState({
  title = 'Todavía no hay movimientos',
  description = 'Añade tu primer registro para empezar a conocer tus finanzas.',
  action,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Inbox />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      {action && <EmptyContent>{action}</EmptyContent>}
    </Empty>
  );
}
export function Section({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader className="panel-heading">
        <div>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        {action}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
export function TextLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link className="text-link" to={to}>
      {children}
      <ArrowRight size={14} />
    </Link>
  );
}
export function DateText({ value }: { value: string }) {
  return (
    <time dateTime={value}>
      {new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }).format(
        new Date(`${value}T12:00:00`),
      )}
    </time>
  );
}
export function Money({ value, sign }: { value: string; sign?: '+' | '−' }) {
  return (
    <span className="money">
      {sign}
      {formatMoney(value)}
    </span>
  );
}
export function Hint({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: setOpen,
    whileElementsMounted: autoUpdate,
    middleware: [offset(8), shift({ padding: 12 })],
  });
  const { getReferenceProps, getFloatingProps } = useInteractions([
    useHover(context),
    useFocus(context),
    useDismiss(context),
    useRole(context, { role: 'tooltip' }),
  ]);
  return (
    <>
      <button
        type="button"
        aria-label="Más información"
        ref={refs.setReference}
        {...getReferenceProps()}
        className="hint-trigger"
      >
        <Info size={14} />
      </button>
      {open && (
        <div ref={refs.setFloating} style={floatingStyles} {...getFloatingProps()} className="hint">
          {text}
        </div>
      )}
    </>
  );
}
export function useRange() {
  const [period, setPeriod] = useState<'week' | 'month' | 'year' | 'custom'>('month');
  const [custom, setCustom] = useState(periodRange('month'));
  const range = period === 'custom' ? custom : periodRange(period);
  const valid = range.from !== '' && range.to !== '' && range.from <= range.to;
  return {
    range,
    valid,
    picker: (
      <div className="period-picker">
        <label className="sr-only" htmlFor="period">
          Período
        </label>
        <select
          id="period"
          value={period}
          onChange={(e) => setPeriod(e.target.value as typeof period)}
        >
          <option value="week">Esta semana</option>
          <option value="month">Este mes</option>
          <option value="year">Este año</option>
          <option value="custom">Personalizado</option>
        </select>
        {period === 'custom' && (
          <>
            <Input
              aria-label="Desde"
              type="date"
              value={custom.from}
              max={custom.to || undefined}
              onChange={(e) => setCustom({ ...custom, from: e.target.value })}
            />
            <span>—</span>
            <Input
              aria-label="Hasta"
              type="date"
              value={custom.to}
              min={custom.from || undefined}
              onChange={(e) => setCustom({ ...custom, to: e.target.value })}
            />
          </>
        )}
      </div>
    ),
    query: valid
      ? `from=${range.from}&to=${range.to}`
      : `from=${todayMadrid()}&to=${todayMadrid()}`,
  };
}
