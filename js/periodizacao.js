/* Periodização: a tela de trabalho de cada equipe (ou grupo de equipes que seguem o mesmo planejamento).
   Começa pela escolha da periodização. Depois vêm as abas daquela escolha:
   Semana (o que está proposto agora, dia a dia), Bloco (o mesociclo), Temporada (o macrociclo e os ajustes),
   Calendário (as competições e a prioridade A, B ou C), Exercícios (a prescrição física) e Atletas.
   A semana mora em equipe.js, o bloco em meso.js, a temporada em macro.js e o editor de uma semana em micro.js. */
(function () {
  const { dados, util, elenco } = window.Farol;
  const { DIA, dd, plural } = util;
  const { TURMAS } = elenco;
  const P = (window.Farol.periodo = window.Farol.periodo || {});

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // O plano escolhido vale para as telas de Periodização e de Registro do treino.
  window.Farol.compartilhado = window.Farol.compartilhado || { planoId: dados.planos[0] ? dados.planos[0].id : null };
  const estado = {
    nivel: 'semana',
    ciclo: null,
    mesoId: null,
    semana: null,
    sel: null,
    turmaId: null,
    editor: null,
    confirmaCopia: false,
    noite: false,
    focoEditor: false,
    painel: 'plano',
    aviso: '',
    editaBase: false,
    baseTrab: null,
    editaPauta: null,
    pautaTrab: null,
  };
  Object.defineProperty(estado, 'planoId', {
    get: () => window.Farol.compartilhado.planoId,
    set: (v) => { window.Farol.compartilhado.planoId = v; },
    enumerable: true,
  });

  const ABAS = [
    { id: 'semana', nome: 'Semana' },
    { id: 'meso', nome: 'Bloco' },
    { id: 'macro', nome: 'Temporada' },
    { id: 'calendario', nome: 'Calendário' },
    { id: 'exercicios', nome: 'Exercícios' },
    { id: 'atletas', nome: 'Atletas' },
  ];
  // O editor de uma semana (micro) é um modo da aba Semana.
  const abaDe = (nivel) => (nivel === 'micro' ? 'semana' : nivel);

  const equipesDe = (plano) => (plano.turmas || [plano.turma]).map((id) => TURMAS[id]).filter(Boolean);
  const categoriasDe = (plano) => [...new Set(equipesDe(plano).flatMap((t) => t.categorias || []))];

  /* ---------- Cabeçalho da periodização escolhida ---------- */

  function cabecalho(plano, criando) {
    const equipes = equipesDe(plano);
    const ciclo = plano.cicloAtual >= 0
      ? plano.ciclos[plano.cicloAtual]
      : plano.ciclos.find((c) => c.estado === 'planejado') || plano.ciclos[plano.ciclos.length - 1];
    const meso = plano.mesos.find((m) => m.id === plano.mesoAtual);
    const semAtual = plano.semanaAtual >= 0 ? plano.semanaAtual + 1 : null;
    const dias = ciclo && ciclo.alvo ? Math.round((ciclo.alvo.data - dados.HOJE) / DIA) : null;
    const fase = meso ? meso.nome.replace(/\s+\d+\/\d+$/, '') : plano.semanaAtual < 0 && dados.HOJE < plano.inicioMs ? 'Ainda não começou' : 'Fora do período';
    const sub = equipes.length ? equipes.map((t) => elenco.cadastro.rotuloEquipe(t)).join(' | ') : esc(plano.detalhe);
    return `
      <section class="ph" aria-label="Periodização escolhida">
        <div class="ph-glow" aria-hidden="true"></div>
        <div class="ph-sel" role="group" aria-label="Escolher periodização">
          ${dados.planos.map((p) => `<button type="button" class="ph-chip ${!criando && p.id === plano.id ? 'on' : ''}" data-plano="${p.id}" aria-pressed="${!criando && p.id === plano.id}">${esc(p.nome)}</button>`).join('')}
          <button type="button" class="ph-chip nova" id="novo-plano">+ Nova</button>
        </div>
        <h1>${esc(plano.nome)}</h1>
        <p class="ph-sub">${esc(sub)} · ${plural(plano.atletas.length, 'atleta', 'atletas')}</p>
        <div class="ph-cats">${categoriasDe(plano).map((c) => `<span>${esc(c)}</span>`).join('')}</div>
        <dl class="ph-stats">
          <div><dt>Fase</dt><dd>${esc(fase)}</dd></div>
          <div><dt>Semana</dt><dd class="num">${semAtual ? `${semAtual} <small>de ${plano.semanas.length}</small>` : '–'}</dd></div>
          <div><dt>${ciclo && ciclo.alvo ? esc(ciclo.alvo.nome) : 'Alvo'}</dt><dd class="num ${dias != null && dias >= 0 ? 'beam' : ''}">${dias == null ? '–' : dias >= 0 ? `${dias} dias` : 'concluído'}</dd></div>
        </dl>
      </section>`;
  }

  function semPlano(root) {
    const livres = dados.turmasSemPlano();
    const temEquipes = Object.keys(TURMAS).length > 0;
    root.innerHTML = `
      <header class="page-head"><div><h1>Periodização</h1>
        <p class="lead">Escolha a equipe, veja a semana e o bloco que o app propõe e acompanhe a temporada até a competição principal.</p></div></header>
      <section class="card eq-vazio"><h2>${temEquipes ? 'Nenhuma equipe tem periodização ainda' : 'Cadastre uma equipe para planejar'}</h2>
        <p>${temEquipes ? 'A periodização divide a temporada em fases até a competição principal e gera a semana de treino.' : 'A periodização é sempre de uma equipe. Cadastre a equipe e os atletas no Início.'}</p>
        <button class="btn btn-primary" id="pl-vazio">${temEquipes ? 'Criar a primeira periodização' : 'Cadastrar equipe e atletas'}</button></section>`;
    root.querySelector('#pl-vazio').addEventListener('click', () => {
      if (temEquipes && livres.length) { estado.nivel = 'criar'; estado.editor = null; render(root); } else window.Farol.ir('equipes-nova');
    });
  }

  /* ---------- Abas que nascem aqui ---------- */

  P.semana = (el, ctx) => {
    const { plano } = ctx;
    const equipes = equipesDe(plano);
    const t = equipes.find((q) => q.id === estado.turmaId) || equipes[0];
    if (!t) { el.innerHTML = '<p class="vazio">Esta periodização não tem equipe.</p>'; return; }
    const params = { turmaId: t.id, planoId: plano.id };
    if (estado.semana != null) params.semana = estado.semana;
    if (estado.sel) params.sel = estado.sel;
    window.Farol.equipes.semana(el, params);
  };

  P.calendario = (el, ctx) => {
    const { plano } = ctx;
    if (plano.motor) el.innerHTML = P.blocosMotor(plano, 'calendario');
    else el.innerHTML = `<section class="card" aria-labelledby="h-cal"><div class="card-head"><h2 id="h-cal">Competições</h2></div>${P.listaCompeticoes(plano)}</section>`;
    el.insertAdjacentHTML('beforeend', '<div class="actions"><button class="btn" id="cal-comps">Abrir todas as competições</button></div>');
    if (plano.motor) P.ligarMotor(el, ctx);
    el.querySelector('#cal-comps').addEventListener('click', () => window.Farol.ir('planejamento-competicoes'));
    el.querySelectorAll('[data-comp]').forEach((b) => b.addEventListener('click', () => window.Farol.ir('planejamento-competicoes', { competicao: b.dataset.comp })));
  };

  P.atletas = (el, ctx) => {
    const { plano } = ctx;
    const EQ = window.Farol.equipes;
    const equipes = equipesDe(plano);
    const membros = EQ.situacoes(equipes[0] || { atletas: plano.atletas }, plano);
    el.innerHTML = `
      <section class="card ph-atletas" aria-label="Atletas da periodização">
        ${EQ.blocoAtletasNovo(membros, true)}
        <div class="actions" style="margin-top:14px">
          ${equipes.map((t) => `<button class="btn btn-sm" data-editar="${t.id}">Editar ${esc(t.nome)}</button>`).join('')}
          <button class="btn btn-sm" id="at-saude">Registrar lesão ou retorno</button>
          <button class="btn btn-sm" id="at-carga">Ver a carga</button>
        </div>
      </section>`;
    EQ.ligarAtb(el);
    el.querySelectorAll('[data-editar]').forEach((b) => b.addEventListener('click', () => window.Farol.ir('equipes-editar', { turmaId: b.dataset.editar })));
    el.querySelector('#at-saude').addEventListener('click', () => window.Farol.ir('saude', { novo: true }));
    el.querySelector('#at-carga').addEventListener('click', () => window.Farol.ir('analise', { aba: 'geral' }));
  };

  P.exercicios = (el, ctx) => {
    const { plano } = ctx;
    const PR = window.Farol.prescricao;
    const equipesIds = (plano.turmas || [plano.turma]);
    const lista = PR.prescricoes().filter((p) => p.status === 'prescrita' && (p.alvo.tipo === 'turma' ? equipesIds.includes(p.alvo.turmaId) : p.alvo.ids.some((id) => plano.atletas.includes(id)))).sort((a, b) => a.data - b.data).slice(0, 6);
    el.innerHTML = `
      <section class="card" aria-labelledby="h-ex">
        <div class="card-head"><h2 id="h-ex">Prescrição física</h2><span class="label">${lista.length ? plural(lista.length, 'treino a fazer', 'treinos a fazer') : 'nenhum treino a fazer'}</span></div>
        ${lista.length ? `<ul class="ix-ul">${lista.map((p) => {
          const m = PR.plano(p.plano);
          return `<li class="ix-li"><span class="ix-data"><b class="num">${new Date(p.data).getUTCDate()}</b><small>${util.mes(p.data)}</small></span><div class="ix-li-m"><b>${esc(m ? m.nome : 'Treino físico')}</b><small>${p.alvo.tipo === 'turma' ? esc(TURMAS[p.alvo.turmaId].nome) : plural(p.alvo.ids.length, 'atleta', 'atletas')}</small></div><button class="btn btn-sm" data-presc="${p.id}">Abrir</button></li>`;
        }).join('')}</ul>` : '<p class="vazio" style="padding:4px 0">Quando você prescrever um treino físico para esta equipe, ele aparece aqui.</p>'}
        <div class="actions" style="margin-top:14px">
          <button class="btn btn-primary" id="ex-nova">Prescrever treino físico</button>
          <button class="btn" id="ex-bib">Biblioteca de exercícios</button>
        </div>
      </section>`;
    el.querySelectorAll('[data-presc]').forEach((b) => b.addEventListener('click', () => window.Farol.ir('treinos-biblioteca', { prescricao: b.dataset.presc })));
    el.querySelector('#ex-bib').addEventListener('click', () => window.Farol.ir('treinos-biblioteca'));
    el.querySelector('#ex-nova').addEventListener('click', () => window.Farol.ir('treinos-biblioteca', { nova: { planoId: plano.id, semana: Math.max(0, plano.semanaAtual), sessaoId: null } }));
  };

  /* ---------- Tela ---------- */

  function render(root, foco) {
    const plano = dados.plano(estado.planoId) || dados.planos[0] || null;
    if (plano) estado.planoId = plano.id;
    if (!plano && estado.nivel !== 'criar') { semPlano(root); return; }
    if (plano) {
      if (estado.ciclo == null) estado.ciclo = plano.cicloAtual >= 0 ? plano.cicloAtual : 0;
      estado.ciclo = Math.min(estado.ciclo, plano.ciclos.length - 1);
    }

    const aviso = estado.aviso;
    estado.aviso = '';
    const criando = estado.nivel === 'criar' || estado.nivel === 'revisao';
    const aba = abaDe(estado.nivel);

    root.innerHTML = `
      ${window.Farol.conta.guardaDados() ? '' : '<span class="chip" style="align-self:flex-start">Dados de exemplo</span>'}
      ${plano && estado.nivel !== 'criar' ? cabecalho(plano, false) : `<header class="page-head"><div><h1>Nova periodização</h1><p class="lead">Escolha as equipes, o início e a competição principal. O app monta a temporada.</p></div></header>`}
      ${aviso ? `<div class="aviso-ok" role="status">${esc(aviso)}</div>` : ''}
      ${estado.nivel === 'revisao' || !plano ? '' : P.bannerRevisao(plano)}
      ${criando || !plano ? '' : `
      <div class="tabs ph-abas" role="tablist" aria-label="Partes da periodização">
        ${ABAS.map((n) => `<button class="tab" role="tab" id="tab-${n.id}" data-nivel="${n.id}" aria-selected="${n.id === aba}" aria-controls="corpo" tabindex="${n.id === aba ? 0 : -1}"><span class="tab-nome">${n.nome}</span></button>`).join('')}
      </div>`}
      <div id="corpo" class="corpo" role="${criando ? 'region' : 'tabpanel'}" ${criando ? 'aria-label="Nova periodização"' : `aria-labelledby="tab-${aba}"`}></div>`;

    const ctx = {
      plano,
      estado,
      ir(nivel, patch, seletor) {
        Object.assign(estado, { nivel }, patch || {});
        render(root, seletor);
      },
    };

    P[estado.nivel](root.querySelector('#corpo'), ctx);

    const rv = root.querySelector('[data-revisar]');
    if (rv) rv.addEventListener('click', () => ctx.ir('revisao', { editor: null }));
    root.querySelectorAll('[data-plano]').forEach((b) => b.addEventListener('click', () => {
      Object.assign(estado, { planoId: b.dataset.plano, ciclo: null, mesoId: null, semana: null, sel: null, turmaId: null, editor: null, confirmaCopia: false, editaBase: false, editaPauta: null });
      if (estado.nivel === 'criar' || estado.nivel === 'revisao') estado.nivel = 'semana';
      render(root, `[data-plano="${b.dataset.plano}"]`);
    }));
    const novo = root.querySelector('#novo-plano');
    if (novo) novo.addEventListener('click', () => ctx.ir('criar', { editor: null }));

    const abas = [...root.querySelectorAll('.ph-abas .tab')];
    const abrir = (b) => ctx.ir(b.dataset.nivel, { editor: null, confirmaCopia: false }, `#tab-${b.dataset.nivel}`);
    abas.forEach((b, i) => {
      b.addEventListener('click', () => abrir(b));
      b.addEventListener('keydown', (e) => {
        const passo = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (!passo) return;
        e.preventDefault();
        abrir(abas[(i + passo + abas.length) % abas.length]);
      });
    });

    if (foco) {
      const el = root.querySelector(foco);
      if (el && !el.disabled) el.focus({ preventScroll: true });
    }
  }

  window.Farol.views = window.Farol.views || {};
  window.Farol.views['treinos-periodizacao'] = (root, params) => {
    if (params) {
      if (params.planoId) window.Farol.compartilhado.planoId = params.planoId;
      // Entrar com uma equipe escolhida abre a periodização que a contém, na aba Semana.
      if (params.turmaId && !params.planoId) {
        const t = TURMAS[params.turmaId];
        const pl = t ? window.Farol.equipes.planoDe(t) : null;
        if (pl) window.Farol.compartilhado.planoId = pl.id;
      }
      Object.assign(estado, params);
    }
    render(root);
  };
})();
