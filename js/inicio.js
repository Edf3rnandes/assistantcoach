/* Início: o painel geral do técnico, ponto de partida e de volta de todas as telas.
   Lê da esquerda para a direita e de cima para baixo, na ordem em que o técnico decide:
   1. faixa do dia, com os atalhos para criar ou começar algo;
   2. planejamento (fase, semana, prioridades) e competições;
   3. elenco e saúde: como estão os times e quem está lesionado ou em retorno;
   4. o que vem em seguida: últimos testes, treinos para rever e o que está em atraso.
   Tudo é lido das mesmas fontes das outras telas; nada é duplicado aqui. */
(function () {
  const { dados, util, elenco, registros: REG, calendario: CAL, scoutDados: SD, analise: A, medidas: M } = window.Farol;
  const { esc, num, dec, dd, plural, HOJE, DIA } = util;
  const { ATLETAS, ATLETAS_LISTA, TURMAS, FUNDAMENTOS } = elenco;

  const DIAS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
  const DIAS_LONGO = ['segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado', 'domingo'];
  const MESES_LONGO = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const TURNO = { manha: 'manhã', tarde: 'tarde', noite: 'noite' };
  const est = { planoId: null };

  /* ---------- Ícones e peças ---------- */

  const I = {
    reg: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
    plano: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4M12 13v5M9.5 15.5h5"/>',
    comp: '<path d="M5 21V4M5 5h12l-2 4 2 4H5"/>',
    jogo: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    quadro: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 12h18M7 9l3 6 4-8 3 4"/>',
    fund: '<path d="M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12"/>',
    pessoas: '<circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0M16 5a3 3 0 0 1 0 6M18 20a6 6 0 0 0-3-5"/>',
    cruz: '<rect x="9" y="3" width="6" height="18" rx="1.5"/><rect x="3" y="9" width="18" height="6" rx="1.5"/>',
    relogio: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    teste: '<path d="M10 3h4M11 3v6l-5 9a2 2 0 0 0 2 3h8a2 2 0 0 0 2-3l-5-9V3"/>',
    olho: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    alvo: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    seta: '<path d="M9 6l6 6-6 6"/>',
  };
  const ic = (k, t = 20) => `<svg width="${t}" height="${t}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[k]}</svg>`;

  const dataLonga = (t) => { const d = new Date(t); return `${DIAS_LONGO[(d.getUTCDay() + 6) % 7]}, ${d.getUTCDate()} de ${MESES_LONGO[d.getUTCMonth()]}`; };
  const dataSes = (semana, s) => semana.inicio + s.dia * DIA;
  const rotuloSes = (semana, s) => `${DIAS[s.dia]} ${dd(dataSes(semana, s))}, ${TURNO[s.turno]}`;
  const iniciais = (n) => n.split(' ').filter((x) => x.length > 2).slice(0, 2).map((x) => x[0]).join('').toUpperCase();
  const emDias = (t) => Math.round((t - HOJE) / DIA);
  const prim = (id) => ATLETAS[id].nome.split(' ')[0];
  const ordTurno = { manha: 0, tarde: 1, noite: 2 };

  // Paisagem da faixa do dia: farol, sol baixo, mar, areia e rede. Só desenho, sem informação.
  const PAISAGEM = `
    <svg class="ix-arte" viewBox="0 0 460 190" preserveAspectRatio="xMaxYMax slice" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="ixc" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b3a4d"/><stop offset=".62" stop-color="#e0903a"/><stop offset="1" stop-color="#f5c45e"/></linearGradient>
        <linearGradient id="ixm" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0e5d73"/><stop offset="1" stop-color="#0a4558"/></linearGradient>
      </defs>
      <rect width="460" height="190" fill="url(#ixc)"/>
      <circle cx="318" cy="112" r="34" fill="#ffe08a" opacity=".95"/>
      <circle cx="318" cy="112" r="52" fill="#ffe08a" opacity=".18"/>
      <rect y="112" width="460" height="42" fill="url(#ixm)"/>
      <path d="M0 126h460M30 136h400M80 145h300" stroke="#fff" stroke-opacity=".16" stroke-width="2"/>
      <path d="M0 160c70-14 140-6 230-12s160 4 230-6v48H0z" fill="#f0dfb2"/>
      <path d="M0 176c80-8 150 0 250-4s150 2 210-4v22H0z" fill="#e6d09a"/>
      <g fill="#0d2231"><path d="M96 76h14l3 66H93z"/><rect x="97" y="62" width="12" height="14" rx="2" fill="#f2a900"/><path d="M92 62l12-12 12 12z"/><rect x="88" y="140" width="30" height="6" rx="2"/></g>
      <path d="M96 66L40 58V70zM110 66l56-8v12z" fill="#f2a900" opacity=".5"/>
      <g stroke="#0d2231" stroke-width="3" stroke-linecap="round"><path d="M352 108v52M424 108v52"/></g>
      <path d="M352 114h72v26h-72z" fill="none" stroke="#fffdf4" stroke-width="1.4" opacity=".9"/>
      <path d="M352 114l72 26M352 140l72-26M352 127h72M376 114v26M400 114v26" stroke="#fffdf4" stroke-width=".8" opacity=".55"/>
      <path d="M352 114h72" stroke="#fffdf4" stroke-width="3"/>
      <circle cx="388" cy="70" r="9" fill="#fffdf4" stroke="#a85600" stroke-width="2"/>
      <path d="M379 70h18M388 61a14 14 0 0 1 0 18M388 61a14 14 0 0 0 0 18" fill="none" stroke="#a85600" stroke-width="1.2"/>
      <path d="M300 128q40-72 80-52" fill="none" stroke="#fffdf4" stroke-width="2" stroke-dasharray="3 6" stroke-linecap="round" opacity=".8"/>
    </svg>`;

  /* ---------- Coleta de dados ---------- */

  function coletar() {
    const planos = dados.planos.filter((p) => p.semanaAtual >= 0);
    const hoje = [], pendentes = [], registradas = [];
    planos.forEach((p) => p.semanas.forEach((semana) => semana.sessoes.forEach((s) => {
      const t = dataSes(semana, s), st = REG.estado(p, semana, s);
      const it = { p, semana, s, t, st };
      if (t === HOJE) hoje.push(it);
      if (st === 'aguardando') pendentes.push(it);
      if (st === 'registrado' && t < HOJE && t >= HOJE - 14 * DIA) registradas.push(it);
    })));
    hoje.sort((a, b) => ordTurno[a.s.turno] - ordTurno[b.s.turno]);
    pendentes.sort((a, b) => a.t - b.t);

    // Elenco por turma: lesionados, em retorno, atenção de carga e disponíveis.
    const nivel = {};
    planos.filter((p) => p.mock).forEach((p) => { let l = []; try { l = A.atletas(p); } catch (e) { l = []; } l.forEach((a) => { nivel[a.id] = a; }); });
    const turmas = Object.values(TURMAS).map((t) => {
      const membros = t.atletas.map((id) => {
        const sit = elenco.situacaoDe(id), an = nivel[id];
        const estado = sit ? (sit.tipo === 'lesao' ? 'lesao' : 'retorno') : an && an.nivel !== 'ok' ? 'atencao' : 'ok';
        return { id, sit, an, estado };
      });
      const c = { lesao: 0, retorno: 0, atencao: 0, ok: 0 };
      membros.forEach((m) => { c[m.estado]++; });
      return { t, membros, c };
    });
    const lesoes = ATLETAS_LISTA.map((a) => ({ a, sit: elenco.situacaoDe(a.id) })).filter((x) => x.sit)
      .sort((x, y) => ({ lesao: 0, retorno: 1, duvida: 2 }[x.sit.tipo] - { lesao: 0, retorno: 1, duvida: 2 }[y.sit.tipo]) || (x.sit.retorno || 9e15) - (y.sit.retorno || 9e15));

    const comps = CAL.lista().filter((c) => !CAL.passada(c)).slice(0, 3);
    const jogos = SD.jogos();
    const andamento = jogos.filter((j) => !SD.estado(j).encerrado)[0] || null;
    return { planos, hoje, pendentes, registradas, turmas, lesoes, comps, andamento, nivel };
  }

  /* ---------- Planejamento e prioridades ---------- */

  function blocoPlano(D) {
    const plano = dados.plano(est.planoId) || D.planos[0];
    const semana = plano.semanas[plano.semanaAtual];
    const ciclo = plano.ciclos[plano.cicloAtual];
    const meso = plano.mesos.find((m) => m.id === plano.mesoAtual);
    const mesosCiclo = plano.mesos.filter((m) => m.ciclo === ciclo.idx);
    const totSem = ciclo.semanas;
    const pos = ((plano.semanaAtual - ciclo.semanaIni + (HOJE - semana.inicio) / (7 * DIA)) / totSem) * 100;
    const alvo = ciclo.alvo;
    const comps = [];
    plano.semanas.slice(ciclo.semanaIni, ciclo.semanaIni + totSem).forEach((s, i) => s.competicoes.forEach((c) => comps.push({ c, x: ((i + 0.5) / totSem) * 100 })));
    const alta = meso.pauta.fundamentos.filter((f) => f.prio === 'alta');
    const media = meso.pauta.fundamentos.filter((f) => f.prio === 'media');
    const sessoes = semana.sessoes;
    const reg = sessoes.filter((s) => REG.estado(plano, semana, s) === 'registrado').length;
    const tm = dados.TIPOS_MICRO[semana.microTipo];
    const seletor = D.planos.length > 1 ? `<div class="ix-seg" role="group" aria-label="Plano">${D.planos.map((p) => `<button type="button" data-plano="${p.id}" aria-pressed="${p.id === plano.id}">${esc(p.nome.split(' ')[0] === 'Mariana' ? 'Mariana' : p.nome.replace(' Masculino', '').replace(' Misto, areia', ''))}</button>`).join('')}</div>` : '';

    return `
      <section class="ix-card ix-plano" aria-labelledby="ix-pl-t">
        <div class="ix-head"><h2 id="ix-pl-t">${ic('plano', 18)} Planejamento</h2>${seletor}</div>
        <div class="ix-fase" style="--c:var(${meso.cor})">
          <span class="ix-fase-n">${esc(meso.nome)}</span>
          <div class="ix-fase-t"><b>${esc(ciclo.nome)} · semana ${semana.n}</b><small>${esc(tm.nome)} · ${num(semana.planejado)} UA planejadas · ${reg} de ${sessoes.length} sessões registradas</small></div>
          <button class="btn btn-sm" data-micro="${plano.id}|${semana.idx}">Abrir semana</button>
        </div>
        <div class="ix-linha" role="img" aria-label="Linha do ${esc(ciclo.nome)}: ${mesosCiclo.map((m) => `${m.nome} ${m.semanas} semanas`).join(', ')}. Hoje na semana ${plano.semanaAtual - ciclo.semanaIni + 1} de ${totSem}.">
          ${mesosCiclo.map((m) => `<i style="flex:${m.semanas};background:var(${m.cor})" title="${esc(m.nome)}, ${m.semanas} semanas"><span>${m.semanas >= 4 ? esc(m.nome) : ''}</span></i>`).join('')}
          ${comps.map((k) => `<b class="ix-bandeira ${k.c.id === alvo.id ? 'alvo' : ''}" style="left:${k.x}%" title="${esc(k.c.nome)}, ${dd(k.c.data)}"></b>`).join('')}
          <u class="ix-hoje" style="left:${Math.max(0, Math.min(100, pos))}%"><em>hoje</em></u>
        </div>
        <p class="ix-alvo">${ic('alvo', 15)}<span>Alvo do ciclo: <b>${esc(alvo.nome)}</b>, ${dd(alvo.data)}, em ${emDias(alvo.data)} dias.</span></p>
        <div class="ix-prio">
          <span class="label">Prioridades desta fase</span>
          <div class="ix-chips">${alta.map((f) => `<span class="ix-chip alta" title="${esc(f.ideia || FUNDAMENTOS[f.id].nome)}">${esc(FUNDAMENTOS[f.id].nome.replace(/ \(.*\)/, ''))}</span>`).join('')}${media.map((f) => `<span class="ix-chip" title="${esc(f.ideia || '')}">${esc(FUNDAMENTOS[f.id].nome.replace(/ \(.*\)/, ''))}</span>`).join('')}</div>
          ${meso.pauta.ideias.length ? `<ul class="ix-ideias">${meso.pauta.ideias.slice(0, 2).map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
          <button class="link-btn" data-ir="treinos-periodizacao" data-params='${esc(JSON.stringify({ planoId: plano.id, nivel: 'meso', mesoId: meso.id }))}' style="margin:0">Ver e editar a pauta da fase</button>
          <button class="link-btn" data-ir="treinos-microciclo" data-params='${esc(JSON.stringify({ planoId: plano.id, semana: semana.idx }))}' style="margin:0">Ver a resposta dos atletas nesta semana</button>
        </div>
      </section>`;
  }

  /* ---------- Competições ---------- */

  function blocoComps(D) {
    return `
      <section class="ix-card" aria-labelledby="ix-co-t">
        <div class="ix-head"><h2 id="ix-co-t">${ic('comp', 18)} Competições</h2><button class="link-btn" data-ir="planejamento-competicoes" style="margin:0">Ver todas</button></div>
        <ul class="ix-comps">${D.comps.map((c) => {
          const p = CAL.plan(c.id), d = new Date(c.data), dias = emDias(c.data);
          const pr = CAL.prontidao(c.id).filter((x) => x.estado !== 'na');
          return `<li><button class="ix-comp" data-comp="${c.id}">
            <span class="ix-data"><b class="num">${d.getUTCDate()}</b><small>${util.mes(c.data)}</small></span>
            <span class="ix-comp-m"><b>${esc(c.nome)}</b><small>${esc(c.local)} · ${p.duplas.filter((x) => x.status === 'confirmada').length} duplas confirmadas</small>
              <span class="ix-pontos" aria-label="Preparo">${pr.map((x) => `<span class="ix-pt ${x.estado}" title="${esc(x.nome)}: ${esc(x.texto)}"><i></i>${esc(x.nome)}</span>`).join('')}</span></span>
            <span class="ix-dias"><b class="num">${dias}</b><small>dias</small></span></button></li>`;
        }).join('')}</ul>
      </section>`;
  }

  /* ---------- Elenco e saúde ---------- */

  const NOME_ESTADO = { lesao: 'Lesionado', retorno: 'Em retorno', duvida: 'Dúvida', atencao: 'Atenção', ok: 'Disponível' };

  function blocoElenco(D) {
    const total = ATLETAS_LISTA.length;
    const nOk = D.turmas.reduce((a, x) => a + x.c.ok, 0);
    const turmaCard = ({ t, membros, c }) => {
      const n = membros.length;
      const fora = membros.filter((m) => m.estado !== 'ok');
      const seg = [['ok', c.ok], ['atencao', c.atencao], ['retorno', c.retorno], ['lesao', c.lesao]].filter(([, v]) => v);
      return `<article class="ix-turma">
        <div class="ix-turma-h"><b>${esc(t.nome)}</b><span class="num">${c.ok} de ${n} disponíveis</span></div>
        <div class="ix-barra" role="img" aria-label="${esc(t.nome)}: ${seg.map(([k, v]) => `${v} ${NOME_ESTADO[k].toLowerCase()}`).join(', ')}">${seg.map(([k, v]) => `<i class="${k}" style="flex:${v}"></i>`).join('')}</div>
        <div class="ix-avatares">${fora.length ? fora.map((m) => `<span class="ix-av ${m.estado}" title="${esc(ATLETAS[m.id].nome)}: ${esc(m.sit ? `${NOME_ESTADO[m.sit.tipo]}, ${m.sit.local.toLowerCase()}` : m.an.motivos.map((x) => x.texto).join(', '))}"><i>${esc(iniciais(ATLETAS[m.id].nome))}</i>${esc(prim(m.id))}</span>`).join('') : '<small class="ix-ok">Todos disponíveis e dentro dos limites de carga.</small>'}</div>
      </article>`;
    };
    const sitCard = (x) => {
      const dias = x.sit.retorno ? emDias(x.sit.retorno) : null;
      return `<li class="ix-les ${x.sit.tipo}">
        <span class="ix-av ${x.sit.tipo === 'lesao' ? 'lesao' : 'retorno'}"><i>${esc(iniciais(x.a.nome))}</i></span>
        <div class="ix-les-m"><button class="link-btn at-link" data-ir="saude" data-params='${esc(JSON.stringify({ foco: x.a.id }))}' style="margin:0">${esc(x.a.nome)}</button><small>${esc(x.sit.local)} · ${esc(x.sit.texto)}</small><small class="conduta">${esc(x.sit.conduta)}</small></div>
        <div class="ix-les-r"><span class="ix-sel ${x.sit.tipo}">${NOME_ESTADO[x.sit.tipo]}</span>${dias != null ? `<small class="num">${dias <= 0 ? 'retorno hoje' : `volta em ${dias} dias`}<br>${dd(x.sit.retorno)}</small>` : '<small>sem data</small>'}</div></li>`;
    };
    return `
      <section class="ix-card ix-elenco" aria-labelledby="ix-el-t">
        <div class="ix-head"><h2 id="ix-el-t">${ic('pessoas', 18)} Elenco e saúde</h2>
          <span class="ix-resumo"><b class="num">${nOk}</b> de ${total} disponíveis · <button class="link-btn" data-ir="analise" data-params='${esc(JSON.stringify({ aba: 'atletas' }))}' style="margin:0">Carga por atleta</button></span></div>
        <div class="actions ix-el-acoes"><button class="btn btn-sm btn-primary" data-ir="saude" data-params='${esc(JSON.stringify({ novo: true }))}'>Registrar lesão ou queixa</button><button class="btn btn-sm" data-ir="saude">Abrir cadastro de saúde</button></div>
        <div class="ix-elenco-g">
          <div class="ix-turmas">${D.turmas.map(turmaCard).join('')}</div>
          <div class="ix-lesoes">
            <span class="label">Lesões e retornos <span class="num">${D.lesoes.length}</span></span>
            ${D.lesoes.length ? `<ul class="ix-ul">${D.lesoes.map(sitCard).join('')}</ul>` : '<p class="vazio" style="padding:6px 0">Ninguém lesionado agora.</p>'}
            <p class="ix-leg"><span class="ix-sel ok">Disponível</span><span class="ix-sel atencao">Atenção de carga</span><span class="ix-sel retorno">Em retorno</span><span class="ix-sel lesao">Lesionado</span></p>
          </div>
        </div>
      </section>`;
  }

  /* ---------- Testes, treinos para rever e atrasos ---------- */

  const nomeCurto = (t) => t.nome.toLowerCase().replace(/ \(.*\)/, '').replace(', 3 kg', '').replace(' de medicine ball', '');

  function blocoTestes(D) {
    const plano = dados.plano(est.planoId) || D.planos[0];
    const ids = plano.atletas;
    const itens = M.TESTES.map((tt) => {
      const pares = ids.map((id) => ({ id, a: M.valor(id, tt.id, 'anterior'), b: M.valor(id, tt.id, 'atual') })).filter((x) => x.a && x.b);
      if (!pares.length) return null;
      const pct = (x) => ((tt.melhor === 'baixo' ? x.a - x.b : x.b - x.a) / x.a) * 100;
      const lista = pares.map((x) => ({ id: x.id, v: pct(x) }));
      const med = lista.reduce((a, x) => a + x.v, 0) / lista.length;
      return { tt, med, valor: pares.reduce((a, x) => a + x.b, 0) / pares.length, lista };
    }).filter(Boolean);
    const prox = M.AVALIACOES.atual + (M.AVALIACOES.atual - M.AVALIACOES.anterior);
    const todos = itens.flatMap((i) => i.lista.map((x) => ({ ...x, teste: i.tt })));
    const melhor = todos.slice().sort((a, b) => b.v - a.v)[0];
    const pior = todos.slice().sort((a, b) => a.v - b.v)[0];
    const mx = Math.max(6, ...itens.map((i) => Math.abs(i.med)));
    return `
      <section class="ix-card" aria-labelledby="ix-te-t">
        <div class="ix-head"><h2 id="ix-te-t">${ic('teste', 18)} Últimos testes</h2><span class="label num">${dd(M.AVALIACOES.atual)}</span></div>
        ${itens.length ? `<ul class="ix-testes">${itens.map((i) => `<li><span class="ix-t-n">${esc(i.tt.nome.replace(', 3 kg', ''))}</span>
          <span class="ix-t-v num">${esc(M.formatar(i.valor, i.tt))} <small>${esc(i.tt.un)}</small></span>
          <span class="ix-t-b" aria-hidden="true"><i class="${i.med >= 0 ? 'sobe' : 'desce'}" style="width:${Math.min(100, (Math.abs(i.med) / mx) * 100)}%"></i></span>
          <b class="num ${i.med >= 0 ? 'bom' : 'ruim'}">${i.med >= 0 ? '+' : '−'}${dec(Math.abs(i.med))}%</b></li>`).join('')}</ul>
          <p class="ix-dest"><span>Mais evoluiu: <b>${esc(prim(melhor.id))}</b> (${esc(nomeCurto(melhor.teste))}, +${dec(melhor.v)}%)</span>
          ${pior.v < -0.5 ? `<span>Para olhar: <b>${esc(prim(pior.id))}</b> (${esc(nomeCurto(pior.teste))}, −${dec(Math.abs(pior.v))}%)</span>` : '<span>Ninguém piorou em relação à avaliação anterior.</span>'}</p>`
          : '<p class="vazio" style="padding:4px 0">Sem testes deste grupo ainda.</p>'}
        <p class="ix-prox">${ic('relogio', 15)}<span>Próxima avaliação sugerida: <b>${dd(prox)}</b>, em ${emDias(prox)} dias.</span></p>
        <button class="btn btn-sm" data-ir="analise" data-params='${esc(JSON.stringify({ aba: 'comparar' }))}'>Comparar atletas e grupos</button>
      </section>`;
  }

  function blocoRever(D) {
    const achados = [];
    D.registradas.forEach((it) => {
      const reg = REG.obter(it.p, it.semana, it.s);
      if (!reg) return;
      const r = REG.resumoSessao(it.p, reg);
      const motivos = [];
      if (r.pseMedio != null && it.s.pse && r.pseMedio - it.s.pse >= 1) motivos.push(`esforço ${dec(r.pseMedio)} contra alvo ${it.s.pse}`);
      if (r.psrMedio != null && r.psrMedio <= 5.5) motivos.push(`recuperação baixa (${dec(r.psrMedio)})`);
      if (r.total && r.presentes / r.total < 0.7) motivos.push(`só ${r.presentes} de ${r.total} presentes`);
      if (motivos.length) achados.push({ it, motivos, peso: motivos.length * 10 + (r.pseMedio != null && it.s.pse ? Math.max(0, r.pseMedio - it.s.pse) : 0) });
    });
    achados.sort((a, b) => b.peso - a.peso || b.it.t - a.it.t);
    const porPlano = {};
    const variados = achados.filter((x) => (porPlano[x.it.p.id] = (porPlano[x.it.p.id] || 0) + 1) <= 2);
    return `
      <section class="ix-card" aria-labelledby="ix-rv-t">
        <div class="ix-head"><h2 id="ix-rv-t">${ic('olho', 18)} Treinos para rever</h2><span class="label">últimos 14 dias</span></div>
        ${variados.length ? `<ul class="ix-ul">${variados.slice(0, 4).map(({ it, motivos }) => {
          const tipo = dados.TIPOS_SESSAO[it.s.tipo];
          return `<li class="ix-li"><span class="dot" style="background:var(${tipo.cor});margin:0;flex:none"></span>
            <div class="ix-li-m"><b>${esc(tipo.nome)} · ${esc(it.p.nome)}</b><small>${esc(rotuloSes(it.semana, it.s))}</small><small class="ix-mot">${esc(motivos.join(' · '))}</small></div>
            <button class="btn btn-sm" data-rever="${it.p.id}|${it.semana.idx}|${it.s.dia}|${it.s.turno}|${it.s.id}">Rever</button></li>`;
        }).join('')}</ul>` : '<p class="vazio" style="padding:4px 0">Nenhuma sessão fora do esperado nas últimas duas semanas.</p>'}
      </section>`;
  }

  function atrasos(D) {
    const lista = [];
    const antigas = D.pendentes.filter((it) => it.t < HOJE);
    if (antigas.length) {
      const o = antigas[0];
      lista.push({ ic: 'reg', t: `${plural(antigas.length, 'sessão sem registro', 'sessões sem registro')}`, s: `a mais antiga é de ${rotuloSes(o.semana, o.s)} (${esc(o.p.nome)})`, bt: 'Registrar', reg: `${o.p.id}|${o.semana.idx}|${o.s.id}` });
    }
    const semResp = D.pendentes.filter((it) => { const r = REG.resumoRespostas(it.p, it.semana, it.s); return r.n < r.total; });
    if (semResp.length) lista.push({ ic: 'pessoas', t: `Atletas sem responder PSE e PSR`, s: `${plural(semResp.length, 'sessão aguarda', 'sessões aguardam')} respostas; reenvie o link da turma`, bt: 'Ver link', ir: 'treino-registro' });
    CAL.lista().filter((c) => !CAL.passada(c) && emDias(c.data) <= 45).forEach((c) => {
      const falta = CAL.prontidao(c.id).filter((x) => x.estado === 'vazio' || x.estado === 'parcial');
      if (falta.length) lista.push({ ic: 'comp', t: `${esc(c.nome)}`, s: `em ${emDias(c.data)} dias · ${esc(falta.map((x) => `${x.nome.toLowerCase()}: ${x.texto.toLowerCase()}`).join('; '))}`, bt: 'Abrir', comp: c.id });
    });
    D.lesoes.filter((x) => x.sit.retorno && emDias(x.sit.retorno) <= 9).forEach((x) => lista.push({ ic: 'cruz', t: `Reavaliar ${esc(x.a.nome)}`, s: `retorno previsto para ${dd(x.sit.retorno)} (${esc(x.sit.local.toLowerCase())})`, bt: 'Abrir', saude: x.a.id }));
    const prox = M.AVALIACOES.atual + (M.AVALIACOES.atual - M.AVALIACOES.anterior);
    if (emDias(prox) <= 14) lista.push({ ic: 'teste', t: 'Reavaliação física se aproxima', s: `sugerida para ${dd(prox)}`, bt: 'Ver testes', ir: 'analise' });
    return lista;
  }

  function blocoAtraso(D) {
    const lista = atrasos(D);
    return `
      <section class="ix-card" aria-labelledby="ix-at-t">
        <div class="ix-head"><h2 id="ix-at-t">${ic('relogio', 18)} Em atraso</h2><span class="label num">${lista.length}</span></div>
        ${lista.length ? `<ul class="ix-ul">${lista.slice(0, 5).map((x, i) => `<li class="ix-li"><span class="ix-ic">${ic(x.ic, 17)}</span>
          <div class="ix-li-m"><b>${x.t}</b><small>${x.s}</small></div>
          <button class="btn btn-sm" data-atraso="${i}">${esc(x.bt)}</button></li>`).join('')}</ul>` : '<p class="vazio" style="padding:4px 0">Nada em atraso. Bom trabalho.</p>'}
      </section>`;
  }

  /* ---------- Tela ---------- */

  function atalho(k, nome, rota, params) {
    return `<a class="ix-acao" href="${rota.startsWith('#') ? '#inicio' : '#' + rota}" data-ir="${rota}" ${params ? `data-params='${esc(JSON.stringify(params))}'` : ''}>${ic(k, 18)}<span>${esc(nome)}</span></a>`;
  }

  function iniciar(root) {
    const D = coletar();
    if (!est.planoId || !dados.plano(est.planoId)) est.planoId = window.Farol.compartilhado.planoId;
    const prox = D.comps[0];
    const antigas = D.pendentes.filter((it) => it.t < HOJE);
    const fora = D.turmas.reduce((a, x) => a + x.c.lesao + x.c.retorno, 0);
    const total = ATLETAS_LISTA.length;
    const nOk = D.turmas.reduce((a, x) => a + x.c.ok, 0);
    const jogoE = D.andamento ? SD.estado(D.andamento) : null;

    root.innerHTML = `
      <section class="ix-hero" aria-label="Resumo do dia">
        ${PAISAGEM}
        <div class="ix-hero-c">
          <span class="ix-data-h">${esc(dataLonga(HOJE))}</span>
          <h1>Painel do dia</h1>
          <p class="ix-frase">${plural(D.hoje.length, 'sessão', 'sessões')} hoje · ${plural(fora, 'atleta fora ou em retorno', 'atletas fora ou em retorno')} · ${prox ? `${esc(prox.nome)} em ${emDias(prox.data)} dias` : 'nenhuma competição agendada'}</p>
          ${D.hoje.length ? `<div class="ix-hoje-l">${D.hoje.slice(0, 2).map((it) => `<button class="ix-sess" data-reg="${it.p.id}|${it.semana.idx}|${it.s.id}" title="Registrar esta sessão"><i style="background:var(${dados.TIPOS_SESSAO[it.s.tipo].cor})"></i>${esc(TURNO[it.s.turno])} · ${esc(dados.TIPOS_SESSAO[it.s.tipo].nome)} <small>${esc(it.p.nome.replace(' Masculino', '').replace(' Misto, areia', ''))}</small></button>`).join('')}${D.hoje.length > 2 ? `<span class="ix-mais">+${D.hoje.length - 2}</span>` : ''}</div>` : ''}
          ${D.andamento ? `<button class="ix-retomar" id="ini-retomar">${ic('jogo', 16)}<span>Jogo em andamento: ${esc(SD.rotuloDupla(D.andamento.dupla))} × ${esc(D.andamento.adv)}, <b class="num">${jogoE.a} a ${jogoE.b}</b></span><em>Continuar</em></button>` : ''}
        </div>
        <nav class="ix-acoes" aria-label="Criar ou começar">
          ${atalho('reg', 'Registrar treino', 'treino-registro', { planoId: est.planoId })}
          ${atalho('jogo', 'Coletar jogo', 'analise-scout', { novo: {} })}
          ${atalho('quadro', 'Quadro técnico', '#quadro')}
          ${atalho('cruz', 'Registrar lesão', 'saude', { novo: true })}
          ${atalho('plano', 'Novo plano', 'treinos-periodizacao', { nivel: 'criar' })}
          ${atalho('comp', 'Nova competição', 'planejamento-competicoes', { nova: true })}
        </nav>
      </section>

      <div class="ix-kpis">
        <a class="ix-kpi" href="#analise" data-ir="analise" data-params='${esc(JSON.stringify({ aba: 'atletas' }))}'><span class="ix-kpi-i ok">${ic('pessoas', 20)}</span><span><b class="num">${nOk}<small> de ${total}</small></b><em>atletas disponíveis</em></span></a>
        <a class="ix-kpi" href="#saude" data-ir="saude"><span class="ix-kpi-i lesao">${ic('cruz', 20)}</span><span><b class="num">${fora}</b><em>lesionados ou em retorno</em></span></a>
        <a class="ix-kpi" href="#treino-registro" data-ir="treino-registro"><span class="ix-kpi-i ${antigas.length ? 'atencao' : 'ok'}">${ic('relogio', 20)}</span><span><b class="num">${antigas.length}</b><em>sessões sem registro</em></span></a>
        <a class="ix-kpi" href="#planejamento-competicoes" data-ir="planejamento-competicoes" ${prox ? `data-params='${esc(JSON.stringify({ competicao: prox.id }))}'` : ''}><span class="ix-kpi-i beam">${ic('comp', 20)}</span><span><b class="num">${prox ? emDias(prox.data) : '–'}<small> dias</small></b><em>para a próxima competição</em></span></a>
      </div>

      <nav class="ix-outras" aria-label="Outras áreas">
        <span class="label">Outras áreas</span>
        <a href="#saude" data-ir="saude">Saúde do elenco</a>
        <a href="#treinos-microciclo" data-ir="treinos-microciclo">Resposta da semana</a>
        <a href="#treinos-biblioteca" data-ir="treinos-biblioteca">Exercícios e prescrição</a>
        <a href="#analise-scout" data-ir="analise-scout" data-params='${esc(JSON.stringify({ aba: 'fund' }))}'>Treino de fundamento</a>
        <a href="#atleta-previa" data-ir="atleta-previa">Prévia do atleta</a>
      </nav>

      <div class="ix-g2">${blocoPlano(D)}${blocoComps(D)}</div>
      ${blocoElenco(D)}
      <div class="ix-g3">${blocoTestes(D)}${blocoRever(D)}${blocoAtraso(D)}</div>`;

    const ir = (rota, params) => {
      if (rota === '#quadro') { window.Farol.gaveta.abrir(); return; }
      window.Farol.ir(rota, params);
    };
    root.querySelectorAll('[data-ir]').forEach((el) => el.addEventListener('click', (e) => { e.preventDefault(); ir(el.dataset.ir, el.dataset.params ? JSON.parse(el.dataset.params) : null); }));
    root.querySelectorAll('[data-rolar]').forEach((el) => el.addEventListener('click', (e) => { e.preventDefault(); const alvo = root.querySelector(`#${el.dataset.rolar}`); if (alvo) alvo.scrollIntoView({ block: 'start' }); }));
    root.querySelectorAll('[data-reg]').forEach((b) => b.addEventListener('click', () => { const [pid, si, sid] = b.dataset.reg.split('|'); window.Farol.ir('treino-registro', { planoId: pid, abrir: { semana: Number(si), sessaoId: sid } }); }));
    root.querySelectorAll('[data-micro]').forEach((b) => b.addEventListener('click', () => { const [pid, si] = b.dataset.micro.split('|'); window.Farol.ir('treinos-periodizacao', { planoId: pid, nivel: 'micro', semana: Number(si), editor: null }); }));
    root.querySelectorAll('[data-rever]').forEach((b) => b.addEventListener('click', () => { const [pid, si, dia, turno, sid] = b.dataset.rever.split('|'); window.Farol.ir('treinos-periodizacao', { planoId: pid, nivel: 'micro', semana: Number(si), editor: { dia: Number(dia), turno, id: sid }, painel: 'registro' }); }));
    root.querySelectorAll('[data-comp]').forEach((b) => b.addEventListener('click', () => window.Farol.ir('planejamento-competicoes', { competicao: b.dataset.comp })));
    root.querySelectorAll('[data-plano]').forEach((b) => b.addEventListener('click', () => { est.planoId = b.dataset.plano; window.Farol.compartilhado.planoId = est.planoId; iniciar(root); const f = root.querySelector(`[data-plano="${est.planoId}"]`); if (f) f.focus({ preventScroll: true }); }));
    const lista = atrasos(D).slice(0, 5);
    root.querySelectorAll('[data-atraso]').forEach((b) => b.addEventListener('click', () => {
      const x = lista[Number(b.dataset.atraso)];
      if (x.reg) { const [pid, si, sid] = x.reg.split('|'); window.Farol.ir('treino-registro', { planoId: pid, abrir: { semana: Number(si), sessaoId: sid } }); }
      else if (x.comp) window.Farol.ir('planejamento-competicoes', { competicao: x.comp });
      else if (x.saude) window.Farol.ir('saude', { foco: x.saude });
      else if (x.ir === 'analise') window.Farol.ir('analise', { aba: 'comparar' });
      else window.Farol.ir(x.ir, null);
    }));
    const r = root.querySelector('#ini-retomar');
    if (r) r.addEventListener('click', () => window.Farol.ir('scout-coleta', { jogo: D.andamento.id }));
  }

  window.Farol.views = window.Farol.views || {};
  window.Farol.views.inicio = iniciar;
})();
