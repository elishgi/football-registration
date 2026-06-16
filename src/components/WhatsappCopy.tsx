'use client';
import { paymentLabels, playerTypeLabel } from '@/lib/labels';
import type { Event, RankedLists, Signup } from '@/lib/types';
export function WhatsappCopy({ event, lists }: { event: Event; lists: RankedLists }) {
  async function copy(){ const line=(s:Signup,i:number)=>`${i+1}. ${s.player_name} — ${playerTypeLabel(s.is_regular)} — ${paymentLabels[s.payment_status]}`; const text=`⚽ הרשמה לכדורגל — ${event.title} ${event.game_time}\n\n✅ בפנים ${lists.active.length}/${event.max_players}:\n${lists.active.map(line).join('\n')}\n\n⏳ ממתינים:\n${lists.waiting.map(line).join('\n') || 'אין ממתינים'}`; await navigator.clipboard.writeText(text); alert('הרשימה הועתקה לוואטסאפ'); }
  return <button className="primary" onClick={copy}>העתק רשימה לוואטסאפ</button>;
}
