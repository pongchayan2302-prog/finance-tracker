import { supabase } from '@/lib/supabase'

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const month = searchParams.get('month')
  const account = searchParams.get('account')
  const type = searchParams.get('type')

  let query = supabase.from('transactions').select('*').order('date', { ascending: false })

  if (month) {
    const start = `${month}-01`
    const end = `${month}-31`
    query = query.gte('date', start).lte('date', end)
  }
  if (account) query = query.eq('account', account)
  if (type) query = query.eq('type', type)

  const { data, error } = await query
  if (error) return Response.json({ error }, { status: 500 })
  return Response.json(data)
}

export async function POST(req) {
  const body = await req.json()
  const { data, error } = await supabase.from('transactions').insert(body).select()
  if (error) return Response.json({ error }, { status: 500 })
  return Response.json(data[0])
}

export async function PUT(req) {
  const body = await req.json()
  const { id, ...updates } = body
  const { data, error } = await supabase.from('transactions').update(updates).eq('id', id).select()
  if (error) return Response.json({ error }, { status: 500 })
  return Response.json(data[0])
}

export async function DELETE(req) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  const { error } = await supabase.from('transactions').delete().eq('id', id)
  if (error) return Response.json({ error }, { status: 500 })
  return Response.json({ success: true })
}
