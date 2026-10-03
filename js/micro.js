/* Periodização > Microciclo
   A semana de treino: grade dia × turno com as sessões planejadas e o registro de cada uma.
   A carga planejada é a soma das sessões. A realizada vem dos registros do professor, com
   presença, PSE e PSR de cada atleta da turma. */
(function () {
  const { dados, util, elenco, registros: REG } = window.Farol;
  const { DIA, dd, num, dec, esc, plural, media } = util;
  const { TIPOS_SESSAO, TIPOS_MICRO, TURNOS, DIAS } = dados;
  const { ATLETAS } = elenco;
  const P = (window.Farol.periodo = window.Farol.periodo || {});

  const horas = (min) => `${Math.floor(min / 60)}h${String(min % 60).padStart(2, '0')}`;

  /* ---------- Resumo da semana ---------- */

  function resumo(plano, sem, meso) {
    const sess = sem.sessoes;
    const minutos = sess.reduce((a, s) => a + s.dur, 0);
    const pse = minutos ? sess.reduce((a, s) => a + s.dur * s.pse, 0) / minutos : 0;
    const dif = Math.round((sem.planejado / meso.mediaPlanejada - 1) * 100);
    const r = sem.registro;
    const porTipo = Object.keys(TIPOS_SESSAO)
      .map((t) => ({ t, min: sess.filter((s) => s.tipo === t).reduce((a, s) => a + s.dur, 0) }))
      .filter((x) => x.min > 0);

    let realizado;
    if (sem.realizado != null) {
      realizado = `<dd class="num">${num(sem.realizado)} <small>UA</small></dd><small class="sub">${Math.round((sem.realizado / sem.planejado) * 100)}% do planejado, por atleta</small>`;
    } else if (r.registradas) {
      realizado = `<dd class="num">${num(r.realizadoParcial)} <small>UA até agora</small></dd><small class="sub">${r.registradas} de ${sess.length} sessões registradas (planejado nelas: ${num(r.planejadoParcial)})</small>`;
    } else {
      realizado = `<dd class="num">n/d</dd><small class="sub">${r.futuras === sess.length ? 'semana ainda não começou' : 'nenhuma sessão registrada'}</small>`;
    }

    const resposta = r.registradas ? `
      <dl class="kv kv-tight kv-resposta" aria-label="Resposta dos atletas nas sessões registradas">
        <div><dt>PSE médio dos atletas</dt><dd class="num">${r.pseMedio != null ? dec(r.pseMedio) : 'n/d'} <small>de 10</small></dd>
          <small class="sub">alvo das sessões registradas: ${r.pseAlvo != null ? dec(r.pseAlvo) : 'n/d'}</small></div>
        <div><dt>PSR médio</dt><dd class="num">${r.psrMedio != null ? dec(r.psrMedio) : 'n/d'} <small>de 10</small></dd>
          <small class="sub">10 é totalmente recuperado</small></div>
        <div><dt>Presença</dt><dd class="num">${r.presencaPct != null ? r.presencaPct : 'n/d'}<small>%</small></dd>
          <small class="sub">nas sessões registradas</small></div>
      </dl>` : '';

    return `
      <dl class="kv kv-tight">
        <div><dt>Carga planejada</dt><dd class="num">${num(sem.planejado)} <small>UA</small></dd>
          <small class="sub">${dif === 0 ? 'igual' : `${dif > 0 ? '+' : ''}${dif}%`} da média da fase</small></div>
        <div><dt>Carga realizada</dt>${realizado}</div>
        <div><dt>Sessões</dt><dd class="num">${sess.length}</dd><small class="sub">${horas(minutos)} de treino</small></div>
        <div><dt>PSE alvo médio</dt><dd class="num">${pse ? dec(pse) : 'n/d'} <small>de 10</small></dd><small class="sub">ponderado pela duração</small></div>
      </dl>
      ${resposta}
      ${porTipo.length ? `
      <div class="detail-block">
        <span class="label">Tempo por tipo de sessão</span>
        <div class="stack" role="img" aria-label="${porTipo.map((x) => `${TIPOS_SESSAO[x.t].nome} ${x.min} minutos`).join(', ')}">
          ${porTipo.map((x) => `<i style="width:${(x.min / minutos) * 100}%;background:var(${TIPOS_SESSAO[x.t].cor})"></i>`).join('')}
        </div>
        <div class="stack-legend num">
          ${porTipo.map((x) => `<span><span class="dot" style="background:var(${TIPOS_SESSAO[x.t].cor})"></span><b>${horas(x.min)}</b> ${TIPOS_SESSAO[x.t].nome.toLowerCase()}</span>`).join('')}
        </div>
      </div>` : ''}`;
  }

  /* ---------- Grade ---------- */

  function cartao(plano, sem, s) {
    const t = TIPOS_SESSAO[s.tipo];
    const st = REG.estado(plano, sem, s);
    let status = '';
    let leitura = '';
    if (st === 'registrado') {
      const r = REG.resumoSessao(plano, REG.obter(plano, sem, s));
      status = `<span class="session-status ok">✓ PSE ${r.pseMedio != null ? dec(r.pseMedio) : '–'} · PSR ${r.psrMedio != null ? dec(r.psrMedio) : '–'}</span>`;
      leitura = ` Registrado: PSE médio ${r.pseMedio != null ? dec(r.pseMedio) : 'n/d'}, PSR médio ${r.psrMedio != null ? dec(r.psrMedio) : 'n/d'}.`;
    } else if (st === 'aguardando') {
      const rr = REG.resumoRespostas(plano, sem, s);
      status = `<span class="session-status pend">Aguardando registro</span>${rr.n ? `<span class="session-status num">${rr.n}/${rr.total} responderam</span>` : ''}`;
      leitura = ' Aguardando registro.';
    } else if (st === 'semregistro') {
      status = '<span class="session-status">Sem registro</span>';
    }
    return `
      <button class="session" data-sessao="${s.id}" aria-label="${esc(t.nome)}, ${s.dur} minutos, PSE alvo ${s.pse}. ${esc(s.obj)}.${leitura} Abrir">
        <span class="session-top"><span class="dot" style="background:var(${t.cor})"></span><span class="session-tipo">${esc(t.curto || t.nome)}</span></span>
        <span class="session-meta num"><span>${s.dur} min</span> <span>PSE ${s.pse}</span></span>
        <span class="session-obj">${esc(s.obj)}</span>
        ${status}
      </button>`;
  }

  function grade(plano, sem, estado) {
    const noite = estado.noite || sem.sessoes.some((s) => s.turno === 'noite');
    const turnos = TURNOS.filter((t) => t.id !== 'noite' || noite);
    const hoje = dados.HOJE;

    const colunas = [];
    const rotulos = turnos.map((t, ti) => `<div class="turno-col" style="grid-row:${ti + 2};grid-column:1">${t.nome}</div>`).join('');

    DIAS.forEach((nome, d) => {
      const data = sem.inicio + d * DIA;
      const jogo = sem.competicoes.find((c) => data >= c.data && data <= (c.fim || c.data));
      const ehHoje = hoje >= data && hoje < data + DIA;
      const slots = turnos.map((t, ti) => {
        const dentro = sem.sessoes.filter((s) => s.dia === d && s.turno === t.id);
        const ativo = estado.editor && estado.editor.dia === d && estado.editor.turno === t.id;
        return `<div class="slot-cell ${ativo ? 'is-ativo' : ''}" style="grid-column:${d + 2};grid-row:${ti + 2}">
          <span class="turno-inline">${t.nome}</span>
          ${dentro.length
            ? dentro.map((s) => cartao(plano, sem, s)).join('')
            : `<button class="slot-add" data-add="${d}:${t.id}" aria-label="Adicionar sessão na ${DIAS[d]}, ${t.nome.toLowerCase()}"><span aria-hidden="true">+</span><span class="turno-inline-txt">Adicionar sessão</span></button>`}
        </div>`;
      }).join('');
      colunas.push(`<div class="week-day">
        <div class="day-head ${ehHoje ? 'is-hoje' : ''}" style="grid-column:${d + 2};grid-row:1">
          <span><b>${nome}</b> <span class="num">${dd(data)}</span></span>
          ${ehHoje ? '<span class="chip chip-hoje">hoje</span>' : ''}
          ${jogo ? '<span class="chip chip-beam">jogo</span>' : ''}
        </div>
        ${slots}
      </div>`);
    });

    return `<div class="week" role="group" aria-label="Grade da semana">${rotulos}${colunas.join('')}</div>
      ${noite && !sem.sessoes.some((s) => s.turno === 'noite')
        ? '<button class="link-btn" id="noite-off">Ocultar turno da noite</button>'
        : !noite ? '<button class="link-btn" id="noite-on">Mostrar turno da noite</button>' : ''}`;
  }

  /* ---------- Atletas da semana ---------- */

  function atencao(p, pseAlvo) {
    const pseM = media(p.pse);
    const psrM = media(p.psr);
    const presenca = p.sessoes ? p.presencas / p.sessoes : null;
    if (psrM != null && psrM <= 4.5 && pseM != null && pseAlvo != null && pseM >= pseAlvo + 1) return { nivel: 'crit', texto: 'PSR baixo e PSE acima do alvo' };
    if (psrM != null && psrM <= 5.5) return { nivel: 'warn', texto: 'PSR baixo' };
    if (presenca != null && presenca < 0.6) return { nivel: 'warn', texto: 'Faltou à maioria' };
    if (pseM != null && pseAlvo != null && pseM >= pseAlvo + 1.5) return { nivel: 'warn', texto: 'PSE bem acima do alvo' };
    return null;
  }

  function atletasSemana(plano, sem) {
    const r = sem.registro;
    if (!r.registradas) return '';
    const linhas = plano.atletas.map((id) => {
      const p = r.porAtleta[id];
      return { id, p, pseM: media(p.pse), psrM: media(p.psr), aten: atencao(p, r.pseAlvo) };
    });
    const peso = { crit: 0, warn: 1 };
    linhas.sort((a, b) => (peso[a.aten ? a.aten.nivel : 'x'] ?? 2) - (peso[b.aten ? b.aten.nivel : 'x'] ?? 2) || ATLETAS[a.id].nome.localeCompare(ATLETAS[b.id].nome));
    const maxCarga = Math.max(...linhas.map((l) => l.p.carga), 1);
    const nAten = linhas.filter((l) => l.aten).length;

    return `
      <section class="card" aria-labelledby="h-atl">
        <div class="card-head">
          <h2 id="h-atl">Atletas na semana</h2>
          <span class="label">${nAten ? `${plural(nAten, 'atleta pede', 'atletas pedem')} atenção` : 'Sem alertas'} · ${r.registradas} de ${sem.sessoes.length} sessões registradas</span>
        </div>
        <div class="table-scroll">
          <table class="mesos atl">
            <thead><tr><th>Atleta</th><th class="r">Presença</th><th class="r">PSE</th><th class="r">PSR</th><th>Carga na semana</th><th>Atenção</th></tr></thead>
            <tbody>
              ${linhas.map((l) => `
                <tr>
                  <td>${esc(ATLETAS[l.id].nome)}</td>
                  <td class="r num">${l.p.presencas}/${l.p.sessoes}</td>
                  <td class="r num">${l.pseM != null ? dec(l.pseM) : '–'}</td>
                  <td class="r num">${l.psrM != null ? dec(l.psrM) : '–'}</td>
                  <td><span class="bar-inline"><i style="width:${(l.p.carga / maxCarga) * 100}%"></i></span> <span class="num">${num(l.p.carga)}</span></td>
                  <td>${l.aten ? `<span class="chip chip-${l.aten.nivel}">${esc(l.aten.texto)}</span>` : ''}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
        <p class="hint">PSE e PSR são médias das sessões em que o atleta esteve presente. Carga em UA: duração × PSE. As faltas contam zero.</p>
      </section>`;
  }

  /* ---------- Painel da sessão ---------- */

  function formPlano(sem, estado) {
    const e = estado.editor;
    const existente = e.id ? sem.sessoes.find((s) => s.id === e.id) : null;
    const base = existente || { tipo: 'tecnica', dur: 90, pse: 5, obj: '' };
    const data = sem.inicio + e.dia * DIA;
    const turno = TURNOS.find((t) => t.id === e.turno).nome.toLowerCase();

    return `
      <form id="form-sessao" novalidate>
        <div class="card-head">
          <h3>${existente ? 'Editar sessão' : 'Nova sessão'}: ${DIAS[e.dia]} ${dd(data)}, ${turno}</h3>
          <span class="label num" id="f-carga">${base.dur * base.pse} UA</span>
        </div>
        <div class="form-grid">
          <div class="field">
            <label class="label" for="f-tipo">Tipo</label>
            <select class="select" id="f-tipo" style="min-width:0">
              ${Object.entries(TIPOS_SESSAO).map(([k, v]) => `<option value="${k}" ${k === base.tipo ? 'selected' : ''}>${v.nome}</option>`).join('')}
            </select>
          </div>
          <div class="field">
            <label class="label" for="f-dur">Duração (min)</label>
            <input class="input num" id="f-dur" type="number" min="20" max="300" step="5" value="${base.dur}" required>
          </div>
          <div class="field">
            <label class="label" for="f-pse">PSE alvo (1 a 10)</label>
            <input class="input num" id="f-pse" type="number" min="1" max="10" step="1" value="${base.pse}" required>
          </div>
          <div class="field field-wide">
            <label class="label" for="f-obj">Objetivo da sessão</label>
            <input class="input" id="f-obj" type="text" maxlength="80" value="${esc(base.obj)}" placeholder="Ex.: saque float e recepção em duplas" required>
          </div>
        </div>
        <p class="form-erro" id="f-erro" role="alert" hidden></p>
        <div class="actions">
          <button class="btn btn-primary" type="submit">Salvar</button>
          <button class="btn" type="button" id="f-cancelar">Cancelar</button>
          ${existente && existente.tipo === 'fisico' ? '<button class="btn" type="button" id="f-prescrever">Prescrever treino físico</button>' : ''}
          ${existente ? '<button class="btn btn-danger" type="button" id="f-remover">Remover sessão</button>' : ''}
        </div>
      </form>`;
  }

  /* ---------- Tela ---------- */

  P.micro = function (el, ctx) {
    const { plano, estado } = ctx;
    let idx = estado.semana != null ? estado.semana : plano.semanaAtual >= 0 ? plano.semanaAtual : 0;
    idx = Math.max(0, Math.min(plano.semanas.length - 1, idx));
    estado.semana = idx;
    const sem = plano.semanas[idx];
    const meso = plano.mesos.find((m) => m.id === sem.meso);
    const ciclo = plano.ciclos[sem.ciclo];
    const posNaFase = idx - meso.semanaIni + 1;
    const ehAtual = idx === plano.semanaAtual;
    const proxima = plano.semanas[idx + 1];
    const modificada = sem.editada || sem.microTipo !== sem.microAuto;
    const aviso = estado.aviso;
    estado.aviso = '';

    const sessaoAberta = estado.editor && estado.editor.id ? sem.sessoes.find((s) => s.id === estado.editor.id) : null;
    const stAberta = sessaoAberta ? REG.estado(plano, sem, sessaoAberta) : null;
    const painel = estado.painel === 'registro' && sessaoAberta && stAberta !== 'futuro' ? 'registro' : 'plano';
    const aguardando = [];
    sem.sessoes.forEach((s) => { if (REG.estado(plano, sem, s) === 'aguardando') aguardando.push(s); });

    el.innerHTML = `
      ${aviso ? `<div class="aviso-ok" role="status">${esc(aviso)}</div>` : ''}
      <section class="card" aria-labelledby="h-sem">
        <div class="card-head">
          <div class="week-nav">
            <button class="btn btn-icon" id="sem-ant" aria-label="Semana anterior" ${idx === 0 ? 'disabled' : ''}>‹</button>
            <div>
              <h2 id="h-sem">Semana ${sem.n} <span class="num" style="font-weight:600">· ${dd(sem.inicio)} a ${dd(sem.inicio + 6 * DIA)}</span></h2>
              <span class="meso-period"><span class="dot" style="background:var(${meso.cor})"></span>${esc(ciclo.nome)} · ${esc(meso.nome)}, semana ${posNaFase} de ${meso.semanas}</span>
            </div>
            <button class="btn btn-icon" id="sem-prox" aria-label="Próxima semana" ${!proxima ? 'disabled' : ''}>›</button>
          </div>
          <div class="chips">
            ${ehAtual ? '<span class="chip chip-hoje">semana atual</span>' : ''}
            ${sem.editada ? '<span class="chip">editada</span>' : ''}
            ${sem.competicoes.map((c) => `<button class="chip chip-link" data-comp="${c.id}">${esc(c.nome)}</button>`).join('')}
            ${ehAtual ? '' : '<button class="link-btn" id="ir-atual">Ir para a semana atual</button>'}
          </div>
        </div>

        <div class="micro-tipo">
          <div class="field">
            <label class="label" for="micro-tipo">Tipo de microciclo</label>
            <select class="select" id="micro-tipo" style="min-width:220px">
              ${Object.entries(TIPOS_MICRO).map(([k, v]) => `<option value="${k}" ${k === sem.microTipo ? 'selected' : ''}>${v.nome}${k === sem.microAuto ? ' (sugerido)' : ''}</option>`).join('')}
            </select>
          </div>
          <p class="micro-desc">${esc(TIPOS_MICRO[sem.microTipo].desc)}${sem.editada ? ' Como a semana foi editada, mudar o tipo não refaz as sessões.' : ' Mudar o tipo refaz as sessões pelo modelo.'}</p>
        </div>

        ${resumo(plano, sem, meso)}

        <div class="detail-block">
          <span class="label">Pauta da fase ${esc(meso.nome)}</span>
          <div class="pauta-chips">
            ${meso.pauta.fundamentos.map((f) => `<span class="chip prio-${f.prio}" title="${esc(elenco.PRIORIDADES[f.prio].nome)}${f.ideia ? '. ' + esc(f.ideia) : ''}">${esc(elenco.FUNDAMENTOS[f.id].nome)}</span>`).join('')}
          </div>
        </div>
      </section>

      ${aguardando.length ? `
      <div class="callout callout-pend" role="status">
        <div><strong>${plural(aguardando.length, 'sessão aguardando', 'sessões aguardando')} registro nesta semana.</strong> Lance presença, PSE e PSR de cada atleta para a carga realizada refletir o treino.</div>
        <button class="btn btn-sm" id="reg-primeira">Registrar a mais antiga</button>
      </div>` : ''}

      ${estado.editor ? `
      <section class="card editor" id="painel-sessao" aria-label="Sessão selecionada">
        <div class="panel-tabs" role="tablist" aria-label="Painel da sessão">
          <button class="ptab" role="tab" id="pt-plano" aria-selected="${painel === 'plano'}">Planejamento</button>
          <button class="ptab" role="tab" id="pt-registro" aria-selected="${painel === 'registro'}" ${!sessaoAberta || stAberta === 'futuro' ? 'disabled title="O registro fica disponível quando a sessão acontecer"' : ''}>Registro do treino</button>
        </div>
        <div id="painel-corpo">${painel === 'plano' ? formPlano(sem, estado) : ''}</div>
      </section>` : ''}

      <section class="card" aria-labelledby="h-grade">
        <div class="card-head">
          <h2 id="h-grade">Sessões da semana</h2>
          <div class="legend">
            ${Object.values(TIPOS_SESSAO).map((t) => `<span><span class="dot" style="background:var(${t.cor});margin:0"></span>${t.nome}</span>`).join('')}
          </div>
        </div>
        ${grade(plano, sem, estado)}
        <div class="actions" style="margin-top:16px">
          ${proxima ? (estado.confirmaCopia
            ? `<span class="confirma">Isto substitui as sessões da semana ${proxima.n}.</span>
               <button class="btn btn-primary" id="copiar-sim">Copiar e substituir</button>
               <button class="btn" id="copiar-nao">Cancelar</button>`
            : `<button class="btn" id="copiar">Copiar para a semana ${proxima.n}</button>`) : ''}
          ${modificada ? '<button class="btn" id="restaurar">Restaurar modelo da semana</button>' : ''}
        </div>
      </section>

      ${atletasSemana(plano, sem)}`;

    /* ---- eventos ---- */
    const ir = (patch, foco) => ctx.ir('micro', Object.assign({ editor: null, confirmaCopia: false, painel: 'plano' }, patch), foco);
    const q = (s) => el.querySelector(s);

    q('#sem-ant').addEventListener('click', () => ir({ semana: idx - 1 }, '#sem-ant'));
    q('#sem-prox').addEventListener('click', () => ir({ semana: idx + 1 }, '#sem-prox'));
    const atual = q('#ir-atual');
    if (atual) atual.addEventListener('click', () => ir({ semana: plano.semanaAtual >= 0 ? plano.semanaAtual : 0 }));
    el.querySelectorAll('[data-comp]').forEach((b) => b.addEventListener('click', () => window.Farol.ir('planejamento-competicoes', { competicao: b.dataset.comp })));

    q('#micro-tipo').addEventListener('change', (e) => {
      dados.definirMicroTipo(plano.id, sem, e.target.value);
      ctx.ir('micro', { editor: null }, '#micro-tipo');
    });

    el.querySelectorAll('[data-add]').forEach((b) => b.addEventListener('click', () => {
      const [dia, turno] = b.dataset.add.split(':');
      ctx.ir('micro', { editor: { dia: Number(dia), turno, id: null }, confirmaCopia: false, painel: 'plano', focoEditor: true });
    }));
    el.querySelectorAll('[data-sessao]').forEach((b) => b.addEventListener('click', () => {
      const s = sem.sessoes.find((x) => x.id === b.dataset.sessao);
      const st = REG.estado(plano, sem, s);
      ctx.ir('micro', { editor: { dia: s.dia, turno: s.turno, id: s.id }, confirmaCopia: false, painel: st === 'aguardando' ? 'registro' : 'plano', focoEditor: true });
    }));

    const primeira = q('#reg-primeira');
    if (primeira) primeira.addEventListener('click', () => {
      const s = aguardando[0];
      ctx.ir('micro', { editor: { dia: s.dia, turno: s.turno, id: s.id }, confirmaCopia: false, painel: 'registro', focoEditor: true });
    });

    const noiteOn = q('#noite-on'); if (noiteOn) noiteOn.addEventListener('click', () => ctx.ir('micro', { noite: true }));
    const noiteOff = q('#noite-off'); if (noiteOff) noiteOff.addEventListener('click', () => ctx.ir('micro', { noite: false }));

    const copiar = q('#copiar'); if (copiar) copiar.addEventListener('click', () => ctx.ir('micro', { confirmaCopia: true }, '#copiar-sim'));
    const nao = q('#copiar-nao'); if (nao) nao.addEventListener('click', () => ctx.ir('micro', { confirmaCopia: false }, '#copiar'));
    const sim = q('#copiar-sim');
    if (sim) sim.addEventListener('click', () => {
      dados.copiarSemana(plano.id, sem, proxima);
      ir({ semana: idx + 1 });
    });
    const rest = q('#restaurar');
    if (rest) rest.addEventListener('click', () => { dados.restaurarSemana(plano.id, sem); ir({}); });

    /* ---- painel da sessão ---- */
    if (estado.editor) {
      const e = estado.editor;
      const abrirAba = (nome) => ctx.ir('micro', { painel: nome, focoEditor: true });
      q('#pt-plano').addEventListener('click', () => abrirAba('plano'));
      q('#pt-registro').addEventListener('click', () => abrirAba('registro'));

      if (painel === 'registro') {
        window.Farol.registroUI.editor(q('#painel-corpo'), {
          plano, semana: sem, sessao: sessaoAberta,
          onSalvar: (msg) => ctx.ir('micro', { aviso: msg, editor: null, painel: 'plano' }),
          onFechar: () => ir({}),
        });
      } else {
        const form = q('#form-sessao');
        const atualizaCarga = () => {
          q('#f-carga').textContent = `${num((Number(q('#f-dur').value) || 0) * (Number(q('#f-pse').value) || 0))} UA`;
        };
        q('#f-dur').addEventListener('input', atualizaCarga);
        q('#f-pse').addEventListener('input', atualizaCarga);

        form.addEventListener('submit', (ev) => {
          ev.preventDefault();
          const dur = Number(q('#f-dur').value);
          const pse = Number(q('#f-pse').value);
          const obj = q('#f-obj').value.trim();
          const erro = q('#f-erro');
          let msg = '';
          if (!(dur >= 20 && dur <= 300)) msg = 'A duração deve ficar entre 20 e 300 minutos.';
          else if (!(Number.isInteger(pse) && pse >= 1 && pse <= 10)) msg = 'O PSE alvo deve ser um número inteiro de 1 a 10.';
          else if (!obj) msg = 'Descreva o objetivo da sessão em poucas palavras.';
          if (msg) { erro.textContent = msg; erro.hidden = false; return; }
          dados.salvarSessao(plano.id, sem, { id: e.id || undefined, dia: e.dia, turno: e.turno, tipo: q('#f-tipo').value, dur, pse, obj });
          ir({}, e.id ? '[data-sessao]' : null);
        });
        q('#f-cancelar').addEventListener('click', () => ir({}));
        const presc = q('#f-prescrever');
        if (presc) presc.addEventListener('click', () => window.Farol.ir('treinos-biblioteca', { nova: { planoId: plano.id, semana: sem.idx, sessaoId: sessaoAberta.id } }));
        const rem = q('#f-remover');
        if (rem) rem.addEventListener('click', () => { dados.removerSessao(plano.id, sem, e.id); ir({}); });
      }

      if (estado.focoEditor) {
        estado.focoEditor = false;
        q('#painel-sessao').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        const primeiro = q('#painel-corpo select, #painel-corpo input');
        if (primeiro) primeiro.focus({ preventScroll: true });
      }
    }
  };
})();
