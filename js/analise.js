/* Análise
   Central de dados do técnico, em quatro abas:
   - Visão geral: indicadores da turma, carga planejada × realizada, ACWR, PSE e PSR, quem pede atenção;
   - Atletas: todos os atletas lado a lado, com mapa de carga das últimas semanas e semáforo;
   - Comparativos: atleta e grupos contra referências (ver comparativos.js);
   - Competições: resultados, aproveitamento e preparo das próximas.
   Tudo vem dos registros de treino e do calendário. As regras do semáforo ficam à vista na própria tela. */
(function () {
  const { dados, util, elenco, graficos: G, analise: A, calendario: CAL } = window.Farol;
  const { esc, num, dec, dd, plural, media } = util;
  const { ATLETAS } = elenco;
  const { TIPOS_SESSAO } = dados;

  const est = { aba: 'geral', ordem: 'atencao' };
  const ABAS = [['geral', 'Visão geral'], ['atletas', 'Atletas'], ['comparar', 'Comparativos'], ['competicoes', 'Competições']];
  let raiz = null;

  /* ---------- Peças visuais ---------- */

  const ICO = {
    ok: '<svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M4.8 8.3l2.2 2.2 4.2-4.6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    warn: '<svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.8l6.6 11.6H1.4z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M8 6.4v3.2M8 11.4v.1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    crit: '<svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><path d="M5.2 1.6h5.6l3.6 3.6v5.6l-3.6 3.6H5.2L1.6 10.8V5.2z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M8 5v3.8M8 10.8v.1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    sobe: '<svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M6 2l4.5 7h-9z" fill="currentColor"/></svg>',
    desce: '<svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M6 10L1.5 3h9z" fill="currentColor"/></svg>',
  };
  const NOME_NIVEL = { ok: 'Em dia', warn: 'Atenção', crit: 'Alerta' };
  const seloIc = (nivel) => `<span class="selo-ic selo-${nivel}" role="img" aria-label="${NOME_NIVEL[nivel]}" title="${NOME_NIVEL[nivel]}">${ICO[nivel]}</span>`;
  const selo = (nivel, texto) => `<span class="selo selo-${nivel}">${ICO[nivel]}<span>${esc(texto || NOME_NIVEL[nivel])}</span></span>`;

  // Indicador: valor, variação com seta e texto, minigráfico. "bom" diz se subir é bom (true), ruim (false) ou neutro (null).
  function kpi(o) {
    let delta = '';
    if (o.delta != null && Number.isFinite(o.delta)) {
      const dir = o.delta > 0.0001 ? 'sobe' : o.delta < -0.0001 ? 'desce' : null;
      const cls = !dir || o.bom == null ? '' : (o.delta > 0) === o.bom ? 'bom' : 'ruim';
      delta = `<span class="kpi-delta ${cls}">${dir ? ICO[dir] : ''}<span>${esc(o.deltaTxt)}</span></span>`;
    }
    return `<article class="kpi" aria-label="${esc(o.rot)}">
      <span class="kpi-rot">${esc(o.rot)}</span>
      <span class="kpi-valor">${o.valor}${o.un ? `<small>${esc(o.un)}</small>` : ''}</span>
      ${o.selo || ''}${delta}
      ${o.sub ? `<span class="kpi-sub">${o.sub}</span>` : ''}
      ${o.spark ? `<span class="kpi-spark">${o.spark}</span>` : ''}
    </article>`;
  }

  const pct = (a, b) => (b ? ((a / b) - 1) * 100 : null);
  const sinal = (v) => (v > 0 ? '+' : v < 0 ? '−' : '');

  /* ---------- Visão geral ---------- */

  function vazioSemRegistro() {
    return `<section class="card an-vazio"><h2>Ainda não há dados para analisar</h2>
      <p>As análises aparecem quando houver semanas completas com registro de treino. Registre as sessões no menu Registro e volte aqui.</p></section>`;
  }

  function geral(el, plano) {
    const T = A.turma(plano);
    if (!T.length) { el.innerHTML = vazioSemRegistro(); return; }
    const AT = A.atletas(plano);
    const w = T[T.length - 1], p = T[T.length - 2] || null;
    const atencao = AT.filter((a) => a.nivel !== 'ok').sort((x, y) => (y.nivel === 'crit') - (x.nivel === 'crit'));
    const nCrit = AT.filter((a) => a.nivel === 'crit').length;

    const faixa = w.acwr == null ? null : w.acwr > A.FAIXA_ACWR.ate ? 'acima' : w.acwr < A.FAIXA_ACWR.de ? 'abaixo' : 'dentro';
    const kpis = [
      kpi({ rot: `Carga na ${w.rotulo}`, valor: num(w.realizado), un: 'UA', delta: p ? pct(w.realizado, p.realizado) : null, deltaTxt: p ? `${sinal(pct(w.realizado, p.realizado))}${Math.abs(Math.round(pct(w.realizado, p.realizado)))}% na semana` : '', bom: null,
        sub: `${Math.round((w.realizado / w.planejado) * 100)}% do planejado`, spark: G.spark(T.slice(-8).map((x) => x.realizado)) }),
      kpi({ rot: 'ACWR da turma', valor: w.acwr == null ? 'n/d' : dec(w.acwr, 2), selo: faixa ? selo(faixa === 'dentro' ? 'ok' : 'warn', faixa === 'dentro' ? 'Na faixa segura' : faixa === 'acima' ? 'Acima da faixa' : 'Abaixo da faixa') : '',
        sub: 'faixa segura: 0,8 a 1,3', spark: G.spark(T.map((x) => x.acwr)) }),
      kpi({ rot: 'PSR médio', valor: dec(w.psr), un: '/10', delta: p && p.psr != null ? w.psr - p.psr : null, deltaTxt: p && p.psr != null ? `${sinal(w.psr - p.psr)}${dec(Math.abs(w.psr - p.psr))} na semana` : '', bom: true,
        sub: '10 é totalmente recuperado', spark: G.spark(T.slice(-8).map((x) => x.psr)) }),
      kpi({ rot: 'Presença', valor: Math.round(w.pres), un: '%', delta: p ? w.pres - p.pres : null, deltaTxt: p ? `${sinal(w.pres - p.pres)}${Math.abs(Math.round(w.pres - p.pres))} pontos` : '', bom: true,
        sub: `nas sessões da ${w.rotulo}`, spark: G.spark(T.slice(-8).map((x) => x.pres)) }),
      kpi({ rot: 'Atletas em atenção', valor: `${atencao.length}`, un: `de ${AT.length}`, selo: selo(nCrit ? 'crit' : atencao.length ? 'warn' : 'ok', nCrit ? 'Há alerta' : atencao.length ? 'Atenção' : 'Tudo em dia'),
        sub: atencao.length ? '<button class="link-btn" data-aba="atletas" style="margin:0">Ver atletas</button>' : 'ninguém fora dos limites' }),
    ].join('');

    // Carga: planejada em barras discretas e realizada em linha (emphasis na realizada).
    const ini = T[0].i;
    const fim = Math.min(plano.semanas.length - 1, Math.max(plano.semanaAtual, T[T.length - 1].i) + 3);
    const W = plano.semanas.slice(ini, fim + 1);
    const cfgCarga = {
      rotulo: 'Carga semanal planejada e realizada', rotuloX: 'Semana', altura: 230,
      x: W.map((s) => `S${s.n}`), tituloDica: (i) => `Semana ${W[i].n} · ${dd(W[i].inicio)}`,
      series: [
        { id: 'plan', nome: 'Planejada', tipo: 'barra', cor: 'plano', opac: 0.3, y: W.map((s) => s.planejado) },
        { id: 'real', nome: 'Realizada, por atleta', tipo: 'linha', cor: 'a', y: W.map((s) => s.realizado), fmt: (v) => `${num(v)} UA` },
      ],
      marcasX: plano.semanaAtual >= ini && plano.semanaAtual <= fim ? [{ i: plano.semanaAtual - ini, rotulo: 'Hoje' }] : [],
      fmtY: (v) => num(v),
    };
    const cfgAcwr = {
      rotulo: 'ACWR da turma por semana', rotuloX: 'Semana', altura: 200, yMin: 0.5, yMax: 1.75, nMarcas: 5, margemEsq: 40,
      x: T.map((s) => s.rotulo), tituloDica: (i) => `Semana ${T[i].n} · ${dd(T[i].inicio)}`,
      series: [{ id: 'acwr', nome: 'ACWR', tipo: 'linha', cor: 'a', y: T.map((s) => s.acwr), fmt: (v) => dec(v, 2) }],
      faixa: { de: A.FAIXA_ACWR.de, ate: A.FAIXA_ACWR.ate, rotulo: 'faixa segura 0,8 a 1,3' },
      fmtY: (v) => dec(v, 2),
      nota: 'ACWR é a carga da semana dividida pela média das 4 últimas semanas. As três primeiras semanas ainda não têm base para o cálculo.',
    };
    const cfgPse = {
      rotulo: 'PSE e PSR médios por semana', rotuloX: 'Semana', altura: 200, yMin: 0, yMax: 10, nMarcas: 5, margemEsq: 34,
      x: T.map((s) => s.rotulo), tituloDica: (i) => `Semana ${T[i].n} · ${dd(T[i].inicio)}`,
      series: [
        { id: 'pse', nome: 'PSE (esforço)', tipo: 'linha', cor: 'b', y: T.map((s) => s.pse), fmt: (v) => dec(v), rotuloUltimo: false },
        { id: 'psr', nome: 'PSR (recuperação)', tipo: 'linha', cor: 'a', y: T.map((s) => s.psr), fmt: (v) => dec(v), rotuloUltimo: false },
      ],
      fmtY: (v) => String(v),
      nota: 'Esforço alto com recuperação em queda, semana após semana, é o sinal clássico de sobrecarga.',
    };

    // Mix das sessões
    const mix = A.mixSessoes(plano);
    const totalMin = Object.values(mix).reduce((a, v) => a + v, 0) || 1;
    const itensMix = Object.keys(TIPOS_SESSAO).filter((k) => mix[k]).map((k) => ({ k, min: mix[k] }));
    const mixHtml = `
      <div class="stack" style="height:14px" role="img" aria-label="Tempo por tipo de sessão">${itensMix.map((x) => `<i style="width:${(x.min / totalMin) * 100}%;background:var(${TIPOS_SESSAO[x.k].cor})"></i>`).join('')}</div>
      <ul class="an-mix">${itensMix.map((x) => `<li><span class="dot" style="background:var(${TIPOS_SESSAO[x.k].cor});margin:0"></span><span>${esc(TIPOS_SESSAO[x.k].nome)}</span><b class="num">${Math.floor(x.min / 60)}h${String(x.min % 60).padStart(2, '0')}</b><span class="num an-pc">${Math.round((x.min / totalMin) * 100)}%</span></li>`).join('')}</ul>`;

    el.innerHTML = `
      <div class="kpis">${kpis}</div>
      <div class="an-grade">
        <div class="an-col">
          ${G.cartao('g-carga', { titulo: 'Carga semanal', sub: `Planejada e realizada por atleta, em UA (duração × PSE). Até a ${w.rotulo}, com as próximas semanas já planejadas.`, ...cfgCarga })}
          ${G.cartao('g-acwr', { titulo: 'ACWR da turma', sub: 'Carga aguda dividida pela crônica. Fora da faixa, o risco aumenta.', ...cfgAcwr })}
          ${G.cartao('g-pse', { titulo: 'Esforço e recuperação', sub: 'PSE e PSR médios da turma em cada semana.', ...cfgPse })}
        </div>
        <aside class="an-lado">
          <section class="card" aria-labelledby="an-at-t">
            <div class="card-head"><h2 id="an-at-t">Atenção agora</h2><span class="label">${plural(atencao.length, 'atleta', 'atletas')}</span></div>
            ${atencao.length ? `<ul class="an-aten">${atencao.slice(0, 6).map((a) => `<li>${selo(a.nivel)}<div><b>${esc(a.nome)}</b><small>${esc(a.motivos.map((m) => m.texto).join(' · '))}</small></div></li>`).join('')}</ul>
              ${atencao.length > 6 ? `<p class="hint"><button class="link-btn" data-aba="atletas" style="margin:0">Ver os outros ${atencao.length - 6}</button></p>` : ''}`
              : `<p class="vazio" style="padding:6px 0">${ICO.ok.replace('width="14" height="14"', 'width="18" height="18"')} Nenhum atleta fora dos limites nas últimas semanas.</p>`}
          </section>
          <section class="card" aria-labelledby="an-mix-t">
            <div class="card-head"><h2 id="an-mix-t">Tipo de sessão</h2><span class="label">últimas 4 semanas</span></div>
            ${mixHtml}
          </section>
          <details class="card an-como">
            <summary>Como lemos estes números</summary>
            <ul class="ideias">
              <li><b>Carga</b>: duração × PSE das sessões em que o atleta esteve presente. Faltas contam zero.</li>
              <li><b>ACWR</b>: carga da semana ÷ média das 4 últimas semanas. De 0,8 a 1,3 é a faixa segura.</li>
              <li><b>Alerta</b>: ACWR acima de 1,5, ou PSR até 5 com PSE acima do alvo, ou dor forte relatada.</li>
              <li><b>Atenção</b>: ACWR fora da faixa, PSR até 5,5, presença abaixo de 60%, semana monótona (monotonia acima de 2) ou dor moderada.</li>
              <li>O semáforo ajuda a olhar primeiro para quem precisa. A decisão é sua.</li>
            </ul>
          </details>
        </aside>
      </div>`;

    G.ativar(el, 'g-carga', cfgCarga);
    G.ativar(el, 'g-acwr', cfgAcwr);
    G.ativar(el, 'g-pse', cfgPse);
    el.querySelectorAll('[data-aba]').forEach((b) => b.addEventListener('click', () => { est.aba = b.dataset.aba; render(raiz, `[data-aba-tab="${b.dataset.aba}"]`); }));
  }

  /* ---------- Atletas ---------- */

  const ORDENS = {
    atencao: 'Quem pede atenção primeiro',
    nome: 'Nome',
    carga: 'Maior carga na última semana',
    acwr: 'Maior ACWR',
    psr: 'Menor PSR',
    pres: 'Menor presença',
  };

  function ordenar(lista, ordem) {
    const peso = { crit: 0, warn: 1, ok: 2 };
    const f = {
      atencao: (a, b) => peso[a.nivel] - peso[b.nivel] || (b.acwr || 0) - (a.acwr || 0) || a.nome.localeCompare(b.nome),
      nome: (a, b) => a.nome.localeCompare(b.nome),
      carga: (a, b) => b.cargaUlt - a.cargaUlt,
      acwr: (a, b) => (b.acwr || 0) - (a.acwr || 0),
      psr: (a, b) => (a.psr == null) - (b.psr == null) || a.psr - b.psr,
      pres: (a, b) => (a.pres == null) - (b.pres == null) || a.pres - b.pres,
    }[ordem];
    return lista.slice().sort(f);
  }

  function atletas(el, plano) {
    const AT = A.atletas(plano);
    if (!AT.length) { el.innerHTML = vazioSemRegistro(); return; }
    const maxC = Math.max(...AT.flatMap((a) => a.cargas8), 1);
    const lista = ordenar(AT, est.ordem);
    const r8 = AT[0].rotulos8;

    const linha = (a) => {
      const fora = a.acwr != null && (a.acwr > A.FAIXA_ACWR.ate || a.acwr < A.FAIXA_ACWR.de);
      const seta = a.tendencia != null && Math.abs(a.tendencia) >= 0.5 ? (a.tendencia > 0 ? ICO.sobe : ICO.desce) : '';
      return `<tr>
        <td class="at-quem"><div class="at-quem-i">${seloIc(a.nivel)}<div><button class="link-btn at-link" data-atleta="${a.id}">${esc(a.nome)}</button>${a.motivos.length ? `<small>${esc(a.motivos.map((m) => m.texto).join(' · '))}</small>` : ''}</div></div></td>
        <td><div class="heat" role="img" aria-label="Carga das últimas ${a.cargas8.length} semanas">${a.cargas8.map((v, i) => `<i style="--o:${(0.1 + 0.85 * (v / maxC)).toFixed(2)}" title="${esc(a.rotulos8[i])}: ${num(v)} UA"></i>`).join('')}</div></td>
        <td class="r num">${a.acwr == null ? '–' : `<span class="${fora ? 'fora' : ''}">${fora ? (a.acwr > 1 ? ICO.sobe : ICO.desce) : ''}${dec(a.acwr, 2)}</span>`}</td>
        <td class="r num">${a.pse == null ? '–' : dec(a.pse)}</td>
        <td class="r num"><span class="${a.psr != null && a.psr <= 5.5 ? 'fora' : ''}">${a.psr == null ? '–' : dec(a.psr)}</span>${seta ? `<span class="tend ${a.tendencia > 0 ? 'bom' : 'ruim'}" title="PSR ${a.tendencia > 0 ? 'subindo' : 'caindo'} nas últimas semanas">${seta}</span>` : ''}</td>
        <td class="r num">${a.pres == null ? '–' : `${Math.round(a.pres)}%`}</td>
        <td class="r num">${a.monotonia == null ? '–' : dec(a.monotonia, 1)}</td>
      </tr>`;
    };

    el.innerHTML = `
      <section class="card" aria-labelledby="an-atl-t">
        <div class="card-head">
          <div><h2 id="an-atl-t">Atletas</h2><p class="gf-sub">Últimas 4 semanas completas, exceto a carga, que mostra as últimas 8.</p></div>
          <div class="field"><label class="label" for="an-ordem">Ordenar por</label>
            <select class="select" id="an-ordem" style="min-width:230px">${Object.entries(ORDENS).map(([k, n]) => `<option value="${k}" ${k === est.ordem ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
        </div>
        <div class="table-scroll">
          <table class="an-tab">
            <thead><tr><th>Atleta</th><th>Carga, ${esc(r8[0])} a ${esc(r8[r8.length - 1])}</th><th class="r">ACWR</th><th class="r">PSE</th><th class="r">PSR</th><th class="r">Presença</th><th class="r" title="Monotonia da última semana">Monot.</th></tr></thead>
            <tbody>${lista.map(linha).join('')}</tbody>
          </table>
        </div>
        <div class="an-escala" aria-hidden="true"><span>menos carga</span><i class="an-grad"></i><span>mais carga</span></div>
        <p class="hint">Toque no nome para comparar o atleta com a turma, a faixa ou outro atleta.</p>
      </section>`;

    el.querySelector('#an-ordem').addEventListener('change', (e) => { est.ordem = e.target.value; render(raiz, '#an-ordem'); });
    el.querySelectorAll('[data-atleta]').forEach((b) => b.addEventListener('click', () => {
      window.Farol.comparativos.definirAtleta(b.dataset.atleta);
      est.aba = 'comparar';
      render(raiz, '[data-aba-tab="comparar"]');
      window.scrollTo({ top: 0 });
    }));
  }

  /* ---------- Competições ---------- */

  function competicoes(el) {
    const C = A.competicoes();
    const nReal = C.realizadas.length;
    const k = [
      kpi({ rot: 'Competições realizadas', valor: String(nReal), sub: 'nesta temporada' }),
      kpi({ rot: 'Duplas com resultado', valor: String(C.duplas), sub: 'lançadas pelo técnico' }),
      kpi({ rot: 'Aproveitamento', valor: C.aproveitamento == null ? 'n/d' : Math.round(C.aproveitamento), un: '%', sub: `${C.v} vitórias e ${C.d} derrotas` }),
      kpi({ rot: 'Melhor resultado', valor: C.melhor ? esc(C.melhor.colocacao) : 'n/d', sub: C.melhor ? esc(`${C.melhor.dupla.cat} · ${C.melhor.comp.nome}`) : '' }),
    ].join('');
    const nomeDupla = (d) => `${ATLETAS[d.a].nome.split(' ')[0]} e ${ATLETAS[d.b].nome.split(' ')[0]}`;

    el.innerHTML = `
      <div class="kpis">${k}</div>
      <section class="card" aria-labelledby="an-res-t">
        <div class="card-head"><h2 id="an-res-t">Resultados</h2><span class="label">${plural(C.linhas.length, 'dupla', 'duplas')}</span></div>
        ${C.linhas.length ? `<div class="table-scroll"><table class="an-tab">
          <thead><tr><th>Competição</th><th>Dupla</th><th>Categoria</th><th>Fase</th><th>Colocação</th><th>Vitórias e derrotas</th></tr></thead>
          <tbody>${C.linhas.map((l) => {
            const t = (l.v || 0) + (l.d || 0) || 1;
            return `<tr>
              <td><button class="link-btn at-link" data-comp="${l.comp.id}">${esc(l.comp.nome)}</button><small class="sub-linha">${dd(l.comp.data)}</small></td>
              <td>${esc(nomeDupla(l.dupla))}</td><td>${esc(l.dupla.cat)}</td><td>${esc(l.fase || '–')}</td><td><b>${esc(l.colocacao || '–')}</b></td>
              <td><div class="vd" role="img" aria-label="${l.v || 0} vitórias e ${l.d || 0} derrotas"><i class="v" style="flex:${l.v || 0}"></i><i class="d" style="flex:${l.d || 0}"></i></div><span class="num vd-n">${l.v || 0} V · ${l.d || 0} D</span></td></tr>`;
          }).join('')}</tbody></table></div>` : '<p class="vazio">Nenhum resultado lançado ainda.</p>'}
      </section>
      <section class="card" aria-labelledby="an-prox-t">
        <div class="card-head"><h2 id="an-prox-t">Próximas competições</h2><span class="label">preparo e custo previsto</span></div>
        <div class="table-scroll"><table class="an-tab">
          <thead><tr><th>Competição</th><th class="r">Duplas</th><th>Preparo</th><th class="r">Custo previsto</th><th class="r">Por pessoa</th></tr></thead>
          <tbody>${C.proximas.map((p) => `<tr>
            <td><button class="link-btn at-link" data-comp="${p.comp.id}">${esc(p.comp.nome)}</button><small class="sub-linha">${dd(p.comp.data)} · ${esc(p.comp.local)}</small></td>
            <td class="r num">${p.confirmadas} <small>conf.</small> · ${p.previstas} <small>prev.</small></td>
            <td><span class="pills">${p.prontidao.map((x) => `<span class="pill pill-${x.estado}" title="${esc(x.nome)}: ${esc(x.texto)}"><span class="pill-dot"></span>${esc(x.nome)}</span>`).join('')}</span></td>
            <td class="r num">${p.previsto ? util.brl(p.previsto) : '–'}</td><td class="r num">${p.porPessoa ? util.brl(p.porPessoa) : '–'}</td></tr>`).join('')}</tbody></table></div>
        <p class="hint">Abra a competição para ver duplas, viagem, custos e equipe.</p>
      </section>`;
    el.querySelectorAll('[data-comp]').forEach((b) => b.addEventListener('click', () => window.Farol.ir('planejamento-competicoes', { competicao: b.dataset.comp })));
  }

  /* ---------- Tela ---------- */

  function render(root, foco) {
    const planoId = window.Farol.compartilhado.planoId;
    const plano = dados.plano(planoId);
    const comPlano = est.aba === 'geral' || est.aba === 'atletas';

    root.innerHTML = `
      <header class="page-head">
        <div>
          <span class="chip" style="margin-bottom:10px">Dados de exemplo</span>
          <h1>Análise</h1>
          <p class="lead">Carga, esforço, recuperação e resultados, calculados a partir dos registros de treino.</p>
        </div>
        ${comPlano ? `<div class="field"><label class="label" for="an-plano">Turma ou atleta</label>
          <select class="select" id="an-plano">${dados.planos.map((p) => `<option value="${p.id}" ${p.id === plano.id ? 'selected' : ''}>${esc(p.nome)} (${esc(p.detalhe)})</option>`).join('')}</select></div>` : ''}
      </header>
      <div class="tabs" role="tablist" aria-label="Áreas da análise">
        ${ABAS.map(([k, nome]) => `<button class="tab" role="tab" data-aba-tab="${k}" id="an-tab-${k}" aria-selected="${k === est.aba}" aria-controls="an-corpo" tabindex="${k === est.aba ? 0 : -1}"><span class="tab-nome">${nome}</span></button>`).join('')}
      </div>
      <div id="an-corpo" class="corpo" role="tabpanel" aria-labelledby="an-tab-${est.aba}"></div>`;

    const corpo = root.querySelector('#an-corpo');
    if (est.aba === 'geral') geral(corpo, plano);
    else if (est.aba === 'atletas') atletas(corpo, plano);
    else if (est.aba === 'comparar') window.Farol.comparativos.montar(corpo);
    else competicoes(corpo);

    root.querySelectorAll('[data-aba-tab]').forEach((b, i, todos) => {
      b.addEventListener('click', () => { est.aba = b.dataset.abaTab; render(root, `#an-tab-${est.aba}`); });
      b.addEventListener('keydown', (e) => {
        const passo = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (!passo) return;
        e.preventDefault();
        est.aba = todos[(i + passo + todos.length) % todos.length].dataset.abaTab;
        render(root, `#an-tab-${est.aba}`);
      });
    });
    const sel = root.querySelector('#an-plano');
    if (sel) sel.addEventListener('change', (e) => { window.Farol.compartilhado.planoId = e.target.value; render(root, '#an-plano'); });
    if (foco) { const f = root.querySelector(foco); if (f) f.focus({ preventScroll: true }); }
  }

  window.Farol.views = window.Farol.views || {};
  window.Farol.views.analise = (root, params) => {
    raiz = root;
    if (params && params.aba) est.aba = params.aba;
    render(root);
  };
})();
