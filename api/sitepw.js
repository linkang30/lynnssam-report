// /api/sitepw — 로그인된(Supabase 토큰이 유효한) 사용자에게만 사이트 비밀번호를 돌려준다.
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
  try {
    const authHeader = req.headers['authorization'] || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!token) { res.status(401).json({ error: '로그인이 필요합니다.' }); return; }

    const supaUrl = process.env.SUPABASE_URL || 'https://bkgvmkbwxmfrocjsmshq.supabase.co';
    const supaAnon = process.env.SUPABASE_ANON_KEY || 'sb_publishable_lzkStKN2FmQCBfGStKEl4Q_-NbC5GdV';
    const ok = await verifySupabaseToken(supaUrl, supaAnon, token);
    if (!ok) { res.status(401).json({ error: '유효하지 않은 로그인입니다.' }); return; }

    const sitePw = process.env.SITE_PASSWORD || '';
    res.status(200).json({ sitePw: sitePw });
  } catch (e) {
    res.status(500).json({ error: '서버 오류: ' + (e.message || 'unknown') });
  }
};
