// /api/grade — 서버 채점 엔드포인트 (자사용 앱 전용)
// 프론트는 { app, level, marks } 만 보내고, 배점·공식은 서버(_grading.js)에서만 계산됩니다.
// 인증은 /api/ai 와 동일: (1) 사이트 비밀번호(SITE_PASSWORD)  (2) Supabase 로그인 토큰
// LLM을 호출하지 않는 순수 계산이라 응답이 매우 빠르고 API 비용이 발생하지 않습니다.

const https = require('https');

function verifySupabaseToken(supabaseUrl, anonKey, token) {
  return new Promise((resolve) => {
    try {
      const u = new URL(supabaseUrl);
      const options = {
        hostname: u.hostname,
        path: '/auth/v1/user',
        method: 'GET',
        headers: { 'Authorization': 'Bearer ' + token, 'apikey': anonKey },
      };
      const req = https.request(options, (resp) => {
        const chunks = [];
        resp.on('data', (c) => { chunks.push(c); });
        resp.on('end', () => {
          const raw = Buffer.concat(chunks).toString('utf8');
          if (resp.statusCode === 200) {
            try { const u2 = JSON.parse(raw); resolve(!!(u2 && u2.id)); }
            catch (e) { resolve(false); }
          } else { resolve(false); }
        });
      });
      req.on('error', () => resolve(false));
      req.end();
    } catch (e) { resolve(false); }
  });
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  // ── 인증: 둘 중 하나만 통과하면 됨 (ai.js와 동일 정책) ──
  let authed = false;
  const sitePw = process.env.SITE_PASSWORD;
  if (sitePw) {
    const given = req.headers['x-site-password'];
    if (given && given === sitePw) authed = true;
  } else {
    authed = true; // SITE_PASSWORD 미설정 시 기존 동작 유지
  }
  if (!authed) {
    const authHeader = req.headers['authorization'] || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    const supaUrl = process.env.SUPABASE_URL || 'https://bkgvmkbwxmfrocjsmshq.supabase.co';
    const supaAnon = process.env.SUPABASE_ANON_KEY || 'sb_publishable_lzkStKN2FmQCBfGStKEl4Q_-NbC5GdV';
    if (token) authed = await verifySupabaseToken(supaUrl, supaAnon, token);
  }
  if (!authed) { res.status(401).json({ error: '인증이 필요합니다.' }); return; }

  try {
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
    if (!body) body = {};

    let GRADERS;
    try { ({ GRADERS } = require('./_grading')); }
    catch (e) { res.status(500).json({ error: '채점 모듈 로드 실패' }); return; }

    const grader = GRADERS[body.app];
    if (!grader) { res.status(400).json({ error: '알 수 없는 app: ' + body.app }); return; }

    const result = grader({ level: body.level, marks: body.marks || {} });
    res.status(200).json(result);
  } catch (e) {
    res.status(500).json({ error: '서버 오류: ' + (e.message || 'unknown') });
  }
};
