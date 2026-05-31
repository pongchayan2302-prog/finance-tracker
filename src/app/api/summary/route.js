import { supabase } from '@/lib/supabase'

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const month = searchParams.get('month') || new Date().toISOString().slice(0, 7)

  const start = `${month}-01`
  const end = `${month}-31`

  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .gte('date', start)
    .lte('date', end)

  if (error) return Response.json({ error }, { status: 500 })

  const summary = {
    month,
    total_income: 0,
    total_expense: 0,
    ktb: { income: 0, expense: 0, by_category: {} },
    gsb: { income: 0, expense: 0, by_category: {} },
  }

  for (const tx of data) {
    const amt = Number(tx.amount)
    if (tx.type === 'income') {
      summary.total_income += amt
      summary[tx.account].income += amt
    } else {
      summary.total_expense += amt
      summary[tx.account].expense += amt
    }
    if (tx.type === 'expense') {
      const cat = tx.category || 'อื่นๆ'
      summary[tx.account].by_category[cat] = (summary[tx.account].by_category[cat] || 0) + amt
    }
  }

  summary.net = summary.total_income - summary.total_expense
  summary.ktb.net = summary.ktb.income - summary.ktb.expense
  summary.gsb.net = summary.gsb.income - summary.gsb.expense

  return Response.json(summary)
}
