/* Periodização > Mesociclo
   Um ciclo da temporada: faixa de fases, bandeiras de competição e carga semanal planejada x realizada.
   Cada barra abre o microciclo daquela semana. */
(function () {
  const { dados, util } = window.Farol;
  const { DIA, dd, mes, num } = util;
  const P = (window.Farol.periodo = window.Farol.periodo || {});

  const esc = util.esc;
  const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

  // Recorte do plano com as semanas de um ciclo, para o gráfico trabalhar em índices locais.
  function vista(plano, ci) {
    const c = plano.ciclos[ci];
    return {
      nome: plano.nome,
      semanas: plano.semanas.slice(c.semanaIni, c.semanaIni + c.semanas),
      mesos: c.mesos.map((m) => ({ ...m, semanaIni: m.semanaIni - c.semanaIni })),
      inicioMs: c.inicio,
      fimMs: c.fim,
      comps: c.comps.map((q) => ({ ...q, alvo: q.id === c.alvo.id })),
      alvo: c.alvo.id,
      mesoAtual: plano.mesoAtual,
    };
  }

  function legenda() {
    return `
      <div class="legend" aria-label="Legenda do gráfico">
        <span><svg width="14" height="12" aria-hidden="true"><rect width="14" height="12" rx="2" style="fill:var(--ink-2)"/></svg>Carga planejada</span>
        <span><svg width="14" height="12" aria-hidden="true"><rect width="14" height="12" rx="2" style="fill:var(--ink-2);fill-opacity:.45"/></svg>Semana de recuperação</span>
        <span><svg width="18" height="12" aria-hidden="true"><line x1="2" x2="16" y1="6" y2="6" stroke="var(--ink)" stroke-width="3" stroke-linecap="round"/></svg>Carga realizada</span>
        <span><svg width="14" height="14" aria-hidden="true"><path d="M3 1v12M3 2h9l-2.5 3L12 8H3" fill="var(--beam)" stroke="var(--beam)" stroke-width="1.5" stroke-linejoin="round"/></svg>Competição alvo</span>
        <span><svg width="14" height="14" aria-hidden="true"><path d="M3 1v12M3 2h9l-2.5 3L12 8H3" fill="none" stroke="var(--ink-2)" stroke-width="1.5" stroke-linejoin="round"/></svg>Outra competição</span>
      </div>`;
  }

  function grafico(v, sel) {
    const n = v.semanas.length;
    const colW = 36, L = 64, R = 16;
    const W = L + n * colW + R;
    const yStrip = 8, hStrip = 32;
    const yBars = 132, hBars = 168, yBase = yBars + hBars;
    const H = yBase + 50;

    const maxV = Math.max(...v.semanas.map((s) => Math.max(s.planejado, s.realizado || 0)));
    const yMax = Math.ceil(maxV / 1000) * 1000;
    const yv = (val) => yBase - (val / yMax) * hBars;
    const xd = (t) => L + ((t - v.inicioMs) / (7 * DIA)) * colW;

    const out = [];
    out.push(`<svg class="chart" viewBox="0 0 ${W} ${H}" role="group" aria-label="Carga semanal planejada e realizada do ciclo">`);

    out.push(`<rect x="${L + sel.semanaIni * colW}" y="${yBars - 6}" width="${sel.semanas * colW}" height="${hBars + 6}" rx="4" style="fill:var(--sel)"/>`);

    for (let val = 0; val <= yMax; val += 1000) {
      const y = yv(val);
      out.push(`<line class="grid" x1="${L}" x2="${W - R}" y1="${y}" y2="${y}"/>`);
      out.push(`<text x="${L - 8}" y="${y + 4}" text-anchor="end" class="num">${num(val)}</text>`);
    }
    out.push(`<text x="${L - 8}" y="${yBars - 14}" text-anchor="end" class="t-strong">UA/sem</text>`);

    v.mesos.forEach((m) => {
      const x = L + m.semanaIni * colW + 1;
      const w = m.semanas * colW - 2;
      const ativo = m.id === sel.id;
      const rotulo = w >= 150 ? `${m.nome} · ${m.semanas} sem` : m.nome;
      const fs = w < 90 ? 12.5 : w < 120 ? 13.5 : 15;
      out.push(`<g class="seg" data-meso="${m.id}" tabindex="0" role="button" aria-pressed="${ativo}" aria-label="${esc(m.nome)}, ${plural(m.semanas, 'semana', 'semanas')}, ${dd(m.inicio)} a ${dd(m.fim)}">
        <rect class="seg-rect" x="${x}" y="${yStrip}" width="${w}" height="${hStrip}" rx="5" style="fill:var(${m.cor});stroke:${ativo ? 'var(--ink)' : 'transparent'};stroke-width:2.5"/>
        <text class="strip-label" x="${x + w / 2}" y="${yStrip + 21}" text-anchor="middle" style="font-size:${fs}px">${esc(rotulo)}</text>
      </g>`);
    });

    // Linha "hoje" atrás das barras.
    if (dados.HOJE >= v.inicioMs && dados.HOJE <= v.fimMs + DIA) {
      const x = xd(dados.HOJE) + colW / 14;
      out.push(`<line x1="${x}" x2="${x}" y1="${yBars - 8}" y2="${yBase}" stroke="var(--accent)" stroke-width="2" stroke-dasharray="3 3"/>`);
      out.push(`<text x="${x}" y="${yBars - 13}" text-anchor="middle" class="t-strong halo" style="fill:var(--accent)">Hoje</text>`);
    }

    v.semanas.forEach((s, i) => {
      const m = v.mesos.find((q) => q.id === s.meso);
      const x = L + i * colW + 6;
      const w = colW - 12;
      const y = yv(s.planejado);
      const dentro = s.meso === sel.id;
      out.push(`<rect class="bar" x="${x}" y="${y}" width="${w}" height="${yBase - y}" rx="2" style="fill:var(${m.cor});fill-opacity:${s.descarga ? 0.45 : dentro ? 1 : 0.8}"/>`);
      if (s.realizado != null) {
        const yr = yv(s.realizado);
        out.push(`<line x1="${x - 3}" x2="${x + w + 3}" y1="${yr}" y2="${yr}" stroke="var(--ink)" stroke-width="3" stroke-linecap="round"/>`);
      }
      if (dentro) {
        out.push(`<text x="${x + w / 2}" y="${y - 6}" text-anchor="middle" class="num t-strong halo">${(s.planejado / 1000).toFixed(1).replace('.', ',')}k</text>`);
      }
    });

    let mesAnt = null;
    v.semanas.forEach((s, i) => {
      const cx = L + i * colW + colW / 2;
      out.push(`<text x="${cx}" y="${yBase + 16}" text-anchor="middle" class="num">S${s.n}</text>`);
      const mm = mes(s.inicio);
      if (mm !== mesAnt) {
        out.push(`<line class="grid" x1="${L + i * colW}" x2="${L + i * colW}" y1="${yBase + 24}" y2="${yBase + 40}"/>`);
        out.push(`<text x="${L + i * colW + 4}" y="${yBase + 37}" class="t-strong">${mm}</text>`);
        mesAnt = mm;
      }
    });

    v.comps.forEach((c) => {
      const x = xd(c.data) + colW / 14;
      const linha = c.alvo ? 1 : 0;
      const yF = 52 + linha * 26;
      const texto = `${c.alvo ? 'ALVO · ' : ''}${c.nome} · ${dd(c.data)}`;
      const larg = texto.length * 5.7;
      const aEsq = x + 16 + larg > W - R;
      out.push(`<line x1="${x}" x2="${x}" y1="${yF}" y2="${yBase}" stroke="${c.alvo ? 'var(--beam)' : 'var(--ink-2)'}" stroke-width="${c.alvo ? 2 : 1.5}" stroke-dasharray="${c.alvo ? '0' : '4 3'}"/>`);
      out.push(`<path d="M${x} ${yF} h${aEsq ? -12 : 12} l${aEsq ? 3.5 : -3.5} 5 l${aEsq ? -3.5 : 3.5} 5 h${aEsq ? 12 : -12}" fill="${c.alvo ? 'var(--beam)' : 'var(--surface)'}" stroke="${c.alvo ? 'var(--beam)' : 'var(--ink-2)'}" stroke-width="1.5" stroke-linejoin="round"/>`);
      out.push(`<text class="halo ${c.alvo ? 't-strong' : ''}" x="${aEsq ? x - 18 : x + 18}" y="${yF + 9}" text-anchor="${aEsq ? 'end' : 'start'}">${esc(texto)}</text>`);
    });

    // Áreas clicáveis por semana, por cima de tudo.
    v.semanas.forEach((s, i) => {
      out.push(`<rect class="hit" data-semana="${s.idx}" tabindex="0" role="button" x="${L + i * colW}" y="${yBars - 6}" width="${colW}" height="${hBars + 6}" aria-label="Abrir microciclo da semana ${s.n}, planejado ${num(s.planejado)} UA"><title>Semana ${s.n}: ${esc(dados.TIPOS_MICRO[s.microTipo].nome)}, planejado ${num(s.planejado)} UA${s.realizado != null ? `, realizado ${num(s.realizado)} UA` : ''}. Clique para abrir.</title></rect>`);
    });

    out.push('</svg>');
    return out.join('');
  }

  function detalhe(plano, v, m, estado) {
    const f = m.fase;
    const sems = v.semanas.slice(m.semanaIni, m.semanaIni + m.semanas);
    const feitas = sems.filter((s) => s.realizado != null);
    const aderencia = feitas.length
      ? Math.round((feitas.reduce((a, s) => a + s.realizado, 0) / feitas.reduce((a, s) => a + s.planejado, 0)) * 100)
      : null;

    return `
      <div class="meso-title">
        <span class="meso-swatch" style="background:var(${m.cor})"></span>
        <div>
          <h2>${esc(m.nome)}</h2>
          <span class="meso-period num">${dd(m.inicio)} a ${dd(m.fim)} · ${plural(m.semanas, 'semana', 'semanas')}</span>
        </div>
      </div>

      <dl class="kv">
        <div><dt>Carga média</dt><dd class="num">${num(m.mediaPlanejada)} <small>UA/sem</small></dd></div>
        <div><dt>Pico planejado</dt><dd class="num">${num(m.picoPlanejado)} <small>UA</small></dd></div>
        <div><dt>PSE alvo</dt><dd class="num">${f.pse[0]} a ${f.pse[1]} <small>de 10</small></dd></div>
        <div><dt>Realizado até hoje</dt><dd class="num">${aderencia != null ? `${aderencia}%` : 'n/d'} <small>${aderencia != null ? `do planejado, ${plural(feitas.length, 'semana', 'semanas')}` : 'fase ainda não começou'}</small></dd></div>
      </dl>

      <div class="detail-block">
        <span class="label">Objetivo da fase</span>
        <p>${esc(f.objetivo)}</p>
      </div>

      <div class="detail-block">
        <div class="reg-tools">
          <span class="label">Fundamentos e ideias da fase ${m.pautaPropria ? '' : '<span class="chip" style="margin-left:6px;text-transform:none;letter-spacing:0">sugestão padrão</span>'}</span>
          ${estado.editaPauta === m.id ? '' : '<button class="link-btn" id="pauta-edit" style="margin:0">Editar pauta</button>'}
        </div>
        ${estado.editaPauta === m.id
          ? `<div id="pauta-mount"></div>
             <div class="actions" style="margin-top:12px"><button class="btn btn-primary" id="pauta-salvar">Salvar pauta</button><button class="btn" id="pauta-cancelar">Cancelar</button></div>`
          : window.Farol.pauta.leitura(m.pauta)}
      </div>

      <div class="detail-block">
        <span class="label">Foco do treino físico</span>
        <div class="stack" role="img" aria-label="Força ${f.foco.forca}%, potência ${f.foco.potencia}%, mobilidade ${f.foco.mobilidade}%">
          <i style="width:${f.foco.forca}%;background:var(--ink)"></i>
          <i style="width:${f.foco.potencia}%;background:var(--accent)"></i>
          <i style="width:${f.foco.mobilidade}%;background:var(--ink-2);opacity:.5"></i>
        </div>
        <div class="stack-legend num">
          <span><b>${f.foco.forca}%</b> força</span>
          <span><b>${f.foco.potencia}%</b> potência</span>
          <span><b>${f.foco.mobilidade}%</b> mobilidade</span>
        </div>
      </div>

      <div class="detail-block">
        <span class="label">Microciclos da fase</span>
        <div class="weeks">
          ${sems.map((s) => `
            <button class="week-chip" data-semana="${s.idx}" aria-label="Abrir semana ${s.n}, ${esc(dados.TIPOS_MICRO[s.microTipo].nome)}">
              <span class="num"><b>S${s.n}</b> ${dd(s.inicio)}</span>
              <span>${esc(dados.TIPOS_MICRO[s.microTipo].nome)}${s.fator != null ? ` · ${Math.round(s.fator * 100)}%` : ''}</span>
              <span class="num">${num(s.planejado)} UA</span>
            </button>`).join('')}
        </div>
      </div>

      <div class="detail-block">
        <span class="label">Competições nesta fase</span>
        ${m.competicoes.length
          ? `<ul class="comp-list">${m.competicoes.map((c) => `<li><span class="chip ${c.id === v.alvo ? 'chip-beam' : ''}">${dd(c.data)}</span><button class="link-btn comp-link" data-comp="${c.id}" style="margin:0">${esc(c.nome)}</button>${c.id === v.alvo ? ' <strong>(alvo)</strong>' : ''}</li>`).join('')}</ul>`
          : '<p>Nenhuma competição do calendário cai nesta fase.</p>'}
      </div>`;
  }

  function tabela(plano, ci, v, sel) {
    const cicloRaw = plano.ciclos[ci];
    const total = cicloRaw.semanas;
    return `
      <div class="table-scroll">
        <table class="mesos">
          <thead><tr><th>Fase</th><th>Período</th><th class="r">Semanas</th></tr></thead>
          <tbody>
            ${v.mesos.map((m) => `
              <tr data-sel="${m.id === sel.id}">
                <td><button class="row-btn" data-meso="${m.id}" aria-pressed="${m.id === sel.id}"><span class="dot" style="background:var(${m.cor})"></span>${esc(m.nome)}${m.id === plano.mesoAtual ? ' <span class="chip chip-beam" style="margin-left:6px">atual</span>' : ''}</button></td>
                <td><button class="row-btn num" data-meso="${m.id}" tabindex="-1">${dd(m.inicio)} a ${dd(m.fim)}</button></td>
                <td class="r">
                  ${plano.motor ? `<span class="num">${m.semanas}</span>` : `<span class="stepper">
                    <button class="step" data-fase="${m.indice}" data-delta="-1" aria-label="Uma semana a menos em ${esc(m.nome)}" ${m.semanas <= 1 ? 'disabled' : ''}>−</button>
                    <span class="num" aria-live="polite">${m.semanas}</span>
                    <button class="step" data-fase="${m.indice}" data-delta="1" aria-label="Uma semana a mais em ${esc(m.nome)}" ${m.semanas >= 12 ? 'disabled' : ''}>+</button>
                  </span>`}
                </td>
              </tr>`).join('')}
          </tbody>
          <tfoot><tr><td colspan="2">Total do ciclo · média ${num(cicloRaw.mediaPlanejada)} UA/sem</td><td class="r num">${total}</td></tr></tfoot>
        </table>
      </div>
      ${plano.motor ? '<p class="hint">As semanas de cada bloco vêm da distância até o evento A. Para mudar, ajuste o calendário na escala Macrociclo.</p>' : '<p class="hint">Mudar as semanas de uma fase move as datas das fases seguintes. Semanas já editadas mantêm suas sessões.</p>'}`;
  }

  P.meso = function (el, ctx) {
    const { plano, estado } = ctx;
    const ci = Math.min(estado.ciclo, plano.ciclos.length - 1);
    const ciclo = plano.ciclos[ci];
    const v = vista(plano, ci);
    const sel = v.mesos.find((m) => m.id === estado.mesoId)
      || v.mesos.find((m) => m.id === plano.mesoAtual)
      || v.mesos[0];
    estado.mesoId = sel.id;

    el.innerHTML = `
      <section class="card" aria-labelledby="h-carga">
        <div class="card-head">
          <div>
            <h2 id="h-carga">Carga semanal de ${esc(ciclo.nome)}</h2>
            <span class="meso-period num">${dd(ciclo.inicio)} a ${dd(ciclo.fim)} · ${ciclo.alvo.semAlvo ? 'sem competição alvo' : `alvo: ${esc(ciclo.alvo.nome)}, ${dd(ciclo.alvo.data)}`}</span>
          </div>
          <div class="field">
            <label class="label" for="ciclo-sel">Ciclo</label>
            <select class="select" id="ciclo-sel" style="min-width:200px">
              ${plano.ciclos.map((c) => `<option value="${c.idx}" ${c.idx === ci ? 'selected' : ''}>${esc(c.nome)}, ${dd(c.inicio)} a ${dd(c.fim)}</option>`).join('')}
            </select>
          </div>
        </div>
        ${legenda()}
        <div class="chart-scroll" style="margin-top:12px">${grafico(v, sel)}</div>
        <p class="hint">UA = unidades arbitrárias: soma de duração × PSE alvo das sessões. Clique numa fase para ver o detalhe, ou numa semana para abrir o microciclo.</p>
      </section>

      <div class="split">
        <section class="card" aria-label="Detalhe da fase selecionada">${detalhe(plano, v, sel, estado)}</section>
        <section class="card" aria-labelledby="h-fases">
          <div class="card-head"><h2 id="h-fases">Fases do ciclo</h2><span class="label num">${dd(ciclo.inicio)} a ${dd(ciclo.fim)}</span></div>
          ${tabela(plano, ci, v, sel)}
        </section>
      </div>`;

    el.querySelector('#ciclo-sel').addEventListener('change', (e) => {
      ctx.ir('meso', { ciclo: Number(e.target.value), mesoId: null, editaPauta: null }, '#ciclo-sel');
    });

    const escolher = (id, foco) => ctx.ir('meso', { mesoId: id, editaPauta: null }, foco);
    el.querySelectorAll('[data-meso]').forEach((b) => {
      b.addEventListener('click', () => escolher(b.dataset.meso, `.seg[data-meso="${b.dataset.meso}"]`));
      b.addEventListener('keydown', (e) => {
        if (b.classList.contains('seg') && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          escolher(b.dataset.meso, `.seg[data-meso="${b.dataset.meso}"]`);
        }
      });
    });
    el.querySelectorAll('[data-semana]').forEach((b) => {
      const abrir = () => ctx.ir('micro', { semana: Number(b.dataset.semana) });
      b.addEventListener('click', abrir);
      b.addEventListener('keydown', (e) => {
        if (b.classList.contains('hit') && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); abrir(); }
      });
    });
    el.querySelectorAll('.step').forEach((b) => {
      b.addEventListener('click', () => {
        dados.ajustarFase(plano.id, ci, Number(b.dataset.fase), Number(b.dataset.delta));
        ctx.ir('meso', {}, `.step[data-fase="${b.dataset.fase}"][data-delta="${b.dataset.delta}"]`);
      });
    });

    const pe = el.querySelector('#pauta-edit');
    if (pe) pe.addEventListener('click', () => {
      estado.editaPauta = sel.id;
      estado.pautaTrab = JSON.parse(JSON.stringify(sel.pauta));
      ctx.ir('meso', {}, '#pauta-salvar');
    });
    if (estado.editaPauta === sel.id) {
      window.Farol.pauta.editor(el.querySelector('#pauta-mount'), estado.pautaTrab, { prefixo: 'mpauta' });
      el.querySelector('#pauta-cancelar').addEventListener('click', () => { estado.editaPauta = null; ctx.ir('meso', {}, '#pauta-edit'); });
      el.querySelector('#pauta-salvar').addEventListener('click', () => {
        dados.salvarPauta(plano.id, ci, sel.tipo, estado.pautaTrab);
        estado.editaPauta = null;
        ctx.ir('meso', { aviso: `Pauta da fase ${sel.nome} salva.` }, '#pauta-edit');
      });
    }
    el.querySelectorAll('[data-comp]').forEach((b) => b.addEventListener('click', () => window.Farol.ir('planejamento-competicoes', { competicao: b.dataset.comp })));
  };
})();
