import type { PaymentStatus, SignupStatus } from './types';
export const paymentLabels: Record<PaymentStatus, string> = {
  PENDING: 'ממתין לאישור תשלום', PAID_MONTHLY: 'התשלום התקבל', PAID_SINGLE: 'התשלום התקבל', UNPAID_AFTER_DEADLINE: 'לא שולם בזמן'
};
export const statusLabels: Record<SignupStatus, string> = { ACTIVE: 'בפנים', WAITING: 'ממתין', CANCELLED: 'מבוטל' };
export const playerTypeLabel = (isRegular: boolean) => (isRegular ? 'קבוע' : 'לא קבוע');
