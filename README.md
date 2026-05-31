# Finance Tracker

แอพติดตามรายรับรายจ่าย 2 บัญชี ผ่าน LINE Bot + Dashboard

## Setup

### 1. สร้าง Supabase Table
เข้า Supabase → SQL Editor → วาง schema.sql แล้วกด Run

### 2. ตั้งค่า Environment Variables
copy .env.example เป็น .env แล้วใส่ค่าจริง:
```
SUPABASE_URL=https://nitguupguzclvwqussnx.supabase.co
SUPABASE_ANON_KEY=ใส่ anon key จาก Supabase
GEMINI_API_KEY=ใส่ Gemini API key
LINE_CHANNEL_ID=2010237509
LINE_CHANNEL_SECRET=ใส่ channel secret จาก LINE
LINE_CHANNEL_ACCESS_TOKEN=ใส่ access token จาก LINE
```

### 3. Deploy ขึ้น Vercel
```bash
npm install -g vercel
vercel --prod
```
จะได้ URL เช่น https://finance-tracker-xxx.vercel.app

### 4. ตั้ง Webhook URL ใน LINE
เข้า LINE OA Manager → Settings → Messaging API
ใส่ Webhook URL: https://your-vercel-url.vercel.app/webhook

### 5. ใส่ Environment Variables ใน Vercel
เข้า vercel.com → Project → Settings → Environment Variables
ใส่ค่าเดียวกับ .env ทุกตัว

## การใช้งาน LINE Bot
- ส่งรูปสลิป → Bot อ่านอัตโนมัติ → กด "บันทึก"
- พิมพ์ "สรุป" → ดูยอดเดือนนี้
- เปิด Dashboard → กดลิงก์ที่ Bot ส่งมา
