'use server';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { getSupabaseAdmin } from './supabase';
import { rankSignups, positionForSignup } from './ranking';
import type { Event, PaymentStatus, RegularPlayer, Signup } from './types';

const ADMIN_COOKIE = 'football_admin';
const cleanName = (name: string) => name.trim().replace(/\s+/g, ' ');
async function db() { return getSupabaseAdmin(); }

export async function isAdmin() { return (await cookies()).get(ADMIN_COOKIE)?.value === process.env.ADMIN_PASSWORD && Boolean(process.env.ADMIN_PASSWORD); }
export async function loginAdmin(formData: FormData) {
  const password = String(formData.get('password') || '');

  if (!process.env.ADMIN_PASSWORD || password !== process.env.ADMIN_PASSWORD) {
    return { ok: false, message: 'סיסמת מנהל שגויה' };
  }

  (await cookies()).set(ADMIN_COOKIE, password, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 30,
  });

  revalidatePath('/admin');

  return { ok: true, message: 'התחברת בהצלחה' };
}

export async function fetchActiveEvent() { const s = await db(); const { data } = await s.from('events').select('*').order('game_date', { ascending: true }).limit(1).maybeSingle(); return data as Event | null; }
export async function fetchRegularPlayers() { const s = await db(); const { data } = await s.from('regular_players').select('*').eq('is_active', true).order('name'); return (data || []) as RegularPlayer[]; }
export async function fetchSignups(eventId: string) { const s = await db(); const { data } = await s.from('signups').select('*').eq('event_id', eventId).order('registered_at'); return (data || []) as Signup[]; }
export async function fetchEventState(eventId?: string) { const event = eventId ? await (async () => { const s = await db(); const { data } = await s.from('events').select('*').eq('id', eventId).single(); return data as Event; })() : await fetchActiveEvent(); if (!event) return null; await recalculateEventSignups(event.id); const [regulars, signups] = await Promise.all([fetchRegularPlayers(), fetchSignups(event.id)]); return { event, regulars, lists: rankSignups(event, signups), signups }; }

async function syncRegularPlayersForEvent(eventId: string) {
  const s = await db();
  const [{ data: regulars }, { data: signups }] = await Promise.all([
    s.from('regular_players').select('*').order('created_at'),
    s.from('signups').select('*').eq('event_id', eventId),
  ]);
  const regularPlayers = (regulars || []) as RegularPlayer[];
  const eventSignups = (signups || []) as Signup[];
  const now = new Date().toISOString();

  await Promise.all(regularPlayers.map(async (regular) => {
    const existing = eventSignups
      .filter((signup) => signup.regular_player_id === regular.id)
      .sort((a, b) => new Date(b.registered_at).getTime() - new Date(a.registered_at).getTime())[0];

    if (!regular.is_active) {
      if (existing && existing.status !== 'CANCELLED') {
        await s.from('signups').update({ status: 'CANCELLED', cancelled_at: existing.cancelled_at || now, updated_at: now }).eq('id', existing.id);
      }
      return;
    }

    if (existing && existing.status !== 'CANCELLED' && !existing.cancelled_at) {
      if (existing.player_name !== regular.name || !existing.is_regular) {
        await s.from('signups').update({ player_name: regular.name, is_regular: true, updated_at: now }).eq('id', existing.id);
      }
      return;
    }

    await s.from('signups').insert({
      event_id: eventId,
      player_name: regular.name,
      regular_player_id: regular.id,
      is_regular: true,
      status: 'WAITING',
      payment_status: 'PENDING',
      registered_at: regular.created_at || now,
    });
  }));
}

export async function recalculateEventSignups(eventId: string) {
  const s = await db(); await syncRegularPlayersForEvent(eventId); const state = await fetchEventStateRaw(eventId); if (!state) throw new Error('אירוע לא נמצא');
  const lists = rankSignups(state.event, state.signups); const active = new Set(lists.active.map(x => x.id)); const waiting = new Set(lists.waiting.map(x => x.id));
  await Promise.all(state.signups.map((x) => s.from('signups').update({ status: active.has(x.id) ? 'ACTIVE' : waiting.has(x.id) ? 'WAITING' : 'CANCELLED', payment_status: lists.active.concat(lists.waiting).some(y => y.id === x.id) && x.payment_status === 'PENDING' && new Date() >= new Date(`${state.event.game_date}T${state.event.payment_deadline}:00`) ? 'UNPAID_AFTER_DEADLINE' : x.payment_status, updated_at: new Date().toISOString() }).eq('id', x.id)));
  revalidatePath('/'); revalidatePath(`/game/${eventId}`); revalidatePath('/admin'); return lists;
}
async function fetchEventStateRaw(eventId: string) { const s = await db(); const [{ data: event }, { data: signups }] = await Promise.all([s.from('events').select('*').eq('id', eventId).single(), s.from('signups').select('*').eq('event_id', eventId)]); return event ? { event: event as Event, signups: (signups || []) as Signup[] } : null; }

export async function signupPlayer(_: unknown, formData: FormData) {
  const schema = z.object({ eventId: z.string().uuid(), mode: z.enum(['regular', 'guest']), regularPlayerId: z.string().optional(), playerName: z.string().optional() }); const v = schema.parse(Object.fromEntries(formData));
  const s = await db(); const { data: event } = await s.from('events').select('*').eq('id', v.eventId).single(); if (!event?.is_open) return { ok: false, message: 'ההרשמה סגורה.' };
  let name = cleanName(v.playerName || ''); let regularId: string | null = null; let isRegular = false;
  if (v.mode === 'regular') { if (!v.regularPlayerId) return { ok: false, message: 'יש לבחור שחקן קבוע מהרשימה.' }; const { data: rp } = await s.from('regular_players').select('*').eq('id', v.regularPlayerId).single(); if (!rp) return { ok: false, message: 'יש לבחור שחקן קבוע מהרשימה.' }; name = rp.name; regularId = rp.id; isRegular = true; }
  if (!name) return { ok: false, message: 'יש להזין שם.' };
  const { data: duplicate } = await s.from('signups').select('id').eq('event_id', v.eventId).eq('player_name', name).is('cancelled_at', null).neq('status', 'CANCELLED').maybeSingle();
  if (duplicate) return { ok: false, message: isRegular ? 'השחקן הזה כבר רשום למשחק.' : 'השם הזה כבר רשום למשחק. נא לכתוב שם ייחודי יותר, לדוגמה שם פרטי + משפחה.' };
  const { data: inserted, error } = await s.from('signups').insert({ event_id: v.eventId, player_name: name, regular_player_id: regularId, is_regular: isRegular, status: 'WAITING', payment_status: 'PENDING' }).select('*').single(); if (error) return { ok: false, message: 'אירעה שגיאה, נסה שוב.' };
  await recalculateEventSignups(v.eventId); const state = await fetchEventStateRaw(v.eventId); const pos = positionForSignup(rankSignups(event as Event, state?.signups || []), inserted.id); return { ok: true, message: 'נרשמת בהצלחה', signupId: inserted.id, result: pos };
}
export async function cancelSignup(signupId: string, eventId: string) { const s = await db(); await s.from('signups').update({ status: 'CANCELLED', cancelled_at: new Date().toISOString() }).eq('id', signupId); await recalculateEventSignups(eventId); return { ok: true, message: 'המשתתף סומן כמבוטל' }; }
export async function saveEvent(formData: FormData) { if (!await isAdmin()) return { ok: false, message: 'אין הרשאת מנהל' }; const s = await db(); const payload = { title: String(formData.get('title') || 'כדורגל יום שני'), game_date: String(formData.get('game_date')), game_time: String(formData.get('game_time') || '20:00'), max_players: Number(formData.get('max_players') || 15), payment_deadline: String(formData.get('payment_deadline') || '17:00'), is_open: formData.get('is_open') === 'on' }; const id = String(formData.get('id') || ''); if (id) { await s.from('events').update(payload).eq('id', id); await recalculateEventSignups(id); } else { const { data: event } = await s.from('events').insert(payload).select('id').single(); if (event?.id) await recalculateEventSignups(event.id); } revalidatePath('/admin'); revalidatePath('/'); return { ok: true, message: 'המשחק נשמר' }; }
export async function addRegular(formData: FormData) { if (!await isAdmin()) return { ok: false, message: 'אין הרשאת מנהל' }; const name = cleanName(String(formData.get('name') || '')); if (!name) return { ok: false, message: 'יש להזין שם' }; const s = await db(); await s.from('regular_players').insert({ name }); const { data: events } = await s.from('events').select('id'); await Promise.all((events || []).map((event) => recalculateEventSignups(event.id))); revalidatePath('/admin'); return { ok: true, message: 'קבוע נוסף' }; }
export async function updateRegular(formData: FormData) { if (!await isAdmin()) return; const s = await db(); await s.from('regular_players').update({ name: cleanName(String(formData.get('name'))) }).eq('id', String(formData.get('id'))); const { data: events } = await s.from('events').select('id'); await Promise.all((events || []).map((event) => recalculateEventSignups(event.id))); revalidatePath('/admin'); }
export async function deleteRegular(id: string) { if (!await isAdmin()) return; const s = await db(); await s.from('regular_players').update({ is_active: false }).eq('id', id); const { data: events } = await s.from('events').select('id'); await Promise.all((events || []).map((event) => recalculateEventSignups(event.id))); revalidatePath('/admin'); }
export async function updatePayment(signupId: string, eventId: string, payment_status: PaymentStatus) { if (!await isAdmin()) return; const s = await db(); await s.from('signups').update({ payment_status }).eq('id', signupId); await recalculateEventSignups(eventId); }
