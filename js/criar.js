/* Periodização > Novo plano
   Cria uma temporada do zero em quatro passos: quem e quando, fundamentos base e ideias,
   ciclos (com a competição alvo, as fases e a pauta de cada fase) e revisão. */
(function () {
  const { dados, util, elenco, calendario: CAL } = window.Farol;
  const { DIA, dd, esc, plural, iso, segunda, HOJE, ms } = util;
  const { TURMAS, PAUTA_PADRAO, FUNDAMENTOS } = elenco;
  const P = (window.Farol.periodo = window.Farol.periodo || {});

  const copiar = (o) => JSON.parse(JSON.stringify(o));
  const PICO_SUGERIDO = { 'Sub-16': 2500, 'Sub-18': 3200, 'Sub-19': 2700, Adulto: 3600 };
  const PASSOS = ['Quem e quando', 'Fundamentos e ideias', 'Ciclos e fases', 'Revisão'];
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

  function novoCiclo(i) {
    return {
      nome: `Ciclo ${i + 1}`, alvo: '',
      sem: { base: 5, especifico: 5, polimento: 2, competicao: 3, transicao: 2 },
      pautas: copiar(PAUTA_PADRAO),
    };
  }

  function novoRascunho() {
    const livres = dados.turmasSemPlano();
    const turma = livres[0] ? livres[0].id : '';
    const seg = iso(segunda(HOJE) + 7 * DIA);
    return {
      passo: 1, turma, nome: '', temporada: 'Temporada 2026/27', inicio: seg,
      pico: turma ? PICO_SUGERIDO[TURMAS[turma].faixa] || 3000 : 3000,
      base: { objetivo: '', fundamentos: [], ideias: [] },
      ciclos: [novoCiclo(0)],
    };
  }

  let w = novoRascunho();
  const fasesDe = (c) => dados.ORDEM_FASES.filter((t) => c.sem[t] > 0).map((t) => [t, c.sem[t]]);
  const crono = () => dados.cronograma(w.inicio, w.ciclos.map((c) => ({ fases: fasesDe(c) })));
  const totalSem = (c) => dados.ORDEM_FASES.reduce((a, t) => a + c.sem[t], 0);

  /* ---------- Passos ---------- */

  function passo1() {
    const livres = dados.turmasSemPlano();
    if (!livres.length) {
      return '<p class="vazio">Todas as turmas já têm plano. Cadastre uma nova turma no sistema para criar outro plano.</p>';
    }
    const turma = TURMAS[w.turma];
    return `
      <div class="form-grid">
        <div class="field field-wide"><label class="label" for="w-turma">Para quem é o plano</label>
          <select class="select" id="w-turma" style="min-width:0">${livres.map((t) => `<option value="${t.id}" ${t.id === w.turma ? 'selected' : ''}>${esc(t.nome)} · ${t.atletas.length} atletas</option>`).join('')}</select></div>
        <div class="field field-wide"><label class="label" for="w-nome">Nome do plano</label>
          <input class="input" id="w-nome" type="text" maxlength="60" value="${esc(w.nome)}" placeholder="${esc(turma.nome)}"></div>
        <div class="field"><label class="label" for="w-temp">Temporada</label><input class="input" id="w-temp" type="text" maxlength="40" value="${esc(w.temporada)}"></div>
        <div class="field"><label class="label" for="w-ini">Início</label><input class="input" id="w-ini" type="date" value="${esc(w.inicio)}"></div>
        <div class="field"><label class="label" for="w-pico">Carga semanal máxima (UA)</label><input class="input num" id="w-pico" type="number" min="1000" max="6000" step="100" value="${w.pico}"></div>
      </div>
      <p class="hint">O plano começa sempre numa segunda-feira (${dd(segunda(ms(w.inicio || iso(HOJE))))} para a data escolhida). A carga semanal máxima é o teto que o grupo suporta: cada fase usa uma fração dela. Sugestão para ${esc(turma.faixa)}: ${(PICO_SUGERIDO[turma.faixa] || 3000).toLocaleString('pt-BR')} UA.</p>`;
  }

  function passo2() {
    return `
      <div class="field"><label class="label" for="w-obj">Objetivo da temporada</label>
        <textarea class="input" id="w-obj" rows="3" maxlength="300" placeholder="O que esta equipe precisa ser ao fim da temporada?">${esc(w.base.objetivo)}</textarea></div>
      <div class="reg-tools" style="margin-top:18px">
        <span class="label">Fundamentos base e ideias</span>
        <button class="link-btn" type="button" id="w-sug" style="margin:0">Começar com uma sugestão</button>
      </div>
      <p class="hint" style="margin-top:0">Esses itens valem para toda a temporada. Na etapa seguinte, cada fase pode ter a sua própria pauta.</p>
      <div id="w-pauta-base"></div>`;
  }

  function opcoesAlvo(c, inicioMs) {
    const cats = TURMAS[w.turma].categorias;
    const todas = CAL.lista().filter((q) => q.data >= inicioMs);
    const da = todas.filter((q) => q.categorias.some((k) => cats.includes(k)));
    const outras = todas.filter((q) => !da.includes(q));
    const op = (q) => `<option value="${q.id}" ${q.id === c.alvo ? 'selected' : ''}>${dd(q.data)}/${String(new Date(q.data).getUTCFullYear()).slice(2)} · ${esc(q.nome)} (${esc(q.local)})</option>`;
    return `<option value="">Escolha a competição alvo…</option>
      ${da.length ? `<optgroup label="Da categoria da turma">${da.map(op).join('')}</optgroup>` : ''}
      ${outras.length ? `<optgroup label="Outras competições">${outras.map(op).join('')}</optgroup>` : ''}`;
  }

  function avisoAlvo(c, ini) {
    if (!c.alvo) return '';
    const alvo = CAL.COMPETICOES[c.alvo];
    let t = ini.inicio;
    let faseDoAlvo = null;
    for (const [tipo, qtd] of fasesDe(c)) {
      const fimFase = t + qtd * 7 * DIA;
      if (alvo.data >= t && alvo.data < fimFase) faseDoAlvo = tipo;
      t = fimFase;
    }
    if (!faseDoAlvo) return `<p class="alerta">A competição alvo (${dd(alvo.data)}) está fora deste ciclo, que vai de ${dd(ini.inicio)} a ${dd(ini.fim)}. Use “Distribuir fases até o alvo” ou ajuste as semanas.</p>`;
    if (faseDoAlvo !== 'competicao') return `<p class="alerta">A competição alvo cai na fase ${dados.FASES[faseDoAlvo].nome}. O ideal é que caia na fase Competição.</p>`;
    return '';
  }

  function passo3() {
    const cr = crono();
    return `
      <div class="ciclos-ed">
        ${w.ciclos.map((c, i) => {
          const ini = cr[i];
          return `
          <section class="card ciclo-ed" data-c="${i}">
            <div class="card-head">
              <div class="field" style="flex:1 1 200px"><label class="label" for="w-cn-${i}">Nome do ciclo</label><input class="input" id="w-cn-${i}" type="text" maxlength="40" value="${esc(c.nome)}"></div>
              <span class="label num">${dd(ini.inicio)} a ${dd(ini.fim)} · ${plural(ini.semanas, 'semana', 'semanas')}</span>
            </div>
            <div class="add-linha" style="grid-template-columns:minmax(0,1fr) auto">
              <div class="field"><label class="label" for="w-alvo-${i}">Competição alvo</label><select class="select" id="w-alvo-${i}" style="min-width:0">${opcoesAlvo(c, ini.inicio)}</select></div>
              <button class="btn" type="button" data-dist="${i}">Distribuir fases até o alvo</button>
            </div>
            ${avisoAlvo(c, ini)}
            <div class="table-scroll">
              <table class="mesos fases-ed">
                <thead><tr><th>Fase</th><th class="r">Semanas</th><th>Período</th></tr></thead>
                <tbody>
                  ${(() => { let t = ini.inicio; return dados.ORDEM_FASES.map((tipo) => {
                    const f = dados.FASES[tipo];
                    const q = c.sem[tipo];
                    const linha = `<tr class="${q ? '' : 'fase-off'}">
                      <td><span class="dot" style="background:var(${f.cor})"></span>${f.nome}</td>
                      <td class="r"><span class="stepper"><button type="button" class="step" data-w-step="${i}:${tipo}:-1" aria-label="Uma semana a menos em ${f.nome}" ${q <= 0 ? 'disabled' : ''}>−</button><span class="num">${q}</span><button type="button" class="step" data-w-step="${i}:${tipo}:1" aria-label="Uma semana a mais em ${f.nome}" ${q >= 12 ? 'disabled' : ''}>+</button></span></td>
                      <td class="num">${q ? `${dd(t)} a ${dd(t + q * 7 * DIA - DIA)}` : 'não usada'}</td></tr>`;
                    t += q * 7 * DIA;
                    return linha;
                  }).join(''); })()}
                </tbody>
              </table>
            </div>
            <div class="detail-block">
              <span class="label">Pauta de cada fase</span>
              ${dados.ORDEM_FASES.filter((t) => c.sem[t] > 0).map((tipo) => `
                <details class="fase-pauta" data-ci="${i}" data-tipo="${tipo}">
                  <summary><span class="dot" style="background:var(${dados.FASES[tipo].cor})"></span>${dados.FASES[tipo].nome} <small class="cont">· ${plural(c.pautas[tipo].fundamentos.length, 'fundamento', 'fundamentos')}</small></summary>
                  <div class="pauta-mount"></div>
                </details>`).join('')}
            </div>
            ${w.ciclos.length > 1 ? `<div class="actions" style="margin-top:12px"><button class="link-btn" type="button" data-rem-ciclo="${i}" style="margin:0">Remover este ciclo</button></div>` : ''}
          </section>`;
        }).join('')}
        <div class="actions"><button class="btn" type="button" id="w-add-ciclo">Adicionar ciclo</button>
          <span class="hint" style="margin:0">Não achou a competição? <button class="link-btn" type="button" id="w-ir-comp" style="margin:0">Cadastre em Competições</button> e volte: o rascunho fica salvo.</span></div>
      </div>`;
  }

  function passo4() {
    const cr = crono();
    const turma = TURMAS[w.turma];
    const nSem = cr.reduce((a, c) => a + c.semanas, 0);
    return `
      <dl class="kv">
        <div><dt>Plano</dt><dd>${esc(w.nome || turma.nome)}</dd></div>
        <div><dt>Temporada</dt><dd>${esc(w.temporada)}</dd></div>
        <div><dt>Período</dt><dd class="num">${dd(cr[0].inicio)} a ${dd(cr[cr.length - 1].fim)}</dd></div>
        <div><dt>Tamanho</dt><dd class="num">${nSem} <small>semanas · ${plural(w.ciclos.length, 'ciclo', 'ciclos')}</small></dd></div>
      </dl>
      ${w.ciclos.map((c, i) => {
        const alvo = CAL.COMPETICOES[c.alvo];
        return `
        <div class="detail-block">
          <span class="label">${esc(c.nome)} · ${dd(cr[i].inicio)} a ${dd(cr[i].fim)} · alvo ${esc(alvo.nome)}, ${dd(alvo.data)}</span>
          <div class="stack" style="height:22px" role="img" aria-label="Fases do ciclo">
            ${fasesDe(c).map(([t, q]) => `<i style="width:${(q / totalSem(c)) * 100}%;background:var(${dados.FASES[t].cor})" title="${dados.FASES[t].nome}, ${q} sem"></i>`).join('')}
          </div>
          <div class="stack-legend num">${fasesDe(c).map(([t, q]) => `<span><span class="dot" style="background:var(${dados.FASES[t].cor})"></span>${dados.FASES[t].nome} ${q}</span>`).join('')}</div>
        </div>`;
      }).join('')}
      <div class="detail-block">
        <span class="label">Fundamentos base</span>
        ${window.Farol.pauta.leitura(w.base, 'Nenhum fundamento base.')}
        ${w.base.objetivo ? `<p><b>Objetivo:</b> ${esc(w.base.objetivo)}</p>` : ''}
      </div>
      <p class="hint">As semanas são geradas com sessões-modelo para cada tipo de microciclo. Depois de criar, edite cada semana na escala Microciclo.</p>`;
  }

  /* ---------- Validação ---------- */

  function validar(passo) {
    if (passo === 1) {
      if (!w.turma) return 'Escolha a turma ou o atleta.';
      if (!w.temporada.trim()) return 'Dê um nome à temporada.';
      if (!w.inicio) return 'Informe a data de início.';
      if (!(w.pico >= 1000 && w.pico <= 6000)) return 'A carga semanal máxima deve ficar entre 1.000 e 6.000 UA.';
    }
    if (passo === 2) {
      if (!w.base.fundamentos.length && !w.base.ideias.length) return 'Escolha ao menos um fundamento base ou escreva uma ideia para a temporada.';
    }
    if (passo === 3) {
      const cr = crono();
      for (let i = 0; i < w.ciclos.length; i++) {
        const c = w.ciclos[i];
        if (!c.nome.trim()) return `Dê um nome ao ciclo ${i + 1}.`;
        if (totalSem(c) < 4) return `${c.nome}: o ciclo precisa de ao menos 4 semanas.`;
        if (!c.sem.base || !c.sem.competicao) return `${c.nome}: use ao menos uma semana de Base e uma de Competição.`;
        if (!c.alvo) return `${c.nome}: escolha a competição alvo.`;
        const alvo = CAL.COMPETICOES[c.alvo];
        if (alvo.data < cr[i].inicio || alvo.data > cr[i].fim + DIA - 1) return `${c.nome}: a competição alvo cai fora das datas do ciclo.`;
      }
    }
    return '';
  }

  /* ---------- Tela ---------- */

  P.criar = function (el, ctx) {
    function desenhar(foco) {
      const livres = dados.turmasSemPlano();
      const semTurma = !livres.length;
      el.innerHTML = `
        <section class="card" aria-labelledby="h-wiz">
          <div class="card-head"><h2 id="h-wiz">Novo plano de temporada</h2>
            <button class="link-btn" id="w-cancelar" style="margin:0">Cancelar</button></div>
          <ol class="passos" aria-label="Etapas">
            ${PASSOS.map((n, i) => `<li class="${i + 1 === w.passo ? 'atual' : i + 1 < w.passo ? 'feito' : ''}" ${i + 1 === w.passo ? 'aria-current="step"' : ''}><span class="passo-n num">${i + 1}</span><span>${n}</span></li>`).join('')}
          </ol>
          <div id="w-corpo">${[passo1, passo2, passo3, passo4][w.passo - 1]()}</div>
          <p class="form-erro" id="w-erro" role="alert" hidden></p>
          <div class="actions" style="margin-top:18px">
            ${w.passo > 1 ? '<button class="btn" id="w-voltar">Voltar</button>' : ''}
            ${w.passo < 4
              ? `<button class="btn btn-primary" id="w-seguir" ${semTurma ? 'disabled' : ''}>Continuar</button>`
              : '<button class="btn btn-primary" id="w-criar">Criar plano</button>'}
          </div>
        </section>`;
      ligar();
      if (foco) { const f = el.querySelector(foco); if (f) f.focus({ preventScroll: true }); }
    }

    function erro(msg) { const e = el.querySelector('#w-erro'); e.textContent = msg; e.hidden = !msg; }

    function ligar() {
      const $ = (s) => el.querySelector(s);
      $('#w-cancelar').addEventListener('click', () => ctx.ir('macro', {}, '#tab-macro'));

      if (w.passo === 1 && $('#w-turma')) {
        $('#w-turma').addEventListener('change', (e) => {
          w.turma = e.target.value;
          w.pico = PICO_SUGERIDO[TURMAS[w.turma].faixa] || 3000;
          desenhar('#w-turma');
        });
        $('#w-nome').addEventListener('input', (e) => { w.nome = e.target.value; });
        $('#w-temp').addEventListener('input', (e) => { w.temporada = e.target.value; });
        $('#w-ini').addEventListener('change', (e) => { w.inicio = e.target.value; desenhar('#w-ini'); });
        $('#w-pico').addEventListener('input', (e) => { w.pico = Number(e.target.value); });
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
        el.querySelectorAll('.ciclo-ed').forEach((sec) => {
          const i = Number(sec.dataset.c);
          const c = w.ciclos[i];
          sec.querySelector(`#w-cn-${i}`).addEventListener('input', (e) => { c.nome = e.target.value; });
          sec.querySelector(`#w-alvo-${i}`).addEventListener('change', (e) => { c.alvo = e.target.value; desenhar(`#w-alvo-${i}`); });
          sec.querySelector('[data-dist]').addEventListener('click', () => {
            if (!c.alvo) return erro(`${c.nome}: escolha a competição alvo antes de distribuir as fases.`);
            const ini = crono()[i].inicio;
            const f = dados.distribuirAteAlvo(ini, CAL.COMPETICOES[c.alvo].data, c.sem.transicao > 0 ? c.sem.transicao : 0);
            if (!f) return erro(`${c.nome}: a competição alvo está a menos de 4 semanas do início do ciclo. Escolha outro alvo ou outra data de início.`);
            dados.ORDEM_FASES.forEach((t) => { c.sem[t] = 0; });
            f.forEach(([t, q]) => { c.sem[t] = q; });
            desenhar('[data-dist]');
          });
          sec.querySelectorAll('[data-w-step]').forEach((b) => b.addEventListener('click', () => {
            const [, tipo, d] = b.dataset.wStep.split(':');
            c.sem[tipo] = Math.max(0, Math.min(12, c.sem[tipo] + Number(d)));
            desenhar(`[data-w-step="${b.dataset.wStep}"]`);
          }));
          sec.querySelectorAll('.fase-pauta').forEach((det) => {
            const tipo = det.dataset.tipo;
            window.Farol.pauta.editor(det.querySelector('.pauta-mount'), c.pautas[tipo], {
              prefixo: `wc${i}${tipo}`,
              onChange: (p) => { det.querySelector('.cont').textContent = `· ${plural(p.fundamentos.length, 'fundamento', 'fundamentos')}`; },
            });
          });
          const rem = sec.querySelector('[data-rem-ciclo]');
          if (rem) rem.addEventListener('click', () => { w.ciclos.splice(i, 1); desenhar('#w-add-ciclo'); });
        });
        $('#w-add-ciclo').addEventListener('click', () => { w.ciclos.push(novoCiclo(w.ciclos.length)); desenhar(`#w-cn-${w.ciclos.length - 1}`); });
        $('#w-ir-comp').addEventListener('click', () => window.Farol.ir('planejamento-competicoes', {}));
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
        for (let p = 1; p <= 3; p++) { const msg = validar(p); if (msg) return erro(msg); }
        const id = dados.criarPlano({
          nome: w.nome.trim(), turma: w.turma, temporada: w.temporada.trim(), inicio: w.inicio, pico: w.pico,
          base: copiar(w.base),
          ciclos: w.ciclos.map((c) => ({ nome: c.nome.trim(), alvo: c.alvo, fases: fasesDe(c), pautas: copiar(c.pautas) })),
        });
        w = novoRascunho();
        window.Farol.compartilhado.planoId = id;
        ctx.ir('macro', { ciclo: null, mesoId: null, semana: null, editor: null, aviso: 'Plano criado. Ajuste as semanas na escala Microciclo.' });
      });
    }

    desenhar();
  };
})();
