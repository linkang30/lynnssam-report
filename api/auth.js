// /api/auth — 공유 비밀번호 검증 (환경변수 SITE_PASSWORD와 대조)
// 비밀번호는 코드에 없고 Vercel 환경변수에만 저장됩니다.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const expected = process.env.SITE_PASSWORD;
  if (!expected) {
    return res.status(500).json({ error: '비밀번호가 설정되지 않았습니다. Vercel 환경변수(SITE_PASSWORD)를 확인하세요.' });
  }
  try {
    const { password } = req.body || {};
    if (typeof password === 'string' && password === expected) {
      return res.status(200).json({ ok: true });
    }
    return res.status(401).json({ ok: false });
  } catch (e) {
    return res.status(500).json({ error: '서버 오류' });
  }
}
