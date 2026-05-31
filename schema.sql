create table transactions (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default now(),
  date date not null,
  amount numeric not null,
  type text not null check (type in ('income', 'expense')),
  bank text not null check (bank in ('ktb', 'gsb')),
  category text,
  description text,
  raw_text text
);

create table categories (
  id uuid default gen_random_uuid() primary key,
  name text not null unique,
  bank text check (bank in ('ktb', 'gsb', 'both'))
);

insert into categories (name, bank) values
  ('ของกิน', 'ktb'),
  ('เดินทาง', 'ktb'),
  ('ช้อปปิ้ง', 'ktb'),
  ('ลงทุน', 'gsb'),
  ('ธุรกิจ', 'gsb'),
  ('รายได้', 'both'),
  ('อื่นๆ', 'both');
