import type { Event, PaymentStatus, RankedLists, Signup } from './types';

export function isPaid(status: PaymentStatus) { return status === 'PAID_MONTHLY' || status === 'PAID_SINGLE'; }
export function deadlineDate(event: Event) { return new Date(`${event.game_date}T${event.payment_deadline}:00`); }
export function isAfterPaymentDeadline(event: Event, now = new Date()) { return now >= deadlineDate(event); }

function priority(signup: Signup, afterDeadline: boolean) {
  if (!afterDeadline) return signup.is_regular ? 0 : 1;
  if (signup.is_regular && isPaid(signup.payment_status)) return 0;
  if (!signup.is_regular && isPaid(signup.payment_status)) return 1;
  if (signup.is_regular) return 2;
  return 3;
}

export function rankSignups(event: Event, signups: Signup[], now = new Date()): RankedLists {
  const max = event.max_players || 15;
  const after = isAfterPaymentDeadline(event, now);
  const cancelled = signups.filter((s) => s.cancelled_at || s.status === 'CANCELLED');
  const ranked = signups
    .filter((s) => !s.cancelled_at && s.status !== 'CANCELLED')
    .sort((a, b) => priority(a, after) - priority(b, after) || new Date(a.registered_at).getTime() - new Date(b.registered_at).getTime() || a.player_name.localeCompare(b.player_name, 'he'));
  return { active: ranked.slice(0, max), waiting: ranked.slice(max), cancelled };
}

export function positionForSignup(lists: RankedLists, signupId: string) {
  const activeIndex = lists.active.findIndex((s) => s.id === signupId);
  if (activeIndex >= 0) return { status: 'ACTIVE' as const, position: activeIndex + 1 };
  const waitingIndex = lists.waiting.findIndex((s) => s.id === signupId);
  if (waitingIndex >= 0) return { status: 'WAITING' as const, position: waitingIndex + 1 };
  return null;
}
