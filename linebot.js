
const line = require('@line/bot-sdk');
const { analyzeSlip } = require('./gemini');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const lineConfig = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
};

const client = new line.Client(lineConfig);

const pendingTransactions = {};

async function handleEvent(event) {
  if (event.type !== 'message') return;

  const userId = event.source.userId;
  const replyToken = event.replyToken;

  if (event.message.type === 'image') {
    await handleImageMessage(userId, replyToken, event.message.id);
  } else if (event.message.type === 'text') {
    await handleTextMessage(userId, replyToken, event.message.text);
  }
}

async function handleImageMessage(userId, replyToken, messageId) {
  try {
    await client.replyMessage(replyToken, {
      type: 'text',
      text: 'กำลังอ่านสลิป...'
    });

    const stream = await client.getMessageContent(messageId);
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    const buffer = Buffer.concat(chunks);
    const base64 = buffer.toString('base64');

    const result = await analyzeSlip(base64, 'image/jpeg');
    console.log('Gemini result:', JSON.stringify(result));

    if (!result) {
      await client.pushMessage(userId, { type: 'text', text: 'Gemini ไม่ตอบกลับครับ' });
      return;
    }

    if (!result.amount) {
      await client.pushMessage(userId, { type: 'text', text: 'Debug: ' + JSON.stringify(result) });
      return;
    }

    pendingTransactions[userId] = result;

    const bankName = result.bank === 'ktb' ? 'กรุงไทย' : result.bank === 'gsb' ? 'ออมสิน' : 'ไม่ทราบ';
    const typeName = result.type === 'income' ? 'เงินเข้า' : 'เงินออก';
    const sign = result.type === 'income' ? '+' : '-';

    await client.pushMessage(userId, {
      type: 'flex',
      altText: `อ่านสลิปได้: ${sign}฿${result.amount?.toLocaleString()}`,
      contents: {
        type: 'bubble',
        body: {
          type: 'box',
          layout: 'vertical',
          spacing: 'md',
          contents: [
            { type: 'text', text: 'ตรวจสอบข้อมูลสลิป', weight: 'bold', size: 'lg' },
            {
              type: 'box', layout: 'vertical', spacing: 'sm',
              contents: [
                { type: 'box', layout: 'horizontal', contents: [
                  { type: 'text', text: 'ธนาคาร', color: '#888888', size: 'sm', flex: 2 },
                  { type: 'text', text: bankName, size: 'sm', flex: 3, weight: 'bold' }
                ]},
                { type: 'box', layout: 'horizontal', contents: [
                  { type: 'text', text: 'ประเภท', color: '#888888', size: 'sm', flex: 2 },
                  { type: 'text', text: typeName, size: 'sm', flex: 3,
                    color: result.type === 'income' ? '#0F9E75' : '#D85A30', weight: 'bold' }
                ]},
                { type: 'box', layout: 'horizontal', contents: [
                  { type: 'text', text: 'จำนวน', color: '#888888', size: 'sm', flex: 2 },
                  { type: 'text', text: `${sign}฿${result.amount?.toLocaleString()}`, size: 'sm', flex: 3,
                    color: result.type === 'income' ? '#0F9E75' : '#D85A30', weight: 'bold' }
                ]},
                { type: 'box', layout: 'horizontal', contents: [
                  { type: 'text', text: 'รายการ', color: '#888888', size: 'sm', flex: 2 },
                  { type: 'text', text: result.description || '-', size: 'sm', flex: 3 }
                ]},
                { type: 'box', layout: 'horizontal', contents: [
                  { type: 'text', text: 'หมวด', color: '#888888', size: 'sm', flex: 2 },
                  { type: 'text', text: result.category_suggest || 'อื่นๆ', size: 'sm', flex: 3 }
                ]}
              ]
            }
          ]
        },
        footer: {
          type: 'box', layout: 'horizontal', spacing: 'sm',
          contents: [
            {
              type: 'button', style: 'primary', color: '#6C63FF',
              action: { type: 'message', label: 'บันทึก', message: 'บันทึก' }
            },
            {
              type: 'button', style: 'secondary',
              action: { type: 'message', label: 'ยกเลิก', message: 'ยกเลิก' }
            }
          ]
        }
      }
    });

  } catch (err) {
    console.error('handleImageMessage error:', err);
    await client.pushMessage(userId, {
      type: 'text', text: 'เกิดข้อผิดพลาด ลองใหม่อีกครั้งครับ'
    });
  }
}

async function handleTextMessage(userId, replyToken, text) {
  const t = text.trim().toLowerCase();

  if (t === 'บันทึก' && pendingTransactions[userId]) {
    const tx = pendingTransactions[userId];
    const { error } = await supabase.from('transactions').insert({
      date: tx.date || new Date().toISOString().split('T')[0],
      amount: tx.amount,
      type: tx.type,
      bank: tx.bank === 'unknown' ? 'ktb' : tx.bank,
      category: tx.category_suggest || 'อื่นๆ',
      description: tx.description,
      raw_text: JSON.stringify(tx)
    });

    delete pendingTransactions[userId];

    if (error) {
      await client.replyMessage(replyToken, { type: 'text', text: 'บันทึกไม่สำเร็จ ลองใหม่ครับ' });
    } else {
      await client.replyMessage(replyToken, {
        type: 'text',
        text: `บันทึกเรียบร้อยแล้วครับ\nดู dashboard ได้ที่ลิงก์ด้านล่าง`
      });
    }

  } else if (t === 'ยกเลิก') {
    delete pendingTransactions[userId];
    await client.replyMessage(replyToken, { type: 'text', text: 'ยกเลิกแล้วครับ' });

  } else if (t === 'สรุป' || t === 'summary') {
    await sendMonthlySummary(userId, replyToken);

  } else {
    await client.replyMessage(replyToken, {
      type: 'text',
      text: 'ส่งรูปสลิปมาได้เลยครับ หรือพิมพ์ "สรุป" เพื่อดูรายเดือน'
    });
  }
}

async function sendMonthlySummary(userId, replyToken) {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

  const { data } = await supabase
    .from('transactions')
    .select('*')
    .gte('date', firstDay)
    .lte('date', lastDay);

  if (!data || data.length === 0) {
    await client.replyMessage(replyToken, { type: 'text', text: 'ยังไม่มีรายการเดือนนี้ครับ' });
    return;
  }

  const ktbIn = data.filter(t => t.bank === 'ktb' && t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const ktbOut = data.filter(t => t.bank === 'ktb' && t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
  const gsbIn = data.filter(t => t.bank === 'gsb' && t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const gsbOut = data.filter(t => t.bank === 'gsb' && t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);

  const monthName = now.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });

  await client.replyMessage(replyToken, {
    type: 'text',
    text: `สรุป ${monthName}\n\nกรุงไทย\n เข้า: +฿${ktbIn.toLocaleString()}\n ออก: -฿${ktbOut.toLocaleString()}\n สุทธิ: ฿${(ktbIn - ktbOut).toLocaleString()}\n\nออมสิน\n เข้า: +฿${gsbIn.toLocaleString()}\n ออก: -฿${gsbOut.toLocaleString()}\n สุทธิ: ฿${(gsbIn - gsbOut).toLocaleString()}\n\nรวมทั้งหมด: ฿${(ktbIn + gsbIn - ktbOut - gsbOut).toLocaleString()}`
  });
}

module.exports = { handleEvent, lineConfig };
