const DATA = {
  daily: 'assets/data/price_daily.js',
  eps: 'assets/data/price_EPS_monthly.js',
  fearGreed: 'assets/data/price_feargreed.js',
  cpi: 'assets/data/CPI.js',
  m2: 'assets/data/m2.js',
  banpo: 'assets/data/banpo_prices.js',
  market: 'assets/data/adjusted_etf_prices.json',
};

const RECESSION_PERIODS = [
  { start: '1929-08', end: '1933-03', label: '1929년 대공황', description: '미국 역사상 최악의 경기침체. 실업률 25%, GDP 40% 감소.' },
  { start: '1937-05', end: '1938-06', label: '1937~38 침체', description: '긴축 정책과 소비 둔화로 촉발된 침체.' },
  { start: '1945-02', end: '1945-10', label: '1945 전후 침체', description: '2차 세계대전 종료와 생산 감소로 인한 경기 둔화.' },
  { start: '1948-11', end: '1949-10', label: '1948~49 침체', description: '전후 재조정과 통화 긴축 정책 영향.' },
  { start: '1953-07', end: '1954-05', label: '1953~54 침체', description: '한국전쟁 종료 후 정부 지출 감소.' },
  { start: '1957-08', end: '1958-04', label: '1957~58 침체', description: '금리 인상과 투자 감소가 주요 원인.' },
  { start: '1960-04', end: '1961-02', label: '1960~61 침체', description: '재고 축소와 고용 둔화로 인한 경기후퇴.' },
  { start: '1969-12', end: '1970-11', label: '1969~70 침체', description: '인플레이션 억제 정책과 소비 위축.' },
  { start: '1973-11', end: '1975-03', label: '1973~75 오일쇼크', description: '오일쇼크와 스태그플레이션 발생.' },
  { start: '1980-01', end: '1980-07', label: '1980 침체', description: '고물가 대응을 위한 금리 인상, 침체 발생.' },
  { start: '1981-07', end: '1982-11', label: '1981~82 더블딥', description: '고금리 정책 지속으로 두 번째 침체 발생.' },
  { start: '1990-07', end: '1991-03', label: '1990 침체', description: '걸프전, 부동산 거품 붕괴 등 복합 요인.' },
  { start: '2001-03', end: '2001-11', label: '닷컴버블 붕괴', description: 'IT 버블 붕괴 및 9.11 테러 여파.' },
  { start: '2007-12', end: '2009-06', label: '2008 금융위기', description: '부동산 및 금융시장 붕괴로 글로벌 침체.' },
  { start: '2020-02', end: '2020-04', label: '코로나 팬데믹', description: '팬데믹에 따른 급격한 경제 봉쇄.' },
];

const groups = [
  {
    title: '투자 시뮬레이션',
    tools: ['dca-general', 'dca-sp500', 'rolling-returns', 'inflation', 'leverage', 'retirement'],
  },
  {
    title: '시장 분석',
    tools: ['trend', 'eps-per', 'recession', 'seasonality', 'm2', 'market'],
  },
  {
    title: '리스크 & 심리',
    tools: ['missing-return', 'streak', 'tuw', 'fear-greed', 'banpo'],
  },
  {
    title: '게임',
    tools: ['pinball', 'galton-board', 'number-baseball'],
  },
];

const tools = {
  'dca-general': {
    title: '일반 투자 시뮬레이션',
    icon: '◎',
    desc: '수익률, 납입액, 기간을 직접 입력해 장기 적립식 투자를 계산합니다.',
    render: renderDcaGeneral,
  },
  'dca-sp500': {
    title: 'S&P 500 적립식 투자',
    icon: 'S',
    desc: '실제 S&P 500 일별 데이터를 기준으로 월 적립 투자 성과를 계산합니다.',
    render: renderDcaSp500,
  },
  'rolling-returns': {
    title: 'Rolling Returns',
    icon: 'R',
    desc: '투자 시작 월을 기준으로 일정 기간 보유했을 때의 롤링 수익률과 분포를 확인합니다.',
    render: renderRollingReturns,
  },
  inflation: {
    title: '물가 반영 수익률',
    icon: '₩',
    desc: 'S&P 500 명목 가치와 CPI 기준 실질 가치를 비교합니다.',
    render: renderInflation,
  },
  leverage: {
    title: '레버리지 시뮬레이션',
    icon: '×',
    desc: '일일 수익률에 레버리지와 비용을 적용해 장기 성과를 비교합니다.',
    render: renderLeverage,
  },
  retirement: {
    title: '은퇴 자금 변화',
    icon: '₩',
    desc: '은퇴 후 인출, 수익률, 물가상승률에 따른 자산 변화를 추정합니다.',
    render: renderRetirement,
  },
  trend: {
    title: 'CAGR 추세 분석',
    icon: '↗',
    desc: '기간별 S&P 500 성장률과 장기 추세선을 확인합니다.',
    render: renderTrend,
  },
  'eps-per': {
    title: 'EPS & PER 분석',
    icon: 'E',
    desc: '일별 S&P 500 가격과 월간 이익(EPS)을 연결해 PER 흐름을 봅니다.',
    render: renderEpsPer,
  },
  recession: {
    title: '경기침체와 낙폭',
    icon: '↓',
    desc: '경기침체 구간과 S&P 500 drawdown을 함께 확인합니다.',
    render: renderRecession,
  },
  seasonality: {
    title: '계절성 분석',
    icon: 'M',
    desc: '월별 평균 수익률과 상승 확률을 계산합니다.',
    render: renderSeasonality,
  },
  m2: {
    title: 'M2 vs S&P 500',
    icon: '$',
    desc: '통화량(M2)과 S&P 500의 장기 흐름을 비교합니다.',
    render: renderM2,
  },
  market: {
    title: '시장 비교',
    icon: 'G',
    desc: '미국, 선진국, 신흥국 ETF의 누적 성과를 비교합니다.',
    render: renderMarketComparison,
  },
  'missing-return': {
    title: '놓친 날의 영향',
    icon: '±',
    desc: '최고/최악의 거래일을 제외했을 때 누적 성과가 어떻게 달라지는지 계산합니다.',
    render: renderMissingReturn,
  },
  streak: {
    title: '연속 상승/하락 통계',
    icon: '#',
    desc: '연속 상승 또는 하락 이후 다음날 수익률 분포를 봅니다.',
    render: renderStreak,
  },
  tuw: {
    title: 'Time Under Water',
    icon: '~',
    desc: '고점 회복까지 걸리는 기간과 drawdown 지속 구간을 분석합니다.',
    render: renderTuw,
  },
  'fear-greed': {
    title: '공포탐욕지수',
    icon: 'F',
    desc: 'Fear & Greed 지표와 S&P 500 drawdown의 관계를 확인합니다.',
    render: renderFearGreed,
  },
  banpo: {
    title: 'S&P 500 vs 반포자이',
    icon: 'B',
    desc: '주식 지수와 부동산 가격 흐름을 같은 시작점에서 비교합니다.',
    render: renderBanpo,
  },
  pinball: {
    title: 'Neon Drop Race',
    icon: 'P',
    desc: '핀볼 스타일의 standalone 게임을 웹앱 안에서 바로 실행합니다.',
    render: renderPinball,
  },
  'galton-board': {
    title: 'Galton Board Simulation',
    icon: 'G',
    desc: '갈톤 보드 확률 시뮬레이션을 웹앱 안에서 바로 실행합니다.',
    render: renderGaltonBoard,
  },
  'number-baseball': {
    title: '숫자 야구 게임',
    icon: 'N',
    desc: '숫자를 추리하는 숫자 야구 게임을 웹앱 안에서 바로 실행합니다.',
    render: renderNumberBaseball,
  },
};

const app = document.getElementById('app');
const cache = new Map();
const charts = new Map();

const recessionBandPlugin = {
  id: 'recessionBands',
  beforeDatasetsDraw(chartInstance, args, options) {
    const bands = options?.bands || [];
    const labels = chartInstance.data.labels || [];
    const xScale = chartInstance.scales.x;
    const area = chartInstance.chartArea;
    if (!bands.length || !labels.length || !xScale || !area) return;

    const { ctx } = chartInstance;
    ctx.save();
    bands.forEach((band) => {
      const startIndex = labels.findIndex((label) => label >= band.start);
      const endIndex = labels.findLastIndex((label) => label <= band.end);
      if (startIndex < 0 || endIndex < 0 || endIndex < startIndex) return;
      const left = xScale.getPixelForValue(startIndex);
      const right = xScale.getPixelForValue(endIndex);
      ctx.fillStyle = 'rgba(148, 163, 184, 0.22)';
      ctx.fillRect(left, area.top, Math.max(1, right - left), area.bottom - area.top);
    });
    ctx.restore();
  },
};

Chart.register(recessionBandPlugin);

function route() {
  return location.hash.replace(/^#\/?/, '') || 'home';
}

function krw(value) {
  if (!Number.isFinite(value)) return '-';
  return `KRW ${Math.round(value).toLocaleString('ko-KR')}`;
}

function number(value, digits = 1) {
  if (!Number.isFinite(value)) return '-';
  return value.toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

function percent(value, digits = 1) {
  if (!Number.isFinite(value)) return '-';
  return `${(value * 100).toFixed(digits)}%`;
}

function byId(id) {
  return document.getElementById(id);
}

function field(id, fallback = 0) {
  const el = byId(id);
  if (!el) return fallback;
  const rawValue = el.dataset.valueType === 'money'
    ? el.value.replace(/,/g, '')
    : el.value;
  const value = el.type === 'number' || el.dataset.valueType === 'money'
    ? Number(rawValue)
    : rawValue;
  return value === '' || Number.isNaN(value) ? fallback : value;
}

function destroyCharts() {
  charts.forEach((chart) => chart.destroy());
  charts.clear();
}

function chart(id, config) {
  const canvas = byId(id);
  if (!canvas) return null;
  if (charts.has(id)) charts.get(id).destroy();
  const instance = new Chart(canvas, {
    ...config,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { intersect: false, mode: 'index' },
      plugins: { legend: { position: 'bottom' }, ...(config.options?.plugins || {}) },
      scales: config.options?.scales,
      ...config.options,
    },
  });
  charts.set(id, instance);
  return instance;
}

async function loadText(url) {
  if (!cache.has(url)) {
    cache.set(url, fetch(url).then((res) => {
      if (!res.ok) throw new Error(`${url} ${res.status}`);
      return res.text();
    }));
  }
  return cache.get(url);
}

async function loadJson(url) {
  if (!cache.has(url)) {
    cache.set(url, fetch(url).then((res) => {
      if (!res.ok) throw new Error(`${url} ${res.status}`);
      return res.json();
    }));
  }
  return cache.get(url);
}

async function loadJsConst(url, name) {
  const key = `${url}:${name}`;
  if (!cache.has(key)) {
    cache.set(key, loadText(url).then((text) => Function(`${text}; return ${name};`)()));
  }
  return cache.get(key);
}

function toSeries(object) {
  return Object.entries(object)
    .map(([date, value]) => ({ date, value: Number(value) }))
    .filter((d) => Number.isFinite(d.value))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function monthlyFromDaily(series) {
  const months = new Map();
  series.forEach((point) => {
    const key = point.date.slice(0, 7);
    if (!months.has(key)) months.set(key, point);
  });
  return [...months.values()];
}

function monthEndFromDaily(series) {
  const months = new Map();
  series.forEach((point) => {
    months.set(point.date.slice(0, 7), point);
  });
  return [...months.values()].map((point) => ({ date: monthKey(point.date), value: point.value }));
}

function annualFromSeries(series) {
  const years = new Map();
  series.forEach((point) => years.set(point.date.slice(0, 4), point));
  return [...years.entries()].map(([year, point]) => ({ date: year, value: point.value }));
}

function monthKey(date) {
  return String(date).slice(0, 7);
}

function weekOfYear(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  const start = new Date(date.getFullYear(), 0, 1);
  const day = Math.floor((date - start) / 86400000) + 1;
  return Math.min(53, Math.floor((day - 1) / 7) + 1);
}

function filterByMonthRange(series, start, end) {
  return series.filter((point) => {
    const month = monthKey(point.date);
    return month >= start && month <= end;
  });
}

function fitExponentialTrend(rows) {
  const values = rows.map((row) => row.value).filter((value) => value > 0);
  if (values.length < 2) return { cagr: 0, fitted: rows.map(() => null) };

  const x = values.map((_, index) => index);
  const y = values.map((value) => Math.log(value));
  const n = values.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((acc, value, index) => acc + value * y[index], 0);
  const sumXX = x.reduce((acc, value) => acc + value * value, 0);
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  return {
    cagr: Math.exp(slope * 12) - 1,
    fitted: rows.map((_, index) => Math.exp(intercept + slope * index)),
  };
}

function toIndexed(rows, key = 'value') {
  const first = rows.find((row) => Number(row[key]) > 0)?.[key] || 1;
  return rows.map((row) => Number(row[key]) / first * 100);
}

function maxDrawdown(values) {
  let peak = values[0] || 0;
  let max = 0;
  return values.map((value) => {
    peak = Math.max(peak, value);
    const dd = peak ? value / peak - 1 : 0;
    max = Math.min(max, dd);
    return { dd, max };
  });
}

function pageHeader(tool) {
  return `
    <div class="tool-header">
      <div>
        <p class="eyebrow">S&P 500 Lab</p>
        <h1>${tool.title}</h1>
        <p class="lead">${tool.desc}</p>
      </div>
      <a class="button secondary" href="#/">홈으로</a>
    </div>
  `;
}

function stats(items) {
  return `<div class="stats">${items.map((item) => `
    <div class="stat"><span>${item.label}</span><strong>${item.value}</strong></div>
  `).join('')}</div>`;
}

function panel(fields, buttonText = '계산하기') {
  return `
    <div class="tool-panel">
      <div class="form-grid">${fields.join('')}</div>
      <div class="toolbar"><button class="button" id="runTool">${buttonText}</button></div>
    </div>
  `;
}

function input(id, label, value, type = 'number', attrs = '') {
  return `<div class="field"><label for="${id}">${label}</label><input id="${id}" type="${type}" value="${value}" ${attrs}></div>`;
}

function formatCommas(value) {
  const cleaned = String(value).replace(/[^\d.-]/g, '');
  if (cleaned === '' || cleaned === '-' || cleaned === '.') return cleaned;
  const [integer, decimal] = cleaned.split('.');
  const sign = integer.startsWith('-') ? '-' : '';
  const digits = integer.replace('-', '');
  const formatted = `${sign}${digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  return decimal === undefined ? formatted : `${formatted}.${decimal}`;
}

function moneyInput(id, label, value, attrs = '') {
  return input(id, label, formatCommas(value), 'text', `inputmode="numeric" data-value-type="money" ${attrs}`);
}

function bindMoneyInputs() {
  document.querySelectorAll('[data-value-type="money"]').forEach((el) => {
    el.value = formatCommas(el.value);
    el.addEventListener('input', () => {
      el.value = formatCommas(el.value);
    });
  });
}

function select(id, label, options, value) {
  return `<div class="field"><label for="${id}">${label}</label><select id="${id}">
    ${options.map((option) => `<option value="${option.value}" ${option.value === value ? 'selected' : ''}>${option.label}</option>`).join('')}
  </select></div>`;
}

function renderShell(content) {
  const current = route();
  app.innerHTML = `
    <div class="mobile-topbar">
      <strong>S&P 500 Lab</strong>
      <button class="menu-button" id="menuButton" aria-label="메뉴">☰</button>
    </div>
    <div class="app-shell">
      <aside class="sidebar" id="sidebar">
        <a class="brand" href="#/">
          <span class="brand-mark">S</span>
          <span><strong>S&P 500 Lab</strong><span>투자 분석 웹앱</span></span>
        </a>
        <a class="nav-link ${current === 'home' ? 'active' : ''}" href="#/">홈</a>
        ${groups.map((group) => `
          <div class="nav-group">
            <div class="nav-title">${group.title}</div>
            ${group.tools.map((id) => `<a class="nav-link ${current === id ? 'active' : ''}" href="#/${id}"><span>${tools[id].icon}</span>${tools[id].title}</a>`).join('')}
          </div>
        `).join('')}
      </aside>
      <main class="main"><div class="page">${content}</div></main>
    </div>
  `;
  byId('menuButton')?.addEventListener('click', () => byId('sidebar')?.classList.toggle('open'));
  bindMoneyInputs();
}

function renderHome() {
  const count = Object.keys(tools).length;
  renderShell(`
    <section class="hero">
      <div class="hero-content">
        <p class="eyebrow">No report pages, only interactive tools</p>
        <h1>데이터로 직접 확인하는 S&P 500 투자 실험실</h1>
        <p class="lead">${count}개의 분석 도구를 하나의 웹앱으로 구성되었습니다.</p>
        <div class="toolbar"><a class="button" href="#/trend">분석 시작</a><a class="button secondary" href="#/dca-sp500">적립식 투자 보기</a></div>
      </div>
    </section>
    ${groups.map((group) => `
      <section class="section">
        <h2>${group.title}</h2>
        <p class="lead">자주 쓰는 흐름은 입력, 핵심 지표, 차트 순서입니다.</p>
        <div class="grid">${group.tools.map((id) => {
          const tool = tools[id];
          return `<a class="card" href="#/${id}"><span class="icon">${tool.icon}</span><h3>${tool.title}</h3><p>${tool.desc}</p></a>`;
        }).join('')}</div>
      </section>
    `).join('')}
  `);
}

async function renderTool(id) {
  const tool = tools[id];
  if (!tool) return renderHome();
  destroyCharts();
  renderShell(`${pageHeader(tool)}<div class="empty">데이터를 준비하고 있습니다.</div>`);
  try {
    await tool.render();
  } catch (error) {
    renderShell(`${pageHeader(tool)}<div class="notice">도구를 불러오지 못했습니다: ${error.message}</div>`);
  }
}

function renderStandaloneGame(toolId, gameUrl) {
  const tool = tools[toolId];
  renderShell(`${pageHeader(tool)}
    <div class="toolbar game-toolbar">
      <a class="button" href="${gameUrl}" target="_blank" rel="noopener">새 탭에서 열기</a>
    </div>
    <div class="game-frame-panel">
      <iframe class="game-frame" src="${gameUrl}" title="${tool.title}" allow="fullscreen; gamepad" allowfullscreen></iframe>
    </div>`);
}

function renderPinball() {
  renderStandaloneGame('pinball', 'src/game_pinball/pinball_standalone.html');
}

function renderGaltonBoard() {
  renderStandaloneGame('galton-board', 'src/galton_board/galtonboard.html');
}

function renderNumberBaseball() {
  renderStandaloneGame('number-baseball', 'src/number_baseball/number_baseball_game.html');
}

async function renderDcaGeneral() {
  const tool = tools['dca-general'];
  renderShell(`${pageHeader(tool)}${panel([
    moneyInput('initial', '초기 투자금(KRW)', 10000000),
    moneyInput('monthly', '월 투자금(KRW)', 500000),
    input('annualReturn', '연 수익률(%)', 8),
    input('years', '투자 기간(년)', 30),
  ], '시뮬레이션 실행')}<div id="result"></div><div class="chart-panel"><canvas id="mainChart"></canvas></div>`);
  const run = () => {
    const initial = field('initial', 10000);
    const monthly = field('monthly', 500);
    const annual = field('annualReturn', 8) / 100;
    const years = field('years', 30);
    const monthlyRate = (1 + annual) ** (1 / 12) - 1;
    let balance = initial;
    let invested = initial;
    const rows = [{ date: '0', balance, invested }];
    for (let i = 1; i <= years * 12; i += 1) {
      balance = balance * (1 + monthlyRate) + monthly;
      invested += monthly;
      if (i % 12 === 0) rows.push({ date: `${i / 12}년`, balance, invested });
    }
    byId('result').innerHTML = stats([
      { label: '최종 자산', value: krw(balance) },
      { label: '투자 원금', value: krw(invested) },
      { label: '수익', value: krw(balance - invested) },
      { label: '총 수익률', value: percent(balance / invested - 1) },
    ]);
    chart('mainChart', {
      type: 'line',
      data: { labels: rows.map((r) => r.date), datasets: [
        { label: '자산', data: rows.map((r) => r.balance), borderColor: '#2563eb', tension: 0.2 },
        { label: '원금', data: rows.map((r) => r.invested), borderColor: '#94a3b8', tension: 0.2 },
      ] },
    });
  };
  byId('runTool').addEventListener('click', run);
  run();
}

async function renderDcaSp500() {
  const series = monthlyFromDaily(toSeries(await loadJsConst(DATA.daily, 'priceData')));
  const minYear = Number(series[0].date.slice(0, 4));
  const maxYear = Number(series.at(-1).date.slice(0, 4));
  const tool = tools['dca-sp500'];
  renderShell(`${pageHeader(tool)}${panel([
    input('startYear', '시작 연도', Math.max(1990, minYear), 'number', `min="${minYear}" max="${maxYear}"`),
    input('endYear', '종료 연도', maxYear, 'number', `min="${minYear}" max="${maxYear}"`),
    moneyInput('monthly', '월 투자금(KRW)', 500000),
    moneyInput('initial', '초기 투자금(KRW)', 10000000),
  ], '실제 데이터로 계산')}<div id="result"></div><div class="chart-panel"><canvas id="mainChart"></canvas></div>`);
  const run = () => {
    const startYear = field('startYear', 1990);
    const endYear = field('endYear', maxYear);
    const monthly = field('monthly', 500);
    const initial = field('initial', 10000);
    const rows = series.filter((d) => {
      const year = Number(d.date.slice(0, 4));
      return year >= startYear && year <= endYear;
    });
    let units = initial / rows[0].value;
    let invested = initial;
    const out = rows.map((row, index) => {
      if (index > 0) {
        units += monthly / row.value;
        invested += monthly;
      }
      return { date: row.date.slice(0, 7), balance: units * row.value, invested };
    });
    const last = out.at(-1);
    byId('result').innerHTML = stats([
      { label: '최종 자산', value: krw(last.balance) },
      { label: '투자 원금', value: krw(last.invested) },
      { label: '수익률', value: percent(last.balance / last.invested - 1) },
      { label: '매수 개월', value: `${out.length}개월` },
    ]);
    chart('mainChart', { type: 'line', data: { labels: out.map((r) => r.date), datasets: [
      { label: 'S&P 500 적립 자산', data: out.map((r) => r.balance), borderColor: '#2563eb', pointRadius: 0 },
      { label: '투자 원금', data: out.map((r) => r.invested), borderColor: '#94a3b8', pointRadius: 0 },
    ] } });
  };
  byId('runTool').addEventListener('click', run);
  run();
}

async function renderTrend() {
  const series = monthlyFromDaily(toSeries(await loadJsConst(DATA.daily, 'priceData'))).map((row) => ({
    date: monthKey(row.date),
    value: row.value,
  }));
  const tool = tools.trend;
  renderShell(`${pageHeader(tool)}${panel([
    input('startMonth', '시작 월', series[0].date, 'month'),
    input('endMonth', '종료 월', series.at(-1).date, 'month'),
    select('scale', 'Y축 스케일', [{ value: 'linear', label: '선형' }, { value: 'logarithmic', label: '로그' }], 'logarithmic'),
  ], '추세 계산')}<div id="result"></div><div class="chart-panel"><canvas id="mainChart"></canvas></div><div class="chart-panel"><canvas id="drawdownChart"></canvas></div>`);
  const run = () => {
    const rows = filterByMonthRange(series, field('startMonth', series[0].date), field('endMonth', series.at(-1).date));
    const first = rows[0].value;
    const last = rows.at(-1).value;
    const years = (rows.length - 1) / 12;
    const cagr = (last / first) ** (1 / years) - 1;
    const fitted = fitExponentialTrend(rows);
    const draw = maxDrawdown(rows.map((r) => r.value));
    byId('result').innerHTML = stats([
      { label: '단순 CAGR', value: percent(cagr) },
      { label: 'Trend fitting CAGR', value: percent(fitted.cagr) },
      { label: '누적 수익률', value: percent(last / first - 1) },
      { label: '최대 낙폭', value: percent(draw.at(-1).max) },
      { label: '분석 기간', value: `${rows[0].date}~${rows.at(-1).date}` },
    ]);
    chart('mainChart', { type: 'line', data: { labels: rows.map((r) => r.date), datasets: [
      { label: 'S&P 500', data: rows.map((r) => r.value), borderColor: '#2563eb', pointRadius: 0 },
      { label: 'Trend fitting', data: fitted.fitted, borderColor: '#059669', borderDash: [6, 5], pointRadius: 0 },
    ] }, options: { scales: { y: { type: field('scale', 'logarithmic') } } } });
    chart('drawdownChart', { type: 'line', data: { labels: rows.map((r) => r.date), datasets: [
      { label: 'Drawdown (%)', data: draw.map((d) => d.dd * 100), borderColor: '#dc2626', backgroundColor: 'rgba(220,38,38,.12)', fill: true, pointRadius: 0 },
    ] }, options: { scales: { y: { ticks: { callback: (value) => `${value}%` } } } } });
  };
  byId('runTool').addEventListener('click', run);
  run();
}

async function renderRollingReturns() {
  const series = monthEndFromDaily(toSeries(await loadJsConst(DATA.daily, 'priceData')));
  const tool = tools['rolling-returns'];
  renderShell(`${pageHeader(tool)}${panel([
    input('years', '롤링 기간(년)', 10),
  ], '분포 계산')}<div id="result"></div><div class="chart-panel"><canvas id="mainChart"></canvas></div><div class="chart-panel"><canvas id="histChart"></canvas></div>`);
  const run = () => {
    const months = field('years', 10) * 12;
    const returns = [];
    for (let i = 0; i + months < series.length; i += 1) {
      const start = series[i];
      const end = series[i + months];
      returns.push({
        date: start.date,
        endDate: end.date,
        value: (end.value / start.value) ** (12 / months) - 1,
      });
    }
    const values = returns.map((r) => r.value);
    if (!values.length) {
      byId('result').innerHTML = '<div class="notice">선택한 롤링 기간보다 데이터 범위가 짧습니다.</div>';
      return;
    }
    byId('result').innerHTML = stats([
      { label: '평균 연수익률', value: percent(values.reduce((a, b) => a + b, 0) / values.length) },
      { label: '최고', value: percent(Math.max(...values)) },
      { label: '최저', value: percent(Math.min(...values)) },
      { label: '샘플 수', value: `${values.length}` },
      { label: '투자 시작 범위', value: `${returns[0].date}~${returns.at(-1).date}` },
      { label: '마지막 종료 월', value: returns.at(-1).endDate },
    ]);
    chart('mainChart', { type: 'line', data: { labels: returns.map((r) => r.date), datasets: [{ label: '투자 시작 월 기준 롤링 CAGR', data: values, borderColor: '#2563eb', pointRadius: 0 }] } });
    const bins = Array.from({ length: 12 }, (_, i) => ({ label: `${-10 + i * 5}%`, count: 0 }));
    values.forEach((v) => {
      const index = Math.max(0, Math.min(bins.length - 1, Math.floor(((v * 100) + 10) / 5)));
      bins[index].count += 1;
    });
    chart('histChart', { type: 'bar', data: { labels: bins.map((b) => b.label), datasets: [{ label: '분포', data: bins.map((b) => b.count), backgroundColor: '#60a5fa' }] } });
  };
  byId('runTool').addEventListener('click', run);
  run();
}

async function renderInflation() {
  const prices = monthlyFromDaily(toSeries(await loadJsConst(DATA.daily, 'priceData'))).map((row) => ({ date: monthKey(row.date), value: row.value }));
  const cpi = monthlyFromDaily(toSeries(await loadJsConst(DATA.cpi, 'const_CPI'))).map((row) => ({ date: monthKey(row.date), value: row.value }));
  const cpiMap = new Map(cpi.map((d) => [d.date, d.value]));
  const rows = prices.filter((d) => cpiMap.has(d.date)).map((d) => ({ date: d.date, price: d.value, cpi: cpiMap.get(d.date) }));
  const base = rows[0];
  rows.forEach((r) => {
    r.nominal = r.price / base.price * 100;
    r.real = (r.price / base.price) / (r.cpi / base.cpi) * 100;
  });
  const last = rows.at(-1);
  const tool = tools.inflation;
  renderShell(`${pageHeader(tool)}${stats([
    { label: '명목 성장', value: `${number(last.nominal, 0)}배 기준` },
    { label: '실질 성장', value: `${number(last.real, 0)}배 기준` },
    { label: 'CPI 상승', value: `${number(last.cpi / base.cpi, 1)}배` },
    { label: '기간', value: `${base.date}~${last.date}` },
  ])}<div class="chart-panel"><canvas id="mainChart"></canvas></div>`);
  chart('mainChart', { type: 'line', data: { labels: rows.map((r) => r.date), datasets: [
    { label: '명목 S&P 500 (100=시작)', data: rows.map((r) => r.nominal), borderColor: '#2563eb', pointRadius: 0 },
    { label: '실질 S&P 500 (CPI 조정)', data: rows.map((r) => r.real), borderColor: '#059669', pointRadius: 0 },
  ] }, options: { scales: { y: { type: 'logarithmic' } } } });
}

async function renderLeverage() {
  const series = toSeries(await loadJsConst(DATA.daily, 'priceData'));
  const tool = tools.leverage;
  renderShell(`${pageHeader(tool)}${panel([
    input('leverage', '레버리지 배율', 2),
    input('fee', '연 비용(%)', 0.9),
    input('startYear', '시작 연도', 1990),
  ], '계산')}<div id="result"></div><div class="chart-panel"><canvas id="mainChart"></canvas></div>`);
  const run = () => {
    const lev = field('leverage', 2);
    const fee = field('fee', 0.9) / 100 / 252;
    const startYear = Number(field('startYear', 1990));
    const rows = series.filter((d) => Number(d.date.slice(0, 4)) >= startYear);
    let normal = 100;
    let leveraged = 100;
    const out = [{ date: rows[0].date, normal, leveraged }];
    for (let i = 1; i < rows.length; i += 1) {
      const daily = rows[i].value / rows[i - 1].value - 1;
      normal *= 1 + daily;
      leveraged *= Math.max(0, 1 + daily * lev - fee);
      if (i % 21 === 0) out.push({ date: rows[i].date, normal, leveraged });
    }
    byId('result').innerHTML = stats([
      { label: '일반 지수', value: number(normal, 1) },
      { label: '레버리지', value: number(leveraged, 1) },
      { label: '상대 배율', value: `${number(leveraged / normal, 2)}x` },
      { label: '기간', value: `${rows[0].date}~${rows.at(-1).date}` },
    ]);
    chart('mainChart', { type: 'line', data: { labels: out.map((r) => r.date), datasets: [
      { label: 'S&P 500', data: out.map((r) => r.normal), borderColor: '#2563eb', pointRadius: 0 },
      { label: `${lev}x`, data: out.map((r) => r.leveraged), borderColor: '#dc2626', pointRadius: 0 },
    ] }, options: { scales: { y: { type: 'logarithmic' } } } });
  };
  byId('runTool').addEventListener('click', run);
  run();
}

async function renderRetirement() {
  const tool = tools.retirement;
  renderShell(`${pageHeader(tool)}${panel([
    moneyInput('assets', '초기 자산(KRW)', 1000000),
    moneyInput('withdrawal', '연 인출액(KRW)', 40000),
    input('returnRate', '연 수익률(%)', 5),
    input('inflation', '인출 증가율(%)', 2),
    input('years', '시뮬레이션 기간', 35),
  ], '은퇴 자금 계산')}<div id="result"></div><div class="chart-panel"><canvas id="mainChart"></canvas></div>`);
  const run = () => {
    let assets = field('assets', 1000000);
    let withdrawal = field('withdrawal', 40000);
    const returnRate = field('returnRate', 5) / 100;
    const inflation = field('inflation', 2) / 100;
    const years = field('years', 35);
    const rows = [{ year: 0, assets }];
    let depleted = null;
    for (let year = 1; year <= years; year += 1) {
      assets = assets * (1 + returnRate) - withdrawal;
      if (assets <= 0 && depleted === null) depleted = year;
      rows.push({ year, assets: Math.max(0, assets) });
      withdrawal *= 1 + inflation;
    }
    byId('result').innerHTML = stats([
      { label: '최종 자산', value: krw(rows.at(-1).assets) },
      { label: '고갈 시점', value: depleted ? `${depleted}년차` : '고갈 없음' },
      { label: '초기 인출률', value: percent(field('withdrawal', 40000) / field('assets', 1000000)) },
      { label: '기간', value: `${years}년` },
    ]);
    chart('mainChart', { type: 'line', data: { labels: rows.map((r) => `${r.year}년`), datasets: [{ label: '은퇴 자산', data: rows.map((r) => r.assets), borderColor: '#2563eb', backgroundColor: 'rgba(37,99,235,.12)', fill: true }] } });
  };
  byId('runTool').addEventListener('click', run);
  run();
}

async function renderEpsPer() {
  const prices = monthEndFromDaily(toSeries(await loadJsConst(DATA.daily, 'priceData')));
  const eps = toSeries(await loadJsConst(DATA.eps, 'EPSData'));
  const priceMap = new Map(prices.map((d) => [d.date, d.value]));
  const epsMap = new Map(eps.map((d) => [d.date.slice(0, 7), d.value]));
  const allRows = [...epsMap.entries()]
    .filter(([date]) => priceMap.has(date))
    .map(([date, epsValue]) => ({ date, price: priceMap.get(date), eps: epsValue }))
    .sort((a, b) => a.date.localeCompare(b.date));
  allRows.forEach((r) => { r.per = r.eps ? r.price / r.eps : null; });
  const tool = tools['eps-per'];
  renderShell(`${pageHeader(tool)}${panel([
    input('startMonth', '시작 월', allRows[0].date, 'month'),
    input('endMonth', '종료 월', allRows.at(-1).date, 'month'),
    select('priceScale', 'S&P500 축', [{ value: 'linear', label: '선형' }, { value: 'logarithmic', label: '로그' }], 'logarithmic'),
    select('epsScale', 'EPS 축', [{ value: 'linear', label: '선형' }, { value: 'logarithmic', label: '로그' }], 'logarithmic'),
  ], '그래프 업데이트')}<div id="result"></div><div class="chart-panel"><canvas id="priceChart"></canvas></div><div class="chart-panel"><canvas id="perChart"></canvas></div>`);
  const run = () => {
    const rows = filterByMonthRange(allRows, field('startMonth', allRows[0].date), field('endMonth', allRows.at(-1).date));
    byId('result').innerHTML = stats([
      { label: '최근 EPS', value: number(rows.at(-1).eps, 1) },
      { label: '최근 PER', value: number(rows.at(-1).per, 1) },
      { label: '가격 데이터', value: `${rows.length}개월` },
      { label: '기간', value: `${rows[0].date}~${rows.at(-1).date}` },
    ]);
    chart('priceChart', { type: 'line', data: { labels: rows.map((r) => r.date), datasets: [
      { label: 'S&P 500', data: rows.map((r) => r.price), borderColor: '#2563eb', pointRadius: 0 },
      { label: 'EPS', data: rows.map((r) => r.eps), borderColor: '#059669', pointRadius: 0, yAxisID: 'y1' },
    ] }, options: { scales: { y: { type: field('priceScale', 'logarithmic') }, y1: { type: field('epsScale', 'linear'), position: 'right' } } } });
    chart('perChart', { type: 'line', data: { labels: rows.map((r) => r.date), datasets: [{ label: 'PER', data: rows.map((r) => r.per), borderColor: '#b45309', pointRadius: 0 }] } });
  };
  byId('runTool').addEventListener('click', run);
  run();
}

async function renderM2() {
  const prices = monthlyFromDaily(toSeries(await loadJsConst(DATA.daily, 'priceData'))).map((row) => ({ date: monthKey(row.date), value: row.value }));
  const m2 = monthlyFromDaily(toSeries(await loadJsConst(DATA.m2, 'const_M2'))).map((row) => ({ date: monthKey(row.date), value: row.value }));
  const m2Map = new Map(m2.map((d) => [d.date, d.value]));
  const rows = prices.filter((d) => m2Map.has(d.date)).map((d) => ({ date: d.date, price: d.value, m2: m2Map.get(d.date) }));
  const base = rows[0];
  const tool = tools.m2;
  renderShell(`${pageHeader(tool)}${panel([
    input('startMonth', '시작 월', rows[0].date, 'month'),
    input('endMonth', '종료 월', rows.at(-1).date, 'month'),
    select('scale', 'Y축 스케일', [{ value: 'linear', label: '선형' }, { value: 'logarithmic', label: '로그' }], 'logarithmic'),
  ], '그래프 업데이트')}<div class="chart-panel"><canvas id="mainChart"></canvas></div>`);
  const run = () => {
    const filtered = filterByMonthRange(rows, field('startMonth', rows[0].date), field('endMonth', rows.at(-1).date));
    const filteredBase = filtered[0];
    chart('mainChart', { type: 'line', data: { labels: filtered.map((r) => r.date), datasets: [
      { label: 'S&P 500 (100=시작)', data: filtered.map((r) => r.price / filteredBase.price * 100), borderColor: '#2563eb', pointRadius: 0 },
      { label: 'M2 (100=시작)', data: filtered.map((r) => r.m2 / filteredBase.m2 * 100), borderColor: '#059669', pointRadius: 0 },
    ] }, options: { scales: { y: { type: field('scale', 'logarithmic') } } } });
  };
  byId('runTool').addEventListener('click', run);
  run();
}

async function renderBanpo() {
  const prices = toSeries(await loadJsConst(DATA.daily, 'priceData'));
  const banpo = await loadJsConst(DATA.banpo, 'banpoData');
  const bRows = banpo.labels.map((date, i) => ({ date, value: banpo.prices[i] })).filter((d) => Number.isFinite(d.value));
  const start = bRows[0].date;
  const pRows = monthlyFromDaily(prices.filter((d) => d.date >= start)).map((row) => ({ date: monthKey(row.date), value: row.value }));
  const bByMonth = new Map();
  bRows.forEach((row) => bByMonth.set(monthKey(row.date), row.value));
  const rows = pRows.map((row) => ({ date: row.date, sp500: row.value, banpo: bByMonth.get(row.date) ?? null }));
  const tool = tools.banpo;
  renderShell(`${pageHeader(tool)}${panel([
    input('startMonth', '시작 월', rows[0].date, 'month'),
    input('endMonth', '종료 월', rows.at(-1).date, 'month'),
    select('mode', '표시 방식', [{ value: 'actual', label: '실제 가격' }, { value: 'indexed', label: '100 기준 비교' }], 'actual'),
    select('scale', 'Y축 스케일', [{ value: 'linear', label: '선형' }, { value: 'logarithmic', label: '로그' }], 'linear'),
  ], '그래프 업데이트')}<div id="result"></div><div class="chart-panel"><canvas id="mainChart"></canvas></div>`);
  const run = () => {
    const filtered = filterByMonthRange(rows, field('startMonth', rows[0].date), field('endMonth', rows.at(-1).date));
    const banpoActual = filtered.filter((row) => row.banpo);
    const mode = field('mode', 'actual');
    const recentRows = bRows.slice(-10).reverse().map((row) => `<tr><td>${row.date}</td><td>${number(row.value, 0)}</td></tr>`).join('');
    byId('result').innerHTML = stats([
      { label: '반포자이 거래 수', value: `${bRows.length}건` },
      { label: '최근 반포자이 가격', value: number(bRows.at(-1).value, 0) },
      { label: '비교 월 수', value: `${filtered.length}개월` },
      { label: '반포자이 월 데이터', value: `${banpoActual.length}개월` },
    ]) + `<div class="table-wrap"><table><thead><tr><th>최근 거래일</th><th>반포자이 가격</th></tr></thead><tbody>${recentRows}</tbody></table></div>`;
    if (mode === 'indexed') {
      const spBase = filtered[0].sp500;
      const bBase = banpoActual[0]?.banpo || 1;
      chart('mainChart', { type: 'line', data: { labels: filtered.map((r) => r.date), datasets: [
        { label: 'S&P 500 (100=시작)', data: filtered.map((r) => r.sp500 / spBase * 100), borderColor: '#2563eb', pointRadius: 0 },
        { label: '반포자이 (100=시작)', data: filtered.map((r) => r.banpo ? r.banpo / bBase * 100 : null), borderColor: '#059669', pointRadius: 0, spanGaps: true },
      ] }, options: { scales: { y: { type: field('scale', 'linear') } } } });
      return;
    }
    chart('mainChart', { type: 'line', data: { labels: filtered.map((r) => r.date), datasets: [
      { label: 'S&P 500', data: filtered.map((r) => r.sp500), borderColor: '#2563eb', pointRadius: 0 },
      { label: '반포자이 실제 가격', data: filtered.map((r) => r.banpo), borderColor: '#059669', pointRadius: 0, spanGaps: true, yAxisID: 'y1' },
    ] }, options: { scales: { y: { type: field('scale', 'linear') }, y1: { type: field('scale', 'linear'), position: 'right' } } } });
  };
  byId('runTool').addEventListener('click', run);
  run();
}

async function renderMarketComparison() {
  const data = await loadJson(DATA.market);
  const keys = Object.keys(data[0]).filter((key) => key.toLowerCase() !== 'date');
  const monthMap = new Map();
  data.forEach((row) => {
    const date = row.Date || row.date;
    monthMap.set(monthKey(date), row);
  });
  const rows = [...monthMap.entries()].map(([date, row]) => ({ date, ...row })).sort((a, b) => a.date.localeCompare(b.date));
  const colors = ['#2563eb', '#059669', '#dc2626', '#b45309'];
  const tool = tools.market;
  renderShell(`${pageHeader(tool)}${panel([
    input('startMonth', '시작 월', rows[0].date, 'month'),
    input('endMonth', '종료 월', rows.at(-1).date, 'month'),
    select('scale', 'Y축 스케일', [{ value: 'linear', label: '선형' }, { value: 'logarithmic', label: '로그' }], 'logarithmic'),
  ], '시장 비교 업데이트')}<div id="result"></div><div class="chart-panel"><canvas id="mainChart"></canvas></div>`);
  const run = () => {
    const filtered = filterByMonthRange(rows, field('startMonth', rows[0].date), field('endMonth', rows.at(-1).date));
    const summaries = keys.map((key) => {
      const values = filtered.map((row) => Number(row[key])).filter(Number.isFinite);
      return { key, maxDd: maxDrawdown(values).at(-1).max };
    });
    byId('result').innerHTML = `<div class="table-wrap"><table><thead><tr><th>시장</th><th>최대 낙폭</th></tr></thead><tbody>${summaries.map((row) => `<tr><td>${row.key}</td><td>${percent(row.maxDd)}</td></tr>`).join('')}</tbody></table></div>`;
    chart('mainChart', { type: 'line', data: { labels: filtered.map((row) => row.date), datasets: keys.map((key, i) => {
      const first = Number(filtered.find((row) => Number(row[key]))?.[key] || 1);
      return { label: key, data: filtered.map((row) => Number(row[key]) / first * 100), borderColor: colors[i % colors.length], pointRadius: 0 };
    }) }, options: { scales: { y: { type: field('scale', 'logarithmic') } } } });
  };
  byId('runTool').addEventListener('click', run);
  run();
}

async function renderFearGreed() {
  const prices = toSeries(await loadJsConst(DATA.fearGreed, 'priceData'));
  const fg = toSeries(await loadJsConst(DATA.fearGreed, 'fearGreedData'));
  const fgMap = new Map(fg.map((d) => [d.date, d.value]));
  const rows = prices.filter((d) => fgMap.has(d.date)).map((d) => ({ date: d.date, price: d.value, fg: fgMap.get(d.date) }));
  const draw = maxDrawdown(rows.map((r) => r.price));
  rows.forEach((row, index) => { row.dd = draw[index].dd; });
  const tool = tools['fear-greed'];
  renderShell(`${pageHeader(tool)}${stats([
    { label: '데이터 시작', value: rows[0].date },
    { label: '데이터 종료', value: rows.at(-1).date },
    { label: '최대 낙폭', value: percent(draw.at(-1).max) },
  ])}<div class="chart-panel"><canvas id="mainChart"></canvas></div>`);
  chart('mainChart', { type: 'line', data: { labels: rows.map((r) => r.date), datasets: [
    { label: 'S&P 500', data: rows.map((r) => r.price), borderColor: '#2563eb', pointRadius: 0 },
    { label: 'Fear & Greed', data: rows.map((r) => r.fg), borderColor: '#059669', pointRadius: 0, yAxisID: 'y1' },
    { label: 'Drawdown', data: rows.map((r) => r.dd * 100), borderColor: '#dc2626', pointRadius: 0, yAxisID: 'y1' },
  ] }, options: { scales: { y: {}, y1: { position: 'right' } } } });
}

async function renderMissingReturn() {
  const series = toSeries(await loadJsConst(DATA.daily, 'priceData'));
  const tool = tools['missing-return'];
  renderShell(`${pageHeader(tool)}${panel([
    input('days', '제외할 최고/최악 일수', 10),
    select('mode', '제외 방식', [{ value: 'best', label: '최고일 제외' }, { value: 'worst', label: '최악일 제외' }, { value: 'both', label: '최고+최악 제외' }], 'best'),
  ], '영향 계산')}<div id="result"></div><div class="chart-panel"><canvas id="mainChart"></canvas></div>`);
  const run = () => {
    const n = field('days', 10);
    const mode = field('mode', 'best');
    const returns = series.slice(1).map((d, i) => ({ date: d.date, r: d.value / series[i].value - 1 }));
    const best = new Set([...returns].sort((a, b) => b.r - a.r).slice(0, n).map((d) => d.date));
    const worst = new Set([...returns].sort((a, b) => a.r - b.r).slice(0, n).map((d) => d.date));
    let base = 100;
    let altered = 100;
    const out = returns.map((d, i) => {
      base *= 1 + d.r;
      const skip = (mode === 'best' && best.has(d.date)) || (mode === 'worst' && worst.has(d.date)) || (mode === 'both' && (best.has(d.date) || worst.has(d.date)));
      if (!skip) altered *= 1 + d.r;
      return i % 21 === 0 ? { date: d.date, base, altered } : null;
    }).filter(Boolean);
    byId('result').innerHTML = stats([
      { label: '원래 성과', value: number(base, 0) },
      { label: '변경 성과', value: number(altered, 0) },
      { label: '차이', value: percent(altered / base - 1) },
    ]);
    chart('mainChart', { type: 'line', data: { labels: out.map((r) => r.date), datasets: [
      { label: '원래', data: out.map((r) => r.base), borderColor: '#2563eb', pointRadius: 0 },
      { label: '제외 후', data: out.map((r) => r.altered), borderColor: '#dc2626', pointRadius: 0 },
    ] }, options: { scales: { y: { type: 'logarithmic' } } } });
  };
  byId('runTool').addEventListener('click', run);
  run();
}

async function renderRecession() {
  const series = monthlyFromDaily(toSeries(await loadJsConst(DATA.daily, 'priceData'))).map((row) => ({ date: monthKey(row.date), value: row.value }));
  const draw = maxDrawdown(series.map((r) => r.value));
  const visibleRecessions = RECESSION_PERIODS.filter((period) => period.start <= series.at(-1).date && period.end >= series[0].date);
  const tableRows = visibleRecessions.map((period) => {
    const rows = series.filter((row) => row.date >= period.start && row.date <= period.end);
    if (rows.length < 2) return '';
    let peak = rows[0].value;
    let mdd = 0;
    rows.forEach((row) => {
      peak = Math.max(peak, row.value);
      mdd = Math.min(mdd, row.value / peak - 1);
    });
    const startValue = rows[0].value;
    const endValue = rows.at(-1).value;
    return `<tr>
      <td>${period.label}</td>
      <td>${period.start}~${period.end}</td>
      <td>${number(startValue, 1)}</td>
      <td>${number(endValue, 1)}</td>
      <td>${percent(endValue / startValue - 1)}</td>
      <td>${percent(mdd)}</td>
      <td>${period.description}</td>
    </tr>`;
  }).join('');
  const tool = tools.recession;
  renderShell(`${pageHeader(tool)}${stats([
    { label: '최대 낙폭', value: percent(draw.at(-1).max) },
    { label: '월 데이터', value: `${series.length}개월` },
    { label: '기간', value: `${series[0].date}~${series.at(-1).date}` },
    { label: '경기침체 구간', value: `${visibleRecessions.length}개` },
  ])}<div class="chart-panel"><canvas id="mainChart"></canvas></div><div class="chart-panel"><canvas id="ddChart"></canvas></div><div class="table-wrap"><table><thead><tr><th>리세션</th><th>기간</th><th>시작 지수</th><th>종료 지수</th><th>변화율</th><th>최대 낙폭</th><th>설명</th></tr></thead><tbody>${tableRows}</tbody></table></div>`);
  chart('mainChart', {
    type: 'line',
    data: { labels: series.map((r) => r.date), datasets: [{ label: 'S&P 500', data: series.map((r) => r.value), borderColor: '#2563eb', pointRadius: 0 }] },
    options: { scales: { y: { type: 'logarithmic' } }, plugins: { recessionBands: { bands: visibleRecessions } } },
  });
  chart('ddChart', {
    type: 'line',
    data: { labels: series.map((r) => r.date), datasets: [{ label: 'Drawdown (%)', data: draw.map((d) => d.dd * 100), borderColor: '#dc2626', backgroundColor: 'rgba(220,38,38,.12)', fill: true, pointRadius: 0 }] },
    options: { plugins: { recessionBands: { bands: visibleRecessions } } },
  });
}

async function renderSeasonality() {
  const series = toSeries(await loadJsConst(DATA.daily, 'priceData'));
  const minYear = Number(series[0].date.slice(0, 4));
  const maxYear = Number(series.at(-1).date.slice(0, 4));
  const labels = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
  const tool = tools.seasonality;
  renderShell(`${pageHeader(tool)}${panel([
    input('startYear', '시작 연도', Math.max(1928, minYear), 'number', `min="${minYear}" max="${maxYear}"`),
    input('endYear', '종료 연도', maxYear, 'number', `min="${minYear}" max="${maxYear}"`),
  ], '계절성 업데이트')}<div id="result"></div><div class="chart-panel"><canvas id="weeklyChart"></canvas></div><div class="chart-panel"><canvas id="avgChart"></canvas></div><div class="chart-panel"><canvas id="winChart"></canvas></div>`);
  const run = () => {
    const startYear = Math.max(minYear, Number(field('startYear', minYear)));
    const endYear = Math.min(maxYear, Number(field('endYear', maxYear)));
    if (startYear > endYear) {
      byId('result').innerHTML = '<div class="notice">시작 연도는 종료 연도보다 작거나 같아야 합니다.</div>';
      return;
    }

    const years = Array.from({ length: endYear - startYear + 1 }, (_, index) => startYear + index);
    const weeklyBuckets = Array.from({ length: 53 }, () => []);
    const monthlyBuckets = Array.from({ length: 12 }, () => []);

    years.forEach((year) => {
      const rows = series.filter((row) => Number(row.date.slice(0, 4)) === year);
      if (rows.length < 2) return;

      const firstPrice = rows[0].value;
      const weekEndPrices = new Map();
      rows.forEach((row) => weekEndPrices.set(weekOfYear(row.date), row.value));
      let latestPrice = firstPrice;
      for (let week = 1; week <= 53; week += 1) {
        if (weekEndPrices.has(week)) latestPrice = weekEndPrices.get(week);
        weeklyBuckets[week - 1].push(latestPrice / firstPrice - 1);
      }

      for (let month = 0; month < 12; month += 1) {
        const monthRows = rows.filter((row) => Number(row.date.slice(5, 7)) === month + 1);
        if (monthRows.length >= 2) monthlyBuckets[month].push(monthRows.at(-1).value / monthRows[0].value - 1);
      }
    });

    const weeklyAvg = weeklyBuckets.map((bucket) => (bucket.length ? bucket.reduce((a, b) => a + b, 0) / bucket.length : 0));
    const avg = monthlyBuckets.map((bucket) => (bucket.length ? bucket.reduce((a, b) => a + b, 0) / bucket.length : 0));
    const win = monthlyBuckets.map((bucket) => (bucket.length ? bucket.filter((value) => value > 0).length / bucket.length : 0));
    const bestIndex = avg.indexOf(Math.max(...avg));
    const worstIndex = avg.indexOf(Math.min(...avg));

    byId('result').innerHTML = stats([
      { label: '분석 기간', value: `${startYear}~${endYear}` },
      { label: '가장 강한 월', value: `${labels[bestIndex]} ${percent(avg[bestIndex])}` },
      { label: '가장 약한 월', value: `${labels[worstIndex]} ${percent(avg[worstIndex])}` },
      { label: '연말 평균 누적', value: percent(weeklyAvg.at(-1)) },
    ]);
    chart('weeklyChart', { type: 'line', data: { labels: weeklyAvg.map((_, index) => `${index + 1}주`), datasets: [{ label: '주간 평균 누적 수익률(%)', data: weeklyAvg.map((value) => value * 100), borderColor: '#2563eb', backgroundColor: 'rgba(37,99,235,.12)', fill: true, pointRadius: 0, tension: 0.25 }] } });
    chart('avgChart', { type: 'bar', data: { labels, datasets: [{ label: '월별 평균 수익률(%)', data: avg.map((v) => v * 100), backgroundColor: '#60a5fa' }] } });
    chart('winChart', { type: 'bar', data: { labels, datasets: [{ label: '상승 확률(%)', data: win.map((v) => v * 100), backgroundColor: '#34d399' }] } });
  };
  byId('runTool').addEventListener('click', run);
  run();
}

async function renderStreak() {
  const series = toSeries(await loadJsConst(DATA.daily, 'priceData'));
  const result = new Map();
  let streak = 0;
  for (let i = 1; i < series.length - 1; i += 1) {
    const r = series[i].value / series[i - 1].value - 1;
    const next = series[i + 1].value / series[i].value - 1;
    streak = r >= 0 ? Math.max(1, streak + 1) : Math.min(-1, streak - 1);
    const key = String(Math.max(-7, Math.min(7, streak)));
    if (!result.has(key)) result.set(key, []);
    result.get(key).push(next);
  }
  const rows = [...result.entries()].sort((a, b) => Number(a[0]) - Number(b[0])).map(([k, values]) => ({ streak: k, avg: values.reduce((a, b) => a + b, 0) / values.length, count: values.length }));
  const tool = tools.streak;
  renderShell(`${pageHeader(tool)}<div class="chart-panel"><canvas id="mainChart"></canvas></div><div class="table-wrap"><table><thead><tr><th>연속일</th><th>다음날 평균</th><th>샘플</th></tr></thead><tbody>${rows.map((r) => `<tr><td>${r.streak}</td><td>${percent(r.avg)}</td><td>${r.count}</td></tr>`).join('')}</tbody></table></div>`);
  chart('mainChart', { type: 'bar', data: { labels: rows.map((r) => r.streak), datasets: [{ label: '다음날 평균 수익률(%)', data: rows.map((r) => r.avg * 100), backgroundColor: '#60a5fa' }] } });
}

async function renderTuw() {
  const series = monthlyFromDaily(toSeries(await loadJsConst(DATA.daily, 'priceData')));
  let peak = series[0].value;
  let underwater = 0;
  const rows = series.map((r) => {
    if (r.value >= peak) {
      peak = r.value;
      underwater = 0;
    } else {
      underwater += 1;
    }
    return { date: r.date.slice(0, 7), underwater, dd: r.value / peak - 1 };
  });
  const tool = tools.tuw;
  renderShell(`${pageHeader(tool)}${stats([
    { label: '최장 수중 기간', value: `${Math.max(...rows.map((r) => r.underwater))}개월` },
    { label: '현재 수중 기간', value: `${rows.at(-1).underwater}개월` },
    { label: '현재 낙폭', value: percent(rows.at(-1).dd) },
  ])}<div class="chart-panel"><canvas id="mainChart"></canvas></div>`);
  chart('mainChart', { type: 'bar', data: { labels: rows.map((r) => r.date), datasets: [{ label: 'Time Under Water(개월)', data: rows.map((r) => r.underwater), backgroundColor: '#60a5fa' }] } });
}

async function drawCurrentRoute() {
  const current = route();
  if (current === 'home') renderHome();
  else await renderTool(current);
}

window.addEventListener('hashchange', drawCurrentRoute);
drawCurrentRoute();
