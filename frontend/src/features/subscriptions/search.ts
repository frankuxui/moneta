import {
  dateSearchText,
  equivalents,
  moneySearchText,
  type Category,
  type Platform,
  type SubscriptionSummary,
} from '@moneta/shared';

export const frequencyLabels = {
  weekly: 'semana',
  monthly: 'mes',
  quarterly: 'trimestre',
  semiannual: 'semestre',
  annual: 'año',
};
export const statusLabels = { active: 'Activa', paused: 'Pausada', cancelled: 'Cancelada' };
const frequencyNames = {
  weekly: 'semanal',
  monthly: 'mensual',
  quarterly: 'trimestral',
  semiannual: 'semestral',
  annual: 'anual',
};

export function subscriptionSearchData(
  s: SubscriptionSummary,
  platforms: Platform[],
  categories: Category[],
) {
  const equivalent = equivalents(s.amountCents, s.frequency);
  const identity = `${s.name} ${platforms.find((p) => p.id === s.platformId)?.name ?? 'Sin plataforma'} ${s.concept || 'Pago recurrente'} Pagado ${moneySearchText(s.paidCents)} ${s.paymentCount} cobros registrados`;
  const billing = `${moneySearchText(s.amountCents)} por ${frequencyLabels[s.frequency]} ${frequencyNames[s.frequency]} ${s.frequency} Equivalente mensual ${moneySearchText(equivalent.monthlyCents)}`;
  const renewal = `${dateSearchText(s.nextPaymentDate)} ${statusLabels[s.status]} ${s.status}`;
  return {
    identity,
    billing,
    renewal,
    global: [
      identity,
      billing,
      renewal,
      s.description,
      s.notes,
      s.url,
      categories.find((c) => c.id === s.categoryId)?.name ?? 'Sin categoría',
      dateSearchText(s.startDate),
      'Equivalente anual',
      moneySearchText(equivalent.annualCents),
    ].join(' '),
  };
}
