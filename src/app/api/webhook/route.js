import { Client, middleware } from '@line/bot-sdk'
import { supabase } from '@/lib/supabase'

const config = {
  channelSecret: process.env.LINE_CHANNEL_SECRET,
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
}

const client = new Client(config)

export const runtime = 'nodejs'

export async function POST(req) {
  const body = await req.json()
  const events = body.events || []

  for (const event of events) {
    if (event.type === 'message') {
      const userId = event.source.userId
      const replyToken = event.replyToken

      if (event.message.type === 'image') {
        await handleImage(event.message.id, replyToken, userId)
      } else if (event.message.type === 'text') {
        await handleText(event.message.text, replyToken, userId)
      }
    }
  }

  return Response.json({ status: 'ok' })
}

async function handleImage(messageId, replyToken, userId) {
  try {
    const imageBuffer = await client.getMessageContent(messageId)
    const chunks = []
    for await (const chunk of imageBuffer) chunks.push(chunk)
    const base64 = Buffer.concat(chunks).toString('base64')

    const result = await analyzeSlipWithGemini(base64)

    if (!result) {
      await client.replyMessage(replyToken, {
        type: 'text',
        text: 'ไม่สามารถอ่านสลิปได้ครับ ลองส่งใหม่อีกครั้ง'
      })
      return
    }

    const { data: categories } = await supabase
      .from('categories')
      .select('name')
      .or(`account.eq.${result.account},account.eq.both`)

    const catList = categories.map(c => c.name).join(', ')

    await client.replyMessage(replyToken, [
      {
        type: 'text',
        text: `📋 อ่านสลิปได้แล้วครับ\n\n` +
          `ธนาคาร: ${result.account === 'ktb' ? 'กรุงไทย' : 'ออมสิน'}\n` +
          `ประเภท: ${result.type === 'income' ? '💚 เงินเข้า' : '🔴 เงินออก'}\n` +
          `จำนวน: ฿${Number(result.amount).toLocaleString()}\n` +
          `วันที่: ${result.date}\n\n` +
          `หมวดที่แนะนำ: ${result.category}\n` +
          `หมวดทั้งหมด: ${catList}\n\n` +
          `พิมพ์ยืนยัน เพื่อบันทึก\nหรือพิมพ์ชื่อหมวดอื่นเพื่อเปลี่ยน`
      }
    ])

    await supabase.from('pending_transactions').upsert({
      user_id: userId,
      data: result,
      created_at: new Date().toISOString()
    })

  } catch (err) {
    console.error(err)
    await client.replyMessage(replyToken, {
      type: 'text',
      text: 'เกิดข้อผิดพลาดครับ ลองใหม่อีกครั้ง'
    })
  }
}

async function handleText(text, replyToken, userId) {
  const normalized = text.trim().toLowerCase()

  if (normalized === 'ยืนยัน') {
    const { data: pending } = await supabase
      .from('pending_transactions')
      .select('data')
      .eq('user_id', userId)
      .single()

    if (!pending) {
      await client.replyMessage(replyToken, {
        type: 'text', text: 'ไม่มีรายการรอยืนยันครับ'
      })
      return
    }

    await supabase.from('transactions').insert(pending.data)
    await supabase.from('pending_transactions').delete().eq('user_id', userId)

    await client.replyMessage(replyToken, {
      type: 'text',
      text: `✅ บันทึกแล้วครับ\n${pending.data.type === 'income' ? '💚' : '🔴'} ${pending.data.type === 'income' ? '+' : '-'}฿${Number(pending.data.amount).toLocaleString()} (${pending.data.category})`
    })
    return
  }

  const { data: pending } = await supabase
    .from('pending_transactions')
    .select('data')
    .eq('user_id', userId)
    .single()

  if (pending) {
    const updated = { ...pending.data, category: text.trim() }
    await supabase.from('pending_transactions').upsert({
      user_id: userId, data: updated
    })
    await client.replyMessage(replyToken, {
      type: 'text',
      text: `เปลี่ยนหมวดเป็น "${text.trim()}" แล้วครับ\nพิมพ์ "ยืนยัน" เพื่อบันทึก`
    })
    return
  }

  await client.replyMessage(replyToken, {
    type: 'text',
    text: 'ส่งรูปสลิปมาได้เลยครับ แล้วผมจะอ่านให้อัตโนมัติ 📷'
  })
}

async function analyzeSlipWithGemini(base64Image) {
  const prompt = `วิเคราะห์สลิปธนาคารนี้และตอบเป็น JSON เท่านั้น ไม่ต้องมีข้อความอื่น:
{
  "account": "ktb หรือ gsb (ดูจากสีและโลโก้: กรุงไทย=ktb, ออมสิน=gsb)",
  "type": "income หรือ expense (เงินเข้า=income, เงินออก=expense)",
  "amount": "จำนวนเงินเป็นตัวเลขเท่านั้น",
  "date": "วันที่ format YYYY-MM-DD",
  "note": "ชื่อร้านหรือรายละเอียดการโอน",
  "category": "หมวดที่เหมาะสม เช่น ของกิน เดินทาง ลงทุน Amway รายได้ธุรกิจ เงินเดือน อื่นๆ"
}`

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            { inline_data: { mime_type: 'image/jpeg', data: base64Image } }
          ]
        }]
      })
    }
  )

  const data = await response.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
  const clean = text.replace(/```json|```/g, '').trim()

  try {
    return JSON.parse(clean)
  } catch {
    return null
  }
}
