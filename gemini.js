const fetch = require('node-fetch');

async function analyzeSlip(imageBase64, mimeType = 'image/jpeg') {
  const apiKey = process.env.GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const prompt = `คุณคือผู้ช่วยอ่านสลิปธนาคารไทย วิเคราะห์รูปสลิปนี้และตอบกลับเป็น JSON เท่านั้น ห้ามมีข้อความอื่น

ให้ตอบในรูปแบบนี้:
{
  "bank": "ktb" หรือ "gsb" หรือ "unknown",
  "type": "income" หรือ "expense",
  "amount": ตัวเลขจำนวนเงิน (ไม่มีเครื่องหมาย),
  "date": "YYYY-MM-DD" หรือ null,
  "description": "รายละเอียดสั้นๆ เช่น ชื่อร้าน หรือ รายการโอน",
  "category_suggest": "หมวดที่แนะนำ เช่น ของกิน/เดินทาง/ลงทุน/รายได้/อื่นๆ",
  "confidence": "high" หรือ "low"
}

วิธีแยกธนาคาร:
- กรุงไทย (KTB): สีน้ำเงิน โลโก้นกเป็ด
- ออมสิน (GSB): สีเขียว โลโก้กระปุก
- ถ้าไม่แน่ใจให้ใส่ "unknown"

วิธีแยกประเภท:
- income = เงินเข้า รับโอน
- expense = เงินออก จ่าย โอนออก`;

  const body = {
    contents: [{
      parts: [
        { text: prompt },
        {
          inline_data: {
            mime_type: mimeType,
            data: imageBase64
          }
        }
      ]
    }],
    generationConfig: { temperature: 0.1 }
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  const data = await res.json();
  console.log('Gemini raw response:', JSON.stringify(data).slice(0, 500));
  
  if (data.error) {
    console.log('Gemini error:', data.error.message);
    return null;
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  console.log('Gemini text:', text.slice(0, 200));
  const clean = text.replace(/```json|```/g, '').trim();

  try {
    return JSON.parse(clean);
  } catch {
    console.log('JSON parse failed:', clean.slice(0, 100));
    return null;
  }
}

module.exports = { analyzeSlip };
