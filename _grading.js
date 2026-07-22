// /api/_grading.js — 서버 전용 채점 엔진 (비공개 지적 자산)
// 배점(DOM_MAX)·점수 공식·등급 컷·레벨별 영역 매핑은 이 파일(서버)에만 존재합니다.
// 프론트는 문항별 마크(1/0/0.5)와 레벨만 보내고, 영역 점수·백분율·등급은 여기서 계산됩니다.
// 브라우저(F12)에서는 이 로직이 보이지 않습니다.

// ─────────────────────────────────────────────────────────────
// Inter Bridge 채점 (45문항, 각 1점, 세모=0.5)
// ─────────────────────────────────────────────────────────────
const IB_TOTAL_RAW = 45;
const IB_DOM_MAX = { VOC: 20, LIS: 10, RDG: 10, GRM: 5 };

// 문항 → 영역 기본 매핑 (1-20 VOC, 21-30 LIS, 31-40 RDG, 41-45 GRM)
const IB_BASE_DOMAIN = (function () {
  const m = {};
  for (let i = 1; i <= 20; i++) m[i] = 'VOC';
  for (let i = 21; i <= 30; i++) m[i] = 'LIS';
  for (let i = 31; i <= 40; i++) m[i] = 'RDG';
  for (let i = 41; i <= 45; i++) m[i] = 'GRM';
  return m;
})();

// 레벨별 문법(40~45) 영역 오버라이드 (시험지 기준). 현재 모든 레벨이 기본과 동일한 영역이지만,
// 향후 레벨별 영역이 달라질 경우를 대비해 매핑을 유지한다.
const IB_GRAM_DOMAIN_BY_LV = {
  '1': { 41: 'GRM', 42: 'GRM', 43: 'GRM', 44: 'GRM', 45: 'GRM' },
  '2': { 41: 'GRM', 42: 'GRM', 43: 'GRM', 44: 'GRM', 45: 'GRM' },
  '3': { 40: 'RDG', 41: 'GRM', 42: 'GRM', 43: 'GRM', 44: 'GRM', 45: 'GRM' },
};

function ibDomainMap(level) {
  const map = Object.assign({}, IB_BASE_DOMAIN);
  const g = IB_GRAM_DOMAIN_BY_LV[String(level)];
  if (g) { for (const k of Object.keys(g)) map[k] = g[k]; }
  return map;
}

function ibGradeOf(pct) {
  return pct >= 95 ? 'A+' : pct >= 90 ? 'A' : pct >= 85 ? 'B+' : pct >= 80 ? 'B'
       : pct >= 75 ? 'C+' : pct >= 70 ? 'C' : pct >= 60 ? 'D' : 'F';
}

// marks: { "1":1, "2":0, "3":0.5, ... } — 프론트의 qScore(n) 값(1/0/0.5). 미지정은 정답(1)으로 간주.
function gradeInterbridge(input) {
  const level = (input && input.level != null) ? String(input.level) : '1';
  const marks = (input && input.marks) || {};
  const map = ibDomainMap(level);
  const ds = { VOC: 0, LIS: 0, RDG: 0, GRM: 0 };
  let raw = 0;
  for (let i = 1; i <= IB_TOTAL_RAW; i++) {
    let v = Number(marks[i]);
    if (isNaN(v)) v = 1;          // 프론트 qScore와 동일: 미지정은 1(정답)
    if (v > 1) v = 1;
    if (v < 0) v = 0;
    raw += v;
    const dom = map[i];
    if (dom && ds[dom] !== undefined) ds[dom] += v;
  }
  const pct = Math.round((raw / IB_TOTAL_RAW) * 1000) / 10;
  return {
    ds: ds,                       // 영역별 점수
    max: IB_DOM_MAX,              // 영역별 배점
    raw: raw,                     // 원점수(45점 만점)
    total: IB_TOTAL_RAW,
    pct: pct,                     // 100점 환산
    grade: ibGradeOf(pct),        // 등급
  };
}

// app 이름 → 채점 함수 (앞으로 다른 앱 추가 시 여기에 등록)
const GRADERS = {
  interbridge: gradeInterbridge,
};

module.exports = { GRADERS };
