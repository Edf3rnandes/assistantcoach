/* Periodização > Nova periodização
   Cria a temporada em quatro passos: quem e quando, fundamentos e ideias, calendário com a prioridade de cada competição
   (A alvo, B importante, C treino) e uma prévia da estrutura. As fases não são mais escolhidas à mão: o motor
   (motor.js) monta o ciclo em contagem regressiva a partir do evento A e refaz o futuro quando o calendário muda. */
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
  const PASSOS = ['Quem e quando', 'Fundamentos e ideias', 'Calendário', 'Revisão'];
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
      passo: 1, turmas: turma ? [turma] : [], nome: '', temporada: temporadaPadrao(), inicio: proximaSegunda(), sessoes: 4,
      baseline: turma ? sugerida([turma]) : 2000,
      base: { objetivo: '', fundamentos: [], ideias: [] },
      prioridades: {}, novaComp: false,
    };
  }
  let w = novoRascunho();

  const cfg = () => ({ turmas: w.turmas.slice(), nome: w.nome.trim(), temporada: w.temporada.trim(), inicio: w.inicio, baseline: w.baseline, sessoesSemana: w.sessoes, prioridades: w.prioridades, base: copiar(w.base) });

  /* ---------- Passos ---------- */

  function passo1() {
    const livres = dados.turmasSemPlano();
    if (!livres.length) return '<p class="vazio">Todas as equipes já têm periodização. <a href="#equipes-nova">Cadastre uma nova equipe</a> para criar outra.</p>';
    const sel = w.turmas.map((id) => TURMAS[id]).filter(Boolean);
    return `
      <div class="form-grid">
        <fieldset class="field field-wide ef-gen" style="border:0;padding:0;margin:0"><legend class="label">Para quais equipes <small>(marque mais de uma se seguem o mesmo planejamento, treinando juntas ou não)</small></legend>
          ${livres.map((t) => `<label class="ef-chip"><input type="checkbox" name="w-eq" value="${t.id}" ${w.turmas.includes(t.id) ? 'checked' : ''}><span>${esc(t.nome)} <small class="num">· ${t.atletas.length}</small></span></label>`).join('')}
        </fieldset>
        <div class="field field-wide"><label class="label" for="w-nome">Nome</label>
          <input class="input" id="w-nome" type="text" maxlength="60" value="${esc(w.nome)}" placeholder="${esc(sel.map((t) => t.nome).join(' + ') || 'Nome da periodização')}"></div>
        <div class="field"><label class="label" for="w-temp">Temporada</label><input class="input" id="w-temp" type="text" maxlength="40" value="${esc(w.temporada)}"></div>
        <div class="field"><label class="label" for="w-ini">Início</label><input class="input" id="w-ini" type="date" value="${esc(w.inicio)}"></div>
        <fieldset class="field field-wide ef-gen" style="border:0;padding:0;margin:0"><legend class="label">Sessões por semana</legend>
          ${[3, 4, 5].map((n) => `<label class="ef-chip"><input type="radio" name="w-sess" value="${n}" ${w.sessoes === n ? 'checked' : ''}><span>${n} sessões</span></label>`).join('')}
        </fieldset>
        <div class="field"><label class="label" for="w-base">Carga semanal de referência (UA)</label><input class="input num" id="w-base" type="number" min="500" max="6000" step="50" value="${w.baseline}"></div>
      </div>
      <p class="hint">A periodização começa sempre numa segunda-feira (${dd(segunda(ms(w.inicio || iso(HOJE))))} para a data escolhida). A carga de referência é o que o grupo faz numa semana normal (soma de duração × PSE das sessões); cada semana é uma porcentagem dela. Sugestão para ${esc([...new Set(sel.flatMap((t) => t.faixas))].join(' e ') || 'a equipe')}: ${num(sugerida(w.turmas))} UA. Depois de algumas semanas registradas, o sistema calcula a referência pelo que foi feito de verdade.</p>`;
  }

  function passo2() {
    return `
      <div class="field"><label class="label" for="w-obj">Objetivo da temporada</label>
        <textarea class="input" id="w-obj" rows="3" maxlength="300" placeholder="O que esta equipe precisa ser ao fim da temporada?">${esc(w.base.objetivo)}</textarea></div>
      <div class="reg-tools" style="margin-top:18px">
        <span class="label">Fundamentos base e ideias</span>
        <button class="link-btn" type="button" id="w-sug" style="margin:0">Começar com uma sugestão</button>
      </div>
      <p class="hint" style="margin-top:0">Esses itens valem para toda a temporada. Depois de criar, cada bloco pode ter a sua própria pauta.</p>
      <div id="w-pauta-base"></div>`;
  }

  // Competições que ainda não aconteceram (a partir do início), as da categoria da equipe primeiro.
  function competicoesDisponiveis() {
    const cats = categoriasDe(w.turmas);
    const ini = segunda(ms(w.inicio));
    const lista = CAL.lista().filter((c) => CAL.fimDe(c) >= ini && c.status !== 'cancelled');
    return lista.sort((a, b) => (b.categorias.some((k) => cats.includes(k)) - a.categorias.some((k) => cats.includes(k))) || a.data - b.data);
  }

  function passo3() {
    const lista = competicoesDisponiveis();
    const cats = categoriasDe(w.turmas);
    const previa = dados.previaPeriodizacao(cfg());
    const avisos = [...previa.conflitos.filter((c) => c.tipo !== 'provisorio'), ...previa.janelas.map((j) => ({ severidade: 'warning', texto: j.texto })), ...previa.sugestoes.map((s) => ({ severidade: 'info', texto: s.texto }))];
    return `
      <p class="hint" style="margin-top:0">Escolha a prioridade de cada competição. O sistema monta o ciclo em contagem regressiva a partir do evento <b>A</b>. Competições sem prioridade ficam fora da periodização.</p>
      <ul class="pr-legenda">${Object.entries(PRIO).map(([k, v]) => `<li><b class="pr pr-${k}">${k}</b><span><b>${esc(v.nome.split(' · ')[1])}</b>: ${esc(v.texto)}</span></li>`).join('')}</ul>
      ${lista.length ? `<div class="table-scroll"><table class="mesos pr-tab"><thead><tr><th>Competição</th><th>Data</th><th>Prioridade</th></tr></thead><tbody>
        ${lista.map((c) => `<tr>
          <td><b>${esc(c.nome)}</b><small class="sub-linha">${esc(c.local)}${c.categorias.some((k) => cats.includes(k)) ? '' : ' · outra categoria'}${c.status === 'provisional' ? ' · provisória' : ''}</small></td>
          <td class="num">${dd(c.data)}${c.fim && c.fim !== c.data ? ` a ${dd(c.fim)}` : ''}</td>
          <td><div class="pr-seg" role="radiogroup" aria-label="Prioridade de ${esc(c.nome)}">${['A', 'B', 'C', ''].map((k) => `<button type="button" class="pr-bt ${k ? `pr-${k}` : 'pr-x'}" role="radio" aria-checked="${(w.prioridades[c.id] || '') === k}" data-prio="${c.id}|${k}" title="${k ? esc(PRIO[k].nome) : 'Fora da periodização'}">${k || '—'}</button>`).join('')}</div></td></tr>`).join('')}
      </tbody></table></div>` : '<p class="vazio">Nenhuma competição cadastrada ainda. Cadastre abaixo ou siga sem competição: a periodização fica em manutenção até você ter um evento A.</p>'}
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

  function resumoEstrutura(previa) {
    const sem = previa.semanas;
    const blocos = [];
    sem.forEach((s) => { const u = blocos[blocos.length - 1]; if (u && u.bloco === s.bloco && u.ciclo === s.ciclo) u.n++; else blocos.push({ bloco: s.bloco, ciclo: s.ciclo, n: 1 }); });
    return { sem, blocos };
  }

  function passo4() {
    const nomes = w.turmas.map((id) => TURMAS[id].nome).join(' + ');
    const previa = dados.previaPeriodizacao(cfg());
    const { sem, blocos } = resumoEstrutura(previa);
    const ciclos = [...new Set(sem.map((s) => s.ciclo))];
    return `
      <dl class="kv">
        <div><dt>Equipe${w.turmas.length > 1 ? 's' : ''}</dt><dd>${esc(w.nome || nomes)}</dd></div>
        <div><dt>Temporada</dt><dd>${esc(w.temporada)}</dd></div>
        <div><dt>Período</dt><dd class="num">${dd(sem[0].inicio)} a ${dd(sem[sem.length - 1].inicio + 6 * DIA)}</dd></div>
        <div><dt>Tamanho</dt><dd class="num">${sem.length} <small>semanas · ${plural(ciclos.length, 'ciclo', 'ciclos')}</small></dd></div>
        <div><dt>Referência</dt><dd class="num">${num(w.baseline)} <small>UA/sem · ${w.sessoes} sessões</small></dd></div>
      </dl>
      <div class="detail-block">
        <span class="label">Blocos</span>
        <div class="stack" style="height:24px" role="img" aria-label="Blocos: ${blocos.map((b) => `${dados.FASES[b.bloco].nome} ${b.n}`).join(', ')}">
          ${blocos.map((b) => `<i style="width:${(b.n / sem.length) * 100}%;background:var(${dados.FASES[b.bloco].cor})" title="${dados.FASES[b.bloco].nome}, ${b.n} sem"></i>`).join('')}
        </div>
        <div class="stack-legend num">${blocos.map((b) => `<span><span class="dot" style="background:var(${dados.FASES[b.bloco].cor})"></span>${dados.FASES[b.bloco].nome} ${b.n}</span>`).join('')}</div>
      </div>
      <div class="table-scroll"><table class="mesos pr-tab"><thead><tr><th>Semana</th><th>Bloco</th><th>Tipo</th><th class="r">Meta</th><th>Eventos</th></tr></thead><tbody>
        ${sem.map((s, i) => `<tr><td class="num">${i + 1} · ${dd(s.inicio)}</td><td><span class="dot" style="background:var(${dados.FASES[s.bloco].cor})"></span>${dados.FASES[s.bloco].nome}</td>
          <td>${esc(dados.TIPOS_MICRO[s.tipoSemana].nome)}</td><td class="r num">${num(w.baseline * s.fator)} UA <small>(${Math.round(s.fator * 100)}%)</small></td>
          <td>${s.eventos.map((e) => `<span class="pr pr-${e.prioridade}" title="${esc((CAL.COMPETICOES[e.id] || {}).nome || '')}">${e.prioridade}</span>`).join(' ')}</td></tr>`).join('')}
      </tbody></table></div>
      ${previa.conflitos.length || previa.sugestoes.length ? `<ul class="pr-avisos">${[...previa.conflitos, ...previa.sugestoes].map((a) => `<li class="pr-av ${a.severidade || 'info'}">${esc(a.texto)}</li>`).join('')}</ul>` : ''}
      <div class="detail-block">
        <span class="label">Fundamentos base</span>
        ${window.Farol.pauta.leitura(w.base, 'Nenhum fundamento base.')}
        ${w.base.objetivo ? `<p><b>Objetivo:</b> ${esc(w.base.objetivo)}</p>` : ''}
      </div>
      <p class="hint">As sessões de cada semana seguem a ondulatória: dia pesado, de volume e de potência, com o dia principal conforme o bloco. Edite qualquer semana na escala Microciclo; semanas editadas não são refeitas. Se o calendário mudar, o sistema mostra o que muda antes de você confirmar.</p>`;
  }

  /* ---------- Validação ---------- */

  function validar(passo) {
    if (passo === 1) {
      if (!w.turmas.length) return 'Marque ao menos uma equipe.';
      if (!w.temporada.trim()) return 'Dê um nome à temporada.';
      if (!w.inicio) return 'Informe a data de início.';
      if (!(w.baseline >= 500 && w.baseline <= 6000)) return 'A carga de referência deve ficar entre 500 e 6.000 UA.';
    }
    if (passo === 2 && !w.base.fundamentos.length && !w.base.ideias.length) return 'Escolha ao menos um fundamento base ou escreva uma ideia para a temporada.';
    return '';
  }

  /* ---------- Tela ---------- */

  P.criar = function (el, ctx) {
    // A turma pode vir pedida (tela da equipe); senão, garante uma equipe que ainda esteja sem periodização.
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
        <section class="card" aria-labelledby="h-wiz">
          <div class="card-head"><h2 id="h-wiz">Nova periodização</h2>
            <button class="link-btn" id="w-cancelar" style="margin:0">Cancelar</button></div>
          <ol class="passos" aria-label="Etapas">
            ${PASSOS.map((n, i) => `<li class="${i + 1 === w.passo ? 'atual' : i + 1 < w.passo ? 'feito' : ''}" ${i + 1 === w.passo ? 'aria-current="step"' : ''}><span class="passo-n num">${i + 1}</span><span class="passo-t">${n}</span></li>`).join('')}
          </ol>
          <div id="w-corpo">${[passo1, passo2, passo3, passo4][w.passo - 1]()}</div>
          <p class="form-erro" id="w-erro" role="alert" hidden></p>
          <div class="actions" style="margin-top:18px">
            ${w.passo > 1 ? '<button class="btn" id="w-voltar">Voltar</button>' : ''}
            ${w.passo < 4
              ? `<button class="btn btn-primary" id="w-seguir" ${semTurma ? 'disabled' : ''}>Continuar</button>`
              : '<button class="btn btn-primary" id="w-criar">Criar periodização</button>'}
          </div>
        </section>`;
      ligar();
      if (foco) { const f = el.querySelector(foco); if (f) f.focus({ preventScroll: true }); }
    }

    function erro(msg) { const e = el.querySelector('#w-erro'); e.textContent = msg; e.hidden = !msg; }

    function ligar() {
      const $ = (s) => el.querySelector(s);
      $('#w-cancelar').addEventListener('click', () => (dados.planos.length ? ctx.ir('macro', {}, '#tab-macro') : window.Farol.ir('inicio')));

      if (w.passo === 1 && $('#w-nome')) {
        el.querySelectorAll('input[name="w-eq"]').forEach((i) => i.addEventListener('change', () => {
          w.turmas = [...el.querySelectorAll('input[name="w-eq"]:checked')].map((x) => x.value);
          if (w.turmas.length) w.baseline = sugerida(w.turmas);
          desenhar(`input[name="w-eq"][value="${i.value}"]`);
        }));
        $('#w-nome').addEventListener('input', (e) => { w.nome = e.target.value; });
        $('#w-temp').addEventListener('input', (e) => { w.temporada = e.target.value; });
        $('#w-ini').addEventListener('change', (e) => { w.inicio = e.target.value; desenhar('#w-ini'); });
        $('#w-base').addEventListener('input', (e) => { w.baseline = Number(e.target.value); });
        el.querySelectorAll('input[name="w-sess"]').forEach((i) => i.addEventListener('change', () => { w.sessoes = Number(i.value); }));
      }

      if (w.passo === 2) {
        $('#w-obj').addEventListener('input', (e) => { w.base.objetivo = e.target.value; });
        window.Farol.pauta.editor($('#w-pauta-base'), w.base, { prefixo: 'wbase' });
        $('#w-sug').addEventListener('click', () => {
          w.base.fundamentos = copiar(SUGESTAO_BASE.fundamentos);
          w.base.ideias = copiar(SUGESTAO_BASE.ideias);
          desenhar('#w-obj');
        });
      }

      if (w.passo === 3) {
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
      }

      const voltar = $('#w-voltar');
      if (voltar) voltar.addEventListener('click', () => { w.passo--; desenhar('#w-corpo'); });
      const seguir = $('#w-seguir');
      if (seguir) seguir.addEventListener('click', () => {
        const msg = validar(w.passo);
        if (msg) return erro(msg);
        w.passo++;
        desenhar();
        el.scrollIntoView({ block: 'start' });
      });
      const criar = $('#w-criar');
      if (criar) criar.addEventListener('click', () => {
        for (let p = 1; p <= 2; p++) { const msg = validar(p); if (msg) return erro(msg); }
        const id = dados.criarPeriodizacao(cfg());
        w = novoRascunho();
        window.Farol.compartilhado.planoId = id;
        ctx.ir('macro', { ciclo: null, mesoId: null, semana: null, editor: null, aviso: 'Periodização criada. Confira o calendário e ajuste as semanas na escala Microciclo.' });
      });
    }

    desenhar();
  };
})();
