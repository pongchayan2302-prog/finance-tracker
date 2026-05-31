console.log('gemini.js loaded v2');

async function analyzeSlip(imageBase64, mimeType = 'image/jpeg') {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    console.log('ERROR: GEMINI_API_KEY not set');
    return null;
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const prompt = `คุณคือผู้ช่วยอ่านสลิปธนาคารไทย วิเคราะห์รูปสลิปนี้และตอบกลับเป็น JSON เท่านั้น ห้ามมีข้อความอื่นนอกจาก JSON

ตอบในรูปแบบนี้เท่านั้น:
{"bank":"ktb","type":"expense","amount":183,"date":"2026-05-29","description":"FUFU MALATANG","category_suggest":"ของกิน"}

กฎ:
- bank: "ktb" (กรุงไทย สีน้ำเงิน), "gsb" (ออมสิน สีเขียว), "unknown"
- type: "expense" (จ่ายออก), "income" (รับเงิน)
- amount: ตัวเลขจำนวนเงินหลัก ไม่รวมค่าธรรมเนียม
- date: YYYY-MM-DD
- description: ชื่อร้านหรือรายการ
- category_suggest: ของกิน/เดินทาง/ช้อปปิ้ง/ลงทุน/ธุรกิจ/รายได้/อื่นๆ`;

  const body = {
    contents: [{
      parts: [
        { text: prompt },
        { inline_data: { mime_type: mimeType, data: imageBase64 } }
      ]
    }],
    generationConfig: { temperature: 0.1, maxOutputTokens: 200 }
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = await res.json();
    console.log('Gemini status:', res.status);
    
    if (data.error) {
      console.log('Gemini API error:', data.error.message);
      return null;
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    console.log('Gemini text:', text.slice(0, 300));
    
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);
    console.log('Parsed OK:', JSON.stringify(parsed));
    return parsed;
  } catch (err) {
    console.log('Gemini fetch error:', err.message);
    return null;
  }
}

module.exports = { analyzeSlip };
