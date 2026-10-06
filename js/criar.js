/* Periodização > Nova periodização, numa tela só.
   Equipes, início e sessões por semana no topo; depois a prioridade de cada competição (A alvo, B importante, C treino)
   e, ao lado, a prévia da temporada, que se refaz a cada mudança. Fundamentos e ajustes finos são opcionais.
   As fases não são escolhidas à mão: o motor (motor.js) monta o ciclo em contagem regressiva a partir do evento A e
   refaz o futuro quando o calendário muda. */
(function () {
  const { dados, util, elenco, calendario: CAL } = window.Farol;
  const { DIA, dd, esc, plural, iso, segunda, HOJE, ms, num } = util;
  const { TURMAS } = elenco;
  const P = (window.Farol.periodo = window.Farol.periodo || {});

  const copiar = (o) => JSON.parse(JSON.stringify(o));
  const BASELINE_SUGERIDA = { 'Sub-13': 1400, 'Sub-14': 1500, 'Sub-15': 1700, 'Sub-16': 1800, 'Sub-17': 2100, 'Sub-18': 2300, 'Sub-19': 2300, 'Sub-21': 2400, Adulto: 2400, Master: 1800 };
  // Referência sugerida para as equipes marcadas: a da faixa mais velha entre elas.
  const sugerida = (ids) => Math.max(1500, ...ids.flatMap((id) => (TURMAS[id] ? TURMAS[id].faixas : [])).map((f) => BASELINE_SUGERIDA[f] || 2000));
  const categoriasDe = (ids) => [...new Set(ids.flatMap((id) => (TURMAS[id] ? TURMAS[id].categorias : [])))];
  const PRIO = {
    A: { nome: 'A · Alvo', texto: 'A competição mais importante do ciclo. Todo o treino é planejado para chegar no melhor momento nela.' },
    B: { nome: 'B · Importante', texto: 'Competição relevante, com redução leve de carga nos dias anteriores. Não muda o planejamento.' },
    C: { nome: 'C · Treino', texto: 'Competição usada como teste e treino. Sem ajuste de carga.' },
  };
  const SUGESTAO_BASE = {
    fundamentos: [
      { id: 'saque', prio: 'alta', ideia: 'Saque como arma, com zona e tipo definidos' },
      { id: 'recepcao', prio: 'alta', ideia: '' },
      { id: 'sideout', prio: 'alta', ideia: '' },
      { id: 'defesa', prio: 'media', ideia: '' },
      { id: 'comunicacao', prio: 'media', ideia: 'Sinais e papéis claros dentro da dupla' },
    ],
    ideias: ['Treinar com placar em pelo menos duas sessões por semana'],
  };

  const proximaSegunda = () => iso(segunda(HOJE) + 7 * DIA);
  const temporadaPadrao = () => { const a = new Date(HOJE).getUTCFullYear(); return `Temporada ${a}/${String((a + 1) % 100).padStart(2, '0')}`; };

  function novoRascunho() {
    const livres = dados.turmasSemPlano();
    const turma = livres[0] ? livres[0].id : '';
    return {
      turmas: turma ? [turma] : [], nome: '', temporada: temporadaPadrao(), inicio: proximaSegunda(), sessoes: 4,
      baseline: turma ? sugerida([turma]) : 2000,
      base: { objetivo: '', fundamentos: [], ideias: [] },
      prioridades: {}, novaComp: false,
    };
  }
  let w = novoRascunho();

  const cfg = () => ({ turmas: w.turmas.slice(), nome: w.nome.trim(), temporada: w.temporada.trim(), inicio: w.inicio, baseline: w.baseline, sessoesSemana: w.sessoes, prioridades: w.prioridades, base: copiar(w.base) });

  /* ---------- Peças da tela ---------- */

  const baseEfetiva = () => (w.base.fundamentos.length || w.base.ideias.length || w.base.objetivo ? w.base : copiar(SUGESTAO_BASE));

  function blocoEquipes() {
    const livres = dados.turmasSemPlano();
    if (!livres.length) return '<p class="vazio">Todas as equipes já têm periodização. <a href="#equipes-nova">Cadastre uma nova equipe</a> para criar outra.</p>';
    return `
      <fieldset class="ef-gen" style="border:0;padding:0;margin:0"><legend class="label">Equipes <small>(marque mais de uma se seguem o mesmo planejamento, treinando juntas ou não)</small></legend>
        ${livres.map((t) => `<label class="ef-chip"><input type="checkbox" name="w-eq" value="${t.id}" ${w.turmas.includes(t.id) ? 'checked' : ''}><span>${esc(t.nome)} <small class="num">· ${t.atletas.length}</small></span></label>`).join('')}
      </fieldset>`;
  }

  function blocoQuando() {
    return `
      <div class="np-linha">
        <div class="field"><label class="label" for="w-ini">Início</label><input class="input" id="w-ini" type="date" value="${esc(w.inicio)}"></div>
        <fieldset class="ef-gen" style="border:0;padding:0;margin:0"><legend class="label">Sessões por semana</legend>
          ${[3, 4, 5].map((n) => `<label class="ef-chip"><input type="radio" name="w-sess" value="${n}" ${w.sessoes === n ? 'checked' : ''}><span>${n} sessões</span></label>`).join('')}
        </fieldset>
      </div>
      <p class="hint">Começa sempre numa segunda-feira (${dd(segunda(ms(w.inicio || iso(HOJE))))} para a data escolhida).</p>
      <details class="alvo-rapido" id="w-aj"><summary>Ajustes: nome, temporada e carga de referência</summary>
        <div class="form-grid" style="margin-top:10px">
          <div class="field field-wide"><label class="label" for="w-nome">Nome</label>
            <input class="input" id="w-nome" type="text" maxlength="60" value="${esc(w.nome)}" placeholder="${esc(w.turmas.map((id) => TURMAS[id].nome).join(' + ') || 'Nome da periodização')}"></div>
          <div class="field"><label class="label" for="w-temp">Temporada</label><input class="input" id="w-temp" type="text" maxlength="40" value="${esc(w.temporada)}"></div>
          <div class="field"><label class="label" for="w-base">Carga de referência (UA/semana)</label><input class="input num" id="w-base" type="number" min="500" max="6000" step="50" value="${w.baseline}"></div>
        </div>
        <p class="hint">A carga de referência é o que o grupo faz numa semana normal (soma de duração × PSE das sessões). O app sugere um valor pela faixa; cada semana vira uma porcentagem dela.</p>
      </details>`;
  }

  // Competições que ainda não aconteceram (a partir do início), as da categoria da equipe primeiro.
  function competicoesDisponiveis() {
    const cats = categoriasDe(w.turmas);
    const ini = segunda(ms(w.inicio));
    const lista = CAL.lista().filter((c) => CAL.fimDe(c) >= ini && c.status !== 'cancelled');
    return lista.sort((a, b) => (b.categorias.some((k) => cats.includes(k)) - a.categorias.some((k) => cats.includes(k))) || a.data - b.data);
  }

  function blocoCompeticoes() {
    const lista = competicoesDisponiveis();
    const cats = categoriasDe(w.turmas);
    const previa = previaSegura();
    const avisos = previa ? [...previa.conflitos.filter((c) => c.tipo !== 'provisorio'), ...previa.janelas.map((j) => ({ severidade: 'warning', texto: j.texto })), ...previa.sugestoes.map((s) => ({ severidade: 'info', texto: s.texto }))] : [];
    return `
      <p class="hint" style="margin-top:0">Escolha a competição principal (<b>A</b>) e, se quiser, as outras (<b>B</b> importante, <b>C</b> treino). O app monta a temporada em contagem regressiva a partir do A. Sem prioridade, a competição fica fora.</p>
      ${lista.length ? `<ul class="nc-lista">${lista.map((c) => `<li class="nc-i">
          <div class="nc-m"><b>${esc(c.nome)}</b><small class="num">${dd(c.data)}${c.fim && c.fim !== c.data ? ` a ${dd(c.fim)}` : ''} · ${esc(c.local)}${c.categorias.some((k) => cats.includes(k)) ? '' : ' · outra categoria'}${c.status === 'provisional' ? ' · provisória' : ''}</small></div>
          <div class="pr-seg" role="radiogroup" aria-label="Prioridade de ${esc(c.nome)}">${['A', 'B', 'C', ''].map((k) => `<button type="button" class="pr-bt ${k ? `pr-${k}` : 'pr-x'}" role="radio" aria-checked="${(w.prioridades[c.id] || '') === k}" data-prio="${c.id}|${k}" aria-label="${k ? PRIO[k].nome : 'Sem prioridade'}">${k || '–'}</button>`).join('')}</div></li>`).join('')}</ul>`
        : '<p class="vazio">Nenhuma competição cadastrada ainda. Cadastre abaixo ou siga sem competição: a periodização fica em manutenção até você ter um evento A.</p>'}
      <details class="alvo-rapido" ${w.novaComp || !lista.length ? 'open' : ''} id="w-nc"><summary>Cadastrar uma competição agora</summary>
        <div class="alvo-rapido-f">
          <div class="field"><label class="label" for="w-rc-nome">Nome</label><input class="input" id="w-rc-nome" type="text" maxlength="80" placeholder="ex.: Campeonato Paraibano"></div>
          <div class="field"><label class="label" for="w-rc-data">Data</label><input class="input" id="w-rc-data" type="date" min="${esc(w.inicio)}"></div>
          <div class="field"><label class="label" for="w-rc-local">Local</label><input class="input" id="w-rc-local" type="text" maxlength="60" placeholder="cidade/UF"></div>
          <div class="field"><label class="label" for="w-rc-prio">Prioridade</label><select class="select" id="w-rc-prio"><option value="A">A · Alvo</option><option value="B">B · Importante</option><option value="C">C · Treino</option></select></div>
          <button class="btn" type="button" id="w-rc-ok">Cadastrar</button>
        </div></details>
      ${avisos.length ? `<ul class="pr-avisos" role="status">${avisos.map((a) => `<li class="pr-av ${a.severidade}">${esc(a.texto)}</li>`).join('')}</ul>` : ''}`;
  }

  function blocoFundamentos() {
    return `
      <details class="alvo-rapido" id="w-fd" ${w.fundOpen ? 'open' : ''}><summary>Fundamentos e objetivo (opcional)</summary>
        <div class="field" style="margin-top:10px"><label class="label" for="w-obj">Objetivo da temporada</label>
          <textarea class="input" id="w-obj" rows="2" maxlength="300" placeholder="O que esta equipe precisa ser ao fim da temporada?">${esc(w.base.objetivo)}</textarea></div>
        <div class="reg-tools" style="margin-top:14px">
          <span class="label">Fundamentos base e ideias</span>
          <button class="link-btn" type="button" id="w-sug" style="margin:0">Usar a sugestão</button>
        </div>
        <p class="hint" style="margin-top:0">Se você não escolher nada, o app começa com uma sugestão. Depois de criar, cada bloco pode ter a sua própria pauta.</p>
        <div id="w-pauta-base"></div>
      </details>`;
  }

  function previaSegura() {
    if (!w.turmas.length || !w.inicio || !(w.baseline >= 500)) return null;
    try { return dados.previaPeriodizacao(cfg()); } catch (e) { return null; }
  }

  function blocoPrevia() {
    const previa = previaSegura();
    if (!previa || !previa.semanas.length) return '<p class="vazio">Marque a equipe e a data de início para ver a prévia.</p>';
    const sem = previa.semanas;
    const blocos = [];
    sem.forEach((q) => { const u = blocos[blocos.length - 1]; if (u && u.bloco === q.bloco && u.ciclo === q.ciclo) u.n++; else blocos.push({ bloco: q.bloco, ciclo: q.ciclo, n: 1 }); });
    const picos = sem.flatMap((q) => q.eventos.filter((e) => e.prioridade === 'A'));
    return `
      <div class="stack" style="height:22px" role="img" aria-label="Blocos: ${blocos.map((b) => `${dados.FASES[b.bloco].nome} ${b.n}`).join(', ')}">
        ${blocos.map((b) => `<i style="width:${(b.n / sem.length) * 100}%;background:var(${dados.FASES[b.bloco].cor})" title="${dados.FASES[b.bloco].nome}, ${b.n} sem"></i>`).join('')}
      </div>
      <div class="stack-legend num">${blocos.map((b) => `<span><span class="dot" style="background:var(${dados.FASES[b.bloco].cor})"></span>${dados.FASES[b.bloco].nome} ${b.n}</span>`).join('')}</div>
      <dl class="kv" style="margin-top:12px">
        <div><dt>Período</dt><dd class="num">${dd(sem[0].inicio)} a ${dd(sem[sem.length - 1].inicio + 6 * DIA)}</dd></div>
        <div><dt>Tamanho</dt><dd class="num">${sem.length} <small>semanas</small></dd></div>
        <div><dt>Pico</dt><dd class="num">${picos.length ? esc((CAL.COMPETICOES[picos[0].id] || {}).nome || 'evento A') : 'sem evento A'}</dd></div>
      </dl>
      <details class="alvo-rapido"><summary>Ver semana a semana</summary>
        <div class="table-scroll"><table class="mesos pr-tab"><thead><tr><th>Semana</th><th>Bloco</th><th>Tipo</th><th class="r">Meta</th><th>Eventos</th></tr></thead><tbody>
          ${sem.map((s, i) => `<tr><td class="num">${i + 1} · ${dd(s.inicio)}</td><td><span class="dot" style="background:var(${dados.FASES[s.bloco].cor})"></span>${dados.FASES[s.bloco].nome}</td>
            <td>${esc(dados.TIPOS_MICRO[s.tipoSemana].nome)}</td><td class="r num">${num(w.baseline * s.fator)} UA <small>(${Math.round(s.fator * 100)}%)</small></td>
            <td>${s.eventos.map((e) => `<span class="pr pr-${e.prioridade}" title="${esc((CAL.COMPETICOES[e.id] || {}).nome || '')}">${e.prioridade}</span>`).join(' ')}</td></tr>`).join('')}
        </tbody></table></div></details>
      <p class="hint">As sessões de cada semana seguem a ondulatória: dia pesado, de volume e de potência. Você edita qualquer semana depois; semanas editadas não são refeitas. Se o calendário mudar, o app propõe o ajuste e você confirma.</p>`;
  }

  function validar() {
    if (!w.turmas.length) return 'Marque ao menos uma equipe.';
    if (!w.inicio) return 'Informe a data de início.';
    if (!(w.baseline >= 500 && w.baseline <= 6000)) return 'A carga de referência deve ficar entre 500 e 6.000 UA.';
    return '';
  }

  /* ---------- Tela ---------- */

  P.criar = function (el, ctx) {
    // A equipe pode vir pedida (cartão do Início); senão, garante uma equipe que ainda esteja sem periodização.
    const livresIni = dados.turmasSemPlano();
    const pedida = ctx.estado.turmaId && livresIni.find((t) => t.id === ctx.estado.turmaId);
    if (pedida) { w.turmas = [pedida.id]; w.baseline = sugerida(w.turmas); ctx.estado.turmaId = null; }
    else {
      w.turmas = w.turmas.filter((id) => livresIni.some((t) => t.id === id));
      if (!w.turmas.length && livresIni[0]) { w.turmas = [livresIni[0].id]; w.baseline = sugerida(w.turmas); }
    }

    function desenhar(foco) {
      const semTurma = !dados.turmasSemPlano().length;
      el.innerHTML = `
        <div class="np">
          <div class="np-col">
            <section class="card" aria-labelledby="h-np1">
              <div class="card-head"><h2 id="h-np1">Quem e quando</h2><button class="link-btn" id="w-cancelar" style="margin:0">Cancelar</button></div>
              ${blocoEquipes()}
              ${semTurma ? '' : blocoQuando()}
            </section>
            ${semTurma ? '' : `<section class="card" aria-labelledby="h-np2"><div class="card-head"><h2 id="h-np2">Competições</h2></div>${blocoCompeticoes()}</section>
            <section class="card" aria-labelledby="h-np3"><div class="card-head"><h2 id="h-np3">Fundamentos</h2></div>${blocoFundamentos()}</section>`}
          </div>
          <div class="np-col">
            <section class="card np-previa" aria-labelledby="h-np4"><div class="card-head"><h2 id="h-np4">Prévia da temporada</h2><span class="label">muda enquanto você edita</span></div>${semTurma ? '<p class="vazio">Cadastre uma equipe para ver a prévia.</p>' : blocoPrevia()}</section>
            <p class="form-erro" id="w-erro" role="alert" hidden></p>
            <button class="btn btn-primary btn-grande" id="w-criar" ${semTurma ? 'disabled' : ''}>Criar periodização</button>
          </div>
        </div>`;
      ligar();
      if (foco) { const f = el.querySelector(foco); if (f) f.focus({ preventScroll: true }); }
    }

    function erro(msg) { const e = el.querySelector('#w-erro'); e.textContent = msg; e.hidden = !msg; }

    function ligar() {
      const $ = (s) => el.querySelector(s);
      $('#w-cancelar').addEventListener('click', () => (dados.planos.length ? ctx.ir('semana', {}, '#tab-semana') : window.Farol.ir('inicio')));
      if (!$('#w-ini')) return;

      el.querySelectorAll('input[name="w-eq"]').forEach((i) => i.addEventListener('change', () => {
        w.turmas = [...el.querySelectorAll('input[name="w-eq"]:checked')].map((x) => x.value);
        if (w.turmas.length) w.baseline = sugerida(w.turmas);
        desenhar(`input[name="w-eq"][value="${i.value}"]`);
      }));
      $('#w-nome').addEventListener('input', (e) => { w.nome = e.target.value; });
      $('#w-temp').addEventListener('input', (e) => { w.temporada = e.target.value; });
      $('#w-ini').addEventListener('change', (e) => { w.inicio = e.target.value; desenhar('#w-ini'); });
      $('#w-base').addEventListener('change', (e) => { w.baseline = Number(e.target.value); desenhar('#w-base'); });
      el.querySelectorAll('input[name="w-sess"]').forEach((i) => i.addEventListener('change', () => { w.sessoes = Number(i.value); desenhar(`input[name="w-sess"][value="${i.value}"]`); }));

      $('#w-obj').addEventListener('input', (e) => { w.base.objetivo = e.target.value; });
      $('#w-fd').addEventListener('toggle', (e) => { w.fundOpen = e.target.open; });
      window.Farol.pauta.editor($('#w-pauta-base'), w.base, { prefixo: 'wbase' });
      $('#w-sug').addEventListener('click', () => {
        w.base.fundamentos = copiar(SUGESTAO_BASE.fundamentos);
        w.base.ideias = copiar(SUGESTAO_BASE.ideias);
        w.fundOpen = true;
        desenhar('#w-obj');
      });

      el.querySelectorAll('[data-prio]').forEach((b) => b.addEventListener('click', () => {
        const [id, k] = b.dataset.prio.split('|');
        if (k) w.prioridades[id] = k; else delete w.prioridades[id];
        desenhar(`[data-prio="${b.dataset.prio}"]`);
      }));
      $('#w-nc').addEventListener('toggle', (e) => { w.novaComp = e.target.open; });
      $('#w-rc-ok').addEventListener('click', () => {
        const nome = $('#w-rc-nome').value.trim(), data = $('#w-rc-data').value, local = $('#w-rc-local').value.trim(), prio = $('#w-rc-prio').value;
        if (nome.length < 3) return erro('Dê um nome à competição.');
        if (!data) return erro('Informe a data da competição.');
        if (ms(data) < segunda(ms(w.inicio))) return erro('A competição precisa ser depois do início da periodização.');
        const id = CAL.criar({ nome, data: ms(data), fim: ms(data), local: local || 'A definir', nivel: 'Estadual', status: 'confirmed', categorias: categoriasDe(w.turmas) });
        w.prioridades[id] = prio;
        erro('');
        desenhar('#w-rc-nome');
      });

      $('#w-criar').addEventListener('click', () => {
        const msg = validar();
        if (msg) return erro(msg);
        const id = dados.criarPeriodizacao({ ...cfg(), base: copiar(baseEfetiva()) });
        w = novoRascunho();
        window.Farol.compartilhado.planoId = id;
        ctx.ir('semana', { ciclo: null, mesoId: null, semana: null, sel: null, turmaId: null, editor: null, aviso: 'Periodização criada. Confira a semana, o bloco e o calendário nas abas.' });
      });
    }

    desenhar();
  };
})();
