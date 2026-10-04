/* Periodização > Macrociclo
   A temporada inteira: ciclos, fases, competições e carga semanal numa só linha do tempo. */
(function () {
  const { dados, util, calendario: CAL } = window.Farol;
  const { DIA, dd, mes, ano, num, esc: _e } = util;
  const P = (window.Farol.periodo = window.Farol.periodo || {});

  const esc = util.esc;

  const ESTADO = {
    concluido: { nome: 'Concluído', classe: '' },
    andamento: { nome: 'Em andamento', classe: 'chip-beam' },
    planejado: { nome: 'Planejado', classe: '' },
  };

  function grafico(plano) {
    const n = plano.semanas.length;
    const L = 58, R = 16;
    const colW = Math.max(14, Math.floor((780 - L - R) / n));
    const W = L + n * colW + R;
    const yCiclo = 8, hCiclo = 30;
    const yFase = 46, hFase = 28;
    const yComp = 90;
    const yBars = 138, hBars = 78, yBase = yBars + hBars;
    const H = yBase + 44;

    const maxV = Math.max(...plano.semanas.map((s) => Math.max(s.planejado, s.realizado || 0)));
    const yMax = Math.ceil(maxV / 2000) * 2000;
    const yv = (v) => yBase - (v / yMax) * hBars;
    const xd = (t) => L + ((t - plano.inicioMs) / (7 * DIA)) * colW;

    const out = [];
    out.push(`<svg class="chart" viewBox="0 0 ${W} ${H}" role="group" aria-label="Temporada completa: ciclos, fases, competições e carga semanal" style="min-width:760px">`);

    // Ciclos.
    plano.ciclos.forEach((c) => {
      const x = L + c.semanaIni * colW + 1;
      const w = c.semanas * colW - 2;
      const atual = c.idx === plano.cicloAtual;
      out.push(`<g class="seg" data-ciclo="${c.idx}" tabindex="0" role="button" aria-label="${esc(c.nome)}, ${dd(c.inicio)} a ${dd(c.fim)}. Abrir mesociclos">
        <rect class="seg-rect" x="${x}" y="${yCiclo}" width="${w}" height="${hCiclo}" rx="5" style="fill:var(--sel);stroke:${atual ? 'var(--ink)' : 'var(--line)'};stroke-width:${atual ? 2 : 1}"/>
        <text x="${x + 10}" y="${yCiclo + 19}" class="t-strong" style="font-size:13px">${esc(c.nome)}</text>
        <text x="${x + w - 10}" y="${yCiclo + 19}" text-anchor="end" style="font-size:11px">${w > 250 && !c.alvo.semAlvo ? `alvo ${esc(dd(c.alvo.data))}` : ''}</text>
      </g>`);
    });

    // Fases.
    plano.mesos.forEach((m) => {
      const x = L + m.semanaIni * colW + 1;
      const w = m.semanas * colW - 2;
      const fits = w >= m.nome.length * 7 + 8;
      out.push(`<g class="seg" data-ciclo="${m.ciclo}" data-meso="${m.id}" tabindex="0" role="button" aria-label="${esc(m.nome)} do ${esc(plano.ciclos[m.ciclo].nome)}, ${m.semanas} semanas. Abrir">
        <rect class="seg-rect" x="${x}" y="${yFase}" width="${w}" height="${hFase}" rx="4" style="fill:var(${m.cor})"/>
        ${fits ? `<text class="strip-label" x="${x + w / 2}" y="${yFase + 19}" text-anchor="middle" style="font-size:13px">${esc(m.nome)}</text>` : ''}
        <title>${esc(m.nome)}, ${dd(m.inicio)} a ${dd(m.fim)} (${m.semanas} sem)</title>
      </g>`);
    });

    // Eixo de carga.
    for (let v = 0; v <= yMax; v += 2000) {
      const y = yv(v);
      out.push(`<line class="grid" x1="${L}" x2="${W - R}" y1="${y}" y2="${y}"/>`);
      out.push(`<text x="${L - 6}" y="${y + 4}" text-anchor="end" class="num">${num(v)}</text>`);
    }
    out.push(`<text x="${L - 6}" y="${yBars - 10}" text-anchor="end" class="t-strong">UA/sem</text>`);

    // Hoje, atrás das barras.
    if (dados.HOJE >= plano.inicioMs && dados.HOJE <= plano.fimMs + DIA) {
      const x = xd(dados.HOJE) + colW / 14;
      out.push(`<line x1="${x}" x2="${x}" y1="${yFase + hFase + 4}" y2="${yBase}" stroke="var(--accent)" stroke-width="2" stroke-dasharray="3 3"/>`);
      out.push(`<text x="${x + 6}" y="${yBars - 10}" class="t-strong halo" style="fill:var(--accent)">Hoje</text>`);
    }

    // Barras de carga, uma por semana.
    plano.semanas.forEach((s, i) => {
      const m = plano.mesos.find((q) => q.id === s.meso);
      const x = L + i * colW + 2;
      const w = colW - 4;
      const y = yv(s.planejado);
      out.push(`<rect data-semana="${s.idx}" class="bar" tabindex="0" role="button" x="${x}" y="${y}" width="${w}" height="${yBase - y}" rx="1.5" style="fill:var(${m.cor});fill-opacity:${s.descarga ? 0.45 : 0.85};cursor:pointer" aria-label="Semana ${s.n}, planejado ${num(s.planejado)} UA. Abrir microciclo"><title>Semana ${s.n} (${dd(s.inicio)}): ${esc(dados.TIPOS_MICRO[s.microTipo].nome)}, ${num(s.planejado)} UA</title></rect>`);
      if (s.realizado != null) {
        const yr = yv(s.realizado);
        out.push(`<line x1="${x - 1}" x2="${x + w + 1}" y1="${yr}" y2="${yr}" stroke="var(--ink)" stroke-width="2.5" stroke-linecap="round" pointer-events="none"/>`);
      }
    });

    // Competições numeradas.
    plano.comps.forEach((c, i) => {
      const x = xd(c.data) + colW / 14;
      out.push(`<line x1="${x}" x2="${x}" y1="${yComp + 12}" y2="${yBase}" stroke="${c.alvo ? 'var(--beam)' : 'var(--ink-2)'}" stroke-width="${c.alvo ? 1.8 : 1}" stroke-dasharray="${c.alvo ? '0' : '3 3'}" opacity="${c.alvo ? 1 : 0.7}" pointer-events="none"/>`);
      out.push(`<circle cx="${x}" cy="${yComp}" r="10" style="fill:${c.alvo ? 'var(--beam)' : 'var(--surface)'};stroke:${c.alvo ? 'var(--beam)' : 'var(--ink-2)'}" stroke-width="1.5"><title>${esc(c.nome)}, ${dd(c.data)}</title></circle>`);
      out.push(`<text x="${x}" y="${yComp + 4}" text-anchor="middle" class="num" style="font-weight:700;font-size:11px;fill:${c.alvo ? 'var(--beam-ink)' : 'var(--ink)'}">${c.prioridade || i + 1}</text>`);
    });

    // Meses.
    let mesAnt = null;
    plano.semanas.forEach((s, i) => {
      const mm = mes(s.inicio);
      if (mm !== mesAnt) {
        const x = L + i * colW;
        out.push(`<line class="grid" x1="${x}" x2="${x}" y1="${yBase}" y2="${yBase + 22}"/>`);
        out.push(`<text x="${x + 3}" y="${yBase + 15}" class="t-strong">${mm}</text>`);
        if (mm === 'jan' || i === 0) out.push(`<text x="${x + 3}" y="${yBase + 33}" class="num">${ano(s.inicio)}</text>`);
        mesAnt = mm;
      }
    });

    out.push('</svg>');
    return out.join('');
  }

  function tabelaCiclos(plano) {
    return `
      <div class="table-scroll">
        <table class="mesos">
          <thead><tr><th>Ciclo</th><th>Período</th><th class="r">Sem.</th><th>Competição alvo</th><th class="r">Carga média</th><th>Situação</th></tr></thead>
          <tbody>
            ${plano.ciclos.map((c) => `
              <tr>
                <td><button class="row-btn" data-ciclo="${c.idx}">${esc(c.nome)}</button></td>
                <td><button class="row-btn num" data-ciclo="${c.idx}" tabindex="-1">${dd(c.inicio)} a ${dd(c.fim)}</button></td>
                <td class="r"><button class="row-btn num" data-ciclo="${c.idx}" tabindex="-1" style="text-align:right">${c.semanas}</button></td>
                <td><button class="row-btn" data-ciclo="${c.idx}" tabindex="-1">${esc(c.alvo.nome)}${c.alvo.semAlvo ? '' : ` <span class="num" style="color:var(--ink-2)">· ${dd(c.alvo.data)}</span>`}</button></td>
                <td class="r"><button class="row-btn num" data-ciclo="${c.idx}" tabindex="-1" style="text-align:right">${num(c.mediaPlanejada)}</button></td>
                <td><button class="row-btn" data-ciclo="${c.idx}" tabindex="-1"><span class="chip ${ESTADO[c.estado].classe}">${ESTADO[c.estado].nome}</span></button></td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  }

  function listaCompeticoes(plano) {
    return `
      <ol class="comp-numbered">
        ${plano.comps.map((c, i) => {
          const conf = CAL.plan(c.id).duplas.filter((d) => d.status === 'confirmada').length;
          return `
          <li>
            <span class="comp-n ${c.alvo ? 'alvo' : ''} num">${i + 1}</span>
            <span class="num comp-date">${dd(c.data)}</span>
            <span><button class="link-btn comp-link" data-comp="${c.id}" style="margin:0">${esc(c.nome)}</button>${c.alvo ? ' <span class="chip chip-beam" style="margin-left:6px">alvo</span>' : ''}
              <small class="comp-sub">${esc(c.local)} · ${conf ? `${conf} ${conf === 1 ? 'dupla confirmada' : 'duplas confirmadas'}` : 'sem duplas confirmadas'}</small></span>
          </li>`;
        }).join('')}
      </ol>`;
  }

  P.macro = function (el, ctx) {
    const { plano, estado } = ctx;
    const semanas = plano.semanas.length;
    const alvos = plano.comps.filter((c) => c.alvo).length;

    el.innerHTML = `
      <section class="card" aria-labelledby="h-temp">
        <div class="card-head">
          <div>
            <h2 id="h-temp">${esc(plano.temporada)}</h2>
            <span class="meso-period num">${dd(plano.inicioMs)}/${ano(plano.inicioMs)} a ${dd(plano.fimMs)}/${ano(plano.fimMs)} · ${semanas} semanas · ${plano.ciclos.length} ciclos · ${plano.comps.length} competições (${alvos} alvo)</span>
          </div>
          <div class="legend" aria-label="Legenda">
            <span><svg width="14" height="12" aria-hidden="true"><rect width="14" height="12" rx="2" style="fill:var(--ink-2)"/></svg>Carga planejada</span>
            <span><svg width="18" height="12" aria-hidden="true"><line x1="2" x2="16" y1="6" y2="6" stroke="var(--ink)" stroke-width="3" stroke-linecap="round"/></svg>Realizada</span>
          </div>
        </div>
        <div class="chart-scroll">${grafico(plano)}</div>
        <p class="hint">Clique num ciclo ou numa fase para abrir os mesociclos, ou numa barra para abrir o microciclo daquela semana.</p>
      </section>

      <section class="card" aria-labelledby="h-base">
        <div class="card-head">
          <h2 id="h-base">Fundamentos base e ideias da temporada</h2>
          ${estado.editaBase ? '' : '<button class="btn btn-sm" id="base-edit">Editar</button>'}
        </div>
        ${estado.editaBase ? `
          <div class="field"><label class="label" for="base-obj">Objetivo da temporada</label>
            <textarea class="input" id="base-obj" rows="2" maxlength="300">${esc(estado.baseTrab.objetivo || '')}</textarea></div>
          <div id="base-mount" style="margin-top:14px"></div>
          <div class="actions" style="margin-top:14px"><button class="btn btn-primary" id="base-salvar">Salvar</button><button class="btn" id="base-cancelar">Cancelar</button></div>`
        : `${plano.base.objetivo ? `<p class="obj"><b>Objetivo:</b> ${esc(plano.base.objetivo)}</p>` : ''}
           ${window.Farol.pauta.leitura(plano.base, 'Nenhum fundamento base definido. Clique em Editar para começar.')}
           <p class="hint">Cada fase tem a sua pauta, que parte destes fundamentos. Veja e edite no Mesociclo.</p>`}
      </section>

      <div class="corpo">
        <section class="card" aria-labelledby="h-ciclos">
          <div class="card-head"><h2 id="h-ciclos">Ciclos da temporada</h2></div>
          ${tabelaCiclos(plano)}
        </section>
        ${plano.motor ? '' : `<section class="card" aria-labelledby="h-comps">
          <div class="card-head"><h2 id="h-comps">Calendário de competições</h2></div>
          ${listaCompeticoes(plano)}
        </section>`}
      </div>
      ${plano.motor ? P.blocosMotor(plano) : ''}`;
    if (plano.motor) P.ligarMotor(el, ctx);

    el.querySelectorAll('[data-ciclo]').forEach((b) => {
      const abrir = (e) => {
        if (e && e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return;
        if (e && e.type === 'keydown') e.preventDefault();
        ctx.ir('meso', { ciclo: Number(b.dataset.ciclo), mesoId: b.dataset.meso || null });
      };
      b.addEventListener('click', abrir);
      if (b.classList.contains('seg')) b.addEventListener('keydown', abrir);
    });
    el.querySelectorAll('[data-semana]').forEach((b) => {
      const abrir = (e) => {
        if (e && e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return;
        if (e && e.type === 'keydown') e.preventDefault();
        ctx.ir('micro', { semana: Number(b.dataset.semana) });
      };
      b.addEventListener('click', abrir);
      b.addEventListener('keydown', abrir);
    });

    const be = el.querySelector('#base-edit');
    if (be) be.addEventListener('click', () => {
      estado.editaBase = true;
      estado.baseTrab = JSON.parse(JSON.stringify(plano.base));
      ctx.ir('macro', {}, '#base-obj');
    });
    if (estado.editaBase) {
      el.querySelector('#base-obj').addEventListener('input', (e) => { estado.baseTrab.objetivo = e.target.value; });
      window.Farol.pauta.editor(el.querySelector('#base-mount'), estado.baseTrab, { prefixo: 'mbase' });
      el.querySelector('#base-cancelar').addEventListener('click', () => { estado.editaBase = false; ctx.ir('macro', {}, '#base-edit'); });
      el.querySelector('#base-salvar').addEventListener('click', () => {
        dados.salvarBase(plano.id, estado.baseTrab);
        estado.editaBase = false;
        ctx.ir('macro', { aviso: 'Fundamentos base salvos.' }, '#base-edit');
      });
    }
    el.querySelectorAll('[data-comp]').forEach((b) => b.addEventListener('click', () => window.Farol.ir('planejamento-competicoes', { competicao: b.dataset.comp })));
  };
})();
