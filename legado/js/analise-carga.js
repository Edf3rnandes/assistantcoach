/* Análise > Carga: a carga interna de um atleta, de perto.
   - Velocímetro do ACWR na semana escolhida, com carga, monotonia, strain, PSE e PSR;
   - carga de cada dia da semana, separando treino de quadra e treino físico;
   - comparação de duas semanas do mesmo atleta (volume, carga, PSE, PSR, presença, monotonia e strain);
   - evolução das últimas semanas.
   Só entram semanas completas (todas as sessões de quadra registradas). As contas ficam em carga.js. */
(function () {
  const { esc, num, dec, dd, plural, media, DIA } = window.Farol.util;
  const { ATLETAS } = window.Farol.elenco;
  const C = window.Farol.carga;
  const A = () => window.Farol.analise;

  const DIAS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
  const est = { atleta: null, semana: null, a: null, b: null };

  const semData = (s) => `${dd(s.inicio)} a ${dd(s.inicio + 6 * DIA)}`;
  const rotSem = (s) => `S${s.n} · ${semData(s)}`;

  // Tudo o que a tela precisa de um atleta numa semana completa.
  function resumo(plano, idx, id) {
    const sem = plano.semanas[idx];
    const p = sem.registro.porAtleta[id];
    const dias = p.diasQ.map((v, i) => v + p.diasF[i]);
    const mono = C.monotonia(dias);
    const min = p.min + p.minF;
    return {
      sem, p, dias, min, carga: p.total, quadra: p.carga, fisica: p.fisica,
      mono, strain: mono != null ? Math.round(p.total * mono) : null,
      pse: media(p.pse), psr: media(p.psr), pres: p.sessoes ? (100 * p.presencas) / p.sessoes : null,
    };
  }

  /* ---------- Peças ---------- */

  const kpi = (rot, valor, sub) => `<div class="cg-kpi"><span class="label">${esc(rot)}</span><b class="num">${valor}</b>${sub ? `<small>${sub}</small>` : ''}</div>`;

  // Colunas de 7 dias, cada uma com a quadra embaixo e o físico em cima. Altura relativa ao maior valor dado.
  function colunasDia(r, max, cls = '') {
    return `<div class="cg-dias ${cls}" role="img" aria-label="Carga por dia: ${r.dias.map((v, i) => `${DIAS[i]} ${num(v)}`).join(', ')}">${r.dias.map((v, i) => {
      const q = r.p.diasQ[i], f = r.p.diasF[i];
      return `<div class="cg-dia" title="${DIAS[i]}: ${num(v)} UA${f ? ` (${num(q)} quadra + ${num(f)} físico)` : ''}">
        <span class="cg-pilha"><i class="cg-f" style="height:${(100 * f) / max}%"></i><i class="cg-q" style="height:${(100 * q) / max}%"></i></span>
        <small>${DIAS[i]}</small></div>`;
    }).join('')}</div>`;
  }

  const delta = (a, b, casas = 0, sufixo = '') => {
    if (a == null || b == null) return '<span class="cg-d">–</span>';
    const d = b - a;
    if (Math.abs(d) < Math.pow(10, -casas) / 2) return '<span class="cg-d">igual</span>';
    return `<span class="cg-d ${d > 0 ? 'sobe' : 'desce'}">${d > 0 ? '▲' : '▼'} ${Math.abs(d).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })}${sufixo}</span>`;
  };

  /* ---------- Tela ---------- */

  function montar(el, plano) {
    const a = A();
    const idx = a.semanasCompletas(plano);
    if (!idx.length) {
      el.innerHTML = `<section class="card an-vazio"><h2>Ainda não há dados para analisar</h2><p>A carga aparece quando houver semanas completas com registro de treino.</p></section>`;
      return;
    }
    if (!plano.atletas.includes(est.atleta)) est.atleta = plano.atletas[0];
    const kUlt = idx.length - 1;
    const pos = (v, padrao) => (v != null && v >= 0 && v <= kUlt ? v : padrao);
    est.semana = pos(est.semana, kUlt);
    est.b = pos(est.b, kUlt);
    est.a = pos(est.a, Math.max(0, kUlt - 1));
    const id = est.atleta;
    const nome = ATLETAS[id].nome;

    // série de cargas totais do atleta nas semanas completas
    const R = idx.map((i) => resumo(plano, i, id));
    const totais = R.map((r) => r.carga);
    const ac = C.acwr(totais, est.semana);
    const z = ac ? C.zona(ac.valor) : null;
    const r = R[est.semana];
    const maxDia = Math.max(...R.slice(-8).flatMap((x) => x.dias), 1);
    const maxSem = Math.max(...R.slice(-8).map((x) => x.carga), 1);
    const ra = R[est.a], rb = R[est.b];
    const maxCmp = Math.max(...ra.dias, ...rb.dias, 1);
    const ult8 = R.slice(-8);
    const treinos = r.p.treinosFisicos;

    const opSem = (sel) => idx.map((i, k) => `<option value="${k}" ${k === sel ? 'selected' : ''}>${esc(rotSem(plano.semanas[i]))}</option>`).join('');

    const interp = ac
      ? `${esc(nome.split(' ')[0])} está em <b>${z.nome.toLowerCase()}</b>: ${z.texto}. ${ac.provisorio ? `A base tem só ${plural(ac.base, 'semana anterior', 'semanas anteriores')}, então o número é <b>provisório</b>.` : 'Base de 4 semanas anteriores.'}`
      : 'Ainda não há semana anterior para comparar: o ACWR aparece a partir da 2ª semana registrada.';

    el.innerHTML = `
      <section class="card" aria-labelledby="cg-t">
        <div class="card-head"><div><h2 id="cg-t">Carga do atleta</h2><p class="gf-sub">Quadra e treino físico somados, em UA (duração × PSE).</p></div></div>
        <div class="cg-filtros">
          <div class="field"><label class="label" for="cg-atleta">Atleta</label>
            <select class="select" id="cg-atleta">${plano.atletas.map((x) => `<option value="${x}" ${x === id ? 'selected' : ''}>${esc(ATLETAS[x].nome)}</option>`).join('')}</select></div>
          <div class="field"><label class="label" for="cg-semana">Semana</label>
            <select class="select" id="cg-semana">${opSem(est.semana)}</select></div>
        </div>
        <div class="cg-topo">
          ${C.velocimetro(ac ? ac.valor : null, { nota: ac ? `carga da semana ÷ média de ${plural(ac.base, 'semana anterior', 'semanas anteriores')}${ac.provisorio ? ' · provisório' : ''}` : 'sem semana anterior' })}
          <div class="cg-kpis">
            ${kpi('Carga na semana', `${num(r.carga)}<small> UA</small>`, r.fisica ? `${num(r.quadra)} de quadra + ${num(r.fisica)} de físico` : 'só treino de quadra')}
            ${kpi('Tempo treinado', `${Math.round(r.min)}<small> min</small>`, r.p.minF ? `${Math.round(r.p.minF)} min de físico` : '')}
            ${kpi('Monotonia', r.mono == null ? 'n/d' : dec(r.mono, 1), r.mono == null ? 'precisa de 4 dias com treino' : r.mono > 2 ? 'alta: dias parecidos demais' : 'dentro do esperado')}
            ${kpi('Strain', r.strain == null ? 'n/d' : num(r.strain), 'carga × monotonia')}
            ${kpi('PSE · PSR', `${r.pse == null ? '–' : dec(r.pse)} · ${r.psr == null ? '–' : dec(r.psr)}`, 'esforço · recuperação')}
          </div>
        </div>
        <p class="cg-interp" role="status">${interp}</p>
        <div class="cg-escala" aria-hidden="true">${C.ZONAS.map((q) => `<span class="gv-t-${q.id}">${q.nome} <small>${q.id === 'destreino' ? 'até 0,8' : q.id === 'otimo' ? '0,8 a 1,3' : q.id === 'risco' ? '1,3 a 1,5' : 'acima de 1,5'}</small></span>`).join('')}</div>
      </section>

      <section class="card" aria-labelledby="cg-dia-t">
        <div class="card-head"><h2 id="cg-dia-t">Carga por dia</h2><span class="label">${esc(rotSem(r.sem))}</span></div>
        ${colunasDia(r, Math.max(...r.dias, 1))}
        <div class="cg-leg"><span><i class="cg-q"></i>Quadra</span><span><i class="cg-f"></i>Treino físico</span></div>
        ${treinos.length ? `<ul class="ix-ul cg-fis">${treinos.map((t) => `<li class="ix-li"><span class="ix-sel ok">Físico</span><div class="ix-li-m"><b>${esc(t.nome)}</b><small class="num">${DIAS[Math.floor((t.data - r.sem.inicio) / DIA)]} ${dd(t.data)} · ${t.dur} min · PSE ${t.pse}</small></div><b class="num">${num(t.carga)} UA</b></li>`).join('')}</ul>`
          : '<p class="hint" style="margin:8px 0 0">Nenhum treino físico lançado nesta semana. Ao marcar uma prescrição como feita (Exercícios e prescrição), a duração e o PSE entram aqui e na carga total.</p>'}
      </section>

      <section class="card" aria-labelledby="cg-cmp-t">
        <div class="card-head"><h2 id="cg-cmp-t">Comparar duas semanas</h2><span class="label">${esc(nome.split(' ')[0])}</span></div>
        <div class="cg-filtros">
          <div class="field"><label class="label" for="cg-a">Semana A</label><select class="select" id="cg-a">${opSem(est.a)}</select></div>
          <div class="field"><label class="label" for="cg-b">Semana B</label><select class="select" id="cg-b">${opSem(est.b)}</select></div>
          <button class="btn btn-sm" id="cg-troca" type="button" aria-label="Trocar A e B">⇄ Trocar</button>
        </div>
        <div class="cg-par">
          <div><span class="cg-par-t"><i class="cg-pa"></i>A · S${ra.sem.n}</span>${colunasDia(ra, maxCmp, 'a')}</div>
          <div><span class="cg-par-t"><i class="cg-pb"></i>B · S${rb.sem.n}</span>${colunasDia(rb, maxCmp, 'b')}</div>
        </div>
        <div class="table-scroll"><table class="an-tab cg-tab">
          <thead><tr><th>Medida</th><th class="r">A</th><th class="r">B</th><th class="r">B − A</th></tr></thead>
          <tbody>
            <tr><td>Carga total (UA)</td><td class="r num">${num(ra.carga)}</td><td class="r num">${num(rb.carga)}</td><td class="r">${delta(ra.carga, rb.carga, 0)}</td></tr>
            <tr><td>&nbsp;&nbsp;de quadra</td><td class="r num">${num(ra.quadra)}</td><td class="r num">${num(rb.quadra)}</td><td class="r">${delta(ra.quadra, rb.quadra, 0)}</td></tr>
            <tr><td>&nbsp;&nbsp;de físico</td><td class="r num">${num(ra.fisica)}</td><td class="r num">${num(rb.fisica)}</td><td class="r">${delta(ra.fisica, rb.fisica, 0)}</td></tr>
            <tr><td>Volume (min)</td><td class="r num">${Math.round(ra.min)}</td><td class="r num">${Math.round(rb.min)}</td><td class="r">${delta(ra.min, rb.min, 0)}</td></tr>
            <tr><td>PSE médio</td><td class="r num">${ra.pse == null ? '–' : dec(ra.pse)}</td><td class="r num">${rb.pse == null ? '–' : dec(rb.pse)}</td><td class="r">${delta(ra.pse, rb.pse, 1)}</td></tr>
            <tr><td>PSR médio</td><td class="r num">${ra.psr == null ? '–' : dec(ra.psr)}</td><td class="r num">${rb.psr == null ? '–' : dec(rb.psr)}</td><td class="r">${delta(ra.psr, rb.psr, 1)}</td></tr>
            <tr><td>Presença (%)</td><td class="r num">${ra.pres == null ? '–' : Math.round(ra.pres)}</td><td class="r num">${rb.pres == null ? '–' : Math.round(rb.pres)}</td><td class="r">${delta(ra.pres, rb.pres, 0)}</td></tr>
            <tr><td>Monotonia</td><td class="r num">${ra.mono == null ? '–' : dec(ra.mono, 1)}</td><td class="r num">${rb.mono == null ? '–' : dec(rb.mono, 1)}</td><td class="r">${delta(ra.mono, rb.mono, 1)}</td></tr>
            <tr><td>Strain</td><td class="r num">${ra.strain == null ? '–' : num(ra.strain)}</td><td class="r num">${rb.strain == null ? '–' : num(rb.strain)}</td><td class="r">${delta(ra.strain, rb.strain, 0)}</td></tr>
          </tbody>
        </table></div>
        <p class="hint">PSR: 10 é totalmente recuperado, então subir é bom. Carga maior não é melhor nem pior por si só: o que importa é o ritmo em que ela muda.</p>
      </section>

      <section class="card" aria-labelledby="cg-ev-t">
        <div class="card-head"><h2 id="cg-ev-t">Últimas semanas</h2><span class="label">carga total por semana</span></div>
        <div class="cg-evo" role="img" aria-label="Carga das últimas ${ult8.length} semanas: ${ult8.map((x) => `S${x.sem.n} ${num(x.carga)}`).join(', ')}">${ult8.map((x, k) => {
          const kk = R.length - ult8.length + k;
          const info = C.acwr(totais, kk);
          return `<button class="cg-sem ${kk === est.semana ? 'sel' : ''}" data-semana="${kk}" title="S${x.sem.n}: ${num(x.carga)} UA${info ? ` · ACWR ${dec(info.valor, 2)}` : ''}" aria-label="Semana ${x.sem.n}, ${num(x.carga)} UA${info ? `, ACWR ${dec(info.valor, 2)}` : ''}">
            <span class="cg-pilha"><i class="cg-f" style="height:${(100 * x.fisica) / maxSem}%"></i><i class="cg-q" style="height:${(100 * x.quadra) / maxSem}%"></i></span>
            <b class="num">${num(x.carga)}</b><small>S${x.sem.n}</small>
            ${info ? `<em class="cg-pt gv-t-${C.zona(info.valor).id}" aria-hidden="true">${dec(info.valor, 2)}</em>` : '<em class="cg-pt" aria-hidden="true">–</em>'}</button>`;
        }).join('')}</div>
        <p class="hint">O número abaixo de cada coluna é o ACWR da semana. Toque numa coluna para ver o velocímetro dela. Semanas com menos de 4 semanas de base são provisórias.</p>
      </section>`;

    const rer = (foco) => { const y = window.scrollY; montar(el, plano); window.scrollTo({ top: y }); if (foco) { const f = el.querySelector(foco); if (f) f.focus({ preventScroll: true }); } };
    el.querySelector('#cg-atleta').addEventListener('change', (e) => { est.atleta = e.target.value; rer('#cg-atleta'); });
    el.querySelector('#cg-semana').addEventListener('change', (e) => { est.semana = Number(e.target.value); rer('#cg-semana'); });
    el.querySelector('#cg-a').addEventListener('change', (e) => { est.a = Number(e.target.value); rer('#cg-a'); });
    el.querySelector('#cg-b').addEventListener('change', (e) => { est.b = Number(e.target.value); rer('#cg-b'); });
    el.querySelector('#cg-troca').addEventListener('click', () => { [est.a, est.b] = [est.b, est.a]; rer('#cg-troca'); });
    el.querySelectorAll('[data-semana]').forEach((b) => b.addEventListener('click', () => { est.semana = Number(b.dataset.semana); rer(`[data-semana="${est.semana}"]`); }));
  }

  window.Farol.analiseCarga = { montar, definir(atletaId) { est.atleta = atletaId; est.semana = null; } };
})();
