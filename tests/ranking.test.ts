import { describe, expect, it } from 'vitest';
import { rankSignups } from '../src/lib/ranking';
import type { Event, Signup } from '../src/lib/types';
const event: Event = { id:'00000000-0000-0000-0000-000000000001', title:'משחק', game_date:'2026-06-16', game_time:'20:00', max_players:15, payment_deadline:'17:00', is_open:true };
const s=(i:number, regular=false, payment='PENDING'): Signup => ({ id:String(i), event_id:event.id, player_name:`שחקן ${i}`, regular_player_id:null, is_regular:regular, registered_at:`2026-06-16T10:${String(i).padStart(2,'0')}:00Z`, cancelled_at:null, status:'WAITING', payment_status:payment as Signup['payment_status'] });
describe('rankSignups',()=>{
 it('keeps fewer than max all active and no waiting',()=>{ const lists=rankSignups(event, Array.from({length:10},(_,i)=>s(i+1)), new Date('2026-06-16T12:00:00')); expect(lists.active).toHaveLength(10); expect(lists.waiting).toHaveLength(0); });
 it('puts 16th guest on waiting list',()=>{ const lists=rankSignups(event, Array.from({length:16},(_,i)=>s(i+1)), new Date('2026-06-16T12:00:00')); expect(lists.active).toHaveLength(15); expect(lists.waiting[0].id).toBe('16'); });
 it('regular number 16 replaces least-priority guest before deadline',()=>{ const signups=Array.from({length:15},(_,i)=>s(i+1,false)).concat(s(16,true)); const lists=rankSignups(event, signups, new Date('2026-06-16T12:00:00')); expect(lists.active.map(x=>x.id)).toContain('16'); expect(lists.waiting[0].id).toBe('15'); });
 it('after deadline paid players outrank unpaid players',()=>{ const signups=Array.from({length:15},(_,i)=>s(i+1,true,'PENDING')).concat(s(16,false,'PAID_SINGLE')); const lists=rankSignups(event, signups, new Date('2026-06-16T18:00:00')); expect(lists.active.map(x=>x.id)).toContain('16'); expect(lists.waiting[0].id).toBe('15'); });
 it('cancelled players are excluded and best waiting enters',()=>{ const signups=Array.from({length:16},(_,i)=>s(i+1)); signups[0].status='CANCELLED'; signups[0].cancelled_at='2026-06-16T11:00:00Z'; const lists=rankSignups(event, signups, new Date('2026-06-16T12:00:00')); expect(lists.active).toHaveLength(15); expect(lists.waiting).toHaveLength(0); expect(lists.active.map(x=>x.id)).toContain('16'); });
});
