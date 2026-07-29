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
 
// ── Silver Stella 채점 (40문항, 문항당 2.5점, 세모=1.25, 레벨별 도메인맵) ──
const SILVER_DOMAINMAP = {"SA1":{"1":"VOC","2":"VOC","3":"VOC","4":"VOC","5":"VOC","6":"VOC","7":"RDG","8":"RDG","9":"RDG","10":"RDG","11":"RDG","12":"RDG","13":"LIS","14":"LIS","15":"LIS","16":"LIS","17":"LIS","18":"GRM","19":"GRM","20":"GRM","21":"GRM","22":"WRT","23":"WRT","24":"WRT","25":"WRT","26":"WRT","27":"WRT","28":"GRM","29":"GRM","30":"GRM","31":"GRM","32":"WRT","33":"WRT","34":"WRT","35":"GRM","36":"GRM","37":"GRM","38":"GRM","39":"GRM","40":"GRM"},"SA2":{"1":"VOC","2":"VOC","3":"VOC","4":"VOC","5":"VOC","6":"VOC","7":"RDG","8":"RDG","9":"RDG","10":"RDG","11":"RDG","12":"RDG","13":"LIS","14":"LIS","15":"LIS","16":"LIS","17":"LIS","18":"GRM","19":"GRM","20":"GRM","21":"GRM","22":"GRM","23":"GRM","24":"GRM","25":"GRM","26":"GRM","27":"GRM","28":"GRM","29":"GRM","30":"GRM","31":"GRM","32":"WRT","33":"WRT","34":"WRT","35":"WRT","36":"GRM","37":"GRM","38":"GRM","39":"GRM","40":"GRM"},"SA3":{"1":"VOC","2":"VOC","3":"VOC","4":"VOC","5":"VOC","6":"VOC","7":"RDG","8":"RDG","9":"RDG","10":"RDG","11":"RDG","12":"RDG","13":"LIS","14":"LIS","15":"LIS","16":"LIS","17":"LIS","18":"GRM","19":"GRM","20":"GRM","21":"GRM","22":"GRM","23":"GRM","24":"GRM","25":"GRM","26":"GRM","27":"GRM","28":"GRM","29":"GRM","30":"GRM","31":"GRM","32":"GRM","33":"GRM","34":"GRM","35":"GRM","36":"GRM","37":"GRM","38":"GRM","39":"GRM","40":"GRM"},"SA4":{"1":"VOC","2":"VOC","3":"VOC","4":"VOC","5":"VOC","6":"VOC","7":"RDG","8":"RDG","9":"RDG","10":"RDG","11":"RDG","12":"RDG","13":"LIS","14":"LIS","15":"LIS","16":"LIS","17":"LIS","18":"GRM","19":"GRM","20":"GRM","21":"GRM","22":"WRT","23":"WRT","24":"WRT","25":"WRT","26":"GRM","27":"GRM","28":"GRM","29":"GRM","30":"GRM","31":"WRT","32":"WRT","33":"WRT","34":"WRT","35":"GRM","36":"GRM","37":"GRM","38":"GRM","39":"GRM","40":"GRM"},"SA5":{"1":"VOC","2":"VOC","3":"VOC","4":"VOC","5":"VOC","6":"VOC","7":"RDG","8":"RDG","9":"RDG","10":"RDG","11":"RDG","12":"RDG","13":"LIS","14":"LIS","15":"LIS","16":"LIS","17":"LIS","18":"GRM","19":"GRM","20":"GRM","21":"GRM","22":"WRT","23":"WRT","24":"WRT","25":"WRT","26":"GRM","27":"GRM","28":"GRM","29":"GRM","30":"GRM","31":"WRT","32":"WRT","33":"WRT","34":"WRT","35":"GRM","36":"GRM","37":"GRM","38":"GRM","39":"GRM","40":"GRM"},"SA6":{"1":"VOC","2":"VOC","3":"VOC","4":"VOC","5":"VOC","6":"VOC","7":"RDG","8":"RDG","9":"RDG","10":"RDG","11":"RDG","12":"RDG","13":"LIS","14":"LIS","15":"LIS","16":"LIS","17":"LIS","18":"GRM","19":"GRM","20":"GRM","21":"GRM","22":"WRT","23":"WRT","24":"WRT","25":"WRT","26":"GRM","27":"GRM","28":"GRM","29":"GRM","30":"GRM","31":"WRT","32":"WRT","33":"WRT","34":"WRT","35":"GRM","36":"GRM","37":"GRM","38":"GRM","39":"GRM","40":"GRM"},"SB1":{"1":"VOC","2":"VOC","3":"VOC","4":"VOC","5":"VOC","6":"VOC","7":"RDG","8":"RDG","9":"RDG","10":"RDG","11":"RDG","12":"RDG","13":"LIS","14":"LIS","15":"LIS","16":"LIS","17":"LIS","18":"GRM","19":"GRM","20":"GRM","21":"GRM","22":"WRT","23":"WRT","24":"WRT","25":"WRT","26":"GRM","27":"GRM","28":"GRM","29":"GRM","30":"GRM","31":"WRT","32":"WRT","33":"WRT","34":"WRT","35":"GRM","36":"GRM","37":"GRM","38":"GRM","39":"GRM","40":"GRM"},"SB2":{"1":"VOC","2":"VOC","3":"VOC","4":"VOC","5":"VOC","6":"VOC","7":"RDG","8":"RDG","9":"RDG","10":"RDG","11":"RDG","12":"RDG","13":"LIS","14":"LIS","15":"LIS","16":"LIS","17":"LIS","18":"GRM","19":"GRM","20":"GRM","21":"GRM","22":"WRT","23":"WRT","24":"WRT","25":"WRT","26":"GRM","27":"GRM","28":"GRM","29":"GRM","30":"GRM","31":"WRT","32":"WRT","33":"WRT","34":"WRT","35":"GRM","36":"GRM","37":"GRM","38":"GRM","39":"GRM","40":"GRM"},"SB3":{"1":"VOC","2":"VOC","3":"VOC","4":"VOC","5":"VOC","6":"VOC","7":"RDG","8":"RDG","9":"RDG","10":"RDG","11":"RDG","12":"RDG","13":"LIS","14":"LIS","15":"LIS","16":"LIS","17":"LIS","18":"GRM","19":"GRM","20":"GRM","21":"GRM","22":"WRT","23":"WRT","24":"WRT","25":"WRT","26":"GRM","27":"GRM","28":"GRM","29":"GRM","30":"GRM","31":"WRT","32":"WRT","33":"WRT","34":"WRT","35":"GRM","36":"GRM","37":"GRM","38":"GRM","39":"GRM","40":"GRM"},"SB4":{"1":"VOC","2":"VOC","3":"VOC","4":"VOC","5":"VOC","6":"VOC","7":"RDG","8":"RDG","9":"RDG","10":"RDG","11":"RDG","12":"RDG","13":"LIS","14":"LIS","15":"LIS","16":"LIS","17":"LIS","18":"GRM","19":"GRM","20":"GRM","21":"GRM","22":"WRT","23":"WRT","24":"WRT","25":"WRT","26":"GRM","27":"GRM","28":"GRM","29":"GRM","30":"GRM","31":"WRT","32":"WRT","33":"WRT","34":"WRT","35":"GRM","36":"GRM","37":"GRM","38":"GRM","39":"GRM","40":"GRM"},"SB5":{"1":"VOC","2":"VOC","3":"VOC","4":"VOC","5":"VOC","6":"VOC","7":"RDG","8":"RDG","9":"RDG","10":"RDG","11":"RDG","12":"RDG","13":"LIS","14":"LIS","15":"LIS","16":"LIS","17":"LIS","18":"GRM","19":"GRM","20":"GRM","21":"GRM","22":"WRT","23":"WRT","24":"WRT","25":"WRT","26":"GRM","27":"GRM","28":"GRM","29":"GRM","30":"GRM","31":"WRT","32":"WRT","33":"WRT","34":"WRT","35":"GRM","36":"GRM","37":"GRM","38":"GRM","39":"GRM","40":"GRM"},"SB6":{"1":"VOC","2":"VOC","3":"VOC","4":"VOC","5":"VOC","6":"VOC","7":"RDG","8":"RDG","9":"RDG","10":"RDG","11":"RDG","12":"RDG","13":"LIS","14":"LIS","15":"LIS","16":"LIS","17":"LIS","18":"GRM","19":"GRM","20":"GRM","21":"GRM","22":"WRT","23":"WRT","24":"WRT","25":"WRT","26":"GRM","27":"GRM","28":"GRM","29":"GRM","30":"GRM","31":"WRT","32":"WRT","33":"WRT","34":"WRT","35":"GRM","36":"GRM","37":"GRM","38":"GRM","39":"GRM","40":"GRM"}};
const SILVER_DOMS = ['VOC','RDG','LIS','GRM','WRT'];
function gradeSilver(input){
  const level = (input && input.level) ? String(input.level) : 'SA2';
  const marks = (input && input.marks) || {};
  const qmap = SILVER_DOMAINMAP[level] || SILVER_DOMAINMAP['SA2'];
  const ds = {VOC:0,RDG:0,LIS:0,GRM:0,WRT:0};
  const cnt = {VOC:0,RDG:0,LIS:0,GRM:0,WRT:0};
  let total = 0;
  for(let i=1;i<=40;i++){
    let v = Number(marks[i]);
    if(isNaN(v)) v = 2.5;
    v = Math.max(0, Math.min(2.5, v));
    total += v;
    const dom = qmap[i];
    if(dom && ds[dom] !== undefined){ ds[dom] += v; }
    if(dom && cnt[dom] !== undefined){ cnt[dom]++; }
  }
  const max = {}; SILVER_DOMS.forEach(function(d){ max[d]=Math.round(cnt[d]*2.5*10)/10; });
  SILVER_DOMS.forEach(function(d){ ds[d]=Math.round(ds[d]*10)/10; });
  const rounded = Math.round(total*10)/10;
  const pct = Math.round(rounded);
  const grade = pct>=95?'A+':pct>=90?'A':pct>=85?'B+':pct>=80?'B':pct>=75?'C+':pct>=70?'C':pct>=60?'D':'F';
  const activeDoms = SILVER_DOMS.filter(function(d){ return max[d]>0; });
  return { ds: ds, max: max, raw: rounded, pct: pct, grade: grade, activeDoms: activeDoms };
}
 
 
// ── Pre Stella 채점 (도메인 만점 고정 V6/R6/L5/S8=25, 오답 -1·세모 -0.5, 도메인점수=max(0,만점-차감)) ──
const PRESTELLA_DOMAINMAP = {"A1":{"1":"Vocabulary","2":"Vocabulary","3":"Vocabulary","4":"Vocabulary","5":"Vocabulary","6":"Vocabulary","7":"Reading","8":"Reading","9":"Reading","10":"Reading","11":"Reading","12":"Reading","13":"Listening","14":"Listening","15":"Listening","16":"Listening","17":"Listening","18":"Structure","19":"Structure","20":"Structure","21":"Structure","22":"Structure","23":"Structure","24":"Structure","25":"Structure"},"A2":{"1":"Vocabulary","2":"Vocabulary","3":"Vocabulary","4":"Vocabulary","5":"Vocabulary","6":"Vocabulary","7":"Reading","8":"Reading","9":"Reading","10":"Reading","11":"Reading","12":"Reading","13":"Listening","14":"Listening","15":"Listening","16":"Listening","17":"Listening","18":"Structure","19":"Structure","20":"Structure","21":"Structure","22":"Structure","23":"Structure","24":"Structure","25":"Structure"},"A3":{"1":"Vocabulary","2":"Vocabulary","3":"Vocabulary","4":"Vocabulary","5":"Vocabulary","6":"Vocabulary","7":"Reading","8":"Reading","9":"Reading","10":"Reading","11":"Reading","12":"Reading","13":"Listening","14":"Listening","15":"Listening","16":"Listening","17":"Listening","18":"Structure","19":"Structure","20":"Structure","21":"Structure","22":"Structure","23":"Structure","24":"Structure","25":"Structure"},"A4":{"1":"Vocabulary","2":"Vocabulary","3":"Vocabulary","4":"Vocabulary","5":"Vocabulary","6":"Vocabulary","7":"Reading","8":"Reading","9":"Reading","10":"Reading","11":"Reading","12":"Reading","13":"Listening","14":"Listening","15":"Listening","16":"Listening","17":"Listening","18":"Structure","19":"Structure","20":"Structure","21":"Structure","22":"Structure","23":"Structure","24":"Structure","25":"Structure"},"A5":{"1":"Vocabulary","2":"Vocabulary","3":"Vocabulary","4":"Vocabulary","5":"Vocabulary","6":"Vocabulary","7":"Reading","8":"Reading","9":"Reading","10":"Reading","11":"Reading","12":"Reading","13":"Listening","14":"Listening","15":"Listening","16":"Listening","17":"Listening","18":"Structure","19":"Structure","20":"Structure","21":"Structure","22":"Structure","23":"Structure","24":"Structure","25":"Structure"},"A6":{"1":"Vocabulary","2":"Vocabulary","3":"Vocabulary","4":"Vocabulary","5":"Vocabulary","6":"Vocabulary","7":"Reading","8":"Reading","9":"Reading","10":"Reading","11":"Reading","12":"Reading","13":"Listening","14":"Listening","15":"Listening","16":"Listening","17":"Listening","18":"Structure","19":"Structure","20":"Structure","21":"Structure","22":"Structure","23":"Structure","24":"Structure","25":"Structure"},"B1":{"1":"Vocabulary","2":"Vocabulary","3":"Vocabulary","4":"Vocabulary","5":"Vocabulary","6":"Vocabulary","7":"Reading","8":"Reading","9":"Reading","10":"Reading","11":"Reading","12":"Reading","13":"Listening","14":"Listening","15":"Listening","16":"Listening","17":"Listening","18":"Structure","19":"Structure","20":"Structure","21":"Structure","22":"Structure","23":"Structure","24":"Structure","25":"Structure"},"B2":{"1":"Vocabulary","2":"Vocabulary","3":"Vocabulary","4":"Vocabulary","5":"Vocabulary","6":"Vocabulary","7":"Reading","8":"Reading","9":"Reading","10":"Reading","11":"Reading","12":"Reading","13":"Listening","14":"Listening","15":"Listening","16":"Listening","17":"Listening","18":"Structure","19":"Structure","20":"Structure","21":"Structure","22":"Structure","23":"Structure","24":"Structure","25":"Structure"},"B3":{"1":"Vocabulary","2":"Vocabulary","3":"Vocabulary","4":"Vocabulary","5":"Vocabulary","6":"Vocabulary","7":"Reading","8":"Reading","9":"Reading","10":"Reading","11":"Reading","12":"Reading","13":"Listening","14":"Listening","15":"Listening","16":"Listening","17":"Listening","18":"Structure","19":"Structure","20":"Structure","21":"Structure","22":"Structure","23":"Structure","24":"Structure","25":"Structure"},"B4":{"1":"Vocabulary","2":"Vocabulary","3":"Vocabulary","4":"Vocabulary","5":"Vocabulary","6":"Vocabulary","7":"Reading","8":"Reading","9":"Reading","10":"Reading","11":"Reading","12":"Reading","13":"Listening","14":"Listening","15":"Listening","16":"Listening","17":"Listening","18":"Structure","19":"Structure","20":"Structure","21":"Structure","22":"Structure","23":"Structure","24":"Structure","25":"Structure"},"B5":{"1":"Vocabulary","2":"Vocabulary","3":"Vocabulary","4":"Vocabulary","5":"Vocabulary","6":"Vocabulary","7":"Reading","8":"Reading","9":"Reading","10":"Reading","11":"Reading","12":"Reading","13":"Listening","14":"Listening","15":"Listening","16":"Listening","17":"Listening","18":"Structure","19":"Structure","20":"Structure","21":"Structure","22":"Structure","23":"Structure","24":"Structure","25":"Structure"},"B6":{"1":"Vocabulary","2":"Vocabulary","3":"Vocabulary","4":"Vocabulary","5":"Vocabulary","6":"Vocabulary","7":"Reading","8":"Reading","9":"Reading","10":"Reading","11":"Reading","12":"Reading","13":"Listening","14":"Listening","15":"Listening","16":"Listening","17":"Listening","18":"Structure","19":"Structure","20":"Structure","21":"Structure","22":"Structure","23":"Structure","24":"Structure","25":"Structure"}};
const PRESTELLA_FULL = {Vocabulary:6, Reading:6, Listening:5, Structure:8};
const PRESTELLA_DOMS = ['Vocabulary','Reading','Listening','Structure'];
function gradePrestella(input){
  const level = (input && input.level) ? String(input.level) : 'A1';
  const wrong = new Set((input && input.wrong) || []);
  const partial = new Set((input && input.partial) || []);
  const qmap = PRESTELLA_DOMAINMAP[level] || PRESTELLA_DOMAINMAP['A1'];
  const dw = {Vocabulary:0, Reading:0, Listening:0, Structure:0};
  for(const qn in qmap){
    const n = Number(qn);
    let d = 0;
    if(wrong.has(n)) d = 1; else if(partial.has(n)) d = 0.5;
    if(d){ const dom = qmap[qn]; if(dw[dom] !== undefined) dw[dom] += d; }
  }
  const ds = {}, rates = {}; let tot = 0;
  PRESTELLA_DOMS.forEach(function(dom){
    const right = Math.max(0, PRESTELLA_FULL[dom] - dw[dom]);
    ds[dom] = right; tot += right;
    rates[dom] = PRESTELLA_FULL[dom] > 0 ? Math.round(right / PRESTELLA_FULL[dom] * 100) : 100;
  });
  const pct = Math.round(tot / 25 * 100);
  return { ds: ds, dw: dw, full: PRESTELLA_FULL, tot: tot, pct: pct, rates: rates };
}
 
 
// ── Neuro Phonics 채점 (area: count=개수×가중치 / grid=항목합, base=합, bonus=floor(입력/per) 상한 total, total=min(100,raw×100/maxRaw)) ──
const NEURO_CFG = {"SD1":{"maxRaw":110,"bonus":{"total":18,"per":3},"areas":[{"id":"voca","type":"count","weight":1,"countMax":12},{"id":"list","type":"count","weight":1,"countMax":14},{"id":"writeMatch","type":"grid","gridLen":14},{"id":"conv","type":"count","weight":1,"countMax":10},{"id":"spkSound","type":"grid","gridLen":42},{"id":"spkWord","type":"grid","gridLen":18}]},"SD2":{"maxRaw":102,"bonus":{"total":9,"per":3},"areas":[{"id":"voca","type":"count","weight":1,"countMax":12},{"id":"list","type":"count","weight":1,"countMax":14},{"id":"writeMatch","type":"grid","gridLen":12},{"id":"conv","type":"count","weight":1,"countMax":10},{"id":"spkSound","type":"grid","gridLen":42},{"id":"spkWord","type":"grid","gridLen":12}]},"SD3":{"maxRaw":104,"bonus":{"total":21,"per":3},"areas":[{"id":"list","type":"count","weight":1,"countMax":15},{"id":"write","type":"count","weight":1,"countMax":14},{"id":"voca","type":"count","weight":1,"countMax":22},{"id":"spkWord","type":"grid","gridLen":53}]},"SD4":{"maxRaw":74,"bonus":{"total":28,"per":4},"areas":[{"id":"list","type":"count","weight":1,"countMax":15},{"id":"write","type":"count","weight":1,"countMax":13},{"id":"voca","type":"count","weight":1,"countMax":15},{"id":"spkWord","type":"grid","gridLen":26},{"id":"sentWord","type":"count","weight":0.5,"countMax":5},{"id":"sentInto","type":"count","weight":0.5,"countMax":5}]},"SD5":{"maxRaw":74,"bonus":{"total":21,"per":3},"areas":[{"id":"list","type":"count","weight":1,"countMax":15},{"id":"write","type":"count","weight":1,"countMax":13},{"id":"voca","type":"count","weight":1,"countMax":15},{"id":"spkWord","type":"grid","gridLen":26},{"id":"sentWord","type":"count","weight":0.5,"countMax":5},{"id":"sentInto","type":"count","weight":0.5,"countMax":5}]},"SD6":{"maxRaw":55,"bonus":{"total":15,"per":3},"areas":[{"id":"list","type":"count","weight":1,"countMax":15},{"id":"write","type":"count","weight":1,"countMax":15},{"id":"voca","type":"count","weight":1,"countMax":15},{"id":"rcWord","type":"count","weight":0.5,"countMax":5},{"id":"rcInto","type":"count","weight":0.5,"countMax":5},{"id":"scWord","type":"count","weight":0.5,"countMax":5},{"id":"scChunk","type":"count","weight":0.5,"countMax":5}]},"TP1":{"maxRaw":45,"bonus":{"total":48,"per":6},"areas":[{"id":"phon","type":"count","weight":1,"countMax":11},{"id":"voca","type":"count","weight":1,"countMax":8},{"id":"rd","type":"count","weight":1,"countMax":6},{"id":"ls","type":"count","weight":1,"countMax":20}]},"TP2":{"maxRaw":45,"bonus":{"total":48,"per":6},"areas":[{"id":"phon","type":"count","weight":1,"countMax":11},{"id":"voca","type":"count","weight":1,"countMax":8},{"id":"rd","type":"count","weight":1,"countMax":6},{"id":"ls","type":"count","weight":1,"countMax":20}]},"TP3":{"maxRaw":45,"bonus":{"total":48,"per":6},"areas":[{"id":"phon","type":"count","weight":1,"countMax":11},{"id":"voca","type":"count","weight":1,"countMax":8},{"id":"rd","type":"count","weight":1,"countMax":6},{"id":"ls","type":"count","weight":1,"countMax":20}]},"TP4":{"maxRaw":45,"bonus":{"total":48,"per":6},"areas":[{"id":"phon","type":"count","weight":1,"countMax":11},{"id":"voca","type":"count","weight":1,"countMax":8},{"id":"rd","type":"count","weight":1,"countMax":6},{"id":"ls","type":"count","weight":1,"countMax":20}]},"TP5":{"maxRaw":45,"bonus":{"total":48,"per":6},"areas":[{"id":"phon","type":"count","weight":1,"countMax":11},{"id":"voca","type":"count","weight":1,"countMax":8},{"id":"rd","type":"count","weight":1,"countMax":6},{"id":"ls","type":"count","weight":1,"countMax":20}]},"TP6":{"maxRaw":45,"bonus":{"total":48,"per":6},"areas":[{"id":"phon","type":"count","weight":1,"countMax":11},{"id":"voca","type":"count","weight":1,"countMax":8},{"id":"rd","type":"count","weight":1,"countMax":6},{"id":"ls","type":"count","weight":1,"countMax":20}]}};
function gradeNeuro(input){
  const level = (input && input.level) ? String(input.level) : 'SD1';
  const cfg = NEURO_CFG[level] || NEURO_CFG['SD1'];
  const gridState = (input && input.gridState) || {};
  const countState = (input && input.countState) || {};
  const byId = {}, areaMax = {}; let base = 0;
  cfg.areas.forEach(function(a){
    let v, amax;
    if(a.type === 'count'){
      v = (Number(countState[a.id]) || 0) * a.weight;
      amax = a.countMax * a.weight;
    } else {
      const st = gridState[a.id] || {}; let sum = 0;
      Object.keys(st).forEach(function(k){ sum += (+st[k] || 0); });
      v = sum; amax = a.gridLen;
    }
    byId[a.id] = v; areaMax[a.id] = amax; base += v;
  });
  let bonusPts = 0;
  if(input && input.bonusOn){
    const bc = Math.min(cfg.bonus.total, Math.max(0, parseInt(input.bonus) || 0));
    bonusPts = Math.floor(bc / cfg.bonus.per);
  }
  let raw = base + bonusPts;
  let total = raw * 100 / (cfg.maxRaw || 110);
  if(total > 100) total = 100;
  total = Math.round(total * 10) / 10;
  return { byId: byId, areaMax: areaMax, base: base, bonusPts: bonusPts, raw: raw, total: total };
}
 
 
// ── Gold Stella 채점 (RD/LW의 O=1·P=0.5·X=0, 시험별 raw/pct, parts 범위로 통합 영역, 통합 total) ──
const GOLD_CFG = {"1":{"tests":{"RD":{"total":28,"parts":[{"from":1,"to":9,"domain":"VOC"},{"from":10,"to":23,"domain":"RDG"},{"from":24,"to":28,"domain":"GRM"}]},"LW":{"total":17,"parts":[{"from":1,"to":5,"domain":"VOC"},{"from":6,"to":17,"domain":"LIS"}]}}},"2":{"tests":{"RD":{"total":24,"parts":[{"from":1,"to":5,"domain":"VOC"},{"from":6,"to":19,"domain":"RDG"},{"from":20,"to":24,"domain":"GRM"}]},"LW":{"total":22,"parts":[{"from":1,"to":10,"domain":"VOC"},{"from":11,"to":22,"domain":"LIS"}]}}},"3":{"tests":{"RD":{"total":24,"parts":[{"from":1,"to":5,"domain":"VOC"},{"from":6,"to":19,"domain":"RDG"},{"from":20,"to":24,"domain":"GRM"}]},"LW":{"total":21,"parts":[{"from":1,"to":9,"domain":"VOC"},{"from":10,"to":21,"domain":"LIS"}]}}},"4":{"tests":{"RD":{"total":33,"parts":[{"from":1,"to":14,"domain":"VOC"},{"from":15,"to":28,"domain":"RDG"},{"from":29,"to":33,"domain":"GRM"}]},"LW":{"total":12,"parts":[{"from":1,"to":12,"domain":"LIS"}]}}},"5":{"tests":{"RD":{"total":27,"parts":[{"from":1,"to":8,"domain":"VOC"},{"from":9,"to":22,"domain":"RDG"},{"from":23,"to":27,"domain":"GRM"}]},"LW":{"total":18,"parts":[{"from":1,"to":6,"domain":"VOC"},{"from":7,"to":18,"domain":"LIS"}]}}}};
function _goldGradeOf(pct){return pct>=95?'A+':pct>=90?'A':pct>=85?'B+':pct>=80?'B':pct>=75?'C+':pct>=70?'C':pct>=60?'D':'F';}
function _goldQScore(st){return st==='O'?1:st==='P'?0.5:0;}
function _goldDomainOf(cfg,test,qnum){const parts=cfg.tests[test].parts;for(const p of parts){if(qnum>=p.from&&qnum<=p.to)return p.domain;}return null;}
function gradeGold(input){
  const level=(input&&input.level)?String(input.level):'1';
  const cfg=GOLD_CFG[level]||GOLD_CFG['1'];
  const state=(input&&input.state)||{RD:{},LW:{}};
  const tests={};
  ['RD','LW'].forEach(function(test){
    const t=cfg.tests[test]; if(!t)return;
    let raw=0;
    for(let n=1;n<=t.total;n++){ const st=(state[test]&&state[test][n])||'O'; raw+=_goldQScore(st); }
    const pct=Math.round(raw/t.total*1000)/10;
    tests[test]={raw:raw,total:t.total,pct:pct,grade:_goldGradeOf(pct)};
  });
  const res={VOC:{got:0,max:0,p:0,x:0},LIS:{got:0,max:0,p:0,x:0},RDG:{got:0,max:0,p:0,x:0},GRM:{got:0,max:0,p:0,x:0}};
  ['RD','LW'].forEach(function(test){
    const t=cfg.tests[test]; if(!t)return;
    for(let n=1;n<=t.total;n++){ const dom=_goldDomainOf(cfg,test,n); const st=(state[test]&&state[test][n])||'O'; if(res[dom]){res[dom].max+=1;res[dom].got+=_goldQScore(st);if(st==='P')res[dom].p+=1;if(st==='X')res[dom].x+=1;} }
  });
  let got=0,max=0; for(const k in res){got+=res[k].got;max+=res[k].max;}
  const total={got:got,max:max,pct:max?Math.round(got/max*1000)/10:0};
  return {tests:tests, domains:res, total:total, grade:_goldGradeOf(total.pct)};
}
 
const GRADERS = {
  interbridge: gradeInterbridge,
  interstella: gradeInterbridge, // 인터스텔라는 인터브릿지와 동일 엔진(45문항·1점·/45·동일 등급컷·동일 도메인맵)
  silver: gradeSilver,
  prestella: gradePrestella,
  neurophonics: gradeNeuro,
  goldstella: gradeGold,
};
 
module.exports = { GRADERS };
 


