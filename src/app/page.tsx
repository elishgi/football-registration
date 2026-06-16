import { redirect } from 'next/navigation';
import { fetchActiveEvent } from '@/lib/data';
export default async function Home(){ const event=await fetchActiveEvent(); if(event) redirect(`/game/${event.id}`); return <main><section className="hero"><h1>⚽ הרשמה לכדורגל</h1><p>עדיין לא נפתח משחק. מנהל יכול לפתוח משחק בדף הניהול.</p><a href="/admin">כניסה למנהל</a></section></main> }
