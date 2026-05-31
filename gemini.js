async function analyzeSlip(imageBase64, mimeType) {
  if (!mimeType) mimeType = 'image/jpeg';
  var apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) { console.log('NO KEY'); return null; }
  var url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + apiKey;
  var prompt = 'Read this Thai bank slip. Reply ONLY with JSON: {"bank":"ktb","type":"expense","amount":183,"date":"2026-05-29","description":"shop name","category_suggest":"food"}\nbank: ktb=Krungthai blue, gsb=GSB green, unknown\ntype: expense=paying, income=receiving\namount: main number only\ndate: YYYY-MM-DD';
  var body = { contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: mimeType, data: imageBase64 } }] }], generationConfig: { temperature: 0.1, maxOutputTokens: 300 } };
  try {
    var res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    var data = await res.json();
    console.log('GS:', res.status);
    if (data.error) { console.log('GE:', data.error.message); return null; }
    var text = (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text) || '';
    console.log('GT:', text.slice(0, 200));
    var clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(clean);
  } catch (err) { console.log('GErr:', err.message); return null; }
}
module.exports = { analyzeSlip };
