/* Início: o painel geral do técnico, ponto de partida e de volta de todas as telas.
   Mostra o que pede ação hoje (sessões, registros pendentes, jogo em andamento), quem pede atenção,
   as próximas competições e leva direto para criar ou acessar qualquer parte do sistema.
   Tudo é lido das mesmas fontes das outras telas; nada é duplicado aqui. */
(function () {
  const { dados, util, elenco, registros: REG, calendario: CAL, scoutDados: SD, analise: A } = window.Farol;
  const { esc, num, dd, plural, HOJE, DIA, brl } = util;
  const { TURMAS } = elenco;

  const DIAS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
  const DIAS_LONGO = ['segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado', 'domingo'];
  const MESES_LONGO = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const TURNO = { manha: 'manhã', tarde: 'tarde', noite: 'noite' };

  const ic = (d, t = 22) => `<svg width="${t}" height="${t}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const I = {
    reg: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
    plano: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4M12 13v5M9.5 15.5h5"/>',
    comp: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M12 4v16M7 9h2M15 9h2"/>',
    jogo: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    quadro: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 12h18M7 9l3 6 4-8 3 4"/>',
    fund: '<path d="M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12"/>',
    graf: '<path d="M3 20h18M6 16l4-5 3 3 5-7"/>',
    seta: '<path d="M9 6l6 6-6 6"/>',
  };

  const dataLonga = (t) => { const d = new Date(t); return `${DIAS_LONGO[(d.getUTCDay() + 6) % 7]}, ${d.getUTCDate()} de ${MESES_LONGO[d.getUTCMonth()]} de ${d.getUTCFullYear()}`; };
  const dataSes = (semana, s) => semana.inicio + s.dia * DIA;
  const rotuloSes = (semana, s) => `${DIAS[s.dia]} ${dd(dataSes(semana, s))}, ${TURNO[s.turno]}`;

  function coletar() {
    const planos = dados.planos.filter((p) => p.semanaAtual >= 0);
    const hoje = [], pendentes = [], proximas = [];
    planos.forEach((p) => {
      p.semanas.forEach((semana) => semana.sessoes.forEach((s) => {
        const t = dataSes(semana, s), st = REG.estado(p, semana, s);
        const item = { p, semana, s, t, st };
        if (t === HOJE) hoje.push(item);
        if (st === 'aguardando') pendentes.push(item);
        if (t > HOJE && t <= HOJE + 7 * DIA) proximas.push(item);
      }));
    });
    const ord = (a, b) => a.t - b.t || ({ manha: 0, tarde: 1, noite: 2 }[a.s.turno] - { manha: 0, tarde: 1, noite: 2 }[b.s.turno]);
    hoje.sort(ord); proximas.sort(ord); pendentes.sort((a, b) => a.t - b.t);

    const atencao = [];
    planos.filter((p) => p.mock).forEach((p) => {
      let lista = [];
      try { lista = A.atletas(p); } catch (e) { lista = []; }
      lista.filter((a) => a.nivel !== 'ok').forEach((a) => atencao.push({ ...a, p }));
    });
    atencao.sort((x, y) => (y.nivel === 'crit') - (x.nivel === 'crit'));

    const comps = CAL.lista().filter((c) => !CAL.passada(c)).slice(0, 3);
    const jogos = SD.jogos();
    const andamento = jogos.filter((j) => !SD.estado(j).encerrado);
    return { planos, hoje, pendentes, proximas, atencao, comps, jogos, andamento };
  }

  function kpi(rot, valor, un, sub, rota, params) {
    return `<a class="kpi ini-kpi" href="#${rota}" data-ir="${rota}" ${params ? `data-params='${esc(JSON.stringify(params))}'` : ''}><span class="kpi-rot">${esc(rot)}</span><span class="kpi-valor">${valor}${un ? `<small>${esc(un)}</small>` : ''}</span><span class="kpi-sub">${sub}</span></a>`;
  }

  const sessaoLinha = (it, botao) => {
    const tipo = dados.TIPOS_SESSAO[it.s.tipo];
    return `<li class="ini-li">
      <span class="dot" style="background:var(${tipo.cor});margin:0;flex:none"></span>
      <div class="ini-li-m"><b>${esc(tipo.nome)} · ${esc(it.p.nome)}</b><small>${esc(rotuloSes(it.semana, it.s))} · ${it.s.dur} min${it.s.pse ? ` · PSE alvo ${it.s.pse}` : ''}</small></div>
      ${botao || ''}</li>`;
  };

  function iniciar(root) {
    const D = coletar();
    const prox = D.comps[0];
    const diasProx = prox ? Math.round((prox.data - HOJE) / DIA) : null;
    const atualPlano = dados.plano(window.Farol.compartilhado.planoId);

    const criar = [
      ['reg', 'Registrar treino', 'PSE, PSR e presença', 'treino-registro', { planoId: atualPlano.id }],
      ['jogo', 'Coletar jogo', 'Scout ao vivo', 'analise-scout', { novo: {} }],
      ['fund', 'Treino de fundamento', 'Contar acertos', 'analise-scout', { aba: 'fund', novoTreino: true }],
      ['quadro', 'Quadro técnico', 'Desenhar uma jogada', '#quadro'],
      ['plano', 'Novo plano', 'Periodização do zero', 'treinos-periodizacao', { nivel: 'criar' }],
      ['comp', 'Nova competição', 'Duplas, viagem e custos', 'planejamento-competicoes', { nova: true }],
    ];
    const acessar = [
      ['plano', 'Periodização', `${plural(D.planos.length, 'plano', 'planos')} ativos`, 'treinos-periodizacao'],
      ['comp', 'Competições', prox ? `próxima em ${diasProx} dias` : 'nenhuma agendada', 'planejamento-competicoes'],
      ['reg', 'Registro do treino', D.pendentes.length ? `${plural(D.pendentes.length, 'sessão', 'sessões')} para registrar` : 'tudo registrado', 'treino-registro'],
      ['graf', 'Análise', D.atencao.length ? `${plural(D.atencao.length, 'atleta', 'atletas')} em atenção` : 'carga, PSE, PSR', 'analise'],
      ['jogo', 'Scout', `${plural(D.jogos.length, 'jogo', 'jogos')} coletados`, 'analise-scout'],
      ['quadro', 'Quadro técnico', 'tela cheia', 'treino-quadro'],
    ];
    const breve = ['treinos-microciclo', 'treinos-biblioteca'].map((id) => window.Farol.rota(id)).filter(Boolean);

    const tile = (t) => {
      const [ico, nome, sub, rota, params] = t;
      return `<a class="ini-tile" href="${rota.startsWith('#') ? 'javascript:void(0)' : '#' + rota}" data-ir="${rota}" ${params ? `data-params='${esc(JSON.stringify(params))}'` : ''}>
        <span class="ini-tile-i">${ic(I[ico], 24)}</span><span class="ini-tile-t"><b>${esc(nome)}</b><small>${esc(sub)}</small></span></a>`;
    };

    const anda = D.andamento[0];
    root.innerHTML = `
      <header class="page-head">
        <div>
          <span class="chip" style="margin-bottom:10px">Dados de exemplo</span>
          <h1>Início</h1>
          <p class="lead">${esc(dataLonga(HOJE))}. O que pede ação agora e atalhos para criar ou abrir qualquer parte.</p>
        </div>
      </header>

      ${anda ? `<section class="ini-retomar" aria-label="Jogo em andamento">
        <div><span class="label">Jogo em andamento</span><b>${esc(anda.titulo)} · ${esc(SD.rotuloDupla(anda.dupla))} × ${esc(anda.adv)}</b><span class="num">${(() => { const e = SD.estado(anda); return `${e.a} – ${e.b}`; })()}</span></div>
        <button class="btn btn-primary" id="ini-retomar">Continuar a coleta</button></section>` : ''}

      <div class="kpis">
        ${kpi('Sessões hoje', String(D.hoje.length), '', D.hoje.length ? 'veja abaixo' : 'dia livre', 'treinos-periodizacao', { nivel: 'micro' })}
        ${kpi('Para registrar', String(D.pendentes.length), '', D.pendentes.length ? 'sessões sem PSE e PSR' : 'tudo em dia', 'treino-registro')}
        ${kpi('Atletas em atenção', String(D.atencao.length), '', D.atencao.length ? `${D.atencao.filter((a) => a.nivel === 'crit').length} em alerta` : 'ninguém fora dos limites', 'analise')}
        ${kpi('Próxima competição', diasProx == null ? '–' : String(diasProx), diasProx == null ? '' : 'dias', prox ? esc(prox.nome) : 'nenhuma agendada', 'planejamento-competicoes', prox ? { competicao: prox.id } : null)}
      </div>

      <section aria-labelledby="ini-criar-t">
        <h2 class="sc-h2" id="ini-criar-t">Criar ou começar</h2>
        <div class="ini-tiles">${criar.map(tile).join('')}</div>
      </section>

      <div class="an-grade">
        <div class="an-col">
          <section class="card" aria-labelledby="ini-hoje-t">
            <div class="card-head"><h2 id="ini-hoje-t">Hoje</h2><span class="label num">${esc(dd(HOJE))}</span></div>
            ${D.hoje.length ? `<ul class="ini-ul">${D.hoje.map((it) => sessaoLinha(it, it.st === 'futuro' || it.st === 'aguardando' ? `<button class="btn btn-sm" data-reg="${it.p.id}|${it.semana.idx}|${it.s.id}">Registrar</button>` : '<span class="chip">registrada</span>')).join('')}</ul>`
              : `<p class="vazio" style="padding:4px 0">Nenhuma sessão planejada para hoje.</p>
                 ${D.proximas.length ? `<span class="label">Próximas sessões</span><ul class="ini-ul">${D.proximas.slice(0, 3).map((it) => sessaoLinha(it)).join('')}</ul>` : ''}`}
          </section>

          <section class="card" aria-labelledby="ini-pend-t">
            <div class="card-head"><h2 id="ini-pend-t">Para registrar</h2><span class="label num">${D.pendentes.length}</span></div>
            ${D.pendentes.length ? `<ul class="ini-ul">${D.pendentes.slice(0, 4).map((it) => {
              const r = REG.resumoRespostas(it.p, it.semana, it.s);
              return sessaoLinha(it, `<button class="btn btn-sm btn-primary" data-reg="${it.p.id}|${it.semana.idx}|${it.s.id}">Registrar</button>`).replace('</small>', `${r.n ? ` · ${r.n} de ${r.total} atletas já responderam` : ''}</small>`);
            }).join('')}</ul>
              ${D.pendentes.length > 4 ? `<p class="hint"><button class="link-btn" data-ir="treino-registro" style="margin:0">Ver as outras ${D.pendentes.length - 4}</button></p>` : ''}`
              : '<p class="vazio" style="padding:4px 0">Todas as sessões passadas já foram registradas.</p>'}
          </section>

          <section class="card" aria-labelledby="ini-sem-t">
            <div class="card-head"><h2 id="ini-sem-t">Semana atual</h2><span class="label">por plano</span></div>
            <ul class="ini-ul">${D.planos.map((p) => {
              const s = p.semanas[p.semanaAtual];
              const tm = dados.TIPOS_MICRO[s.microTipo];
              return `<li class="ini-li"><div class="ini-li-m"><b>${esc(p.nome)}</b><small>Semana ${s.n} · ${esc(tm.nome)} · ${num(s.planejado)} UA planejadas · ${plural(s.sessoes.length, 'sessão', 'sessões')}</small></div>
                <button class="btn btn-sm" data-micro="${p.id}|${s.idx}">Abrir semana</button></li>`;
            }).join('')}</ul>
          </section>
        </div>

        <aside class="an-lado">
          <section class="card" aria-labelledby="ini-at-t">
            <div class="card-head"><h2 id="ini-at-t">Atenção agora</h2><span class="label">${plural(D.atencao.length, 'atleta', 'atletas')}</span></div>
            ${D.atencao.length ? `<ul class="ini-ul">${D.atencao.slice(0, 4).map((a) => `<li class="ini-li"><span class="chip ${a.nivel === 'crit' ? 'chip-crit' : 'chip-warn'}">${a.nivel === 'crit' ? 'Alerta' : 'Atenção'}</span><div class="ini-li-m"><b>${esc(a.nome)}</b><small>${esc(a.motivos.map((m) => m.texto).join(' · '))}</small></div></li>`).join('')}</ul>
              <p class="hint"><button class="link-btn" data-ir="analise" data-params='${esc(JSON.stringify({ aba: 'atletas' }))}' style="margin:0">Ver todos na Análise</button></p>`
              : '<p class="vazio" style="padding:4px 0">Nenhum atleta fora dos limites.</p>'}
          </section>

          <section class="card" aria-labelledby="ini-co-t">
            <div class="card-head"><h2 id="ini-co-t">Próximas competições</h2><button class="link-btn" data-ir="planejamento-competicoes" style="margin:0">Ver todas</button></div>
            <ul class="ini-ul">${D.comps.map((c) => {
              const p = CAL.plan(c.id), dias = Math.round((c.data - HOJE) / DIA);
              return `<li class="ini-li"><div class="ini-li-m"><b>${esc(c.nome)}</b><small>${esc(dd(c.data))} · em ${dias} dias · ${esc(c.local)} · ${p.duplas.filter((d) => d.status === 'confirmada').length} duplas confirmadas</small>
                <span class="pills" style="margin-top:6px">${CAL.prontidao(c.id).map((x) => `<span class="pill pill-${x.estado}" title="${esc(x.nome)}: ${esc(x.texto)}"><span class="pill-dot"></span>${esc(x.nome)}</span>`).join('')}</span></div>
                <button class="btn btn-sm" data-comp="${c.id}">Abrir</button></li>`;
            }).join('')}</ul>
          </section>
        </aside>
      </div>

      <section aria-labelledby="ini-ac-t">
        <h2 class="sc-h2" id="ini-ac-t">Acessar</h2>
        <div class="ini-tiles">${acessar.map(tile).join('')}</div>
      </section>

      ${breve.length ? `<section class="card ini-breve"><span class="label">Em breve</span><ul class="ini-ul">${breve.map((b) => `<li class="ini-li"><div class="ini-li-m"><b>${esc(b.nome)}</b><small>${esc(b.resumo)}</small></div></li>`).join('')}</ul></section>` : ''}`;

    // Navegação
    root.querySelectorAll('[data-ir]').forEach((el) => el.addEventListener('click', (e) => {
      e.preventDefault();
      const rota = el.dataset.ir;
      if (rota === '#quadro') { window.Farol.gaveta.abrir(); return; }
      window.Farol.ir(rota, el.dataset.params ? JSON.parse(el.dataset.params) : null);
    }));
    root.querySelectorAll('[data-reg]').forEach((b) => b.addEventListener('click', () => {
      const [pid, si, sid] = b.dataset.reg.split('|');
      window.Farol.ir('treino-registro', { planoId: pid, abrir: { semana: Number(si), sessaoId: sid } });
    }));
    root.querySelectorAll('[data-micro]').forEach((b) => b.addEventListener('click', () => {
      const [pid, si] = b.dataset.micro.split('|');
      window.Farol.ir('treinos-periodizacao', { planoId: pid, nivel: 'micro', semana: Number(si), editor: null });
    }));
    root.querySelectorAll('[data-comp]').forEach((b) => b.addEventListener('click', () => window.Farol.ir('planejamento-competicoes', { competicao: b.dataset.comp })));
    const r = root.querySelector('#ini-retomar');
    if (r) r.addEventListener('click', () => window.Farol.ir('scout-coleta', { jogo: anda.id }));
  }

  window.Farol.views = window.Farol.views || {};
  window.Farol.views.inicio = iniciar;
})();
