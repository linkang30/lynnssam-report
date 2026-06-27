// /api/ai — AI 중계 백엔드 (자사용 앱 + 검증 앱 공용)
// API 키는 Vercel 환경변수(ANTHROPIC_API_KEY)에 저장되어 외부에 노출되지 않습니다.
// 인증: (1) 기존 사이트 비밀번호(SITE_PASSWORD) — 자사용 앱(우리 강사들)
//       (2) Supabase 로그인 토큰 — 검증 앱(pamus). 둘 중 하나만 통과하면 됨.
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

// Supabase 토큰이 유효한 로그인인지 확인 (Supabase /auth/v1/user 에 물어봄)
function verifySupabaseToken(supabaseUrl, anonKey, token) {
  return new Promise((resolve) => {
    try {
      const u = new URL(supabaseUrl);
      const options = {
        hostname: u.hostname,
        path: '/auth/v1/user',
        method: 'GET',
        headers: {
          'Authorization': 'Bearer ' + token,
          'apikey': anonKey,
        },
      };
      const req = https.request(options, (resp) => {
        let raw = '';
        resp.on('data', (c) => { raw += c; });
        resp.on('end', () => {
          // 200이고 user id가 있으면 유효한 로그인
          if (resp.statusCode === 200) {
            try {
              const u2 = JSON.parse(raw);
              resolve(!!(u2 && u2.id));
            } catch (e) { resolve(false); }
          } else {
            resolve(false);
          }
        });
      });
      req.on('error', () => resolve(false));
      req.end();
    } catch (e) { resolve(false); }
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

  // ── 인증: 둘 중 하나만 통과하면 됨 ──────────────────────
  let authed = false;

  // (1) 기존 사이트 비밀번호 경로 (자사용 앱 — 우리 강사들). 동작 그대로 보존.
  const sitePw = process.env.SITE_PASSWORD;
  if (sitePw) {
    const given = req.headers['x-site-password'];
    if (given && given === sitePw) authed = true;
  } else {
    // SITE_PASSWORD가 설정 안 됐으면 비번 체크 자체가 없던 기존 동작 유지
    authed = true;
  }

  // (2) Supabase 토큰 경로 (검증 앱 — pamus). 비번이 안 맞아도 토큰이 유효하면 통과.
  if (!authed) {
    const authHeader = req.headers['authorization'] || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    const supaUrl = process.env.SUPABASE_URL || 'https://bkgvmkbwxmfrocjsmshq.supabase.co';
    const supaAnon = process.env.SUPABASE_ANON_KEY || 'sb_publishable_lzkStKN2FmQCBfGStKEl4Q_-NbC5GdV';
    if (token) {
      authed = await verifySupabaseToken(supaUrl, supaAnon, token);
    }
  }

  if (!authed) {
    res.status(401).json({ error: '인증이 필요합니다.' });
    return;
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (e) { body = {}; }
    }
    if (!body) body = {};

    let { model, max_tokens, system, messages } = body;

    // ── task 모드: 프롬프트 본문을 서버에서 조립 (지적 자산 보호) ──
    // 프론트는 task 이름과 재료(input)만 보내고, 프롬프트 전문은 서버에만 존재.
    // task가 없으면 기존처럼 messages를 그대로 중계 (하위 호환).
    if (body.task) {
      let BUILDERS;
      try { ({ BUILDERS } = require('./_prompts')); }
      catch (e) { res.status(500).json({ error: '프롬프트 모듈 로드 실패' }); return; }
      const builder = BUILDERS[body.task];
      if (!builder) { res.status(400).json({ error: '알 수 없는 task: ' + body.task }); return; }
      const prompt = builder(body.input || {});
      messages = [{ role: 'user', content: prompt }];
    }

    if (!messages || !Array.isArray(messages)) {
      res.status(400).json({ error: '잘못된 요청입니다.' });
      return;
    }

    const payload = {
      model: model || 'claude-sonnet-4-6',
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
