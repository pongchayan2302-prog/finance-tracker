async function analyzeSlip(imageBase64, mimeType) {
  if (!mimeType) mimeType = 'image/jpeg';
  var apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.log('ERROR: no GEMINI_API_KEY');
    return null;
  }
  var url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + apiKey;
  var prompt = 'Read this Thai bank slip and reply with ONLY a JSON object, no other text.\nFormat: {"bank":"ktb","type":"expense","amount":183,"date":"2026-05-29","description":"shop name","category_suggest":"food"}\nRules:\n- bank: ktb (Krungthai blue) or gsb (GSB green) or unknown\n- type: expense (paying out) or income (receiving money)\n- amount: main amount number only\n- date: YYYY-MM-DD format\n- category_suggest: one of: food, travel, shopping, investment, business, income, other';
  var body = {
    contents: [{
      parts: [
        { text: prompt },
        { inline_data: { mime_type: mimeType, data: imageBase64 } }
      ]
    }],
    generationConfig: { temperature: 0.1, maxOutputTokens: 200 }
  };
  try {
    var res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    var data = await res.json();
    console.log('Gemini status:', res.status);
    if (data.error) {
      console.log('Gemini error:', data.error.message);
      return null;
    }
    var text = '';
    if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0]) {
      text = data.candidates[0].content.parts[0].text || '';
    }
    console.log('Gemini text:', text.slice(0, 200));
    var clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
    var parsed = JSON.parse(clean);
    console.log('Parsed:', JSON.stringify(parsed));
    return parsed;
  } catch (err) {
    console.log('Gemini error:', err.message);
    return null;
  }
}

module.exports = { analyzeSlip };
