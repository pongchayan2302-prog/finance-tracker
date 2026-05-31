require('dotenv').config();
const express = require('express');
const line = require('@line/bot-sdk');
const { createClient } = require('@supabase/supabase-js');
const { handleEvent, lineConfig } = require('./linebot');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

app.use(express.json({
  verify: (req, res, buf) => { req.rawBody = buf; }
}));
app.use(express.static(path.join(__dirname, 'public')));

app.post('/webhook', async (req, res) => {
  try {
    const crypto = require('crypto');
    const signature = req.headers['x-line-signature'];
    const body = req.rawBody;
    const hash = crypto
      .createHmac('sha256', process.env.LINE_CHANNEL_SECRET)
      .update(body)
      .digest('base64');
    if (hash !== signature) {
      return res.status(400).json({ error: 'Invalid signature' });
    }
    const events = req.body.events || [];
    await Promise.all(events.map(handleEvent));
    res.json({ status: 'ok' });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/transactions', async (req, res) => {
  const { month, year, bank } = req.query;
  let query = supabase.from('transactions').select('*').order('date', { ascending: false });

  if (month && year) {
    const firstDay = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).toISOString().split('T')[0];
    query = query.gte('date', firstDay).lte('date', lastDay);
  }
  if (bank) query = query.eq('bank', bank);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error });
  res.json(data);
});

app.get('/api/summary', async (req, res) => {
  const { month, year } = req.query;
  const m = month || new Date().getMonth() + 1;
  const y = year || new Date().getFullYear();
  const firstDay = `${y}-${String(m).padStart(2, '0')}-01`;
  const lastDay = new Date(y, m, 0).toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .gte('date', firstDay)
    .lte('date', lastDay);

  if (error) return res.status(500).json({ error });

  const summary = {
    ktb: { income: 0, expense: 0, categories: {} },
    gsb: { income: 0, expense: 0, categories: {} },
    total: { income: 0, expense: 0 }
  };

  data.forEach(tx => {
    const bank = tx.bank;
    const amt = Number(tx.amount);
    if (tx.type === 'income') {
      summary[bank].income += amt;
      summary.total.income += amt;
    } else {
      summary[bank].expense += amt;
      summary.total.expense += amt;
      if (!summary[bank].categories[tx.category]) summary[bank].categories[tx.category] = 0;
      summary[bank].categories[tx.category] += amt;
    }
  });

  res.json(summary);
});

app.get('/api/categories', async (req, res) => {
  const { data, error } = await supabase.from('categories').select('*');
  if (error) return res.status(500).json({ error });
  res.json(data);
});

app.post('/api/categories', async (req, res) => {
  const { name, bank } = req.body;
  const { data, error } = await supabase.from('categories').insert({ name, bank }).select();
  if (error) return res.status(500).json({ error });
  res.json(data[0]);
});

app.patch('/api/transactions/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const { data, error } = await supabase.from('transactions').update(updates).eq('id', id).select();
  if (error) return res.status(500).json({ error });
  res.json(data[0]);
});

app.delete('/api/transactions/:id', async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.from('transactions').delete().eq('id', id);
  if (error) return res.status(500).json({ error });
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Dashboard: http://localhost:${PORT}`);
  console.log(`Webhook: http://localhost:${PORT}/webhook`);
});
