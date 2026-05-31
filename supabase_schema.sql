-- รัน SQL นี้ใน Supabase → SQL Editor

create table transactions (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default now(),
  date date not null,
  amount numeric not null,
  type text not null check (type in ('income', 'expense')),
  account text not null check (account in ('ktb', 'gsb')),
  category text,
  note text,
  slip_url text
);

create table categories (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  account text check (account in ('ktb', 'gsb', 'both')),
  created_at timestamp with time zone default now()
);

create table budgets (
  id uuid default gen_random_uuid() primary key,
  account text check (account in ('ktb', 'gsb')),
  category text,
  limit_amount numeric not null,
  month text not null,
  created_at timestamp with time zone default now()
);

-- Default categories
insert into categories (name, account) values
  ('เงินเดือน', 'ktb'),
  ('ของกิน', 'ktb'),
  ('เดินทาง', 'ktb'),
  ('ช้อปปิ้ง', 'ktb'),
  ('รายได้ธุรกิจ', 'gsb'),
  ('ลงทุน', 'gsb'),
  ('Amway', 'gsb'),
  ('อื่นๆ', 'both');
