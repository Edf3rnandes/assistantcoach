/* Periodização > peças da periodização dinâmica
   - calendário com a prioridade A, B ou C de cada competição (mudar a prioridade só propõe: nada muda até o técnico confirmar);
   - faixa de aviso "o calendário mudou" e a tela de revisão, com o que muda semana a semana (aceitar ou rejeitar);
   - ajustes (carga de referência, sessões por semana, descarga), alertas de planejado × executado e histórico de revisões;
   - textos de ajuda do documento de lógica. */
(function () {
  const { dados, util, calendario: CAL } = window.Farol;
  const { DIA, dd, num, esc, plural } = util;
  const P = (window.Farol.periodo = window.Farol.periodo || {});

  const PRIO = {
    A: { nome: 'A · Alvo', texto: 'A competição mais importante do ciclo. Todo o treino é planejado para chegar no melhor momento nela.' },
    B: { nome: 'B · Importante', texto: 'Competição relevante, com redução leve de carga nos dias anteriores. Não muda o planejamento.' },
    C: { nome: 'C · Treino', texto: 'Competição usada como teste e treino. Sem ajuste de carga.' },
  };
  const STATUS = { confirmed: 'Confirmada', provisional: 'Provisória', cancelled: 'Cancelada' };
  const AJUDA = [
    ['Prioridades A, B e C', `<ul><li><b>A (Alvo):</b> ${PRIO.A.texto}</li><li><b>B (Importante):</b> ${PRIO.B.texto}</li><li><b>C (Treino):</b> ${PRIO.C.texto}</li></ul>`],
    ['Blocos', '<ul><li><b>Acumulação:</b> constrói a base. Mais volume, intensidade moderada.</li><li><b>Transmutação:</b> transforma a base em potência e em gesto específico do jogo. A intensidade sobe e o volume cai um pouco.</li><li><b>Realização:</b> prepara a competição. Mantém a intensidade, reduz o volume e termina no evento A.</li><li><b>Manutenção:</b> mantém o nível enquanto não há competição alvo definida.</li><li><b>Transição:</b> recuperação depois do evento A.</li></ul>'],
    ['Ondulatória', '<p>Dentro de cada semana, o estímulo principal muda de dia para dia: um dia pesado (força), um dia de volume (técnico-tático) e um dia de potência (salto e velocidade). O tema do bloco define qual deles tem mais peso, em torno de 40% da carga da semana.</p>'],
    ['Quando o calendário muda', '<p>O calendário pode mudar. Ao adicionar, mover ou cancelar uma competição, o sistema recalcula as semanas futuras e mostra o que muda antes de você confirmar. As semanas já treinadas não mudam.</p>'],
  ];

  const dataSem = (t) => `${dd(t)} a ${dd(t + 6 * DIA)}`;
  const nomeBloco = (b) => dados.FASES[b].nome;
  const resumoSemana = (w) => (w ? `${nomeBloco(w.bloco)}, ${dados.TIPOS_MICRO[w.tipoSemana].nome.toLowerCase()}, ${Math.round(w.fator * 100)}%` : 'fora do plano');

  /* ---------- Faixa de aviso ---------- */

  P.bannerRevisao = function (plano) {
    if (!plano || !plano.motor) return '';
    const p = dados.proposta(plano.id);
    if (!p) return '';
    return `<section class="rev-banner" role="status" aria-label="O calendário mudou">
      <span class="rev-ic" aria-hidden="true">⟳</span>
      <div class="rev-t"><b>${p.trocaBase && !p.gatilhos.some((g) => !g.startsWith('A carga')) ? 'A carga de referência mudou.' : 'O calendário mudou.'} ${plural(p.dif.length, 'semana muda', 'semanas mudam')}.</b>
        <small>${esc(p.gatilhos.slice(0, 3).join(' · ') || 'O sistema recalculou o futuro.')}</small></div>
      <button class="btn btn-primary btn-sm" data-revisar="${plano.id}">Ver o que muda</button>
    </section>`;
  };

  /* ---------- Tela de revisão ---------- */

  P.revisao = function (el, ctx) {
    const { plano } = ctx;
    const p = plano ? dados.proposta(plano.id) : null;
    if (!p) {
      el.innerHTML = '<section class="card"><h2>Nada para revisar</h2><p>O planejamento já está de acordo com o calendário.</p><button class="btn" id="rv-volta">Voltar</button></section>';
      el.querySelector('#rv-volta').addEventListener('click', () => ctx.ir('macro', {}));
      return;
    }
    const itens = p.dif;
    el.innerHTML = `
      <section class="card" aria-labelledby="h-rev">
        <div class="card-head"><div><h2 id="h-rev">O que muda no planejamento</h2>
          <span class="meso-period">${plural(itens.length, 'semana muda', 'semanas mudam')}; as semanas já treinadas e a semana atual não mudam.</span></div></div>
        ${p.gatilhos.length ? `<ul class="rev-gat">${p.gatilhos.map((g) => `<li>${esc(g)}</li>`).join('')}</ul>` : ''}
        ${p.conflitos.filter((c) => c.tipo !== 'provisorio').length || p.sugestoes.length ? `<ul class="pr-avisos">${[...p.conflitos, ...p.sugestoes].map((a) => `<li class="pr-av ${a.severidade || 'info'}">${esc(a.texto)}</li>`).join('')}</ul>` : ''}
        <div class="table-scroll"><table class="mesos pr-tab"><thead><tr><th>Semana</th><th>Antes</th><th>Depois</th><th class="r">Meta</th></tr></thead><tbody>
          ${itens.map((d) => {
            const a = d.antes, b = d.depois;
            const meta = (w) => (w ? `${num((w.base || p.baseline) * w.fator)}` : '–');
            return `<tr class="rev-${d.tipo}"><td class="num">${dataSem(d.inicio)}</td>
              <td>${d.tipo === 'entra' ? '<span class="chip">nova semana</span>' : esc(resumoSemana(a))}</td>
              <td>${d.tipo === 'sai' ? '<span class="chip">sai do plano</span>' : `<b>${esc(resumoSemana(b))}</b>`}</td>
              <td class="r num">${meta(a)} → ${meta(b)}</td></tr>`;
          }).join('')}
        </tbody></table></div>
        <div class="actions" style="margin-top:16px">
          <button class="btn btn-primary" id="rv-aceitar">Aceitar mudanças</button>
          <button class="btn" id="rv-rejeitar">Manter como está</button>
          <button class="link-btn" id="rv-volta" style="margin:0">Decidir depois</button>
        </div>
        <p class="hint">Aceitar troca só as semanas futuras. Manter como está esconde este aviso até o calendário mudar de novo.</p>
      </section>`;
    el.querySelector('#rv-aceitar').addEventListener('click', () => { dados.aceitarProposta(plano.id); ctx.ir('macro', { aviso: `Mudanças aceitas: ${plural(itens.length, 'semana atualizada', 'semanas atualizadas')}.` }); });
    el.querySelector('#rv-rejeitar').addEventListener('click', () => { dados.rejeitarProposta(plano.id); ctx.ir('macro', { aviso: 'Planejamento mantido como estava.' }); });
    el.querySelector('#rv-volta').addEventListener('click', () => ctx.ir('macro', {}));
  };

  /* ---------- Blocos do Macrociclo ---------- */

  function tabelaCalendario(plano) {
    const noPlano = Object.entries(plano.motor.prioridades).map(([id, k]) => ({ c: CAL.COMPETICOES[id], k })).filter((x) => x.c).sort((a, b) => a.c.data - b.c.data);
    const fora = CAL.lista().filter((c) => !plano.motor.prioridades[c.id] && CAL.fimDe(c) >= plano.inicioMs && c.status !== 'cancelled');
    const efetiva = (id) => { const w = plano.semanas.find((s) => s.eventos.some((e) => e.id === id)); const e = w && w.eventos.find((x) => x.id === id); return e ? e.prioridade : null; };
    const seg = (c, atual) => `<div class="pr-seg" role="radiogroup" aria-label="Prioridade de ${esc(c.nome)}">${['A', 'B', 'C', ''].map((k) => `<button type="button" class="pr-bt ${k ? `pr-${k}` : 'pr-x'}" role="radio" aria-checked="${(atual || '') === k}" data-pr="${c.id}|${k}" title="${k ? esc(PRIO[k].nome) : 'Tirar da periodização'}">${k || '—'}</button>`).join('')}</div>`;
    return `
      <div class="table-scroll"><table class="mesos pr-tab"><thead><tr><th>Competição</th><th>Data</th><th>Status</th><th>Prioridade</th></tr></thead><tbody>
        ${noPlano.map(({ c, k }) => {
          const ef = efetiva(c.id);
          return `<tr><td><button class="link-btn comp-link" data-comp="${c.id}" style="margin:0">${esc(c.nome)}</button><small class="sub-linha">${esc(c.local)}${ef && ef !== k ? ` · conta como ${ef}` : ''}</small></td>
            <td class="num">${dd(c.data)}${c.fim && c.fim !== c.data ? ` a ${dd(c.fim)}` : ''}</td>
            <td><span class="chip ${c.status === 'provisional' ? 'chip-beam' : c.status === 'cancelled' ? '' : ''}">${STATUS[c.status || 'confirmed']}</span></td>
            <td>${seg(c, k)}</td></tr>`;
        }).join('') || '<tr><td colspan="4"><span class="vazio">Nenhuma competição na periodização. Adicione abaixo.</span></td></tr>'}
      </tbody></table></div>
      ${fora.length ? `<div class="pr-add"><div class="field"><label class="label" for="pr-add-comp">Adicionar competição do calendário</label>
        <select class="select" id="pr-add-comp" style="min-width:0">${fora.map((c) => `<option value="${c.id}">${dd(c.data)} · ${esc(c.nome)}</option>`).join('')}</select></div>
        <div class="field"><label class="label" for="pr-add-prio">Prioridade</label><select class="select" id="pr-add-prio"><option value="C">C · Treino</option><option value="B">B · Importante</option><option value="A">A · Alvo</option></select></div>
        <button class="btn" id="pr-add-ok">Adicionar</button></div>` : ''}`;
  }

  P.blocosMotor = function (plano) {
    const m = plano.motor;
    const av = dados.avisos(plano.id);
    const alertas = dados.alertasPlano(plano.id);
    const todos = [...av.conflitos, ...av.sugestoes, ...av.janelas.map((j) => ({ severidade: 'warning', texto: j.texto }))];
    const rev = m.revisoes || [];
    return `
      <section class="card" aria-labelledby="h-cal">
        <div class="card-head"><h2 id="h-cal">Calendário e prioridades</h2><span class="label">${av.provisorio ? 'depende de evento provisório' : 'A, B ou C'}</span></div>
        ${todos.length ? `<ul class="pr-avisos" role="status">${todos.map((a) => `<li class="pr-av ${a.severidade || 'info'}">${esc(a.texto)}</li>`).join('')}</ul>` : ''}
        ${tabelaCalendario(plano)}
        <p class="hint">Mudar a prioridade, a data ou o status de uma competição não altera nada de imediato: o sistema recalcula o futuro e mostra a diferença para você confirmar.</p>
      </section>

      <div class="corpo">
        <section class="card" aria-labelledby="h-aj">
          <div class="card-head"><h2 id="h-aj">Ajustes</h2></div>
          <div class="form-grid">
            <div class="field"><label class="label" for="aj-base">Carga de referência (UA/semana)</label><input class="input num" id="aj-base" type="number" min="500" max="6000" step="50" value="${m.baseline}"></div>
            <div class="field"><label class="label" for="aj-sess">Sessões por semana</label>
              <select class="select" id="aj-sess" style="min-width:0">${[3, 4, 5].map((n) => `<option ${n === m.sessoesSemana ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
            <div class="field"><label class="label" for="aj-desc">Descarga (% da referência)</label><input class="input num" id="aj-desc" type="number" min="50" max="90" step="5" value="${Math.round((window.Farol.motor.parametros(m.params).deload_factor) * 100)}"></div>
          </div>
          <div class="actions" style="margin-top:12px"><button class="btn" id="aj-salvar">Salvar ajustes</button><span class="hint" id="aj-msg" role="status" style="margin:0"></span></div>
          <p class="hint">A referência é a carga de uma semana normal. Cada semana é uma porcentagem dela. Mudar ajustes também só propõe: você confirma o que muda.</p>
        </section>

        <section class="card" aria-labelledby="h-al">
          <div class="card-head"><h2 id="h-al">Planejado × executado</h2><span class="label">${alertas.length ? plural(alertas.length, 'alerta', 'alertas') : 'sem alertas'}</span></div>
          ${alertas.length ? `<ul class="pr-avisos">${alertas.slice(-6).reverse().map((a) => `<li class="pr-av ${a.severidade}"><b class="num">${dataSem(a.inicio)}</b> ${esc(a.texto)}</li>`).join('')}</ul>` : '<p class="vazio" style="padding:4px 0">Nenhuma semana fora da meta até agora.</p>'}
          <p class="hint">São sinalizadores para você decidir, nunca regra automática de corte de carga.</p>
        </section>
      </div>

      ${rev.length ? `<section class="card" aria-labelledby="h-rv"><div class="card-head"><h2 id="h-rv">Revisões</h2><span class="label">${plural(rev.length + 1, 'versão', 'versões')}</span></div>
        <ul class="ix-ul">${rev.slice().reverse().map((r) => `<li class="ix-li"><span class="ix-sel ${r.status === 'aceita' ? 'ok' : ''}">${r.status === 'aceita' ? 'Aceita' : 'Rejeitada'}</span><div class="ix-li-m"><b>Versão ${r.versao}</b><small>${esc((r.gatilhos || []).join(' · ') || 'Recálculo')} · ${plural(r.semanas, 'semana', 'semanas')}</small></div><small class="num">${dd(r.em)}</small></li>`).join('')}</ul></section>` : ''}

      <details class="card an-como"><summary>Entenda a periodização dinâmica</summary>
        ${AJUDA.map(([t, h]) => `<h3 style="margin:14px 0 4px">${esc(t)}</h3>${h}`).join('')}
      </details>`;
  };

  P.ligarMotor = function (el, ctx) {
    const { plano } = ctx;
    const re = (foco, aviso) => ctx.ir('macro', aviso ? { aviso } : {}, foco);
    el.querySelectorAll('[data-pr]').forEach((b) => b.addEventListener('click', () => {
      const [id, k] = b.dataset.pr.split('|');
      dados.definirPrioridade(plano.id, id, k || null);
      re(`[data-pr="${b.dataset.pr}"]`);
    }));
    const ok = el.querySelector('#pr-add-ok');
    if (ok) ok.addEventListener('click', () => { dados.definirPrioridade(plano.id, el.querySelector('#pr-add-comp').value, el.querySelector('#pr-add-prio').value); re('#pr-add-comp'); });
    const salvar = el.querySelector('#aj-salvar');
    if (salvar) salvar.addEventListener('click', () => {
      const baseline = Number(el.querySelector('#aj-base').value), sess = Number(el.querySelector('#aj-sess').value), desc = Number(el.querySelector('#aj-desc').value);
      const msg = el.querySelector('#aj-msg');
      if (!(baseline >= 500 && baseline <= 6000)) { msg.textContent = 'A referência deve ficar entre 500 e 6.000 UA.'; return; }
      if (!(desc >= 50 && desc <= 90)) { msg.textContent = 'A descarga deve ficar entre 50% e 90%.'; return; }
      dados.salvarParametrosMotor(plano.id, { baseline, sessoesSemana: sess, params: { ...plano.motor.params, deload_factor: desc / 100 } });
      re('#aj-salvar');
    });
  };
})();
