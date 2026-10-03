/* Análise > Comparativos
   Dois modos, com poucas linhas cada:
   - Atleta: um atleta contra a turma, a mesma faixa e gênero, todos do mesmo gênero, ele mesmo na avaliação
     anterior ou outro atleta (por exemplo, o parceiro de dupla).
   - Grupos: um grupo contra outro (turma, faixa etária, gênero), com a opção de comparar a posição de cada
     atleta dentro da própria faixa e gênero, que é a forma justa de comparar gêneros diferentes. */
(function () {
  const { util, elenco, medidas: M } = window.Farol;
  const { esc, plural, dd } = util;
  const { ATLETAS, TURMAS } = elenco;

  let raiz = null;
  const est = { modo: 'atleta', atletaId: 'a4', ref: 'turma', outroId: 'a3', gA: 'genero:M', gB: 'genero:F', escala: 'bruto' };

  const REFS = {
    turma: 'Colegas da turma',
    faixaGenero: 'Mesma faixa e gênero',
    genero: 'Todos do mesmo gênero',
    anterior: 'Ele mesmo, na avaliação anterior',
    outro: 'Outro atleta',
  };
  const PRESETS = [
    { nome: 'Masculino × Feminino', a: 'genero:M', b: 'genero:F' },
    { nome: 'Sub-18 × Adulto', a: 'faixa:Sub-18', b: 'faixa:Adulto' },
    { nome: 'Sub-16 × Sub-19 (feminino)', a: 'turma:sub16f', b: 'turma:sub19f' },
  ];
  const nomeGenero = { M: 'masculino', F: 'feminino' };

  /* ---------- Gráficos de uma linha ---------- */

  const W = 320, L = 12, R = 12, XW = W - L - R;
  const TETO = { pres: 100, psr: 10, pse: 10 };
  const dominio = (vals, m) => {
    let a = Math.min(...vals), b = Math.max(...vals);
    if (a === b) { a -= 1; b += 1; }
    const pad = (b - a) * 0.08;
    a -= pad; b += pad;
    if (m && TETO[m.id] != null) b = Math.min(b, TETO[m.id]);
    if (m && m.grupo === 'treino') a = Math.max(a, 0);
    return [a, b];
  };
  const px = (v, [a, b], inverter) => L + ((inverter ? b - v : v - a) / (b - a)) * XW;
  const jit = (i) => (((i * 7) % 5) - 2) * 2.6;

  function eixo(dom, inverter, y, f) {
    const esq = inverter ? dom[1] : dom[0], dir = inverter ? dom[0] : dom[1];
    return `<text x="${L}" y="${y}" class="cmp-eixo">${f(esq)}</text><text x="${W - R}" y="${y}" text-anchor="end" class="cmp-eixo">${f(dir)}</text>`;
  }

  // Linha de um atleta (ou dois) sobre a distribuição da referência.
  function tiraAtleta(m, ref, marcas) {
    const todos = [...ref.map((p) => p.v), ...marcas.map((k) => k.v)];
    const dom = dominio(todos, m);
    const inv = m.melhor === 'baixo';
    const y = 24;
    const med = M.mediana(ref.map((p) => p.v));
    return `<svg viewBox="0 0 ${W} 50" class="cmp-svg" role="img" aria-label="${esc(m.nome)}: ${marcas.map((k) => `${esc(k.nome)} ${M.formatar(k.v, m)}`).join(', ')}">
      <line x1="${L}" x2="${W - R}" y1="${y}" y2="${y}" class="cmp-base"/>
      ${ref.map((p, i) => `<circle cx="${px(p.v, dom, inv).toFixed(1)}" cy="${y + jit(i)}" r="3.4" class="cmp-pt"><title>${esc(p.nome)}: ${M.formatar(p.v, m)}</title></circle>`).join('')}
      ${med != null ? `<line x1="${px(med, dom, inv).toFixed(1)}" x2="${px(med, dom, inv).toFixed(1)}" y1="${y - 13}" y2="${y + 13}" class="cmp-med"><title>Mediana: ${M.formatar(med, m)}</title></line>` : ''}
      ${marcas.map((k) => `<circle cx="${px(k.v, dom, inv).toFixed(1)}" cy="${y}" r="7" class="${k.vazio ? 'cmp-marca-vazia' : `cmp-marca cmp-${k.cor}`}"><title>${esc(k.nome)}: ${M.formatar(k.v, m)}</title></circle>`).join('')}
      ${eixo(dom, inv, 46, (v) => M.formatar(v, m))}
    </svg>`;
  }

  // Duas pistas, uma por grupo, com a média marcada.
  function tiraGrupos(m, A, B, o) {
    const todos = [...A, ...B].map((p) => p.v);
    const dom = dominio(todos, o.evolucao ? null : m);
    const inv = !o.evolucao && m.melhor === 'baixo';
    const pista = (lista, y, cor) => {
      const media = lista.length ? lista.reduce((a, p) => a + p.v, 0) / lista.length : null;
      return `<line x1="${L}" x2="${W - R}" y1="${y}" y2="${y}" class="cmp-base"/>
        ${lista.map((p, i) => `<circle cx="${px(p.v, dom, inv).toFixed(1)}" cy="${y + jit(i)}" r="3.3" class="cmp-pt cmp-${cor}-pt"><title>${esc(p.nome)}: ${o.fmt(p.v)}</title></circle>`).join('')}
        ${media != null ? `<rect x="${(px(media, dom, inv) - 2).toFixed(1)}" y="${y - 11}" width="4" height="22" rx="1.5" class="cmp-${cor} cmp-media"><title>Média: ${o.fmt(media)}</title></rect>` : ''}`;
    };
    return `<svg viewBox="0 0 ${W} 74" class="cmp-svg" role="img" aria-label="${esc(m.nome)}: distribuição dos dois grupos">
      ${pista(A, 18, 'a')}${pista(B, 44, 'b')}
      ${eixo(dom, inv, 70, o.fmt)}
    </svg>`;
  }

  const sinal = (d) => (d > 0 ? '+' : d < 0 ? '−' : '');
  const pontos = (ids, m, qual = 'atual') => ids.map((id) => ({ id, nome: ATLETAS[id].nome, v: M.valor(id, m.id, qual) })).filter((p) => p.v != null);

  /* ---------- Modo atleta ---------- */

  function chipPosicao(pos, m, n) {
    if (pos == null) return '';
    const classe = !m.melhor ? '' : pos >= 67 ? 'chip-bom' : pos <= 33 ? 'chip-aten' : '';
    const texto = !m.melhor
      ? (pos === 100 ? 'maior valor do grupo' : pos === 0 ? 'menor valor do grupo' : `acima de ${pos}% do grupo`)
      : pos === 0 ? 'pior valor do grupo' : pos === 100 ? 'melhor valor do grupo' : `melhor que ${pos}% do grupo`;
    return `<span class="chip ${classe}">${texto}</span>${n < 5 ? '<span class="cmp-n">grupo pequeno</span>' : ''}`;
  }

  function linhaAtleta(m, ctx) {
    const id = est.atletaId;
    const v = M.valor(id, m.id);
    const nome = ATLETAS[id].nome.split(' ')[0];
    const nomeOutro = est.ref === 'outro' ? ATLETAS[est.outroId].nome.split(' ')[0] : '';
    const refIds = ctx.refIds;
    const ref = pontos(refIds, m);

    let meio = '', num = '';
    if (v == null) {
      meio = '<p class="cmp-vazio">Sem treino registrado neste período.</p>';
      num = '<span class="cmp-valor">n/d</span>';
    } else if (est.ref === 'anterior') {
      const ant = M.valor(id, m.id, 'anterior');
      const marcas = [{ v: ant, cor: 'a', vazio: true, nome: `${nome} (anterior)` }, { v, cor: 'a', nome: `${nome} (atual)` }];
      meio = tiraAtleta(m, ref, marcas);
      const d = +(v - ant).toFixed(m.casas + 1);
      const melhorou = m.melhor === 'alto' ? d > 0 : d < 0;
      num = `<span class="cmp-valor num">${M.formatar(ant, m)} → ${M.formatar(v, m)} <small>${m.un}</small></span>
        <span class="chip ${d === 0 ? '' : melhorou ? 'chip-bom' : 'chip-aten'}">${d === 0 ? 'sem mudança' : `${sinal(d)}${M.formatar(Math.abs(d), m)} ${m.un}`}</span>`;
    } else if (est.ref === 'outro') {
      const vo = M.valor(est.outroId, m.id);
      const marcas = [{ v, cor: 'a', nome }, ...(vo != null ? [{ v: vo, cor: 'b', nome: nomeOutro }] : [])];
      meio = tiraAtleta(m, ref, marcas);
      const d = vo != null ? +(v - vo).toFixed(m.casas + 1) : null;
      num = `<span class="cmp-valor num"><i class="cmp-dot cmp-a"></i>${M.formatar(v, m)} <i class="cmp-dot cmp-b"></i>${vo != null ? M.formatar(vo, m) : 'n/d'} <small>${m.un}</small></span>
        ${d != null ? `<span class="cmp-n num">diferença ${sinal(d)}${M.formatar(Math.abs(d), m)} ${m.un}</span>` : ''}`;
    } else {
      meio = ref.length ? tiraAtleta(m, ref, [{ v, cor: 'a', nome }]) : '<p class="cmp-vazio">Sem referência.</p>';
      const refV = ref.map((p) => p.v);
      const med = M.mediana(refV);
      const d = med != null ? +(v - med).toFixed(m.casas + 1) : null;
      num = `<span class="cmp-valor num">${M.formatar(v, m)} <small>${m.un}</small></span>
        ${chipPosicao(M.posicao(v, refV, m.melhor), m, refV.length)}
        ${d != null ? `<span class="cmp-n num">mediana ${M.formatar(med, m)}, ${d === 0 ? 'igual' : `${sinal(d)}${M.formatar(Math.abs(d), m)}`}</span>` : ''}`;
    }
    return `<div class="cmp-linha"><div class="cmp-nome"><b>${esc(m.nome)}</b>${m.un ? `<small>${esc(m.un)}</small>` : ''}</div><div class="cmp-grafico">${meio}</div><div class="cmp-num">${num}</div></div>`;
  }

  function atleta(el) {
    const id = est.atletaId;
    const a = ATLETAS[id];
    const turma = M.turmaDe(id);
    let refIds, refNome;
    if (est.ref === 'turma') { refIds = (turma ? turma.atletas : []).filter((x) => x !== id); refNome = turma ? turma.nome : 'turma'; }
    else if (est.ref === 'genero') { refIds = M.grupo(`genero:${a.genero}`).membros.filter((x) => x !== id); refNome = `todos do gênero ${nomeGenero[a.genero]}`; }
    else { refIds = M.mesmaFaixaGenero(id).filter((x) => x !== id && x !== est.outroId); refNome = `${a.faixa} ${nomeGenero[a.genero]}`; }
    const ctx = { refIds };
    const mostraTreino = est.ref !== 'anterior';

    el.innerHTML = `
      <div class="cmp-controles">
        <div class="field"><label class="label" for="cmp-atl">Atleta</label>
          <select class="select" id="cmp-atl">${Object.values(TURMAS).map((t) => `<optgroup label="${esc(t.nome)}">${t.atletas.map((x) => `<option value="${x}" ${x === id ? 'selected' : ''}>${esc(ATLETAS[x].nome)}</option>`).join('')}</optgroup>`).join('')}</select></div>
        <div class="field"><label class="label" for="cmp-ref">Comparar com</label>
          <select class="select" id="cmp-ref">${Object.entries(REFS).map(([k, n]) => `<option value="${k}" ${k === est.ref ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
        ${est.ref === 'outro' ? `<div class="field"><label class="label" for="cmp-outro">Outro atleta</label>
          <select class="select" id="cmp-outro">${Object.values(TURMAS).map((t) => `<optgroup label="${esc(t.nome)}">${t.atletas.filter((x) => x !== id).map((x) => `<option value="${x}" ${x === est.outroId ? 'selected' : ''}>${esc(ATLETAS[x].nome)}</option>`).join('')}</optgroup>`).join('')}</select></div>` : ''}
      </div>
      <p class="cmp-resumo"><b>${esc(a.nome)}</b> · ${esc(a.faixa)}, ${nomeGenero[a.genero]}${turma ? ` · ${esc(turma.nome)}` : ''}.
        ${est.ref === 'anterior' ? `Comparado com a avaliação de ${dd(M.AVALIACOES.anterior)}, em relação a ${plural(refIds.length, 'atleta', 'atletas')} de ${esc(refNome)}.`
          : est.ref === 'outro' ? `Contra ${esc(ATLETAS[est.outroId].nome)}, sobre ${plural(refIds.length, 'atleta', 'atletas')} de ${esc(refNome)}.`
          : `Referência: ${plural(refIds.length, 'atleta', 'atletas')} (${esc(refNome)}).`}</p>

      <section class="card" aria-labelledby="h-testes">
        <div class="card-head"><h2 id="h-testes">Testes físicos</h2><span class="label">avaliação de ${dd(M.AVALIACOES.atual)} · mais à direita é melhor</span></div>
        ${M.TESTES.map((m) => linhaAtleta(m, ctx)).join('')}
      </section>

      ${mostraTreino ? `
      <section class="card" aria-labelledby="h-treino">
        <div class="card-head"><h2 id="h-treino">Treino</h2><span class="label">últimas 4 semanas completas</span></div>
        ${M.TREINO.map((m) => linhaAtleta(m, ctx)).join('')}
        <p class="hint">Carga e PSE não têm lado melhor: só mostram quanto o atleta treinou e sentiu. PSR e presença têm: mais à direita é melhor.</p>
      </section>` : '<p class="hint">A evolução usa só os testes físicos, que têm mais de uma avaliação.</p>'}`;

    el.querySelector('#cmp-atl').addEventListener('change', (e) => { est.atletaId = e.target.value; if (est.outroId === est.atletaId) est.outroId = 'a1'; render(raiz, '#cmp-atl'); });
    el.querySelector('#cmp-ref').addEventListener('change', (e) => { est.ref = e.target.value; render(raiz, '#cmp-ref'); });
    const o = el.querySelector('#cmp-outro'); if (o) o.addEventListener('change', (e) => { est.outroId = e.target.value; render(raiz, '#cmp-outro'); });
  }

  /* ---------- Modo grupos ---------- */

  function opcoesGrupo(sel) {
    const g = M.listaGrupos();
    const op = (x) => `<option value="${x.id}" ${x.id === sel ? 'selected' : ''}>${esc(x.nome)}</option>`;
    return `<optgroup label="Turmas">${g.turmas.map(op).join('')}</optgroup>
      <optgroup label="Faixas etárias">${g.faixas.map(op).join('')}</optgroup>
      <optgroup label="Gênero">${g.generos.map(op).join('')}</optgroup>
      <optgroup label="Todos">${g.todos.map(op).join('')}</optgroup>`;
  }

  const desvio = (v) => {
    if (v.length < 2) return 0;
    const mu = v.reduce((a, x) => a + x, 0) / v.length;
    return Math.sqrt(v.reduce((a, x) => a + (x - mu) ** 2, 0) / v.length);
  };
  const fmtPct = (v) => `${v.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;

  // Melhora de um teste desde a avaliação anterior, em %, já com o sinal ajustado (positivo é melhor).
  function melhoraPct(id, m) {
    const ant = M.valor(id, m.id, 'anterior'), at = M.valor(id, m.id);
    if (ant == null || at == null) return null;
    return ((m.melhor === 'alto' ? at - ant : ant - at) / ant) * 100;
  }

  function linhaGrupos(m, gA, gB, evolucao) {
    const dados = (g) => g.membros.map((id) => ({ id, nome: ATLETAS[id].nome, v: evolucao ? melhoraPct(id, m) : M.valor(id, m.id) })).filter((p) => p.v != null);
    const A = dados(gA), B = dados(gB);
    const mA = M.media(A.map((p) => p.v)), mB = M.media(B.map((p) => p.v));
    const fmt = evolucao ? (v) => (v == null ? 'n/d' : fmtPct(v)) : (v) => (v == null ? 'n/d' : M.formatar(v, m));
    let veredito = '';
    if (mA != null && mB != null) {
      const d = mA - mB;
      const dTxt = evolucao ? `${sinal(+d.toFixed(1))}${Math.abs(d).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} p.p.` : `${sinal(+d.toFixed(m.casas))}${M.formatar(Math.abs(d), m)} ${m.un}`;
      const relevante = Math.abs(d) >= 0.2 * desvio([...A, ...B].map((p) => p.v));
      let quem = '';
      if (evolucao || m.melhor) {
        if (!relevante) quem = '<span class="chip">equivalentes</span>';
        else {
          const aFrente = evolucao || m.melhor === 'alto' ? d > 0 : d < 0;
          quem = `<span class="chip"><i class="cmp-dot cmp-${aFrente ? 'a' : 'b'}"></i>${esc(aFrente ? gA.nome : gB.nome)} ${evolucao ? 'melhorou mais' : 'à frente'}</span>`;
        }
      }
      veredito = `<span class="cmp-n num">diferença de médias ${dTxt}</span>${quem}`;
    }
    const pequeno = (A.length && A.length < 5) || (B.length && B.length < 5);
    const meio = (A.length || B.length) ? tiraGrupos(m, A, B, { evolucao, fmt }) : '<p class="cmp-vazio">Sem dados nestes grupos.</p>';
    return `<div class="cmp-linha"><div class="cmp-nome"><b>${esc(m.nome)}</b><small>${evolucao ? 'melhora desde a avaliação anterior' : esc(m.un)}</small></div>
      <div class="cmp-grafico">${meio}</div>
      <div class="cmp-num"><span class="cmp-valor num"><i class="cmp-dot cmp-a"></i>${fmt(mA)} <i class="cmp-dot cmp-b"></i>${fmt(mB)}</span>${veredito}
        <span class="cmp-n num">n = ${A.length} e ${B.length}${pequeno ? ' · grupo pequeno' : ''}</span></div></div>`;
  }

  function grupos(el) {
    const gA = M.grupo(est.gA), gB = M.grupo(est.gB);
    const gens = (g) => [...M.generosDe(g.membros)].sort().join('');
    const diferentes = gens(gA) !== gens(gB);
    const evolucao = est.escala === 'evolucao';

    el.innerHTML = `
      <div class="cmp-presets" role="group" aria-label="Comparações prontas">
        ${PRESETS.map((p, i) => `<button class="chip chip-link" data-preset="${i}" aria-pressed="${p.a === est.gA && p.b === est.gB}">${esc(p.nome)}</button>`).join('')}
      </div>
      <div class="cmp-controles">
        <div class="field"><label class="label" for="cmp-ga"><i class="cmp-dot cmp-a"></i>Grupo A</label><select class="select" id="cmp-ga">${opcoesGrupo(est.gA)}</select></div>
        <div class="field"><label class="label" for="cmp-gb"><i class="cmp-dot cmp-b"></i>Grupo B</label><select class="select" id="cmp-gb">${opcoesGrupo(est.gB)}</select></div>
        <div class="field"><span class="label" id="cmp-esc-l">Comparar</span>
          <div class="seg-ctl" role="group" aria-labelledby="cmp-esc-l">
            <button class="seg-btn" data-escala="bruto" aria-pressed="${!evolucao}">Valores</button>
            <button class="seg-btn" data-escala="evolucao" aria-pressed="${evolucao}">Evolução nos testes</button>
          </div></div>
      </div>
      <p class="cmp-resumo"><b>${esc(gA.nome)}</b> (${plural(gA.membros.length, 'atleta', 'atletas')}) contra <b>${esc(gB.nome)}</b> (${plural(gB.membros.length, 'atleta', 'atletas')}).
        ${diferentes && !evolucao ? 'Os grupos têm gêneros diferentes: diferenças nos testes refletem em parte a fisiologia, não a qualidade do trabalho. Para comparar de forma justa, veja a evolução nos testes.' : ''}
        ${evolucao ? 'Evolução: quanto cada atleta melhorou desde a avaliação de ' + dd(M.AVALIACOES.anterior) + ', em % da própria marca. Essa medida não depende do gênero.' : ''}</p>

      <section class="card" aria-labelledby="h-gt">
        <div class="card-head"><h2 id="h-gt">Testes físicos</h2><span class="label">${evolucao ? `de ${dd(M.AVALIACOES.anterior)} para ${dd(M.AVALIACOES.atual)} · mais à direita é melhor` : `avaliação de ${dd(M.AVALIACOES.atual)} · mais à direita é melhor`}</span></div>
        ${M.TESTES.map((m) => linhaGrupos(m, gA, gB, evolucao)).join('')}
      </section>
      ${evolucao ? '<p class="hint">A evolução só existe para os testes físicos, que têm duas avaliações.</p>' : `
      <section class="card" aria-labelledby="h-gtr">
        <div class="card-head"><h2 id="h-gtr">Treino</h2><span class="label">últimas 4 semanas completas</span></div>
        ${M.TREINO.map((m) => linhaGrupos(m, gA, gB, false)).join('')}
      </section>`}`;

    el.querySelector('#cmp-ga').addEventListener('change', (e) => { est.gA = e.target.value; render(raiz, '#cmp-ga'); });
    el.querySelector('#cmp-gb').addEventListener('change', (e) => { est.gB = e.target.value; render(raiz, '#cmp-gb'); });
    el.querySelectorAll('[data-escala]').forEach((b) => b.addEventListener('click', () => { est.escala = b.dataset.escala; render(raiz, `[data-escala="${b.dataset.escala}"]`); }));
    el.querySelectorAll('[data-preset]').forEach((b) => b.addEventListener('click', () => { const p = PRESETS[Number(b.dataset.preset)]; est.gA = p.a; est.gB = p.b; render(raiz, `[data-preset="${b.dataset.preset}"]`); }));
  }

  /* ---------- Tela ---------- */

  function render(root, foco) {
    root.innerHTML = `
      <header class="page-head">
        <div>
          <span class="chip" style="margin-bottom:10px">Dados de exemplo</span>
          <h1>Comparativos</h1>
          <p class="lead">Veja onde cada atleta e cada grupo está em relação aos outros.</p>
        </div>
        <div class="seg-ctl" role="group" aria-label="Tipo de comparação">
          <button class="seg-btn" data-modo="atleta" aria-pressed="${est.modo === 'atleta'}">Atleta</button>
          <button class="seg-btn" data-modo="grupos" aria-pressed="${est.modo === 'grupos'}">Grupos</button>
        </div>
      </header>
      <div id="cmp-corpo" class="corpo"></div>
      <p class="hint">Os comparativos são só para o técnico. O atleta nunca vê a posição dos colegas.</p>`;
    root.querySelectorAll('[data-modo]').forEach((b) => b.addEventListener('click', () => { est.modo = b.dataset.modo; render(root, `[data-modo="${b.dataset.modo}"]`); }));
    (est.modo === 'atleta' ? atleta : grupos)(root.querySelector('#cmp-corpo'));
    if (foco) { const f = root.querySelector(foco); if (f) f.focus({ preventScroll: true }); }
  }

  window.Farol.views = window.Farol.views || {};
  window.Farol.views['analise-comparar'] = (root) => { raiz = root; render(root); };
})();
