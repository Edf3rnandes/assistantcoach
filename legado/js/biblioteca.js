/* Exercícios e prescrição (rota `treinos-biblioteca`)
   Três abas:
   - Prescrições: planos de treino aplicados a turmas ou atletas, com os conflitos de saúde e as trocas;
   - Planos de treino: modelos com séries, repetições, carga e descanso;
   - Catálogo: exercícios com categoria, grupos, equipamento, vídeo e dica.
   O cruzamento com a saúde usa as restrições e a região do corpo do cadastro de saúde (ver saude.js). */
(function () {
  const { util, elenco, dados, registros: REG } = window.Farol;
  const P = window.Farol.prescricao;
  const { esc, num, dd, plural, HOJE, iso, ms } = util;
  const { ATLETAS, TURMAS } = elenco;
  const DIAS = dados.DIAS;
  const TURNO = { manha: 'manhã', tarde: 'tarde', noite: 'noite' };

  const est = { aba: 'presc', sel: null, form: null, ed: null, filtro: { q: '', cat: '', grupo: '', equip: '' }, exForm: null, confirma: null, aviso: '', copia: 'turma' };
  let raiz = null;

  const prim = (id) => ATLETAS[id].nome.split(' ')[0];
  const nomeAlvo = (p) => (p.alvo.tipo === 'turma' ? `${TURMAS[p.alvo.turmaId].nome} · ${plural(TURMAS[p.alvo.turmaId].atletas.length, 'atleta', 'atletas')}` : p.alvo.ids.map((id) => ATLETAS[id].nome).join(', '));
  const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const cargaTxt = (it, kg) => (kg != null ? `${kg} kg` : it.carga === 'pc' ? 'peso do corpo' : it.carga === 'kg' ? (it.valor != null ? `${it.valor} kg` : 'carga a definir') : it.carga === 'pct' ? `${it.valor} % de 1RM` : `PSE ${it.valor}`);
  const dataCurta = (t) => `${DIAS[(new Date(t).getUTCDay() + 6) % 7]} ${dd(t)}`;

  /* Sessões físicas do microciclo que podem receber a prescrição */
  function sessoesFisicas(alvo) {
    const out = [];
    dados.planos.filter((pl) => pl.semanaAtual >= 0).forEach((pl) => {
      const serve = alvo.tipo === 'turma' ? (pl.turmas || [pl.turma]).includes(alvo.turmaId) : alvo.ids.every((id) => pl.atletas.includes(id));
      if (!serve) return;
      pl.semanas.slice(Math.max(0, pl.semanaAtual - 1), pl.semanaAtual + 4).forEach((sem) => sem.sessoes.filter((s) => s.tipo === 'fisico').forEach((s) => {
        const t = sem.inicio + s.dia * 864e5;
        out.push({ v: `${pl.id}|${sem.idx}|${s.id}`, t, label: `${dataCurta(t)}, ${TURNO[s.turno]} · Físico, ${s.dur} min (${pl.nome})` });
      }));
    });
    return out.sort((a, b) => a.t - b.t);
  }
  const sessaoDe = (sv) => { if (!sv) return null; const [pid, si, sid] = sv.split('|'); const pl = dados.plano(pid); const sem = pl && pl.semanas[Number(si)]; const s = sem && sem.sessoes.find((x) => x.id === sid); return s ? { pl, sem, s, t: sem.inicio + s.dia * 864e5 } : null; };

  /* ====================================================================
     PRESCRIÇÕES
     ==================================================================== */

  function cartaoPresc(p) {
    const m = P.plano(p.plano), rc = P.resumoConflitos(p);
    const nConf = Object.keys(rc).length, resolvidos = Object.values(rc).filter((x) => x.resolvidos === x.total).length;
    const ses = sessaoDe(p.sessao);
    const d = new Date(p.data);
    const conf = est.confirma === `p:${p.id}`;
    return `<article class="bb-card ${p.status === 'feita' ? 'feita' : ''}">
      <div class="bb-data"><b class="num">${d.getUTCDate()}</b><small>${util.mes(p.data)}</small></div>
      <div class="bb-m"><b>${esc(m.nome)}</b><span>${esc(nomeAlvo(p))}</span>
        <span class="bb-chips"><span class="ix-chip">${plural(m.itens.length, 'exercício', 'exercícios')}</span><span class="ix-chip">cerca de ${P.minutos(m)} min</span>
          ${ses ? `<span class="ix-chip">Sessão física ${esc(dataCurta(ses.t))}</span>` : ''}
          ${nConf ? `<span class="ix-sel ${resolvidos === nConf ? 'ok' : 'retorno'}">${resolvidos === nConf ? 'Conflitos resolvidos' : `${plural(nConf - resolvidos, 'atleta com conflito', 'atletas com conflito')}`}</span>` : ''}
          ${p.status === 'feita' ? '<span class="ix-sel ok">Feita</span>' : ''}</span></div>
      <div class="bb-a actions">
        <button class="btn btn-sm btn-primary" data-abrir="${p.id}">Abrir</button>
        <button class="btn btn-sm" data-feita="${p.id}">${p.status === 'feita' ? 'Reabrir' : 'Marcar como feita'}</button>
        ${conf ? `<button class="btn btn-sm btn-danger" data-exc-ok="p:${p.id}">Excluir mesmo</button><button class="btn btn-sm" data-exc-no>Manter</button>` : `<button class="link-btn" data-exc="p:${p.id}" style="margin:0" aria-label="Excluir a prescrição de ${esc(m.nome)}">Excluir</button>`}
      </div></article>`;
  }

  function formPresc() {
    const f = est.form;
    const alvo = f.tipo === 'turma' ? { tipo: 'turma', turmaId: f.turmaId } : { tipo: 'atletas', ids: f.ids };
    const sess = f.tipo === 'turma' || f.ids.length ? sessoesFisicas(alvo) : [];
    const erro = f.erro ? `<p class="sd-erro" role="alert">${esc(f.erro)}</p>` : '';
    return `<section class="card sd-form" aria-labelledby="bb-f-t">
      <div class="card-head"><h2 id="bb-f-t">Nova prescrição</h2></div>
      <form id="bb-form" novalidate>
        <div class="form-grid sd-grid">
          <div class="field"><label class="label" for="bb-plano">Plano de treino</label><select class="select" id="bb-plano">${P.planos().map((m) => `<option value="${m.id}" ${f.plano === m.id ? 'selected' : ''}>${esc(m.nome)}</option>`).join('')}</select></div>
          <div class="field"><label class="label" for="bb-data">Data</label><input class="input" id="bb-data" type="date" value="${f.data}"></div>
          <div class="field"><label class="label" for="bb-sessao">Sessão do microciclo <small>(opcional)</small></label><select class="select" id="bb-sessao"><option value="">Sem vínculo</option>${sess.map((s) => `<option value="${s.v}" ${f.sessao === s.v ? 'selected' : ''}>${esc(s.label)}</option>`).join('')}</select></div>
        </div>
        <div class="seg-ctl" role="group" aria-label="Para quem" style="margin-bottom:12px">
          <button class="seg-btn" type="button" data-tipo="turma" aria-pressed="${f.tipo === 'turma'}">Para a turma</button>
          <button class="seg-btn" type="button" data-tipo="atletas" aria-pressed="${f.tipo === 'atletas'}">Para atletas</button>
        </div>
        ${f.tipo === 'turma'
          ? `<div class="field" style="max-width:360px;margin-bottom:12px"><label class="label" for="bb-turma">Turma</label><select class="select" id="bb-turma">${Object.values(TURMAS).map((t) => `<option value="${t.id}" ${f.turmaId === t.id ? 'selected' : ''}>${esc(t.nome)}</option>`).join('')}</select></div>`
          : `<fieldset class="sd-restr" style="margin-bottom:12px"><legend class="label">Atletas</legend>${Object.values(TURMAS).map((t) => `<div class="bb-grupo"><span class="bb-grupo-n">${esc(t.nome)}</span><div class="chips">${t.atletas.map((id) => `<label class="chipcheck"><input type="checkbox" name="bb-at" value="${id}" ${f.ids.includes(id) ? 'checked' : ''}> ${esc(prim(id))}</label>`).join('')}</div></div>`).join('')}</fieldset>`}
        <div class="field" style="margin-bottom:12px"><label class="label" for="bb-nota">Observação <small>(opcional)</small></label><input class="input" id="bb-nota" maxlength="160" value="${esc(f.nota)}" placeholder="Depois do aquecimento na areia…"></div>
        ${erro}
        <div class="actions"><button class="btn btn-primary" type="submit">Prescrever</button><button class="btn" type="button" id="bb-cancela">Cancelar</button></div>
      </form></section>`;
  }

  function listaPresc(el) {
    const lista = P.prescricoes();
    const futuras = lista.filter((p) => p.status === 'prescrita'), feitas = lista.filter((p) => p.status === 'feita');
    el.innerHTML = `
      <div class="sc-barra"><p class="sc-resumo" style="margin:0">Planos de treino físico aplicados a turmas e atletas, já cruzados com lesões e restrições.</p>${est.form ? '' : '<button class="btn btn-primary" id="bb-nova">Nova prescrição</button>'}</div>
      ${est.form ? formPresc() : ''}
      <section aria-labelledby="bb-pr-t"><h2 id="bb-pr-t" class="sc-h2">A fazer <span class="label num">${futuras.length}</span></h2>
        ${futuras.length ? `<div class="sc-jogos">${futuras.map(cartaoPresc).join('')}</div>` : '<p class="vazio">Nenhuma prescrição a fazer. Use Nova prescrição.</p>'}</section>
      ${feitas.length ? `<section aria-labelledby="bb-ft-t"><h2 id="bb-ft-t" class="sc-h2">Feitas <span class="label num">${feitas.length}</span></h2><div class="sc-jogos">${feitas.map(cartaoPresc).join('')}</div></section>` : ''}`;
    ligarPresc(el);
  }

  function novoFormPresc(pre) {
    const t = TURMAS.sub18;
    return { plano: P.planos()[0].id, data: iso(HOJE + 2 * 864e5), sessao: '', tipo: 'turma', turmaId: t.id, ids: [], nota: '', erro: '', ...(pre || {}) };
  }

  function ligarPresc(el) {
    const $ = (s) => el.querySelector(s);
    const re = (foco) => { const y = window.scrollY; render(raiz, foco); window.scrollTo({ top: y }); };
    const nv = $('#bb-nova'); if (nv) nv.addEventListener('click', () => { est.form = novoFormPresc(); est.aviso = ''; render(raiz, '#bb-plano'); });
    el.querySelectorAll('[data-abrir]').forEach((b) => b.addEventListener('click', () => { est.sel = b.dataset.abrir; est.aviso = ''; render(raiz); window.scrollTo({ top: 0 }); }));
    el.querySelectorAll('[data-feita]').forEach((b) => b.addEventListener('click', () => {
      const p = P.presc(b.dataset.feita);
      if (p.status === 'feita') { P.reabrir(p.id); est.aviso = 'Prescrição reaberta.'; re(`[data-feita="${p.id}"]`); return; }
      if (p.sessao) { P.atualizarPrescricao(p.id, { status: 'feita' }); est.aviso = 'Prescrição marcada como feita.'; re(`[data-feita="${p.id}"]`); return; }
      est.sel = p.id; est.focoExec = true; est.aviso = ''; render(raiz); // sem sessão ligada: pede duração e PSE
    }));
    ligarExcluir(el, re);
    const f = $('#bb-form'); if (!f) return;
    const ler = () => {
      const fm = est.form;
      fm.plano = $('#bb-plano').value; fm.data = $('#bb-data').value; fm.sessao = $('#bb-sessao').value; fm.nota = $('#bb-nota').value.trim();
      if (fm.tipo === 'turma') fm.turmaId = $('#bb-turma').value; else fm.ids = [...el.querySelectorAll('input[name="bb-at"]:checked')].map((x) => x.value);
    };
    el.querySelectorAll('[data-tipo]').forEach((b) => b.addEventListener('click', () => { ler(); est.form.tipo = b.dataset.tipo; est.form.sessao = ''; render(raiz, `[data-tipo="${b.dataset.tipo}"]`); }));
    ['#bb-turma'].forEach((s) => { const x = $(s); if (x) x.addEventListener('change', () => { ler(); est.form.sessao = ''; render(raiz, s); }); });
    el.querySelectorAll('input[name="bb-at"]').forEach((c) => c.addEventListener('change', () => { ler(); est.form.sessao = ''; render(raiz, `input[value="${c.value}"]`); }));
    $('#bb-sessao').addEventListener('change', () => { ler(); const s = sessaoDe(est.form.sessao); if (s) est.form.data = iso(s.t); render(raiz, '#bb-sessao'); });
    $('#bb-cancela').addEventListener('click', () => { est.form = null; re('#bb-nova'); });
    f.addEventListener('submit', (e) => {
      e.preventDefault(); ler();
      const fm = est.form;
      const erro = !fm.data ? 'Informe a data.' : fm.tipo === 'atletas' && !fm.ids.length ? 'Escolha ao menos um atleta.' : '';
      if (erro) { fm.erro = erro; render(raiz, '.sd-erro'); return; }
      const p = P.prescrever({ plano: fm.plano, data: ms(fm.data), alvo: fm.tipo === 'turma' ? { tipo: 'turma', turmaId: fm.turmaId } : { tipo: 'atletas', ids: fm.ids }, sessao: fm.sessao || null, nota: fm.nota });
      est.form = null; est.sel = p.id;
      est.aviso = 'Prescrição criada. Confira abaixo os conflitos de saúde.';
      render(raiz); window.scrollTo({ top: 0 });
    });
  }

  function ligarExcluir(el, re) {
    el.querySelectorAll('[data-exc]').forEach((b) => b.addEventListener('click', () => { est.confirma = b.dataset.exc; re(`[data-exc-ok="${b.dataset.exc}"]`); }));
    el.querySelectorAll('[data-exc-no]').forEach((b) => b.addEventListener('click', () => { est.confirma = null; re(); }));
    el.querySelectorAll('[data-exc-ok]').forEach((b) => b.addEventListener('click', () => {
      const [k, id] = b.dataset.excOk.split(':');
      if (k === 'p') { P.excluirPrescricao(id); if (est.sel === id) est.sel = null; est.aviso = 'Prescrição excluída.'; }
      else if (k === 'm') { P.excluirPlano(id); est.aviso = 'Plano de treino excluído, junto com as prescrições dele.'; }
      else { P.excluirExercicio(id); est.aviso = 'Exercício excluído.'; }
      est.confirma = null; re();
    }));
  }

  /* ---------- Detalhe de uma prescrição ---------- */

  function textoTreino(p, atletaId) {
    const m = P.plano(p.plano);
    const linhas = [`Treino físico: ${m.nome}`, `${dataCurta(p.data)}${atletaId ? ` · ${ATLETAS[atletaId].nome}` : ` · ${nomeAlvo(p)}`}`, ''];
    const itens = atletaId ? P.itensDoAtleta(p, atletaId) : m.itens.map((it, i) => ({ i, it, efetivo: P.ex(it.ex), base: P.ex(it.ex), troca: null, kg: null }));
    itens.forEach((x, n) => {
      const nome = x.efetivo.nome + (x.troca ? ` (troca de ${x.base.nome.toLowerCase()})` : '');
      linhas.push(`${n + 1}) ${nome}: ${x.it.series} x ${x.it.reps}, ${cargaTxt(x.it, x.kg)}${x.it.desc ? `, descanso ${x.it.desc} s` : ''}${x.it.obs ? `. ${x.it.obs}` : ''}`);
    });
    if (p.nota) linhas.push('', p.nota);
    return linhas.join('\n');
  }

  /* ---------- Como foi o treino: duração e PSE entram na carga ---------- */

  function execCartao(p, m, ids) {
    const ses = sessaoDe(p.sessao);
    if (p.sessao) {
      return `<section class="card" aria-labelledby="bb-ex-t" id="bb-exec"><div class="card-head"><h2 id="bb-ex-t">Como foi o treino</h2></div>
        <p class="hint" style="margin:0">Esta prescrição está ligada à sessão física de ${esc(ses ? dataCurta(ses.t) : 'outro dia')}. A carga (duração × PSE) já vem do registro dessa sessão, então não é somada de novo.</p></section>`;
    }
    const e = p.exec || { duracao: P.minutos(m), fez: {}, pse: {} };
    const fez = (id) => (p.exec ? !!e.fez[id] : true);
    const total = (id) => (fez(id) && e.pse[id] != null ? e.duracao * e.pse[id] : null);
    return `<section class="card" aria-labelledby="bb-ex-t" id="bb-exec">
      <div class="card-head"><h2 id="bb-ex-t">Como foi o treino</h2><span class="label">${p.status === 'feita' ? 'conta na carga do atleta' : 'ao salvar, vira treino feito'}</span></div>
      <div class="bb-ex-topo">
        <div class="field"><label class="label" for="bb-ex-dur">Duração (min)</label><input class="input num" id="bb-ex-dur" type="number" min="5" max="240" step="5" value="${e.duracao}" style="width:110px"></div>
        <div class="field"><label class="label" for="bb-ex-todos">PSE de todos</label><select class="select" id="bb-ex-todos" style="min-width:120px"><option value="">–</option>${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => `<option value="${n}">${n}</option>`).join('')}</select></div>
      </div>
      <div class="table-scroll"><table class="an-tab bb-tab" id="bb-ex-tab">
        <thead><tr><th>Atleta</th><th>Fez</th><th>PSE (1 a 10)</th><th class="r">Carga</th></tr></thead>
        <tbody>${ids.map((id) => `<tr data-ex-atleta="${id}"><td><b>${esc(prim(id))}</b></td>
          <td><input type="checkbox" class="bb-ex-fez" aria-label="${esc(prim(id))} fez o treino" ${fez(id) ? 'checked' : ''}></td>
          <td><select class="select sm bb-ex-pse" aria-label="PSE de ${esc(prim(id))}"><option value="">–</option>${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => `<option value="${n}" ${e.pse[id] === n ? 'selected' : ''}>${n}</option>`).join('')}</select></td>
          <td class="r num bb-ex-carga">${total(id) == null ? '–' : `${num(total(id))} UA`}</td></tr>`).join('')}</tbody></table></div>
      <div class="actions" style="margin-top:12px"><button class="btn btn-primary" id="bb-ex-salvar">${p.status === 'feita' ? 'Salvar alterações' : 'Salvar e marcar como feita'}</button></div>
      <p class="hint">Quem fez sem PSE conta como feito, mas fica fora da carga. Carga = duração × PSE, somada ao treino de quadra na Análise.</p>
    </section>`;
  }

  function ligarExec(el, p, re) {
    const $ = (s) => el.querySelector(s);
    if (!$('#bb-ex-salvar')) return;
    const linhas = () => [...el.querySelectorAll('[data-ex-atleta]')];
    const atualizar = () => {
      const dur = Number($('#bb-ex-dur').value) || 0;
      linhas().forEach((tr) => {
        const pse = tr.querySelector('.bb-ex-pse').value, fez = tr.querySelector('.bb-ex-fez').checked;
        tr.querySelector('.bb-ex-carga').textContent = fez && pse && dur ? `${num(dur * Number(pse))} UA` : '–';
        tr.querySelector('.bb-ex-pse').disabled = !fez;
      });
    };
    $('#bb-ex-dur').addEventListener('input', atualizar);
    el.querySelectorAll('.bb-ex-pse, .bb-ex-fez').forEach((x) => x.addEventListener('change', atualizar));
    $('#bb-ex-todos').addEventListener('change', (e) => { if (!e.target.value) return; linhas().forEach((tr) => { if (tr.querySelector('.bb-ex-fez').checked) tr.querySelector('.bb-ex-pse').value = e.target.value; }); atualizar(); });
    $('#bb-ex-salvar').addEventListener('click', () => {
      const dur = Number($('#bb-ex-dur').value);
      if (!(dur >= 5 && dur <= 240)) { est.aviso = 'Informe a duração entre 5 e 240 minutos.'; re('#bb-ex-dur'); return; }
      const fez = {}, pse = {};
      linhas().forEach((tr) => {
        const id = tr.dataset.exAtleta;
        fez[id] = tr.querySelector('.bb-ex-fez').checked;
        const v = tr.querySelector('.bb-ex-pse').value;
        if (fez[id] && v) pse[id] = Number(v);
      });
      const sem = Object.keys(fez).filter((id) => fez[id] && pse[id] == null).length;
      P.registrarExecucao(p.id, { duracao: dur, fez, pse });
      est.aviso = sem ? `Treino registrado. ${plural(sem, 'atleta ficou', 'atletas ficaram')} sem PSE e fora da carga.` : 'Treino registrado. A carga entra na Análise.';
      re('#bb-feita');
    });
    atualizar();
  }

  function detalhe(el, p) {
    const m = P.plano(p.plano), ids = P.atletasDe(p);
    const ses = sessaoDe(p.sessao);
    const rc = P.resumoConflitos(p);
    const comConflito = ids.filter((id) => rc[id]);
    const temKg = m.itens.some((it) => it.carga === 'kg');
    const base = m.itens.map((it, i) => ({ i, it, e: P.ex(it.ex) }));
    const totalSeries = m.itens.reduce((a, it) => a + it.series, 0);
    const sitSel = (id) => { const s = elenco.situacaoDe(id); return s ? `<span class="ix-sel ${s.tipo}">${s.tipo === 'lesao' ? 'Lesionado' : s.tipo === 'retorno' ? 'Em retorno' : 'Dúvida'}, ${esc(s.local.toLowerCase())}</span>` : ''; };
    const copiaAlvo = est.copia === 'turma' || !ids.includes(est.copia) ? 'turma' : est.copia;

    el.innerHTML = `
      <div><button class="link-btn" id="bb-voltar" style="margin:0">‹ Prescrições</button></div>
      <header class="page-head">
        <div>${window.Farol.conta.guardaDados() ? '' : '<span class="chip" style="margin-bottom:10px">Dados de exemplo</span>'}
          <h1>${esc(m.nome)}</h1>
          <p class="lead num">${esc(dataCurta(p.data))} · ${esc(nomeAlvo(p))}${ses ? ` · sessão física de ${esc(dataCurta(ses.t))}` : ''}</p></div>
        <div class="actions">${p.status === 'feita' ? '<span class="ix-sel ok">Feita</span>' : ''}<button class="btn" id="bb-feita">${p.status === 'feita' ? 'Reabrir' : 'Marcar como feita'}</button></div>
      </header>
      ${est.aviso ? `<div class="aviso-ok" role="status">${esc(est.aviso)}</div>` : ''}
      ${p.nota ? `<p class="hint" style="margin:0">${esc(p.nota)}</p>` : ''}

      <section class="card" aria-labelledby="bb-tr-t">
        <div class="card-head"><h2 id="bb-tr-t">Treino</h2><span class="label num">${plural(totalSeries, 'série', 'séries')} · cerca de ${P.minutos(m)} min</span></div>
        <div class="table-scroll"><table class="an-tab bb-tab">
          <thead><tr><th>#</th><th>Exercício</th><th>Séries × reps</th><th>Carga</th><th class="r">Descanso</th></tr></thead>
          <tbody>${base.map((x) => `<tr><td class="num">${x.i + 1}</td><td><b>${esc(x.e.nome)}</b><small class="sub-linha">${esc(x.e.grupos.map((g) => P.GRUPOS[g]).join(', '))}${x.it.obs ? ` · ${esc(x.it.obs)}` : ''}</small></td>
            <td class="num">${x.it.series} × ${esc(x.it.reps)}</td><td>${esc(cargaTxt(x.it))}</td><td class="r num">${x.it.desc ? `${x.it.desc} s` : '–'}</td></tr>`).join('')}</tbody></table></div>
      </section>

      ${execCartao(p, m, ids)}

      <section class="card" aria-labelledby="bb-cf-t">
        <div class="card-head"><h2 id="bb-cf-t">Conflitos com a saúde</h2>
          ${comConflito.length ? '<button class="btn btn-sm" id="bb-sugerir">Aplicar as trocas sugeridas</button>' : ''}</div>
        ${comConflito.length ? comConflito.map((id) => {
          const itens = P.itensDoAtleta(p, id).filter((x) => x.conflito);
          return `<div class="bb-conf"><div class="bb-conf-h"><b>${esc(ATLETAS[id].nome)}</b>${sitSel(id)}</div>
            <ul class="ix-ul">${itens.map((x) => {
              const alts = P.alternativas(id, x.base);
              const ok = x.troca && !x.conflitoFinal;
              return `<li class="ix-li"><span class="ix-sel ${ok ? 'ok' : 'lesao'}">${ok ? 'Resolvido' : 'Conflito'}</span>
                <div class="ix-li-m"><b>${x.i + 1}. ${esc(x.base.nome)}</b><small>${esc(x.conflito.motivos.join(' · '))}</small></div>
                <label class="bb-troca"><span class="label">Trocar por</span><select class="select sm" data-troca="${id}|${x.i}" style="min-width:0"><option value="">Manter (avaliar com a fisioterapia)</option>${alts.map((a) => `<option value="${a.id}" ${x.troca && x.troca.id === a.id ? 'selected' : ''}>${esc(a.nome)}</option>`).join('')}</select></label></li>`;
            }).join('')}</ul></div>`;
        }).join('') : `<p class="vazio" style="padding:4px 0">${ids.some((id) => elenco.situacaoDe(id)) ? 'Os atletas em acompanhamento de saúde não têm conflito com estes exercícios.' : 'Ninguém com lesão ou restrição ativa neste grupo.'}</p>`}
        <p class="hint">A troca vale só para este treino e respeita as restrições e a região do corpo cadastradas na Saúde do elenco.</p>
      </section>

      ${temKg ? `<details class="card an-como" ${est.cargasAbertas ? 'open' : ''} id="bb-cargas"><summary>Cargas individuais (kg)</summary>
        <p class="hint" style="margin:8px 0">Deixe em branco para usar a carga do plano.</p>
        <div class="table-scroll"><table class="an-tab bb-tab"><thead><tr><th>Atleta</th>${base.filter((x) => x.it.carga === 'kg').map((x) => `<th class="r">${x.i + 1}. ${esc(x.e.nome.split(' ').slice(0, 2).join(' '))}</th>`).join('')}</tr></thead>
        <tbody>${ids.map((id) => { const itens = P.itensDoAtleta(p, id); return `<tr><td><b>${esc(prim(id))}</b></td>${itens.filter((x) => x.it.carga === 'kg').map((x) => `<td class="r"><input class="input sm num" type="number" min="0" max="400" step="0.5" style="width:84px" data-kg="${id}|${x.i}" value="${x.kg == null ? '' : x.kg}" aria-label="Carga de ${esc(prim(id))} em ${esc(x.efetivo.nome)}"></td>`).join('')}</tr>`; }).join('')}</tbody></table></div></details>` : ''}

      <section class="card" aria-labelledby="bb-cp-t">
        <div class="card-head"><h2 id="bb-cp-t">Copiar para enviar</h2></div>
        <div class="bb-copia"><div class="field"><label class="label" for="bb-cp-quem">Versão</label><select class="select" id="bb-cp-quem"><option value="turma">${p.alvo.tipo === 'turma' ? 'Treino da turma (padrão)' : 'Treino padrão'}</option>${ids.map((id) => `<option value="${id}" ${copiaAlvo === id ? 'selected' : ''}>${esc(ATLETAS[id].nome)}${rc[id] ? ' (com trocas)' : ''}</option>`).join('')}</select></div>
          <button class="btn btn-primary" id="bb-copiar">Copiar texto</button></div>
        <pre class="bb-pre" id="bb-texto" tabindex="0" aria-label="Texto do treino">${esc(textoTreino(p, copiaAlvo === 'turma' ? null : copiaAlvo))}</pre>
        <p class="hint" id="bb-cp-msg" role="status"></p>
      </section>`;

    const $ = (s) => el.querySelector(s);
    const re = (foco) => { est.cargasAbertas = !!(el.querySelector('#bb-cargas') || {}).open; const y = window.scrollY; render(raiz, foco); window.scrollTo({ top: y }); };
    $('#bb-voltar').addEventListener('click', () => { est.sel = null; est.aviso = ''; render(raiz); window.scrollTo({ top: 0 }); });
    $('#bb-feita').addEventListener('click', () => {
      if (p.status === 'feita') { P.reabrir(p.id); est.aviso = 'Prescrição reaberta.'; re('#bb-feita'); return; }
      if (p.sessao) { P.atualizarPrescricao(p.id, { status: 'feita' }); est.aviso = 'Prescrição marcada como feita.'; re('#bb-feita'); return; }
      const c = $('#bb-exec'); c.scrollIntoView({ behavior: 'smooth', block: 'center' }); $('#bb-ex-dur').focus({ preventScroll: true });
    });
    ligarExec(el, p, re);
    if (est.focoExec) { est.focoExec = false; const c = $('#bb-exec'); if (c) { c.scrollIntoView({ block: 'center' }); const f = $('#bb-ex-dur'); if (f) f.focus({ preventScroll: true }); } }
    const sg = $('#bb-sugerir'); if (sg) sg.addEventListener('click', () => { P.sugerirTrocas(p.id); est.aviso = 'Trocas sugeridas aplicadas. Revise cada uma antes de enviar.'; re('#bb-sugerir'); });
    el.querySelectorAll('[data-troca]').forEach((s) => s.addEventListener('change', () => { const [id, i] = s.dataset.troca.split('|'); P.trocar(p.id, id, Number(i), s.value || null); est.aviso = ''; re(`[data-troca="${s.dataset.troca}"]`); }));
    el.querySelectorAll('[data-kg]').forEach((inp) => inp.addEventListener('change', () => { const [id, i] = inp.dataset.kg.split('|'); P.carga(p.id, id, Number(i), inp.value === '' ? null : Number(inp.value)); re(`[data-kg="${inp.dataset.kg}"]`); }));
    $('#bb-cp-quem').addEventListener('change', (e) => { est.copia = e.target.value; $('#bb-texto').textContent = textoTreino(p, est.copia === 'turma' ? null : est.copia); });
    $('#bb-copiar').addEventListener('click', () => {
      const t = $('#bb-texto').textContent, msg = $('#bb-cp-msg');
      const falhou = () => { msg.textContent = 'Não consegui copiar sozinho. Selecione o texto acima e copie.'; };
      try { navigator.clipboard.writeText(t).then(() => { msg.textContent = 'Texto copiado.'; }, falhou); } catch (e) { falhou(); }
    });
  }

  /* ====================================================================
     PLANOS DE TREINO
     ==================================================================== */

  function distCat(m) {
    const c = {};
    m.itens.forEach((it) => { const e = P.ex(it.ex); if (e) c[e.cat] = (c[e.cat] || 0) + it.series; });
    return c;
  }
  const COR_CAT = { forca: 'var(--s-fisico)', potencia: 'var(--s-tatica)', core: 'var(--s-tecnica)', prevencao: 'var(--s-jogo)', mobilidade: 'var(--s-recuperacao)', cond: 'var(--beam)' };

  function cartaoPlano(m) {
    const d = distCat(m), tot = Object.values(d).reduce((a, v) => a + v, 0) || 1;
    const conf = est.confirma === `m:${m.id}`;
    const fase = m.fase ? dados.FASES[m.fase] : null;
    return `<article class="bb-plano">
      <div class="bb-plano-h"><b>${esc(m.nome)}</b>${fase ? `<span class="ix-chip" style="border-color:var(${fase.cor})">${esc(fase.nome)}</span>` : ''}</div>
      <p class="bb-obj">${esc(m.objetivo)}</p>
      <div class="stack" style="height:10px" role="img" aria-label="Séries por categoria: ${esc(Object.entries(d).map(([k, v]) => `${P.CATEGORIAS[k]} ${v}`).join(', '))}">${Object.entries(d).map(([k, v]) => `<i style="width:${(v / tot) * 100}%;background:${COR_CAT[k]}"></i>`).join('')}</div>
      <ul class="bb-legenda">${Object.entries(d).map(([k, v]) => `<li><span class="dot" style="background:${COR_CAT[k]};margin:0"></span>${esc(P.CATEGORIAS[k])} <b class="num">${v}</b></li>`).join('')}</ul>
      <p class="bb-meta num">${plural(m.itens.length, 'exercício', 'exercícios')} · ${plural(tot, 'série', 'séries')} · cerca de ${P.minutos(m)} min</p>
      <div class="actions">
        <button class="btn btn-sm btn-primary" data-prescrever="${m.id}">Prescrever</button>
        <button class="btn btn-sm" data-editar-plano="${m.id}">Editar</button>
        <button class="btn btn-sm" data-dup="${m.id}">Duplicar</button>
        ${conf ? `<button class="btn btn-sm btn-danger" data-exc-ok="m:${m.id}">Excluir mesmo</button><button class="btn btn-sm" data-exc-no>Manter</button>` : `<button class="link-btn" data-exc="m:${m.id}" style="margin:0" aria-label="Excluir o plano ${esc(m.nome)}">Excluir</button>`}
      </div></article>`;
  }

  const optsEx = (sel) => Object.entries(P.CATEGORIAS).map(([k, n]) => `<optgroup label="${esc(n)}">${P.exercicios().filter((e) => e.cat === k).map((e) => `<option value="${e.id}" ${sel === e.id ? 'selected' : ''}>${esc(e.nome)}</option>`).join('')}</optgroup>`).join('');

  function editor(el) {
    const m = est.ed;
    const novo = !m.id;
    el.innerHTML = `
      <section class="card sd-form" aria-labelledby="bb-ed-t">
        <div class="card-head"><h2 id="bb-ed-t">${novo ? 'Novo plano de treino' : `Editar ${esc(m.nome)}`}</h2><span class="label num">cerca de ${P.minutos(m)} min</span></div>
        <form id="bb-ed" novalidate>
          <div class="form-grid sd-grid">
            <div class="field"><label class="label" for="ed-nome">Nome</label><input class="input" id="ed-nome" value="${esc(m.nome)}" maxlength="60" placeholder="Força de base, inferiores"></div>
            <div class="field"><label class="label" for="ed-fase">Fase do ciclo <small>(opcional)</small></label><select class="select" id="ed-fase"><option value="">Qualquer fase</option>${Object.entries(dados.FASES).map(([k, f]) => `<option value="${k}" ${m.fase === k ? 'selected' : ''}>${esc(f.nome)}</option>`).join('')}</select></div>
            <div class="field"><label class="label" for="ed-obj">Objetivo</label><input class="input" id="ed-obj" value="${esc(m.objetivo)}" maxlength="140" placeholder="O que este treino desenvolve"></div>
          </div>
          <div class="table-scroll"><table class="an-tab bb-ed-tab">
            <thead><tr><th>#</th><th>Exercício</th><th class="r">Séries</th><th>Reps ou tempo</th><th>Carga</th><th class="r">Descanso (s)</th><th>Obs.</th><th aria-label="Ações"></th></tr></thead>
            <tbody>${m.itens.map((it, i) => `<tr>
              <td class="num">${i + 1}</td>
              <td><select class="select sm" data-f="ex" data-i="${i}" aria-label="Exercício ${i + 1}" style="min-width:210px">${optsEx(it.ex)}</select></td>
              <td class="r"><input class="input sm num" data-f="series" data-i="${i}" type="number" min="1" max="12" value="${it.series}" style="width:64px" aria-label="Séries do exercício ${i + 1}"></td>
              <td><input class="input sm" data-f="reps" data-i="${i}" value="${esc(it.reps)}" maxlength="14" style="width:96px" placeholder="8, 30s…" aria-label="Repetições do exercício ${i + 1}"></td>
              <td><span class="bb-carga"><select class="select sm" data-f="carga" data-i="${i}" aria-label="Tipo de carga do exercício ${i + 1}" style="min-width:0">${Object.entries(P.CARGAS).map(([k, n]) => `<option value="${k}" ${it.carga === k ? 'selected' : ''}>${n}</option>`).join('')}</select>
                ${it.carga === 'pc' ? '' : `<input class="input sm num" data-f="valor" data-i="${i}" type="number" min="0" max="${it.carga === 'pse' ? 10 : 400}" step="${it.carga === 'kg' ? 0.5 : 1}" value="${it.valor == null ? '' : it.valor}" style="width:70px" placeholder="${it.carga === 'kg' ? 'por atleta' : ''}" aria-label="Valor da carga do exercício ${i + 1}">`}</span></td>
              <td class="r"><input class="input sm num" data-f="desc" data-i="${i}" type="number" min="0" max="600" step="5" value="${it.desc || 0}" style="width:74px" aria-label="Descanso do exercício ${i + 1}"></td>
              <td><input class="input sm" data-f="obs" data-i="${i}" value="${esc(it.obs)}" maxlength="80" style="min-width:120px" aria-label="Observação do exercício ${i + 1}"></td>
              <td class="bb-ord"><button type="button" class="btn btn-icon btn-sm" data-sobe="${i}" aria-label="Subir o exercício ${i + 1}" ${i === 0 ? 'disabled' : ''}>↑</button><button type="button" class="btn btn-icon btn-sm" data-desce="${i}" aria-label="Descer o exercício ${i + 1}" ${i === m.itens.length - 1 ? 'disabled' : ''}>↓</button><button type="button" class="btn btn-icon btn-sm btn-danger" data-rem="${i}" aria-label="Remover o exercício ${i + 1}">×</button></td></tr>`).join('')}</tbody></table></div>
          <div class="actions" style="margin:12px 0"><label class="label" for="ed-add" style="margin:0">Adicionar</label>
            <select class="select sm" id="ed-add" style="min-width:230px"><option value="">Escolha um exercício…</option>${optsEx('')}</select></div>
          ${m.erro ? `<p class="sd-erro" role="alert">${esc(m.erro)}</p>` : ''}
          <div class="actions"><button class="btn btn-primary" type="submit">Salvar plano de treino</button><button class="btn" type="button" id="ed-cancela">Cancelar</button></div>
        </form></section>`;
    const $ = (s) => el.querySelector(s);
    const lerTudo = () => {
      m.nome = $('#ed-nome').value.trim(); m.fase = $('#ed-fase').value || null; m.objetivo = $('#ed-obj').value.trim();
      el.querySelectorAll('[data-f]').forEach((x) => {
        const it = m.itens[Number(x.dataset.i)], f = x.dataset.f;
        if (f === 'series') it.series = Math.max(1, Math.min(12, Number(x.value) || 1));
        else if (f === 'desc') it.desc = Math.max(0, Number(x.value) || 0);
        else if (f === 'valor') it.valor = x.value === '' ? null : Number(x.value);
        else it[f] = x.value;
      });
    };
    const re = (foco) => { lerTudo(); const y = window.scrollY; render(raiz, foco); window.scrollTo({ top: y }); };
    el.querySelectorAll('[data-f]').forEach((x) => x.addEventListener('change', () => { if (x.dataset.f === 'carga') { lerTudo(); if (m.itens[Number(x.dataset.i)].carga === 'pc') m.itens[Number(x.dataset.i)].valor = null; render(raiz, `[data-f="carga"][data-i="${x.dataset.i}"]`); } else lerTudo(); }));
    $('#ed-add').addEventListener('change', (e) => { if (!e.target.value) return; lerTudo(); m.itens.push({ ex: e.target.value, series: 3, reps: '10', carga: 'pc', valor: null, desc: 60, obs: '' }); render(raiz, '#ed-add'); });
    el.querySelectorAll('[data-sobe]').forEach((b) => b.addEventListener('click', () => { lerTudo(); const i = Number(b.dataset.sobe); [m.itens[i - 1], m.itens[i]] = [m.itens[i], m.itens[i - 1]]; render(raiz, `[data-sobe="${i - 1}"]`); }));
    el.querySelectorAll('[data-desce]').forEach((b) => b.addEventListener('click', () => { lerTudo(); const i = Number(b.dataset.desce); [m.itens[i + 1], m.itens[i]] = [m.itens[i], m.itens[i + 1]]; render(raiz, `[data-desce="${i + 1}"]`); }));
    el.querySelectorAll('[data-rem]').forEach((b) => b.addEventListener('click', () => { lerTudo(); m.itens.splice(Number(b.dataset.rem), 1); render(raiz, '#ed-add'); }));
    $('#ed-cancela').addEventListener('click', () => { est.ed = null; est.aviso = ''; re2(); });
    $('#bb-ed').addEventListener('submit', (e) => {
      e.preventDefault(); lerTudo();
      m.erro = m.nome.length < 3 ? 'Dê um nome ao plano.' : !m.itens.length ? 'Adicione ao menos um exercício.' : m.itens.some((it) => !String(it.reps).trim()) ? 'Informe as repetições ou o tempo de cada exercício.' : '';
      if (m.erro) { render(raiz, '.sd-erro'); return; }
      const { erro, ...limpo } = m; void erro;
      P.salvarPlano({ ...limpo, itens: m.itens.map((it) => ({ ...it, reps: String(it.reps).trim() })) });
      est.ed = null; est.aviso = `Plano “${m.nome}” salvo.`; re2();
    });
  }
  const re2 = () => { render(raiz); window.scrollTo({ top: 0 }); };

  function listaPlanos(el) {
    if (est.ed) { editor(el); return; }
    el.innerHTML = `
      <div class="sc-barra"><p class="sc-resumo" style="margin:0">Modelos de treino com séries, repetições, carga e descanso, prontos para prescrever.</p><button class="btn btn-primary" id="bb-novo-plano">Novo plano de treino</button></div>
      <div class="bb-planos">${P.planos().map(cartaoPlano).join('')}</div>`;
    const $ = (s) => el.querySelector(s);
    $('#bb-novo-plano').addEventListener('click', () => { est.ed = { id: null, nome: '', objetivo: '', fase: null, itens: [] }; est.aviso = ''; render(raiz, '#ed-nome'); });
    el.querySelectorAll('[data-editar-plano]').forEach((b) => b.addEventListener('click', () => { const m = P.plano(b.dataset.editarPlano); est.ed = { ...m, itens: m.itens.map((i) => ({ ...i })) }; est.aviso = ''; render(raiz, '#ed-nome'); window.scrollTo({ top: 0 }); }));
    el.querySelectorAll('[data-dup]').forEach((b) => b.addEventListener('click', () => { const c = P.duplicarPlano(b.dataset.dup); est.aviso = `Plano duplicado como “${c.nome}”.`; re2(); }));
    el.querySelectorAll('[data-prescrever]').forEach((b) => b.addEventListener('click', () => { est.aba = 'presc'; est.sel = null; est.form = novoFormPresc({ plano: b.dataset.prescrever }); est.aviso = ''; render(raiz, '#bb-sessao'); window.scrollTo({ top: 0 }); }));
    ligarExcluir(el, () => render(raiz));
  }

  /* ====================================================================
     CATÁLOGO
     ==================================================================== */

  function formEx() {
    const f = est.exForm, novo = !f.id;
    return `<section class="card sd-form" aria-labelledby="ex-f-t">
      <div class="card-head"><h2 id="ex-f-t">${novo ? 'Novo exercício' : `Editar ${esc(f.nome)}`}</h2></div>
      <form id="ex-form" novalidate>
        <div class="form-grid sd-grid">
          <div class="field"><label class="label" for="xf-nome">Nome</label><input class="input" id="xf-nome" value="${esc(f.nome)}" maxlength="70"></div>
          <div class="field"><label class="label" for="xf-cat">Categoria</label><select class="select" id="xf-cat">${Object.entries(P.CATEGORIAS).map(([k, n]) => `<option value="${k}" ${f.cat === k ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
          <div class="field"><label class="label" for="xf-equip">Equipamento</label><select class="select" id="xf-equip">${P.EQUIPS.map((n) => `<option ${f.equip === n ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
          <div class="field"><label class="label" for="xf-nivel">Nível</label><select class="select" id="xf-nivel">${Object.entries(P.NIVEIS).map(([k, n]) => `<option value="${k}" ${f.nivel === k ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
          <div class="field" style="grid-column:span 2"><label class="label" for="xf-video">Vídeo <small>(link do YouTube, Drive…)</small></label><input class="input" id="xf-video" type="url" value="${esc(f.video)}" placeholder="https://…"></div>
        </div>
        <fieldset class="sd-restr" style="margin-bottom:12px"><legend class="label">Grupos musculares</legend><div class="chips">${Object.entries(P.GRUPOS).map(([k, n]) => `<label class="chipcheck"><input type="checkbox" name="xf-g" value="${k}" ${f.grupos.includes(k) ? 'checked' : ''}> ${n}</label>`).join('')}</div></fieldset>
        <fieldset class="sd-restr" style="margin-bottom:12px"><legend class="label">Exige <small>(cruza com as restrições do atleta)</small></legend><div class="chips">${Object.entries(P.TAGS).map(([k, n]) => `<label class="chipcheck"><input type="checkbox" name="xf-t" value="${k}" ${f.tags.includes(k) ? 'checked' : ''}> ${n}</label>`).join('')}</div></fieldset>
        <fieldset class="sd-restr" style="margin-bottom:12px"><legend class="label">Pesa em <small>(cruza com a região da lesão)</small></legend><div class="chips">${Object.entries(P.REGIOES).map(([k, n]) => `<label class="chipcheck"><input type="checkbox" name="xf-r" value="${k}" ${f.regioes.includes(k) ? 'checked' : ''}> ${n}</label>`).join('')}</div></fieldset>
        <div class="field" style="margin-bottom:12px"><label class="label" for="xf-dica">Dica técnica</label><textarea class="input" id="xf-dica" rows="2" maxlength="220">${esc(f.dica)}</textarea></div>
        ${f.erro ? `<p class="sd-erro" role="alert">${esc(f.erro)}</p>` : ''}
        <div class="actions"><button class="btn btn-primary" type="submit">Salvar exercício</button><button class="btn" type="button" id="xf-cancela">Cancelar</button></div>
      </form></section>`;
  }

  function catalogo(el) {
    const F = est.filtro;
    const todos = P.exercicios();
    const lista = todos.filter((e) => (!F.cat || e.cat === F.cat) && (!F.grupo || e.grupos.includes(F.grupo)) && (!F.equip || e.equip === F.equip) && (!F.q || norm(`${e.nome} ${e.dica}`).includes(norm(F.q))));
    const card = (e) => {
      const uso = P.usoDoExercicio(e.id);
      const conf = est.confirma === `e:${e.id}`;
      const url = /^https?:\/\//i.test(e.video) ? e.video : '';
      return `<article class="bb-ex">
        <div class="bb-ex-h"><b>${esc(e.nome)}</b><span class="ix-chip" style="border-color:${COR_CAT[e.cat]}">${esc(P.CATEGORIAS[e.cat])}</span></div>
        <p class="bb-ex-g">${esc(e.grupos.map((g) => P.GRUPOS[g]).join(', '))} · ${esc(e.equip)} · ${esc(P.NIVEIS[e.nivel])}</p>
        ${e.tags.length || e.regioes.length ? `<p class="bb-ex-t">${e.tags.length ? `<span>Exige: ${esc(e.tags.map((t) => P.TAGS[t].toLowerCase()).join(', '))}</span>` : ''}${e.regioes.length ? `<span>Pesa em: ${esc(e.regioes.map((r) => P.REGIOES[r].toLowerCase()).join(', '))}</span>` : ''}</p>` : ''}
        <p class="bb-ex-d">${esc(e.dica)}</p>
        <div class="actions">
          ${url ? `<a class="btn btn-sm" href="${esc(url)}" target="_blank" rel="noopener noreferrer">Ver vídeo</a>` : `<button class="btn btn-sm" data-ed-ex="${e.id}">Adicionar vídeo</button>`}
          <button class="btn btn-sm" data-ed-ex="${e.id}">Editar</button>
          ${conf ? `<button class="btn btn-sm btn-danger" data-exc-ok="e:${e.id}">Excluir mesmo</button><button class="btn btn-sm" data-exc-no>Manter</button>`
            : uso.length ? `<small class="bb-uso">usado em ${plural(uso.length, 'plano', 'planos')}</small>` : `<button class="link-btn" data-exc="e:${e.id}" style="margin:0" aria-label="Excluir ${esc(e.nome)}">Excluir</button>`}
        </div></article>`;
    };
    el.innerHTML = `
      <div class="sc-barra"><p class="sc-resumo" style="margin:0">${plural(todos.length, 'exercício', 'exercícios')} no catálogo.</p>${est.exForm ? '' : '<button class="btn btn-primary" id="bb-novo-ex">Novo exercício</button>'}</div>
      ${est.exForm ? formEx() : ''}
      <div class="bb-filtros">
        <div class="field"><label class="label" for="cf-q">Buscar</label><input class="input" id="cf-q" type="search" value="${esc(F.q)}" placeholder="Agachamento, ombro, escada…"></div>
        <div class="field"><label class="label" for="cf-cat">Categoria</label><select class="select" id="cf-cat"><option value="">Todas</option>${Object.entries(P.CATEGORIAS).map(([k, n]) => `<option value="${k}" ${F.cat === k ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
        <div class="field"><label class="label" for="cf-grupo">Grupo muscular</label><select class="select" id="cf-grupo"><option value="">Todos</option>${Object.entries(P.GRUPOS).map(([k, n]) => `<option value="${k}" ${F.grupo === k ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
        <div class="field"><label class="label" for="cf-equip">Equipamento</label><select class="select" id="cf-equip"><option value="">Todos</option>${P.EQUIPS.map((n) => `<option ${F.equip === n ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
      </div>
      <p class="sc-resumo" role="status">${plural(lista.length, 'exercício encontrado', 'exercícios encontrados')}</p>
      ${lista.length ? `<div class="bb-exs">${lista.map(card).join('')}</div>` : '<p class="vazio">Nenhum exercício com esses filtros.</p>'}`;

    const $ = (s) => el.querySelector(s);
    const re = (foco) => { const y = window.scrollY; render(raiz, foco); window.scrollTo({ top: y }); };
    const q = $('#cf-q'); let t;
    q.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { F.q = q.value; const pos = q.selectionStart; render(raiz, '#cf-q'); const n = raiz.querySelector('#cf-q'); if (n) n.setSelectionRange(pos, pos); }, 200); });
    [['#cf-cat', 'cat'], ['#cf-grupo', 'grupo'], ['#cf-equip', 'equip']].forEach(([s, k]) => $(s).addEventListener('change', (e) => { F[k] = e.target.value; re(s); }));
    const nv = $('#bb-novo-ex'); if (nv) nv.addEventListener('click', () => { est.exForm = { id: null, nome: '', cat: 'forca', grupos: [], equip: P.EQUIPS[0], nivel: 'inic', tags: [], regioes: [], video: '', dica: '', erro: '' }; est.aviso = ''; render(raiz, '#xf-nome'); window.scrollTo({ top: 0 }); });
    el.querySelectorAll('[data-ed-ex]').forEach((b) => b.addEventListener('click', () => { const e = P.ex(b.dataset.edEx); est.exForm = { ...e, grupos: e.grupos.slice(), tags: e.tags.slice(), regioes: e.regioes.slice(), erro: '' }; est.aviso = ''; render(raiz, b.textContent === 'Adicionar vídeo' ? '#xf-video' : '#xf-nome'); window.scrollTo({ top: 0 }); }));
    ligarExcluir(el, () => render(raiz));
    const f = $('#ex-form'); if (!f) return;
    $('#xf-cancela').addEventListener('click', () => { est.exForm = null; re('#bb-novo-ex'); });
    f.addEventListener('submit', (e) => {
      e.preventDefault();
      const x = est.exForm, v = (s) => $(s).value;
      const checks = (n) => [...el.querySelectorAll(`input[name="${n}"]:checked`)].map((i) => i.value);
      Object.assign(x, { nome: v('#xf-nome').trim(), cat: v('#xf-cat'), equip: v('#xf-equip'), nivel: v('#xf-nivel'), video: v('#xf-video').trim(), dica: v('#xf-dica').trim(), grupos: checks('xf-g'), tags: checks('xf-t'), regioes: checks('xf-r') });
      x.erro = x.nome.length < 3 ? 'Dê um nome ao exercício.' : !x.grupos.length ? 'Marque ao menos um grupo muscular.' : x.video && !/^https?:\/\/\S+$/i.test(x.video) ? 'O vídeo precisa ser um link que comece com http:// ou https://.' : '';
      if (x.erro) { render(raiz, '.sd-erro'); return; }
      const { erro, ...limpo } = x; void erro;
      P.salvarExercicio(limpo);
      est.exForm = null; est.aviso = `Exercício “${x.nome}” salvo.`; re();
    });
  }

  /* ====================================================================
     TELA
     ==================================================================== */

  const ABAS = [['presc', 'Prescrições'], ['planos', 'Planos de treino'], ['cat', 'Catálogo']];

  let desenhando = false;
  function render(root, foco) {
    // Remover um campo em foco pode disparar `change` no meio do desenho; esse eco é ignorado.
    if (desenhando) return;
    desenhando = true;
    try { desenhar(root, foco); } finally { desenhando = false; }
  }

  function desenhar(root, foco) {
    raiz = root;
    if (est.sel && !P.presc(est.sel)) est.sel = null;
    if (est.sel && est.aba === 'presc') {
      root.innerHTML = '<div class="corpo" id="bb-corpo"></div>';
      detalhe(root.querySelector('#bb-corpo'), P.presc(est.sel));
      return;
    }
    root.innerHTML = `
      <header class="page-head">
        <div>${window.Farol.conta.guardaDados() ? '' : '<span class="chip" style="margin-bottom:10px">Dados de exemplo</span>'}
          <h1>Exercícios e prescrição</h1>
          <p class="lead">Catálogo de exercícios, modelos de treino físico e a prescrição para turmas e atletas, já cruzada com lesões e restrições.</p></div>
      </header>
      <div class="tabs" role="tablist" aria-label="Áreas">
        ${ABAS.map(([k, n]) => `<button class="tab" role="tab" data-aba-tab="${k}" id="bb-tab-${k}" aria-selected="${k === est.aba}" aria-controls="bb-corpo" tabindex="${k === est.aba ? 0 : -1}"><span class="tab-nome">${n}</span></button>`).join('')}
      </div>
      ${est.aviso ? `<div class="aviso-ok" role="status">${esc(est.aviso)}</div>` : ''}
      <div id="bb-corpo" class="corpo" role="tabpanel" aria-labelledby="bb-tab-${est.aba}"></div>`;
    const corpo = root.querySelector('#bb-corpo');
    if (est.aba === 'presc') listaPresc(corpo); else if (est.aba === 'planos') listaPlanos(corpo); else catalogo(corpo);
    root.querySelectorAll('[data-aba-tab]').forEach((b, i, todos) => {
      b.addEventListener('click', () => { est.aba = b.dataset.abaTab; est.aviso = ''; est.sel = null; render(root, `#bb-tab-${est.aba}`); });
      b.addEventListener('keydown', (e) => {
        const passo = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (!passo) return;
        e.preventDefault(); est.aba = todos[(i + passo + todos.length) % todos.length].dataset.abaTab; est.aviso = ''; est.sel = null; render(root, `#bb-tab-${est.aba}`);
      });
    });
    if (foco) { const f = root.querySelector(foco); if (f) f.focus({ preventScroll: true }); }
  }

  window.Farol.views = window.Farol.views || {};
  window.Farol.views['treinos-biblioteca'] = (root, params) => {
    est.aviso = ''; est.confirma = null;
    if (params && params.aba) { est.aba = params.aba; est.sel = null; }
    if (params && params.prescricao) { est.aba = 'presc'; est.sel = params.prescricao; }
    else if (!(params && params.manter)) est.sel = null;
    if (params && params.nova) {
      est.aba = 'presc'; est.sel = null;
      const n = params.nova, pl = dados.plano(n.planoId);
      const sv = n.planoId ? `${n.planoId}|${n.semana}|${n.sessaoId}` : '';
      const s = sessaoDe(sv);
      est.form = novoFormPresc({ turmaId: pl ? pl.turma : 'sub18', tipo: 'turma', sessao: s ? sv : '', data: s ? iso(s.t) : iso(HOJE + 2 * 864e5) });
    }
    render(root);
  };
  void REG;
})();
