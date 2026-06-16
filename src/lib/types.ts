export type SignupStatus = 'ACTIVE' | 'WAITING' | 'CANCELLED';
export type PaymentStatus = 'PENDING' | 'PAID_MONTHLY' | 'PAID_SINGLE' | 'UNPAID_AFTER_DEADLINE';

export type Event = {
  id: string;
  title: string;
  game_date: string;
  game_time: string;
  max_players: number;
  payment_deadline: string;
  is_open: boolean;
  created_at?: string;
  updated_at?: string;
};

export type RegularPlayer = { id: string; name: string; is_active: boolean; created_at?: string; updated_at?: string };

export type Signup = {
  id: string;
  event_id: string;
  player_name: string;
  regular_player_id: string | null;
  is_regular: boolean;
  registered_at: string;
  cancelled_at: string | null;
  status: SignupStatus;
  payment_status: PaymentStatus;
  created_at?: string;
  updated_at?: string;
};

export type RankedLists = { active: Signup[]; waiting: Signup[]; cancelled: Signup[] };
