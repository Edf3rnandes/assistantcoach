/* Treinos > Periodização
   Plano dividido em mesociclos, ancorado no calendário de competições.
   Gráfico: faixa de fases, bandeiras de competição e carga semanal planejada x realizada. */
(function () {
  const { dados, util } = window.Farol;
  const { DIA, dd, mes, num } = util;

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

  const estado = { planoId: dados.planos[0].id, mesoId: null };

  const planoAtual = () => dados.planos.find((p) => p.id === estado.planoId);

  function mesoSelecionado(plano) {
    return plano.mesos.find((m) => m.id === estado.mesoId) || plano.mesos.find((m) => m.id === plano.mesoAtual) || plano.mesos[0];
  }

  /* ---------- Faixa de situação ---------- */

  function status(plano) {
    const total = plano.semanas.length;
    const alvo = plano.comps.find((c) => c.alvo);
    const dias = Math.round((alvo.data - dados.HOJE) / DIA);
    const atual = plano.mesos.find((m) => m.id === plano.mesoAtual);

    let semana;
    if (plano.semanaAtual >= 0) {
      semana = `<strong class="num">Semana ${plano.semanaAtual + 1} de ${total}</strong>
        <span class="sub">${esc(dd(plano.semanas[plano.semanaAtual].inicio))} a ${esc(dd(plano.semanas[plano.semanaAtual].inicio + 6 * DIA))}</span>`;
    } else {
      semana = `<strong>Fora do período</strong><span class="sub">${esc(dd(plano.inicioMs))} a ${esc(dd(plano.fimMs))}</span>`;
    }

    return `
      <div class="status-item">${semana}</div>
      <div class="status-item">
        <strong>${atual ? `<span class="dot" style="background:var(${atual.cor})"></span>${esc(atual.nome)}` : 'Sem fase ativa'}</strong>
        <span class="sub">Fase atual</span>
      </div>
      <div class="status-item">
        <strong class="num">${dias >= 0 ? `${dias} dias` : 'Concluída'}</strong>
        <span class="sub">Até a competição alvo: ${esc(alvo.nome)}, ${esc(dd(alvo.data))}</span>
      </div>`;
  }

  /* ---------- Gráfico ---------- */

  function legenda() {
    return `
      <div class="legend" aria-label="Legenda do gráfico">
        <span><svg width="14" height="12" aria-hidden="true"><rect width="14" height="12" rx="2" style="fill:var(--ink-2)"/></svg>Carga planejada</span>
        <span><svg width="14" height="12" aria-hidden="true"><rect width="14" height="12" rx="2" style="fill:var(--ink-2);fill-opacity:.45"/></svg>Semana de descarga</span>
        <span><svg width="18" height="12" aria-hidden="true"><line x1="2" x2="16" y1="6" y2="6" stroke="var(--ink)" stroke-width="3" stroke-linecap="round"/></svg>Carga realizada</span>
        <span><svg width="14" height="14" aria-hidden="true"><path d="M3 1v12M3 2h9l-2.5 3L12 8H3" fill="var(--beam)" stroke="var(--beam)" stroke-width="1.5" stroke-linejoin="round"/></svg>Competição alvo</span>
        <span><svg width="14" height="14" aria-hidden="true"><path d="M3 1v12M3 2h9l-2.5 3L12 8H3" fill="none" stroke="var(--ink-2)" stroke-width="1.5" stroke-linejoin="round"/></svg>Competição do calendário</span>
      </div>`;
  }

  function grafico(plano, sel) {
    const n = plano.semanas.length;
    const colW = 36, L = 64, R = 16;
    const W = L + n * colW + R;
    const yStrip = 8, hStrip = 32;
    const yBars = 132, hBars = 168, yBase = yBars + hBars;
    const H = yBase + 50;

    const maxV = Math.max(...plano.semanas.map((s) => Math.max(s.planejado, s.realizado || 0)));
    const yMax = Math.ceil(maxV / 1000) * 1000;
    const yv = (v) => yBase - (v / yMax) * hBars;
    const xd = (t) => L + ((t - plano.inicioMs) / (7 * DIA)) * colW;

    const out = [];
    out.push(`<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Carga semanal planejada e realizada por semana do plano ${esc(plano.nome)}">`);

    // Faixa do mesociclo selecionado atrás das barras.
    out.push(`<rect x="${L + sel.semanaIni * colW}" y="${yBars - 6}" width="${sel.semanas * colW}" height="${hBars + 6}" rx="4" style="fill:var(--sel)"/>`);

    // Grade e eixo Y.
    for (let v = 0; v <= yMax; v += 1000) {
      const y = yv(v);
      out.push(`<line class="grid" x1="${L}" x2="${W - R}" y1="${y}" y2="${y}"/>`);
      out.push(`<text x="${L - 8}" y="${y + 4}" text-anchor="end" class="num">${num(v)}</text>`);
    }
    out.push(`<text x="${L - 8}" y="${yBars - 14}" text-anchor="end" class="t-strong">UA/sem</text>`);

    // Faixa de fases (clicável).
    plano.mesos.forEach((m) => {
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

    // Hoje.
    if (dados.HOJE >= plano.inicioMs && dados.HOJE <= plano.fimMs + DIA) {
      const x = xd(dados.HOJE) + colW / 14;
      out.push(`<line x1="${x}" x2="${x}" y1="${yBars - 8}" y2="${yBase}" stroke="var(--accent)" stroke-width="2" stroke-dasharray="3 3"/>`);
      out.push(`<text x="${x}" y="${yBars - 13}" text-anchor="middle" class="t-strong halo" style="fill:var(--accent)">Hoje</text>`);
    }

    // Barras de carga.
    plano.semanas.forEach((s, i) => {
      const m = plano.mesos.find((q) => q.id === s.meso);
      const x = L + i * colW + 6;
      const w = colW - 12;
      const y = yv(s.planejado);
      const dentro = s.meso === sel.id;
      out.push(`<rect class="bar" x="${x}" y="${y}" width="${w}" height="${yBase - y}" rx="2" style="fill:var(${m.cor});fill-opacity:${s.descarga ? 0.45 : dentro ? 1 : 0.8}"><title>Semana ${s.n}: planejado ${num(s.planejado)} UA${s.realizado != null ? `, realizado ${num(s.realizado)} UA` : ''}${s.descarga ? ' (descarga)' : ''}</title></rect>`);
      if (s.realizado != null) {
        const yr = yv(s.realizado);
        out.push(`<line x1="${x - 3}" x2="${x + w + 3}" y1="${yr}" y2="${yr}" stroke="var(--ink)" stroke-width="3" stroke-linecap="round"/>`);
      }
      if (dentro) {
        out.push(`<text x="${x + w / 2}" y="${y - 6}" text-anchor="middle" class="num t-strong halo">${(s.planejado / 1000).toFixed(1).replace('.', ',')}k</text>`);
      }
    });

    // Eixo X: semana e mês.
    let mesAnt = null;
    plano.semanas.forEach((s, i) => {
      const cx = L + i * colW + colW / 2;
      out.push(`<text x="${cx}" y="${yBase + 16}" text-anchor="middle" class="num">S${s.n}</text>`);
      const m = mes(s.inicio);
      if (m !== mesAnt) {
        out.push(`<line class="grid" x1="${L + i * colW}" x2="${L + i * colW}" y1="${yBase + 24}" y2="${yBase + 40}"/>`);
        out.push(`<text x="${L + i * colW + 4}" y="${yBase + 37}" class="t-strong">${m}</text>`);
        mesAnt = m;
      }
    });

    // Bandeiras de competição. A alvo fica na linha de baixo para os rótulos não colidirem.
    plano.comps.forEach((c) => {
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

    out.push('</svg>');
    return out.join('');
  }

  /* ---------- Detalhe do mesociclo ---------- */

  function detalhe(plano, m) {
    const f = m.fase;
    const sems = plano.semanas.slice(m.semanaIni, m.semanaIni + m.semanas);
    const feitas = sems.filter((s) => s.realizado != null);
    const aderencia = feitas.length
      ? Math.round((feitas.reduce((a, s) => a + s.realizado, 0) / feitas.reduce((a, s) => a + s.planejado, 0)) * 100)
      : null;
    const doCiclo = m.competicoes;

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
        <span class="label">Competições nesta fase</span>
        ${doCiclo.length
          ? `<ul class="comp-list">${doCiclo.map((c) => `<li><span class="chip ${c.id === plano.alvo ? 'chip-beam' : ''}">${dd(c.data)}</span><span>${esc(c.nome)}${c.id === plano.alvo ? ' <strong>(alvo)</strong>' : ''}</span></li>`).join('')}</ul>`
          : '<p>Nenhuma competição do calendário cai nesta fase.</p>'}
      </div>

      <div class="callout" style="margin-top:18px">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3c3 4 5 6.5 5 10a5 5 0 0 1-10 0c0-3.5 2-6 5-10z"/></svg>
        <div><strong>Fase nutricional ligada:</strong> ${esc(f.nutricao)} <a href="#nutricao-plano">Ver plano</a></div>
      </div>`;
  }

  function tabela(plano, sel) {
    return `
      <div class="table-scroll">
        <table class="mesos">
          <thead><tr><th>Fase</th><th>Período</th><th class="r col-sem">Sem.</th><th class="r">Carga média</th></tr></thead>
          <tbody>
            ${plano.mesos.map((m) => `
              <tr data-sel="${m.id === sel.id}">
                <td><button class="row-btn" data-meso="${m.id}" aria-pressed="${m.id === sel.id}"><span class="dot" style="background:var(${m.cor})"></span>${esc(m.nome)}${m.id === plano.mesoAtual ? ' <span class="chip chip-beam" style="margin-left:6px">atual</span>' : ''}</button></td>
                <td><button class="row-btn num" data-meso="${m.id}" tabindex="-1">${dd(m.inicio)} a ${dd(m.fim)}</button></td>
                <td class="r col-sem"><button class="row-btn num" data-meso="${m.id}" tabindex="-1" style="text-align:right">${m.semanas}</button></td>
                <td class="r"><button class="row-btn num" data-meso="${m.id}" tabindex="-1" style="text-align:right">${num(m.mediaPlanejada)}</button></td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  }

  /* ---------- Tela ---------- */

  function render(root) {
    const plano = planoAtual();
    const sel = mesoSelecionado(plano);
    estado.mesoId = sel.id;

    root.innerHTML = `
      <header class="page-head">
        <div>
          <span class="chip" style="margin-bottom:10px">Dados de exemplo</span>
          <h1>Periodização</h1>
          <p class="lead">Mesociclos ligados ao calendário de competições. A competição alvo define o fim do ciclo.</p>
        </div>
        <div class="field">
          <label class="label" for="plano-sel">Plano</label>
          <select class="select" id="plano-sel">
            ${dados.planos.map((p) => `<option value="${p.id}" ${p.id === plano.id ? 'selected' : ''}>${esc(p.nome)} (${esc(p.detalhe)})</option>`).join('')}
          </select>
        </div>
      </header>

      <section class="status" aria-label="Situação do plano">${status(plano)}</section>

      <section class="card" aria-labelledby="h-carga">
        <div class="card-head">
          <h2 id="h-carga">Carga semanal do plano</h2>
          ${legenda()}
        </div>
        <div class="chart-scroll">${grafico(plano, sel)}</div>
        <p style="margin-top:10px;font-size:13px;color:var(--ink-2)">UA = unidades arbitrárias, PSE da sessão × minutos. Clique numa fase para ver o detalhe.</p>
      </section>

      <div class="split">
        <section class="card" aria-label="Detalhe da fase selecionada">${detalhe(plano, sel)}</section>
        <section class="card" aria-labelledby="h-fases">
          <div class="card-head"><h2 id="h-fases">Fases do plano</h2><span class="label num">${dd(plano.inicioMs)} a ${dd(plano.fimMs)}</span></div>
          ${tabela(plano, sel)}
        </section>
      </div>`;

    root.querySelector('#plano-sel').addEventListener('change', (e) => {
      estado.planoId = e.target.value;
      estado.mesoId = null;
      render(root);
      root.querySelector('#plano-sel').focus();
    });

    const escolher = (id) => {
      estado.mesoId = id;
      render(root);
      const alvo = root.querySelector(`.seg[data-meso="${id}"]`);
      if (alvo) alvo.focus({ preventScroll: true });
    };
    root.querySelectorAll('[data-meso]').forEach((el) => {
      el.addEventListener('click', () => escolher(el.dataset.meso));
      el.addEventListener('keydown', (e) => {
        if (el.classList.contains('seg') && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          escolher(el.dataset.meso);
        }
      });
    });
  }

  window.Farol.views = window.Farol.views || {};
  window.Farol.views['treinos-periodizacao'] = render;
})();
