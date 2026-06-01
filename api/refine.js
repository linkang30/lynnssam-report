// /api/refine — 린쌤 톤으로 AI 중계 백엔드 (실버·프리스텔라 공용)
// API 키는 Vercel 환경변수(ANTHROPIC_API_KEY)에 저장되어 외부에 노출되지 않습니다.

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API 키가 설정되지 않았습니다. Vercel 환경변수를 확인하세요.' });
  }

  // 비밀번호 확인 (SITE_PASSWORD가 설정된 경우에만 검사)
  const sitePw = process.env.SITE_PASSWORD;
  if (sitePw) {
    const given = req.headers['x-site-password'];
    if (given !== sitePw) {
      return res.status(401).json({ error: '인증이 필요합니다.' });
    }
  }

  try {
    // req.body가 문자열로 올 수도 있으니 안전하게 파싱
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (e) { body = {}; }
    }
    const { model, max_tokens, system, messages } = body || {};

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: '잘못된 요청입니다.' });
    }

    const payload = {
      model: model || 'claude-sonnet-4-20250514',
      max_tokens: max_tokens || 1000,
      messages,
    };
    if (system) payload.system = system;

    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(payload),
    });

    const data = await upstream.json();

    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: (data && data.error && data.error.message) || 'AI 호출 오류' });
    }

    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ error: '서버 오류: ' + (e.message || 'unknown') });
  }
};
