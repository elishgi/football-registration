'use client';
import { cancelSignup } from '@/lib/data';
import { paymentLabels, playerTypeLabel } from '@/lib/labels';
import type { RankedLists } from '@/lib/types';

export function SignupLists({ lists, eventId, maxPlayers }: { lists: RankedLists; eventId: string; maxPlayers: number }) {
  const Row = ({ s, i }: { s: RankedLists['active'][number]; i: number }) => (
    <li className="player-row"><span><b>{i + 1}. {s.player_name}</b><small>{playerTypeLabel(s.is_regular)} — {paymentLabels[s.payment_status]}</small></span><button className="ghost danger" onClick={async()=>{ if(confirm(`האם לבטל את ההגעה של ${s.player_name}?`)) { await cancelSignup(s.id,eventId); location.reload(); }}}>בטל הגעה</button></li>
  );
  return <div className="lists"><section className="card"><h2>✅ בפנים {lists.active.length}/{maxPlayers}</h2><ol>{lists.active.map((s,i)=><Row key={s.id} s={s} i={i}/>)}</ol>{!lists.active.length && <p>עדיין אין נרשמים.</p>}</section><section className="card"><h2>⏳ ממתינים {lists.waiting.length}</h2><ol>{lists.waiting.map((s,i)=><Row key={s.id} s={s} i={i}/>)}</ol>{!lists.waiting.length && <p>אין ממתינים.</p>}</section></div>;
}
