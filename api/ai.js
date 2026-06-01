// /api/refine — 린쌤 톤으로 AI 중계 백엔드 (실버·프리스텔라 공용)
// API 키는 Vercel 환경변수(ANTHROPIC_API_KEY)에 저장되어 외부에 노출되지 않습니다.
// fetch 대신 Node 기본 https 모듈을 사용 (모든 Vercel 환경에서 안정 작동)

const https = require('https');

function callAnthropic(apiKey, payload) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const options = {
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
    };
    const req = https.request(options, (resp) => {
      let raw = '';
      resp.on('data', (chunk) => { raw += chunk; });
      resp.on('end', () => {
        let parsed;
        try { parsed = JSON.parse(raw); } catch (e) { parsed = { error: { message: raw } }; }
        resolve({ status: resp.statusCode, body: parsed });
      });
    });
    req.on('error', (err) => reject(err));
    req.write(data);
    req.end();
  });
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'API 키가 설정되지 않았습니다. Vercel 환경변수를 확인하세요.' });
    return;
  }

  // 비밀번호 확인 (SITE_PASSWORD가 설정된 경우에만)
  const sitePw = process.env.SITE_PASSWORD;
  if (sitePw) {
    const given = req.headers['x-site-password'];
    if (given !== sitePw) {
      res.status(401).json({ error: '인증이 필요합니다.' });
      return;
    }
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (e) { body = {}; }
    }
    if (!body) body = {};

    const { model, max_tokens, system, messages } = body;
    if (!messages || !Array.isArray(messages)) {
      res.status(400).json({ error: '잘못된 요청입니다.' });
      return;
    }

    const payload = {
      model: model || 'claude-sonnet-4-20250514',
      max_tokens: max_tokens || 1000,
      messages: messages,
    };
    if (system) payload.system = system;

    const result = await callAnthropic(apiKey, payload);

    if (result.status < 200 || result.status >= 300) {
      const msg = (result.body && result.body.error && result.body.error.message) || 'AI 호출 오류';
      res.status(result.status).json({ error: msg });
      return;
    }

    res.status(200).json(result.body);
  } catch (e) {
    res.status(500).json({ error: '서버 오류: ' + (e.message || 'unknown') });
  }
};
