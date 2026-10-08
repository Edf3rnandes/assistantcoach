/* Equipe: o painel de uma turma, a tela para onde o Início leva.
   Reúne, numa rolagem só, o que o técnico precisa para tocar a semana:
   1. semana em andamento (fase, dias de treino e as sessões de cada dia, com o estado do registro);
   2. a sessão escolhida, com os atalhos para registrar, abrir o quadro, prescrever o físico ou editar;
   3. atletas da equipe (quem está disponível, em atenção, em retorno ou lesionado);
   4. foco da fase, próximas competições e atalhos para o plano e a análise da equipe.
   Nada é duplicado: cada atalho abre a tela que já existe (registro, periodização, exercícios, saúde, análise). */
(function () {
  const { dados, util, elenco, registros: REG, calendario: CAL, analise: A } = window.Farol;
  const { esc, num, dec, dd, plural, HOJE, DIA } = util;
  const { ATLETAS, TURMAS, FUNDAMENTOS } = elenco;

  const DIAS_LONGO = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
  const DIAS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
  const TURNO = { manha: 'Manhã', tarde: 'Tarde', noite: 'Noite' };
  const ORD = { manha: 0, tarde: 1, noite: 2 };
  const NOME_ESTADO = { lesao: 'Lesionado', retorno: 'Em retorno', duvida: 'Dúvida', atencao: 'Atenção', ok: 'Disponível' };
  const est = { turmaId: null, planoId: null, semana: null, sel: null };

  const iniciais = (n) => n.split(' ').filter((x) => x.length > 2).slice(0, 2).map((x) => x[0]).join('').toUpperCase();
  const emDias = (t) => Math.round((t - HOJE) / DIA);
  const dataSes = (semana, s) => semana.inicio + s.dia * DIA;
  const ordenar = (lista) => lista.slice().sort((a, b) => a.dia - b.dia || ORD[a.turno] - ORD[b.turno]);

  /* ---------- Dados da equipe (também usados pelo Início) ---------- */

  const planoDe = (t) => dados.planos.find((p) => (p.turmas || [p.turma]).includes(t.id) && p.tipo === 'turma') || dados.planos.find((p) => (p.turmas || [p.turma]).includes(t.id)) || null;

  // Situação de cada atleta: lesão ou retorno do cadastro de saúde; senão, atenção de carga; senão, disponível.
  function situacoes(t, plano) {
    let nivel = {};
    if (plano) { try { A.atletas(plano).forEach((a) => { nivel[a.id] = a; }); } catch (e) { nivel = {}; } }
    const ids = plano && plano.tipo === 'turma' && plano.atletas ? plano.atletas : t.atletas;
    return ids.map((id) => {
      const sit = elenco.situacaoDe(id), an = nivel[id];
      const estado = sit ? (sit.tipo === 'lesao' ? 'lesao' : 'retorno') : an && an.nivel !== 'ok' ? 'atencao' : 'ok';
      return { id, sit, an, estado };
    });
  }

  function resumo(t, forcado) {
    const plano = forcado || planoDe(t);
    const membros = situacoes(t, plano);
    const c = { lesao: 0, retorno: 0, atencao: 0, ok: 0 };
    membros.forEach((m) => { c[m.estado]++; });
    const out = { t, plano, membros, c, semana: null, meso: null, ciclo: null, sessoes: [], nReg: 0, pendentes: 0, hoje: [] };
    // Plano que ainda não começou: mostra a primeira semana.
    out.comeca = plano && plano.semanaAtual < 0 && HOJE < plano.inicioMs ? plano.inicioMs : null;
    const iAtual = plano ? (plano.semanaAtual >= 0 ? plano.semanaAtual : out.comeca ? 0 : -1) : -1;
    if (plano && iAtual >= 0) {
      out.semana = plano.semanas[iAtual];
      out.meso = plano.mesos.find((m) => m.id === (plano.semanaAtual >= 0 ? plano.mesoAtual : out.semana.meso)) || null;
      out.ciclo = plano.ciclos[plano.semanaAtual >= 0 ? plano.cicloAtual : out.semana.ciclo] || null;
      out.sessoes = ordenar(out.semana.sessoes).map((s) => ({ s, st: REG.estado(plano, out.semana, s), t: dataSes(out.semana, s) }));
      out.nReg = out.sessoes.filter((x) => x.st === 'registrado').length;
      out.hoje = out.sessoes.filter((x) => x.t === HOJE);
      plano.semanas.forEach((w) => w.sessoes.forEach((s) => { if (REG.estado(plano, w, s) === 'aguardando' && dataSes(w, s) < HOJE) out.pendentes++; }));
    }
    out.proxComp = CAL.lista().filter((q) => !CAL.passada(q) && q.categorias.some((k) => t.categorias.includes(k)))[0] || null;
    return out;
  }

  /* ---------- Peças ---------- */

  const ST_ICO = {
    registrado: '<svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="7" fill="currentColor"/><path d="M4.8 8.3l2.2 2.2 4.2-4.6" fill="none" stroke="var(--surface)" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    aguardando: '<svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="8" cy="8" r="2.6" fill="currentColor"/></svg>',
    futuro: '<svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-dasharray="2.4 2.4"/></svg>',
    semregistro: '<svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  };
  const ST_TXT = { registrado: 'registrada', aguardando: 'aguardando registro', futuro: 'planejada', semregistro: 'sem registro' };

  function chipSessao(x, ativo) {
    const tipo = dados.TIPOS_SESSAO[x.s.tipo];
    return `<button class="eq-sess ${x.st} ${ativo ? 'sel' : ''}" data-sess="${x.s.id}" style="--c:var(${tipo.cor})" aria-pressed="${ativo}"
      aria-label="${DIAS_LONGO[x.s.dia]}, ${TURNO[x.s.turno].toLowerCase()}, ${esc(tipo.nome)}, ${x.s.dur} minutos, ${ST_TXT[x.st]}">
      <span class="eq-sess-t"><b>${esc(tipo.curto || tipo.nome)}</b><small class="num">${x.s.dur}'</small></span>
      <span class="eq-sess-m"><small>${TURNO[x.s.turno]}</small><i class="eq-st">${ST_ICO[x.st]}</i></span>
    </button>`;
  }

  /* ---------- Sessão escolhida ---------- */

  function painelSessao(R, semana, x) {
    if (!x) return '<p class="vazio" style="padding:6px 0">Nenhuma sessão planejada nesta semana. Abra o plano para montar a semana.</p>';
    const { plano } = R;
    const tipo = dados.TIPOS_SESSAO[x.s.tipo];
    const reg = x.st === 'registrado' ? REG.obter(plano, semana, x.s) : null;
    const rs = reg ? REG.resumoSessao(plano, reg) : null;
    const rr = x.st === 'aguardando' ? REG.resumoRespostas(plano, semana, x.s) : null;
    let situacao = '';
    if (rs) situacao = `<div class="eq-nums"><span><b class="num">${rs.pseMedio != null ? dec(rs.pseMedio) : '–'}</b><small>PSE médio</small></span><span><b class="num">${rs.psrMedio != null ? dec(rs.psrMedio) : '–'}</b><small>PSR médio</small></span><span><b class="num">${rs.presentes}/${rs.total}</b><small>presentes</small></span><span><b class="num">${num(rs.cargaMedia)}</b><small>UA por atleta</small></span></div>`;
    else if (x.st === 'aguardando') situacao = `<p class="eq-aviso">Esta sessão já aconteceu e ainda não foi registrada.${rr && rr.n ? ` ${plural(rr.n, 'atleta já respondeu', 'atletas já responderam')} pelo link.` : ''}</p>`;
    else if (x.st === 'futuro') situacao = `<p class="eq-aviso neutro">${x.t === HOJE ? 'Hoje.' : `Em ${plural(emDias(x.t), 'dia', 'dias')}.`} PSE alvo ${x.s.pse}.</p>`;
    else situacao = '<p class="eq-aviso neutro">Sessão antiga sem registro.</p>';

    const primario = x.st === 'registrado'
      ? `<button class="btn btn-primary" data-acao="registro">Ver registro</button>`
      : x.st === 'futuro' ? `<button class="btn btn-primary" data-acao="editar">Editar sessão</button>`
        : `<button class="btn btn-primary" data-acao="registro">Registrar treino</button>`;
    return `<div class="eq-ses" style="--c:var(${tipo.cor})">
      <div class="eq-ses-h"><span class="eq-ses-dot"></span><div><b>${esc(tipo.nome)}${x.s.diaTipo ? ` <span class="dia-tipo dt-${x.s.diaTipo}">${esc(window.Farol.motor.ROTULO_DIA[x.s.diaTipo])}</span>` : ''}</b><small class="num">${DIAS_LONGO[x.s.dia]}, ${dd(x.t)} · ${TURNO[x.s.turno].toLowerCase()} · ${x.s.dur} min · PSE alvo ${x.s.pse}</small></div>
        <span class="eq-estado ${x.st}">${ST_ICO[x.st]}${esc(ST_TXT[x.st])}</span></div>
      ${x.s.obj ? `<p class="eq-obj">${esc(x.s.obj)}</p>` : ''}
      ${situacao}
      <div class="eq-acoes">
        ${primario}
        <button class="btn" data-acao="quadro">Abrir quadro</button>
        ${x.s.tipo === 'fisico' ? '<button class="btn" data-acao="fisico">Prescrever físico</button>' : ''}
        ${x.st !== 'futuro' ? '<button class="btn" data-acao="editar">Editar sessão</button>' : ''}
      </div></div>`;
  }

  /* ---------- Tela ---------- */

  function escolhida(R, semana) {
    const lista = ordenar(semana.sessoes).map((s) => ({ s, st: REG.estado(R.plano, semana, s), t: dataSes(semana, s) }));
    let x = lista.find((q) => q.s.id === est.sel);
    if (!x) x = lista.find((q) => q.t === HOJE) || lista.find((q) => q.st === 'aguardando') || lista.find((q) => q.st === 'futuro') || lista[0] || null;
    return { lista, x };
  }

  function semPlano(root, t) {
    root.innerHTML = `
      <header class="page-head"><div><h1>${esc(t.nome)}</h1><p class="lead">${plural(t.atletas.length, 'atleta', 'atletas')} · ${esc(elenco.cadastro.rotuloEquipe(t))}</p></div></header>
      <section class="card eq-vazio"><h2>Esta equipe ainda não tem periodização</h2>
        <p>Com a periodização, o painel mostra a semana, os dias de treino e as sessões a registrar.</p>
        <div class="actions" style="justify-content:center"><button class="btn btn-primary" id="eq-criar">Criar a periodização da equipe</button><button class="btn" id="eq-editar">Editar equipe</button></div></section>
      ${blocoAtletas(t, situacoes(t, null))}`;
    root.querySelector('#eq-criar').addEventListener('click', () => window.Farol.ir('treinos-periodizacao', { nivel: 'criar', editor: null, turmaId: t.id }));
    root.querySelector('#eq-editar').addEventListener('click', () => window.Farol.ir('equipes-editar', { turmaId: t.id }));
    ligarAtletas(root);
  }

  function blocoAtletas(t, membros) {
    const c = { lesao: 0, retorno: 0, atencao: 0, ok: 0 };
    membros.forEach((m) => { c[m.estado]++; });
    const motivo = (m) => (m.sit ? `${NOME_ESTADO[m.sit.tipo]}, ${m.sit.local.toLowerCase()}` : m.an && m.an.motivos.length ? m.an.motivos.map((q) => q.texto).join(', ') : 'Disponível');
    return `<section class="card eq-atl" aria-labelledby="eq-atl-t">
      <div class="card-head"><h2 id="eq-atl-t">Atletas</h2><span class="label num">${c.ok} de ${membros.length} disponíveis</span></div>
      ${membros.length ? `<ul class="eq-atletas">${membros.map((m) => `<li><button class="eq-at ${m.estado}" data-atleta="${m.id}" data-estado="${m.estado}" title="${esc(ATLETAS[m.id].nome)}: ${esc(motivo(m))}">
        <span class="eq-av"><i>${esc(iniciais(ATLETAS[m.id].nome))}</i></span><span class="eq-at-n"><b>${esc(ATLETAS[m.id].nome.split(' ')[0])}</b><small>${m.estado === 'ok' ? '' : esc(NOME_ESTADO[m.estado])}</small></span></button></li>`).join('')}</ul>`
        : '<p class="vazio" style="padding:6px 0">Ainda não há atletas nesta equipe.</p>'}
      <p class="eq-leg"><span class="ix-sel ok">Disponível</span><span class="ix-sel atencao">Atenção</span><span class="ix-sel retorno">Em retorno</span><span class="ix-sel lesao">Lesionado</span></p>
    </section>`;
  }


  // Bloco de atletas que abre e fecha: uma linha de resumo e, ao tocar, a lista com a situação de cada um.
  let seqAtb = 0;
  function blocoAtletasNovo(membros, aberto) {
    const id = `atb${++seqAtb}`;
    const c = { lesao: 0, retorno: 0, atencao: 0, ok: 0 };
    membros.forEach((m) => { c[m.estado]++; });
    const chip = (k, n, txt) => (n ? `<span class="atb-c ${k}">${n} ${txt}</span>` : '');
    const motivo = (m) => (m.sit ? m.sit.local.toLowerCase() : m.an && m.an.motivos && m.an.motivos.length ? m.an.motivos[0].texto : '');
    const sub = (a) => `${a.faixa || ''}${a.genero ? ` · ${a.genero === 'F' ? 'feminino' : 'masculino'}` : ''}`;
    return `<div class="atb" data-atb>
      <button type="button" class="atb-t" aria-expanded="${!!aberto}" aria-controls="${id}">
        <span class="atb-res"><b>Atletas</b><span class="num atb-n">${membros.length}</span>${chip('ok', c.ok, c.ok === membros.length ? 'disponíveis' : 'ok')}${chip('atencao', c.atencao, 'atenção')}${chip('retorno', c.retorno, 'em retorno')}${chip('lesao', c.lesao, c.lesao === 1 ? 'lesão' : 'lesões')}</span>
        <svg class="atb-seta" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>
      </button>
      <ul class="atb-l" id="${id}" ${aberto ? '' : 'hidden'}>${membros.length ? membros.map((m) => {
        const a = ATLETAS[m.id];
        const ac = m.an && m.an.acwr != null ? `ACWR ${dec(m.an.acwr)}` : '';
        const det = m.estado === 'ok' ? ac : (motivo(m) || ac);
        return `<li><button type="button" class="atb-i ${m.estado}" data-atleta="${m.id}" data-estado="${m.estado}">
          <span class="atb-av"><i>${esc(iniciais(a.nome))}</i></span>
          <span class="atb-nm"><b>${esc(a.nome)}</b><small>${esc(sub(a))}</small></span>
          <span class="atb-st"><span class="atb-c ${m.estado}">${esc(NOME_ESTADO[m.estado])}</span>${det ? `<small class="num" title="${esc(det)}">${esc(det)}</small>` : ''}</span></button></li>`;
      }).join('') : '<li class="vazio" style="padding:8px 4px">Ainda não há atletas nesta equipe.</li>'}</ul></div>`;
  }

  // Liga o abrir/fechar dos blocos de atletas de uma tela e o toque em cada atleta (abre a ficha).
  function ligarAtb(root) {
    root.querySelectorAll('[data-atb] .atb-t').forEach((b) => b.addEventListener('click', () => {
      const abre = b.getAttribute('aria-expanded') !== 'true';
      b.setAttribute('aria-expanded', String(abre));
      root.querySelector(`#${b.getAttribute('aria-controls')}`).hidden = !abre;
    }));
    root.querySelectorAll('.atb-i').forEach((b) => b.addEventListener('click', () => window.Farol.ir('ficha', { atletaId: b.dataset.atleta })));
  }

  function ligarAtletas(root) {
    root.querySelectorAll('[data-atleta]').forEach((b) => b.addEventListener('click', () => {
      const id = b.dataset.atleta;
      if (b.dataset.estado === 'lesao' || b.dataset.estado === 'retorno') window.Farol.ir('saude', { foco: id });
      else window.Farol.ir('analise', { aba: 'carga', atleta: id });
    }));
  }

  function montar(root, params) {
    if (params && params.turmaId) { est.turmaId = params.turmaId; est.semana = null; est.sel = null; }
    if (params && params.planoId && params.planoId !== est.planoId) { est.planoId = params.planoId; est.semana = null; est.sel = null; }
    if (params && params.semana != null) est.semana = params.semana;
    if (params && params.sel) est.sel = params.sel;
    if (!est.turmaId || !TURMAS[est.turmaId]) est.turmaId = window.Farol.compartilhado.equipeId && TURMAS[window.Farol.compartilhado.equipeId] ? window.Farol.compartilhado.equipeId : Object.keys(TURMAS)[0];
    window.Farol.compartilhado.equipeId = est.turmaId;
    const t = TURMAS[est.turmaId];
    if (!t) { window.Farol.ir('inicio'); return; }
    const R = resumo(t, est.planoId ? dados.plano(est.planoId) : null);
    if (!R.plano) { semPlano(root, t); return; }
    const { plano } = R;
    window.Farol.compartilhado.planoId = plano.id;
    if (est.semana == null || est.semana < 0 || est.semana >= plano.semanas.length) est.semana = Math.max(0, plano.semanaAtual);
    const semana = plano.semanas[est.semana];
    const atual = est.semana === plano.semanaAtual;
    const ciclo = plano.ciclos[semana.ciclo] || R.ciclo;
    const meso = plano.mesos.find((m) => m.id === semana.meso) || R.meso;
    const tm = dados.TIPOS_MICRO[semana.microTipo];
    const { lista, x } = escolhida(R, semana);
    est.sel = x ? x.s.id : null;
    const nReg = lista.filter((q) => q.st === 'registrado').length;
    const comp = R.proxComp;
    const alvo = ciclo && ciclo.alvo;

    const dias = DIAS.map((nome, d) => {
      const data = semana.inicio + d * DIA;
      const ses = lista.filter((q) => q.s.dia === d);
      return `<div class="eq-dia ${data === HOJE ? 'hoje' : ''} ${ses.length ? '' : 'folga'}" role="group" aria-label="${DIAS_LONGO[d]} ${dd(data)}">
        <div class="eq-dia-h"><b>${nome}</b><small class="num">${dd(data).slice(0, 5)}</small>${data === HOJE ? '<em>hoje</em>' : ''}</div>
        <div class="eq-dia-s">${ses.length ? ses.map((q) => chipSessao(q, x && q.s.id === x.s.id)).join('') : '<span class="eq-folga">Folga</span>'}</div></div>`;
    }).join('');

    const alta = meso ? meso.pauta.fundamentos.filter((f) => f.prio === 'alta') : [];
    const media = meso ? meso.pauta.fundamentos.filter((f) => f.prio === 'media') : [];

    root.innerHTML = `
      <section class="card eq-semana" aria-labelledby="eq-sem-t">
        <div class="card-head eq-sem-h">
          <h2 id="eq-sem-t">Semana ${semana.n}</h2>
          <div class="eq-nav" role="group" aria-label="Trocar de semana">
            <button class="eq-nav-b" id="eq-ant" aria-label="Semana anterior" ${est.semana <= 0 ? 'disabled' : ''}>‹</button>
            <span class="num">${dd(semana.inicio).slice(0, 5)} a ${dd(semana.inicio + 6 * DIA).slice(0, 5)}</span>
            <button class="eq-nav-b" id="eq-prox" aria-label="Próxima semana" ${est.semana >= plano.semanas.length - 1 ? 'disabled' : ''}>›</button>
            ${atual ? '' : '<button class="link-btn" id="eq-hoje" style="margin:0">Esta semana</button>'}
          </div>
        </div>
        <div class="eq-dias">${dias}</div>
        <div id="eq-sessao" aria-live="polite">${painelSessao(R, semana, x)}</div>
        <p class="eq-leg"><span><i class="eq-st registrado">${ST_ICO.registrado}</i> registrada</span><span><i class="eq-st aguardando">${ST_ICO.aguardando}</i> aguardando registro</span><span><i class="eq-st futuro">${ST_ICO.futuro}</i> planejada</span></p>
      </section>

      ${blocoAtletasNovo(R.membros, false)}

      <div class="eq-g2">
        <section class="card" aria-labelledby="eq-foco-t">
          <div class="card-head"><h2 id="eq-foco-t">Foco da fase</h2>${meso ? `<button class="link-btn" id="eq-pauta" style="margin:0">Editar pauta</button>` : ''}</div>
          ${meso ? `<div class="ix-chips">${alta.map((f) => `<span class="ix-chip alta" title="${esc(f.ideia || FUNDAMENTOS[f.id].nome)}">${esc(FUNDAMENTOS[f.id].nome.replace(/ \(.*\)/, ''))}</span>`).join('')}${media.map((f) => `<span class="ix-chip" title="${esc(f.ideia || FUNDAMENTOS[f.id].nome)}">${esc(FUNDAMENTOS[f.id].nome.replace(/ \(.*\)/, ''))}</span>`).join('')}</div>
            ${meso.pauta.ideias.length ? `<ul class="ix-ideias">${meso.pauta.ideias.slice(0, 2).map((q) => `<li>${esc(q)}</li>`).join('')}</ul>` : ''}` : '<p class="vazio" style="padding:6px 0">Sem fase ativa nesta data.</p>'}
        </section>
        <section class="card" aria-labelledby="eq-comp-t">
          <div class="card-head"><h2 id="eq-comp-t">Próxima competição</h2><button class="link-btn" id="eq-comps" style="margin:0">Ver todas</button></div>
          ${comp ? `<button class="eq-comp" id="eq-comp"><span class="ix-data"><b class="num">${new Date(comp.data).getUTCDate()}</b><small>${util.mes(comp.data)}</small></span>
            <span class="eq-comp-m"><b>${esc(comp.nome)}</b><small>${esc(comp.local)}</small></span><span class="ix-dias"><b class="num">${emDias(comp.data)}</b><small>dias</small></span></button>`
            : '<p class="vazio" style="padding:6px 0">Nenhuma competição prevista para esta equipe.</p>'}
        </section>
      </div>

      <div class="eq-rodape">
        <button class="btn btn-sm" data-ir="treinos-microciclo">Resposta da semana</button>
        <button class="btn btn-sm" id="eq-link-copiar">Copiar link dos atletas<small id="eq-link-msg" class="eq-link-msg"></small></button>
        <button class="btn btn-sm" id="eq-editar">Editar equipe</button>
      </div>`;

    const refaz = (foco) => { const y = window.scrollY; montar(root); window.scrollTo({ top: y }); if (foco) { const f = root.querySelector(foco); if (f) f.focus({ preventScroll: true }); } };
    const $ = (s) => root.querySelector(s);
    $('#eq-ant').addEventListener('click', () => { est.semana--; est.sel = null; refaz('#eq-ant'); });
    $('#eq-prox').addEventListener('click', () => { est.semana++; est.sel = null; refaz('#eq-prox'); });
    const h = $('#eq-hoje'); if (h) h.addEventListener('click', () => { est.semana = null; est.sel = null; refaz('#eq-ant'); });
    root.querySelectorAll('[data-sess]').forEach((b) => b.addEventListener('click', () => { est.sel = b.dataset.sess; refaz(`[data-sess="${b.dataset.sess}"]`); }));
    root.querySelectorAll('[data-acao]').forEach((b) => b.addEventListener('click', () => {
      const a = b.dataset.acao;
      if (a === 'quadro') { window.Farol.gaveta.abrir(); return; }
      if (a === 'registro') window.Farol.ir('treino-registro', { planoId: plano.id, abrir: { semana: semana.idx, sessaoId: x.s.id } });
      else if (a === 'editar') window.Farol.ir('treinos-periodizacao', { planoId: plano.id, nivel: 'micro', semana: semana.idx, editor: { dia: x.s.dia, turno: x.s.turno, id: x.s.id }, painel: x.st === 'futuro' ? 'plano' : 'registro' });
      else if (a === 'fisico') window.Farol.ir('treinos-biblioteca', { nova: { planoId: plano.id, semana: semana.idx, sessaoId: x.s.id } });
    }));
    ligarAtb(root);
    root.querySelectorAll('[data-ir]').forEach((b) => b.addEventListener('click', () => {
      const rota = b.dataset.ir;
      if (rota === 'treinos-microciclo') window.Farol.ir(rota, { planoId: plano.id, semana: semana.idx });
    }));
    $('#eq-editar').addEventListener('click', () => window.Farol.ir('equipes-editar', { turmaId: t.id }));
    const pa = $('#eq-pauta'); if (pa) pa.addEventListener('click', () => window.Farol.ir('treinos-periodizacao', { planoId: plano.id, nivel: 'meso', mesoId: meso.id }));
    const co = $('#eq-comp'); if (co) co.addEventListener('click', () => window.Farol.ir('planejamento-competicoes', { competicao: comp.id }));
    $('#eq-comps').addEventListener('click', () => window.Farol.ir('planejamento-competicoes'));
    $('#eq-link-copiar').addEventListener('click', () => {
      const url = new URL(`atleta.html?t=${encodeURIComponent(t.token)}`, location.href).href;
      const msg = $('#eq-link-msg');
      const ok = () => { msg.textContent = ' · copiado'; };
      const falha = () => { msg.textContent = url; };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(ok, falha); else falha();
    });
  }

  window.Farol.equipes = { resumo, planoDe, situacoes, blocoAtletasNovo, ligarAtb, semana: (root, params) => montar(root, params) };
  window.Farol.views = window.Farol.views || {};
  // A tela de equipe deixou de existir à parte: ela é a periodização escolhida, na aba Semana.
  window.Farol.views.equipe = (root, params) => {
    const t = params && params.turmaId ? TURMAS[params.turmaId] : null;
    const pl = t ? planoDe(t) : null;
    if (pl) window.Farol.ir('treinos-periodizacao', { planoId: pl.id, nivel: 'semana', turmaId: t.id, ...(params.sel ? { sel: params.sel } : {}) });
    else window.Farol.ir('treinos-periodizacao', { nivel: 'criar', editor: null, turmaId: t ? t.id : null });
  };
})();
