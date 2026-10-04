/* Início: o painel geral do técnico, ponto de partida de tudo.
   Três perguntas, nessa ordem:
   1. Quais são as minhas equipes e como está a semana de cada uma? (cartões que abrem a tela da equipe)
   2. O que acontece hoje? (sessões do dia, de todas as equipes, com o atalho para registrar)
   3. O que está pendente? (três atalhos: treinos sem registro, lesionados e a próxima competição)
   O resto (plano da fase, atletas, competições da equipe, testes) fica dentro de cada equipe e nas áreas Plano, Jogos e Análise. */
(function () {
  const { dados, util, elenco, scoutDados: SD, calendario: CAL, equipes: EQ } = window.Farol;
  const { esc, plural, dd, HOJE, DIA } = util;
  const { TURMAS } = elenco;

  const DIAS_LONGO = ['segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado', 'domingo'];
  const MESES_LONGO = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const TURNO = { manha: 'manhã', tarde: 'tarde', noite: 'noite' };
  const ORD_TURNO = { manha: 0, tarde: 1, noite: 2 };

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
  const emDias = (t) => Math.round((t - HOJE) / DIA);

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


  /* ---------- Peças ---------- */

  const saudacao = () => { const h = new Date().getHours(); return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'; };

  function cartaoEquipe(R) {
    const { t, plano, meso, semana, sessoes, c } = R;
    const fora = c.lesao + c.retorno;
    const ok = c.ok;
    return `<button class="ix2-eq" data-equipe="${t.id}" style="--c:var(${meso ? meso.cor : '--accent'})" aria-label="Abrir a equipe ${esc(t.nome)}">
      <span class="ix2-eq-top"><span class="ix2-eq-faixa">${esc(t.faixa)}</span><span class="ix2-eq-seta" aria-hidden="true">${ic('seta', 18)}</span></span>
      <b class="ix2-eq-nome">${esc(t.nome)}</b>
      <span class="ix2-eq-fase">${plano && semana ? (R.comeca ? `Plano começa em ${esc(dd(R.comeca))}` : `${meso ? `<i class="ix2-eq-dot"></i>${esc(meso.nome)} · ` : ''}semana ${semana.n}`) : plano ? 'Fora do período do plano' : 'Sem plano de treino'}</span>
      ${sessoes.length ? `<span class="ix2-eq-semana" role="img" aria-label="Sessões da semana: ${R.nReg} de ${sessoes.length} registradas">${sessoes.map((x) => `<i class="${x.st} ${x.t === HOJE ? 'hoje' : ''}" style="--s:var(${dados.TIPOS_SESSAO[x.s.tipo].cor})" title="${esc(dados.TIPOS_SESSAO[x.s.tipo].nome)}, ${esc(dd(x.t))}"></i>`).join('')}<small class="num">${R.nReg}/${sessoes.length}</small></span>` : '<span class="ix2-eq-semana vazio"><small>Crie o plano para ver a semana</small></span>'}
      <span class="ix2-eq-pe">
        <span class="ix2-pill ${ok === R.membros.length ? 'ok' : ''}"><b class="num">${ok}</b> de ${R.membros.length} disponíveis</span>
        ${fora ? `<span class="ix2-pill lesao">${plural(fora, 'fora', 'fora')}</span>` : ''}
        ${R.pendentes ? `<span class="ix2-pill atencao">${plural(R.pendentes, 'sem registro', 'sem registro')}</span>` : ''}
        ${R.proxComp ? `<span class="ix2-pill">${esc(R.proxComp.nome.split(' ')[0])} em ${emDias(R.proxComp.data)} d</span>` : ''}
      </span>
    </button>`;
  }

  function linhaHoje(R, x) {
    const tipo = dados.TIPOS_SESSAO[x.s.tipo];
    const pend = x.st === 'aguardando' || x.st === 'futuro';
    return `<li class="ix2-h" style="--c:var(${tipo.cor})">
      <span class="ix2-h-b"></span>
      <div class="ix2-h-m"><b>${esc(R.t.nome)}</b><small>${esc(tipo.nome)} · ${TURNO[x.s.turno]} · ${x.s.dur} min</small></div>
      <span class="ix2-h-e ${x.st}">${x.st === 'registrado' ? 'Registrada' : x.st === 'aguardando' ? 'Aguardando registro' : 'Planejada'}</span>
      <button class="btn btn-sm ${x.st === 'aguardando' ? 'btn-primary' : ''}" data-equipe="${R.t.id}" data-sessao="${x.s.id}">${pend ? 'Abrir' : 'Ver'}</button></li>`;
  }

  function iniciar(root) {
    const turmas = Object.values(TURMAS);
    const Rs = turmas.map((t) => EQ.resumo(t));
    const hoje = Rs.flatMap((R) => R.hoje.map((x) => ({ R, x }))).sort((a, b) => ORD_TURNO[a.x.s.turno] - ORD_TURNO[b.x.s.turno]);
    const pend = Rs.reduce((a, R) => a + R.pendentes, 0);
    const fora = Rs.reduce((a, R) => a + R.c.lesao + R.c.retorno, 0);
    const comps = CAL.lista().filter((c) => !CAL.passada(c));
    const prox = comps[0] || null;
    const jogos = SD.jogos();
    const andamento = jogos.filter((j) => !SD.estado(j).encerrado)[0] || null;
    const jogoE = andamento ? SD.estado(andamento) : null;
    const nome = window.Farol.conta && window.Farol.conta.usuario() ? window.Farol.conta.usuario().nome.split(' ')[0] : '';

    const proximaSessao = (() => {
      if (hoje.length) return null;
      let melhor = null;
      Rs.forEach((R) => R.plano && R.plano.semanas.forEach((w) => w.sessoes.forEach((s) => { const t = w.inicio + s.dia * DIA; if (t > HOJE && (!melhor || t < melhor.t)) melhor = { t, R, s }; })));
      return melhor;
    })();

    root.innerHTML = `
      <section class="ix-hero ix2-hero" aria-label="Resumo do dia">
        ${PAISAGEM}
        <div class="ix-hero-c">
          <span class="ix-data-h">${esc(dataLonga(HOJE))}</span>
          <h1>${saudacao()}${nome ? `, ${esc(nome)}` : ''}</h1>
          <p class="ix-frase">${hoje.length ? `${plural(hoje.length, 'sessão', 'sessões')} hoje` : 'Sem treino hoje'}${proximaSessao ? ` · próximo treino em ${esc(dd(proximaSessao.t))}` : ''}</p>
          ${andamento ? `<button class="ix-retomar" id="ini-retomar">${ic('jogo', 16)}<span>Jogo em andamento: ${esc(SD.rotuloDupla(andamento.dupla))} × ${esc(andamento.adv)}, <b class="num">${jogoE.a} a ${jogoE.b}</b></span><em>Retomar</em></button>` : ''}
        </div>
      </section>

      ${!turmas.length ? `<section class="ix2-onb" aria-labelledby="ix2-onb-t">
        <h2 id="ix2-onb-t">Comece pela sua primeira equipe</h2>
        <ol><li><b>Cadastre a equipe</b><span>Nome, faixa e os atletas, um por um ou colando a lista.</span></li>
          <li><b>Crie o plano da temporada</b><span>O app distribui as fases até a competição alvo.</span></li>
          <li><b>Registre os treinos</b><span>PSE e PSR de cada atleta alimentam a carga e os alertas.</span></li></ol>
        <div class="actions"><button class="btn btn-primary" id="ix2-onb-bt">Cadastrar equipe e atletas</button></div></section>` : `
      <section aria-labelledby="ix2-eq-t">
        <div class="ix2-h2"><h2 id="ix2-eq-t">Minhas equipes</h2>${turmas.length ? `<span class="label num">${plural(turmas.length, 'equipe', 'equipes')}</span>` : ''}</div>
        <div class="ix2-equipes">
          ${Rs.map(cartaoEquipe).join('')}
          <button class="ix2-nova" id="ix2-nova-eq">${ic('cruz', 22)}<b>Nova equipe</b><small>cadastre equipe e atletas</small></button>
        </div>
      </section>`}

      ${turmas.length ? `
      <section aria-labelledby="ix2-hoje-t">
        <div class="ix2-h2"><h2 id="ix2-hoje-t">Hoje</h2></div>
        ${hoje.length ? `<ul class="ix2-hoje">${hoje.map(({ R, x }) => linhaHoje(R, x)).join('')}</ul>`
          : `<p class="ix2-vazio">${proximaSessao ? `Nenhum treino hoje. O próximo é ${esc(DIAS_LONGO[proximaSessao.s.dia])}, ${esc(dd(proximaSessao.t))}, da equipe ${esc(proximaSessao.R.t.nome)}.` : 'Nenhum treino hoje.'}</p>`}
      </section>

      <nav class="ix2-pend" aria-label="Pendências">
        <button class="ix2-p ${pend ? 'atencao' : 'ok'}" data-pend="registro"><span class="ix2-p-i">${ic('relogio', 20)}</span><span><b class="num">${pend}</b><em>${pend === 1 ? 'treino sem registro' : 'treinos sem registro'}</em></span></button>
        <button class="ix2-p ${fora ? 'lesao' : 'ok'}" data-pend="saude"><span class="ix2-p-i">${ic('cruz', 20)}</span><span><b class="num">${fora}</b><em>${fora === 1 ? 'atleta fora ou em retorno' : 'atletas fora ou em retorno'}</em></span></button>
        <button class="ix2-p ${prox ? 'beam' : ''}" data-pend="comp"><span class="ix2-p-i">${ic('comp', 20)}</span><span><b class="num">${prox ? emDias(prox.data) : '–'}</b><em>${prox ? `dias para ${esc(prox.nome)}` : 'sem competição prevista'}</em></span></button>
      </nav>

      <nav class="ix2-rapido" aria-label="Atalhos">
        <button class="ix2-r" data-ir="#quadro">${ic('quadro', 20)}<span>Quadro</span></button>
        <button class="ix2-r" data-ir="analise-scout" data-params='${esc(JSON.stringify({ novo: {} }))}'>${ic('jogo', 20)}<span>Coletar jogo</span></button>
        <button class="ix2-r" data-ir="saude" data-params='${esc(JSON.stringify({ novo: true }))}'>${ic('cruz', 20)}<span>Registrar lesão</span></button>
        <button class="ix2-r" data-ir="treinos-biblioteca">${ic('fund', 20)}<span>Exercícios</span></button>
      </nav>
      ` : ''}`;

    const abrirEquipe = (id, extra) => window.Farol.ir('equipe', { turmaId: id, ...(extra || {}) });
    root.querySelectorAll('[data-equipe]').forEach((b) => b.addEventListener('click', () => abrirEquipe(b.dataset.equipe, b.dataset.sessao ? { sel: b.dataset.sessao } : null)));
    root.querySelectorAll('[data-pend]').forEach((b) => b.addEventListener('click', () => {
      const k = b.dataset.pend;
      if (k === 'registro') {
        const R = Rs.filter((q) => q.pendentes).sort((a, b2) => b2.pendentes - a.pendentes)[0];
        if (R) window.Farol.ir('treino-registro', { planoId: R.plano.id }); else window.Farol.ir('treino-registro');
      } else if (k === 'saude') window.Farol.ir('saude');
      else window.Farol.ir('planejamento-competicoes', prox ? { competicao: prox.id } : null);
    }));
    root.querySelectorAll('[data-ir]').forEach((el) => el.addEventListener('click', () => {
      const rota = el.dataset.ir;
      if (rota === '#quadro') { window.Farol.gaveta.abrir(); return; }
      window.Farol.ir(rota, el.dataset.params ? JSON.parse(el.dataset.params) : null);
    }));
    const nv = root.querySelector('#ix2-nova-eq'); if (nv) nv.addEventListener('click', () => window.Farol.ir('equipes-nova'));
    const ob = root.querySelector('#ix2-onb-bt'); if (ob) ob.addEventListener('click', () => window.Farol.ir('equipes-nova'));
    const r = root.querySelector('#ini-retomar');
    if (r) r.addEventListener('click', () => window.Farol.ir('scout-coleta', { jogo: andamento.id }));
  }

  window.Farol.views = window.Farol.views || {};
  window.Farol.views.inicio = iniciar;
})();
