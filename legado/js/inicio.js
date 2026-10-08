/* Início: o painel geral do técnico, ponto de partida de tudo.
   Duas perguntas, nessa ordem:
   1. O que acontece hoje? (as sessões do dia, de todas as equipes, com o atalho para registrar)
   2. Como estão as minhas equipes? (um cartão por equipe, com a fase, os dias de treino da semana e os atletas,
      que ficam minimizados e abrem com um toque)
   Tocar no cartão abre a periodização daquela equipe. O resto mora dentro dela. */
(function () {
  const { dados, util, elenco, calendario: CAL, equipes: EQ } = window.Farol;
  const { esc, plural, dd, HOJE, DIA } = util;
  const { TURMAS } = elenco;

  const DIAS_LONGO = ['segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado', 'domingo'];
  const DIAS_CURTO = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM'];
  const MESES_LONGO = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const TURNO = { manha: 'manhã', tarde: 'tarde', noite: 'noite' };
  const ORD_TURNO = { manha: 0, tarde: 1, noite: 2 };

  const ic = (d, t = 20) => `<svg width="${t}" height="${t}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const SETA = '<path d="M9 6l6 6-6 6"/>';
  const MAIS = '<path d="M12 5v14M5 12h14"/>';

  const dataLonga = (t) => { const d = new Date(t); return `${DIAS_LONGO[(d.getUTCDay() + 6) % 7]}, ${d.getUTCDate()} de ${MESES_LONGO[d.getUTCMonth()]}`; };
  const emDias = (t) => Math.round((t - HOJE) / DIA);
  const saudacao = () => { const h = new Date().getHours(); return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'; };

  // Sol baixo, mar e duna: só desenho, sem informação.
  const PAISAGEM = `
    <svg class="in-arte" viewBox="0 0 390 90" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <path d="M0 50c60-18 120-10 200-16s140 6 190-4v60H0z" fill="#f0dfb2" opacity=".28"/>
      <path d="M0 70c80-12 150-2 240-6s110 2 150-4v30H0z" class="in-duna"/>
    </svg>`;

  /* ---------- Peças ---------- */

  // Sete quadradinhos com o número do dia; os de treino ganham um ponto por sessão.
  function semanaDias(R) {
    if (!R.plano || !R.semana) return '';
    const sem = R.semana;
    return `<div class="in-dias" role="img" aria-label="Dias de treino da semana">${DIAS_CURTO.map((nome, d) => {
      const t = sem.inicio + d * DIA;
      const ses = R.sessoes.filter((x) => x.s.dia === d);
      return `<div class="in-d ${ses.length ? 'tr' : ''} ${t === HOJE ? 'hoje' : ''}"><small>${nome}</small><b class="num">${dd(t).slice(0, 2)}</b><span class="in-pts">${ses.map((x) => `<i class="${x.st}"></i>`).join('')}</span></div>`;
    }).join('')}</div>`;
  }

  function cartaoEquipe(R) {
    const { t, plano, meso, semana, c } = R;
    const abre = plano ? `data-plano="${plano.id}" data-equipe="${t.id}"` : `data-equipe="${t.id}"`;
    let fase;
    if (!plano) fase = '<span class="in-fase vazio">Sem periodização</span>';
    else if (R.comeca) fase = `<span class="in-fase">Começa em ${esc(dd(R.comeca))}</span>`;
    else if (semana) fase = `<span class="in-fase" style="--c:var(${meso ? meso.cor : '--accent'})">${esc(meso ? meso.nome : 'Sem fase')}</span><span class="in-sem">semana ${semana.n} de ${plano.semanas.length}</span>`;
    else fase = '<span class="in-fase vazio">Fora do período</span>';
    const alvo = R.ciclo && R.ciclo.alvo && emDias(R.ciclo.alvo.data) >= 0 ? `<span class="in-alvo">${esc(R.ciclo.alvo.nome)} · ${emDias(R.ciclo.alvo.data)} dias</span>` : '';
    const prog = plano && plano.semanas.length && plano.semanaAtual >= 0 ? Math.round(((plano.semanaAtual + 1) / plano.semanas.length) * 100) : 0;
    return `<article class="in-eq card">
      <button type="button" class="in-eq-h" ${abre} aria-label="Abrir a periodização de ${esc(t.nome)}">
        <span class="in-eq-n"><b>${esc(t.nome)}</b><small>${esc(elenco.cadastro.rotuloEquipe(t))}</small></span>
        <span class="in-eq-seta">${ic(SETA, 22)}</span>
      </button>
      <div class="in-eq-f">${fase}${alvo}</div>
      ${plano ? `<div class="in-prog" role="img" aria-label="${prog}% da temporada"><i style="width:${prog}%"></i></div>` : ''}
      ${semanaDias(R)}
      ${EQ.blocoAtletasNovo(R.membros, false)}
    </article>`;
  }

  function linhaHoje(R, x) {
    const tipo = dados.TIPOS_SESSAO[x.s.tipo];
    const pend = x.st === 'aguardando' || x.st === 'futuro';
    return `<li class="in-h" style="--c:var(${tipo.cor})">
      <span class="in-h-t">${esc(TURNO[x.s.turno])}</span>
      <div class="in-h-m"><b>${esc(R.t.nome)}</b><small>${esc(tipo.nome)} · ${x.s.dur} min · PSE alvo ${x.s.pse}</small></div>
      <button class="btn btn-sm ${x.st === 'aguardando' ? 'btn-primary' : ''}" data-equipe="${R.t.id}" data-plano="${R.plano.id}" data-sessao="${x.s.id}">${x.st === 'registrado' ? 'Ver' : pend ? 'Registrar' : 'Abrir'}</button></li>`;
  }

  function iniciar(root) {
    const turmas = Object.values(TURMAS);
    const Rs = turmas.map((t) => EQ.resumo(t));
    const hoje = Rs.flatMap((R) => R.hoje.map((x) => ({ R, x }))).sort((a, b) => ORD_TURNO[a.x.s.turno] - ORD_TURNO[b.x.s.turno]);
    const pend = Rs.reduce((a, R) => a + R.pendentes, 0);
    const fora = Rs.reduce((a, R) => a + R.c.lesao + R.c.retorno, 0);
    const prox = CAL.lista().filter((c) => !CAL.passada(c))[0] || null;
    const nome = window.Farol.conta && window.Farol.conta.usuario() ? window.Farol.conta.usuario().nome.split(' ')[0] : '';

    const proximaSessao = (() => {
      if (hoje.length) return null;
      let melhor = null;
      Rs.forEach((R) => R.plano && R.plano.semanas.forEach((w) => w.sessoes.forEach((s) => { const t = w.inicio + s.dia * DIA; if (t > HOJE && (!melhor || t < melhor.t)) melhor = { t, R, s }; })));
      return melhor;
    })();

    const resumoHoje = turmas.length
      ? `${hoje.length ? plural(hoje.length, 'sessão', 'sessões') + ' hoje' : 'Sem treino hoje'}${fora ? ` · ${plural(fora, 'atleta fora ou em retorno', 'atletas fora ou em retorno')}` : ''}`
      : 'Vamos começar pela sua primeira equipe';

    root.innerHTML = `
      <section class="in-hero" aria-label="Resumo do dia">
        <div class="in-sol" aria-hidden="true"></div>
        ${PAISAGEM}
        <div class="in-hero-c">
          <span class="in-data">${esc(dataLonga(HOJE))}</span>
          <h1>${saudacao()}${nome ? `,<br>${esc(nome)}` : ''}</h1>
          <p>${esc(resumoHoje)}</p>
        </div>
      </section>

      ${!turmas.length ? `<section class="card in-onb" aria-labelledby="in-onb-t">
        <h2 id="in-onb-t">Comece pela sua primeira equipe</h2>
        <p>Cadastre a equipe e os atletas. Depois é só escolher a competição principal: o app monta a temporada, a semana e o bloco de treino.</p>
        <button class="btn btn-primary btn-grande" id="in-onb-bt">Cadastrar equipe e atletas</button></section>` : `
      <section class="card in-hoje" aria-labelledby="in-hoje-t">
        <h2 class="label" id="in-hoje-t">Hoje</h2>
        ${hoje.length ? `<ul class="in-hoje-l">${hoje.map(({ R, x }) => linhaHoje(R, x)).join('')}</ul>`
          : `<p class="in-vazio">${proximaSessao ? `Nenhum treino hoje. O próximo é ${esc(DIAS_LONGO[proximaSessao.s.dia])}, ${esc(dd(proximaSessao.t))}, da equipe ${esc(proximaSessao.R.t.nome)}.` : 'Nenhum treino hoje.'}</p>`}
        ${pend || prox ? `<div class="in-pend">
          ${pend ? `<button type="button" class="in-pend-b atencao" data-pend="registro">${plural(pend, 'treino sem registro', 'treinos sem registro')}</button>` : ''}
          ${prox ? `<button type="button" class="in-pend-b" data-pend="comp">${esc(prox.nome)} em ${emDias(prox.data)} d</button>` : ''}
        </div>` : ''}
      </section>

      <section aria-labelledby="in-eq-t">
        <div class="in-h2"><h2 id="in-eq-t">Suas equipes</h2>
          <span class="in-todos"><button type="button" class="link-btn" data-todos="abrir">Abrir tudo</button><button type="button" class="link-btn" data-todos="fechar">Recolher</button></span></div>
        <div class="in-equipes">
          ${Rs.map(cartaoEquipe).join('')}
          <button class="in-nova" id="in-nova-eq">${ic(MAIS, 20)}<b>Nova equipe</b></button>
        </div>
      </section>`}`;

    root.querySelectorAll('[data-equipe]').forEach((b) => b.addEventListener('click', () => {
      const t = TURMAS[b.dataset.equipe];
      const pl = b.dataset.plano ? dados.plano(b.dataset.plano) : null;
      if (pl) window.Farol.ir('treinos-periodizacao', { planoId: pl.id, turmaId: t.id, nivel: 'semana', semana: null, sel: b.dataset.sessao || null });
      else window.Farol.ir('treinos-periodizacao', { nivel: 'criar', editor: null, turmaId: t.id });
    }));
    root.querySelectorAll('[data-pend]').forEach((b) => b.addEventListener('click', () => {
      if (b.dataset.pend === 'registro') {
        const R = Rs.filter((q) => q.pendentes).sort((a, b2) => b2.pendentes - a.pendentes)[0];
        window.Farol.ir('treino-registro', R && R.plano ? { planoId: R.plano.id } : null);
      } else window.Farol.ir('planejamento-competicoes', prox ? { competicao: prox.id } : null);
    }));
    root.querySelectorAll('[data-todos]').forEach((b) => b.addEventListener('click', () => {
      const abre = b.dataset.todos === 'abrir';
      root.querySelectorAll('[data-atb] .atb-t').forEach((t) => { t.setAttribute('aria-expanded', String(abre)); root.querySelector(`#${t.getAttribute('aria-controls')}`).hidden = !abre; });
    }));
    EQ.ligarAtb(root);
    const nv = root.querySelector('#in-nova-eq'); if (nv) nv.addEventListener('click', () => window.Farol.ir('equipes-nova'));
    const ob = root.querySelector('#in-onb-bt'); if (ob) ob.addEventListener('click', () => window.Farol.ir('equipes-nova'));
  }

  window.Farol.views = window.Farol.views || {};
  window.Farol.views.inicio = iniciar;
})();
