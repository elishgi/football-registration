'use client';
import { useActionState, useState } from 'react';
import { signupPlayer } from '@/lib/data';
import type { RegularPlayer } from '@/lib/types';

export function SignupForm({ eventId, regulars }: { eventId: string; regulars: RegularPlayer[] }) {
  const [mode,setMode]=useState<'regular'|'guest'>('regular');
  const [state, action, pending] = useActionState(signupPlayer, null);
  return <section className="card"><h2>אני מגיע</h2><div className="segmented"><button type="button" className={mode==='regular'?'active':''} onClick={()=>setMode('regular')}>אני שחקן קבוע</button><button type="button" className={mode==='guest'?'active':''} onClick={()=>setMode('guest')}>אני לא קבוע</button></div><form action={action}><input type="hidden" name="eventId" value={eventId}/><input type="hidden" name="mode" value={mode}/>{mode==='regular'?<label>בחר שם מהרשימה:<select name="regularPlayerId" defaultValue=""><option value="">בחר שחקן</option>{regulars.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></label>:<label>השם שלך:<input name="playerName" placeholder="שם פרטי + משפחה"/></label>}<button disabled={pending} className="primary">אני מגיע</button></form>{state?.message && <p className={state.ok?'success':'error'}>{state.message}{state.ok && state.result ? <><br/>הסטטוס שלך: {state.result.status==='ACTIVE'?'בפנים':'ממתין'}<br/>{state.result.status==='ACTIVE'?`המיקום שלך: ${state.result.position} מתוך 15`:`המיקום שלך בממתינים: ${state.result.position}`}</>:null}</p>}</section>
}
