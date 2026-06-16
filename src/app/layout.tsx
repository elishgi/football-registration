import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'הרשמה לכדורגל', description: 'מערכת הרשמה פשוטה למשחק כדורגל' };
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="he" dir="rtl"><body>{children}</body></html>; }
