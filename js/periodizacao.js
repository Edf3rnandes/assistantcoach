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
    filtroAt: 'todos',
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

  /* ---------- Aba Atletas ---------- */

  const NOME_ESTADO = { lesao: 'Lesionado', retorno: 'Em retorno', atencao: 'Atenção', ok: 'Disponível' };
  const iniciais = (n) => n.split(' ').filter((x) => x.length > 2).slice(0, 2).map((x) => x[0]).join('').toUpperCase();
  const isoMs = (iso) => { const [y, m, d] = iso.split('-').map(Number); return Date.UTC(y, m - 1, d); };

  // Nota curta de um atleta: lesão e retorno, motivos de atenção e atestado perto de vencer.
  function notaAtleta(m, a) {
    const partes = [];
    if (m.sit) {
      partes.push(`${m.sit.local}${m.sit.texto ? `: ${m.sit.texto.toLowerCase()}` : ''}${m.sit.retorno ? ` · retorno previsto em ${dd(m.sit.retorno)}` : ''}`);
      if (m.sit.conduta && m.estado === 'retorno') partes.push(m.sit.conduta);
    } else if (m.an && m.an.motivos && m.an.motivos.length) partes.push(m.an.motivos.slice(0, 2).map((q) => q.texto).join(' · '));
    if (a.atestado) {
      const d = Math.round((isoMs(a.atestado) - dados.HOJE) / DIA);
      if (d < 0) partes.push('Atestado médico vencido');
      else if (d <= 30) partes.push(`Atestado vence em ${plural(d, 'dia', 'dias')}`);
    }
    return partes;
  }

  function cartaoAtleta(m) {
    const a = elenco.ATLETAS[m.id];
    const an = m.an;
    const idade = a.nascimento ? elenco.cadastro.idadeEm(a.nascimento) : null;
    const nota = notaAtleta(m, a);
    const ac = an && an.acwr != null ? an.acwr : null;
    const metricas = an ? `<span class="at-m">
        <span class="at-ac"><span class="at-ac-t"><small>ACWR</small><b class="num">${ac != null ? util.dec(ac) : '–'}</b></span>
          <span class="at-barra" aria-hidden="true"><i style="width:40%;background:#8db6f0"></i><i style="width:25%;background:#4db982"></i><i style="width:10%;background:#f2b84b"></i><i style="width:25%;background:#e5493d"></i>${ac != null ? `<em style="left:${Math.min(100, Math.max(0, ac * 50))}%"></em>` : ''}</span></span>
        <span class="at-n"><b class="num">${an.pse != null ? util.dec(an.pse) : '–'}</b><small>PSE médio</small></span>
        <span class="at-n"><b class="num">${an.pres != null ? `${Math.round(an.pres)}%` : '–'}</b><small>presença</small></span></span>` : '';
    return `<li><button type="button" class="at-card ${m.estado}" data-atleta="${m.id}" aria-label="Abrir a ficha de ${esc(a.nome)}">
      <span class="at-top"><span class="at-av"><i>${esc(iniciais(a.nome))}</i></span>
        <span class="at-id"><b>${esc(a.nome)}</b><small>${esc(a.faixa)} · ${a.genero === 'F' ? 'feminino' : 'masculino'}${idade != null ? ` · ${idade} anos` : ''}</small></span>
        <span class="atb-c ${m.estado}">${NOME_ESTADO[m.estado]}</span></span>
      ${metricas}
      ${nota.length ? `<span class="at-nota ${m.estado}">${nota.map((t) => esc(t)).join('<br>')}</span>` : ''}
    </button></li>`;
  }

  P.atletas = (el, ctx) => {
    const { plano } = ctx;
    const EQ = window.Farol.equipes;
    const equipes = equipesDe(plano);
    const membros = EQ.situacoes(equipes[0] || { atletas: plano.atletas }, plano);
    const conta = { todos: membros.length, atencao: 0, retorno: 0, lesao: 0 };
    membros.forEach((m) => { if (conta[m.estado] != null) conta[m.estado]++; });
    const filtro = conta[estado.filtroAt] || estado.filtroAt === 'todos' ? estado.filtroAt || 'todos' : 'todos';
    const lista = membros.filter((m) => filtro === 'todos' || m.estado === filtro);
    const PILULAS = [['todos', 'Todos'], ['atencao', 'Atenção'], ['retorno', 'Em retorno'], ['lesao', 'Lesão']];
    el.innerHTML = `
      <div class="at-pil" role="group" aria-label="Filtrar atletas">${PILULAS.filter(([k]) => k === 'todos' || conta[k]).map(([k, n]) => `<button type="button" class="at-p ${k} ${k === filtro ? 'on' : ''}" data-filtro="${k}" aria-pressed="${k === filtro}">${n} · ${conta[k]}</button>`).join('')}</div>
      ${lista.length ? `<ul class="at-lista">${lista.map(cartaoAtleta).join('')}</ul>` : '<p class="vazio">Nenhum atleta nesta situação.</p>'}
      <div class="at-acoes">
        ${equipes.map((t) => `<button class="btn" data-editar="${t.id}">Editar ${esc(t.nome)}</button>`).join('')}
        <button class="btn" id="at-saude">Registrar lesão ou retorno</button>
        <button class="btn" id="at-carga">Ver a carga</button>
      </div>`;
    el.querySelectorAll('[data-filtro]').forEach((b) => b.addEventListener('click', () => ctx.ir('atletas', { filtroAt: b.dataset.filtro }, `[data-filtro="${b.dataset.filtro}"]`)));
    el.querySelectorAll('[data-atleta]').forEach((b) => b.addEventListener('click', () => window.Farol.ir('ficha', { atletaId: b.dataset.atleta })));
    el.querySelectorAll('[data-editar]').forEach((b) => b.addEventListener('click', () => window.Farol.ir('equipes-editar', { turmaId: b.dataset.editar })));
    el.querySelector('#at-saude').addEventListener('click', () => window.Farol.ir('saude', { novo: true }));
    el.querySelector('#at-carga').addEventListener('click', () => window.Farol.ir('analise', { aba: 'geral' }));
  };

  /* ---------- Aba Exercícios ---------- */

  // O treino físico é na areia: só peso do corpo, disco, cone e escada de agilidade.
  const IMPLEMENTOS = [
    ['Peso do corpo', '<circle cx="12" cy="5" r="2.5"/><path d="M12 8v7M8 11h8M9 21l3-6 3 6"/>'],
    ['Disco', '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/>'],
    ['Cone', '<path d="M12 3l6 16H6z"/><path d="M4 21h16M8.5 13h7"/>'],
    ['Escada de agilidade', '<path d="M7 3v18M17 3v18M7 7h10M7 12h10M7 17h10"/>'],
  ];
  const svgImp = (d, t = 18) => `<svg width="${t}" height="${t}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const MESES = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

  P.exercicios = (el, ctx) => {
    const { plano } = ctx;
    const PR = window.Farol.prescricao;
    const equipesIds = (plano.turmas || [plano.turma]);
    const dela = (p) => (p.alvo.tipo === 'turma' ? equipesIds.includes(p.alvo.turmaId) : p.alvo.ids.some((id) => plano.atletas.includes(id)));
    const todas = PR.prescricoes().filter(dela);
    const aFazer = todas.filter((p) => p.status === 'prescrita').sort((x, y) => x.data - y.data).slice(0, 5);
    const feitas = todas.filter((p) => p.status === 'feita').sort((x, y) => y.data - x.data).slice(0, 3);
    const implementos = (m) => [...new Set(m.itens.map((i) => (PR.ex(i.ex) || {}).equip).filter(Boolean))];
    const alvoTxt = (p) => (p.alvo.tipo === 'turma' ? elenco.TURMAS[p.alvo.turmaId].nome : plural(p.alvo.ids.length, 'atleta', 'atletas'));
    const linha = (p, feita) => {
      const m = PR.plano(p.plano);
      const d = new Date(p.data);
      const pses = feita && p.exec ? Object.values(p.exec.pse) : [];
      const pse = pses.length ? pses.reduce((x, y) => x + y, 0) / pses.length : null;
      return `<li><button type="button" class="ex-card ${feita ? 'feita' : ''}" data-presc="${p.id}" aria-label="Abrir ${esc(m ? m.nome : 'treino físico')}">
        <span class="ex-data"><b class="num">${d.getUTCDate()}</b><small>${MESES[d.getUTCMonth()]}</small></span>
        <span class="ex-m"><b>${esc(m ? m.nome : 'Treino físico')}</b>
          <small>${esc(alvoTxt(p))} · ${m ? plural(m.itens.length, 'exercício', 'exercícios') : ''}${feita && pse != null ? ` · PSE médio ${util.dec(pse)}` : ''}</small>
          <span class="ex-imp">${m ? implementos(m).map((n) => `<span class="ex-i">${esc(n)}</span>`).join('') : ''}</span></span>
        <span class="ex-seta" aria-hidden="true">${svgImp('<path d="M9 6l6 6-6 6"/>', 20)}</span></button></li>`;
    };
    // Sessões físicas da semana: com treino prescrito ou ainda por prescrever.
    const semana = plano.semanaAtual >= 0 ? plano.semanas[plano.semanaAtual] : null;
    const fisicas = semana ? semana.sessoes.filter((s) => s.tipo === 'fisico').sort((x, y) => x.dia - y.dia) : [];
    const DIAS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
    el.innerHTML = `
      <section class="ex-areia card" aria-labelledby="ex-areia-t">
        <h2 id="ex-areia-t">Treino físico na areia</h2>
        <p class="hint" style="margin:4px 0 12px">Os implementos são só estes quatro. Toda a biblioteca e os modelos usam apenas eles.</p>
        <ul class="ex-impl">${IMPLEMENTOS.map(([n, d]) => `<li>${svgImp(d, 22)}<span>${esc(n)}</span></li>`).join('')}</ul>
      </section>

      ${fisicas.length ? `<section class="card" aria-labelledby="ex-sem-t">
        <div class="card-head"><h2 id="ex-sem-t">Sessões físicas da semana</h2><span class="label num">semana ${semana.n}</span></div>
        <ul class="ex-sess">${fisicas.map((s) => {
          const lig = todas.find((p) => p.sessao === s.id);
          const m = lig ? PR.plano(lig.plano) : null;
          return `<li><span class="ex-dia"><b>${DIAS[s.dia]}</b><small class="num">${dd(semana.inicio + s.dia * DIA).slice(0, 5)}</small></span>
            <span class="ex-m"><b>Físico · ${s.dur} min</b><small>${lig ? esc(m ? m.nome : 'treino prescrito') : 'ainda sem treino prescrito'}</small></span>
            ${lig ? `<button class="btn btn-sm" data-presc="${lig.id}">Abrir</button>` : `<button class="btn btn-sm btn-primary" data-nova="${s.id}">Prescrever</button>`}</li>`;
        }).join('')}</ul></section>` : ''}

      <section aria-labelledby="ex-fazer-t">
        <div class="in-h2"><h2 id="ex-fazer-t">A fazer</h2><span class="label num">${aFazer.length}</span></div>
        ${aFazer.length ? `<ul class="ex-lista">${aFazer.map((p) => linha(p, false)).join('')}</ul>` : '<p class="vazio">Nenhum treino físico prescrito para esta equipe. Prescreva um modelo para uma data.</p>'}
      </section>

      ${feitas.length ? `<section aria-labelledby="ex-feitas-t">
        <div class="in-h2"><h2 id="ex-feitas-t">Feitos recentemente</h2></div>
        <ul class="ex-lista">${feitas.map((p) => linha(p, true)).join('')}</ul></section>` : ''}

      <div class="ex-acoes">
        <button class="btn btn-primary btn-grande" id="ex-nova">Prescrever treino físico</button>
        <button class="btn btn-grande" id="ex-bib">Biblioteca de exercícios</button>
      </div>`;
    el.querySelectorAll('[data-presc]').forEach((b) => b.addEventListener('click', () => window.Farol.ir('treinos-biblioteca', { prescricao: b.dataset.presc })));
    el.querySelectorAll('[data-nova]').forEach((b) => b.addEventListener('click', () => window.Farol.ir('treinos-biblioteca', { nova: { planoId: plano.id, semana: Math.max(0, plano.semanaAtual), sessaoId: b.dataset.nova } })));
    el.querySelector('#ex-bib').addEventListener('click', () => window.Farol.ir('treinos-biblioteca', { aba: 'cat' }));
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
    // Para o botão "‹" das telas que saem daqui: voltar para a aba em que o técnico estava.
    window.Farol.contexto = { rota: 'treinos-periodizacao', rotulo: (ABAS.find((n) => n.id === aba) || {}).nome || null };

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
