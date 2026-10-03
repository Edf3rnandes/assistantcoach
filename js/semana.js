/* Resposta da semana (tabelas previstas: `pse_sessao` e `wellness_diario`)
   Como os atletas estão respondendo à semana do microciclo, sessão por sessão:
   - quadro atleta × sessão com PSE e PSR (o que o professor registrou ou o que o atleta relatou pelo link da turma);
   - carga da semana, carga contra o plano, ACWR, monotonia e bem-estar (dor, sono e disposição);
   - semáforo por atleta, com os motivos à vista, e quem já está em acompanhamento de saúde;
   - lançamento em lote pelo técnico: escolhe o valor e toca nos atletas;
   - gráfico do PSE e do PSR médios contra o PSE planejado de cada sessão.
   Tudo é calculado dos registros e das respostas; as regras do semáforo ficam escritas na própria tela. */
(function () {
  const { dados, util, elenco, registros: REG, graficos: G, analise: A } = window.Farol;
  const { esc, num, dec, dd, plural, media, HOJE, DIA } = util;
  const { ATLETAS } = elenco;
  const { TIPOS_SESSAO, DIAS } = dados;

  const TURNO = { manha: 'manhã', tarde: 'tarde', noite: 'noite' };
  const ORD = { manha: 0, tarde: 1, noite: 2 };
  const est = { sem: null, lote: null, loteAberto: false, aviso: '' };
  let raiz = null;

  const prim = (id) => ATLETAS[id].nome.split(' ')[0];
  const dataSes = (semana, s) => semana.inicio + s.dia * DIA;
  const sinal = (v) => (v > 0 ? '+' : v < 0 ? '−' : '');

  /* ---------- Cálculo ---------- */

  function montar(plano, semana) {
    const sess = semana.sessoes.slice().sort((a, b) => a.dia - b.dia || ORD[a.turno] - ORD[b.turno]);
    const cols = sess.map((s) => {
      const st = REG.estado(plano, semana, s);
      return { s, st, data: dataSes(semana, s), reg: st === 'registrado' ? REG.obter(plano, semana, s) : null, resp: st === 'aguardando' ? REG.respostas(plano, semana, s) : {} };
    });
    const passadas = cols.filter((c) => c.st !== 'futuro');
    const cargaPlano = passadas.reduce((a, c) => a + c.s.dur * c.s.pse, 0);
    const alvoPse = passadas.length ? passadas.reduce((a, c) => a + c.s.dur * c.s.pse, 0) / passadas.reduce((a, c) => a + c.s.dur, 0) : null;
    const completa = cols.length > 0 && cols.every((c) => c.st === 'registrado');
    const k = plano.semanas.indexOf(semana);
    const previas = plano.semanas.slice(0, k).filter((w) => w.registro && w.registro.completo).slice(-4);

    const linhas = plano.atletas.map((id) => {
      const celulas = cols.map((c) => {
        if (c.st === 'registrado') {
          const pres = c.reg.presenca[id];
          return pres === 'presente' ? { k: 'reg', pse: c.reg.pse[id], psr: c.reg.psr[id], dur: c.reg.duracao } : { k: 'falta', just: pres === 'justificada' };
        }
        if (c.st === 'aguardando') {
          const r = c.resp[id];
          if (!r) return { k: 'pend' };
          return r.faltou ? { k: 'rfalta' } : { k: 'rel', pse: r.pse, psr: r.psr, dor: r.dor, sono: r.sono, disp: r.disp, dur: c.s.dur };
        }
        return { k: c.st === 'futuro' ? 'fut' : 'sem' };
      });
      const dados_ = celulas.filter((c) => c.k === 'reg' || c.k === 'rel');
      const dias = [0, 0, 0, 0, 0, 0, 0];
      let carga = 0;
      celulas.forEach((c, i) => { if ((c.k === 'reg' || c.k === 'rel') && c.pse != null) { const v = c.dur * c.pse; carga += v; dias[cols[i].s.dia] += v; } });
      const pses = dados_.map((c) => c.pse).filter((v) => v != null), psrs = dados_.map((c) => c.psr).filter((v) => v != null);
      const respondidas = celulas.filter((c) => ['reg', 'rel', 'falta', 'rfalta'].includes(c.k)).length;
      const pres = celulas.filter((c) => c.k === 'reg' || c.k === 'rel').length;
      const rel = celulas.filter((c) => c.k === 'rel');
      const dor = rel.length ? Math.max(...rel.map((c) => c.dor || 0)) : null;
      const ultimoRel = rel[rel.length - 1];
      const sono = ultimoRel ? ultimoRel.sono : null, disp = ultimoRel ? ultimoRel.disp : null;
      const cron = previas.length >= 3 ? media(previas.map((w) => w.registro.porAtleta[id].carga)) : null;
      const diasComCarga = dias.filter((v) => v > 0).length;
      const dsv = A.desvio(dias);
      const monotonia = diasComCarga >= 4 && dsv > 0 ? media(dias) / dsv : null;
      const acwr = cron && completa ? carga / cron : null;
      const pseM = media(pses), psrM = media(psrs);
      const pctPres = respondidas >= 3 ? (100 * pres) / respondidas : null;
      const sit = window.Farol.elenco.situacaoDe(id);

      const motivos = [];
      const add = (nivel, texto) => motivos.push({ nivel, texto });
      if (dor === 3) add('crit', 'Relatou dor forte');
      else if (dor === 2) add('warn', 'Relatou dor moderada');
      if (psrM != null && psrM <= 5 && pseM != null && alvoPse != null && pseM - alvoPse >= 0.5) add('crit', 'PSR baixo e PSE acima do alvo');
      else if (psrM != null && psrM <= 5.5) add('warn', 'PSR baixo');
      if (acwr != null && acwr > 1.5) add('crit', `ACWR alto (${dec(acwr, 2)})`);
      else if (acwr != null && (acwr > A.FAIXA_ACWR.ate || acwr < A.FAIXA_ACWR.de)) add('warn', `ACWR fora da faixa (${dec(acwr, 2)})`);
      if (sono != null && sono <= 2) add('warn', 'Dormiu mal');
      if (disp != null && disp <= 2) add('warn', 'Pouca disposição');
      if (pctPres != null && pctPres < 60) add('warn', 'Presença abaixo de 60%');
      if (monotonia != null && monotonia > 2) add('warn', 'Semana monótona');
      const nivel = motivos.some((m) => m.nivel === 'crit') ? 'crit' : motivos.length ? 'warn' : 'ok';
      return { id, celulas, carga, pctPlano: cargaPlano && respondidas ? (100 * carga) / cargaPlano : null, pseM, psrM, acwr, monotonia, dor, sono, disp, pctPres, motivos, nivel, sit, respondidas };
    });
    return { plano, semana, cols, linhas, cargaPlano, alvoPse, completa };
  }

  /* ---------- Peças ---------- */

  const ICO = {
    ok: '<svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M4.8 8.3l2.2 2.2 4.2-4.6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    warn: '<svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.8l6.6 11.6H1.4z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M8 6.4v3.2M8 11.4v.1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    crit: '<svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><path d="M5.2 1.6h5.6l3.6 3.6v5.6l-3.6 3.6H5.2L1.6 10.8V5.2z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M8 5v3.8M8 10.8v.1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  };
  const NOME_NIVEL = { ok: 'Em dia', warn: 'Atenção', crit: 'Alerta' };
  const selo = (nivel) => `<span class="selo selo-${nivel}">${ICO[nivel]}<span>${NOME_NIVEL[nivel]}</span></span>`;
  const DOR_ROT = ['sem dor', 'dor leve', 'dor moderada', 'dor forte'];

  function celula(c, alvo) {
    const par = (pse, psr) => `<span class="sw-v ${pse != null && alvo && pse - alvo >= 1.5 ? 'alto' : ''}">${pse == null ? '–' : pse}</span><i>/</i><span class="sw-v ${psr != null && psr <= 5 ? 'baixo' : ''}">${psr == null ? '–' : psr}</span>`;
    switch (c.k) {
      case 'reg': return `<td class="sw-c sw-k-reg" title="Registrado: PSE ${c.pse}, PSR ${c.psr == null ? 'pendente' : c.psr}">${par(c.pse, c.psr)}</td>`;
      case 'rel': return `<td class="sw-c sw-k-rel" title="Relato do atleta, ainda sem registro do professor: PSE ${c.pse}, PSR ${c.psr}${c.dor ? `, ${DOR_ROT[c.dor]}` : ''}">${par(c.pse, c.psr)}${c.dor >= 2 ? '<b class="sw-dor" aria-label="com dor">•</b>' : ''}</td>`;
      case 'falta': return `<td class="sw-c sw-k-falta" title="${c.just ? 'Falta justificada' : 'Falta'}">${c.just ? 'just.' : 'falta'}</td>`;
      case 'rfalta': return '<td class="sw-c sw-k-falta sw-k-rel" title="O atleta relatou que não foi">faltou</td>';
      case 'pend': return '<td class="sw-c sw-k-pend" title="Ainda não respondeu">sem resp.</td>';
      case 'fut': return '<td class="sw-c sw-k-fut" title="Ainda não aconteceu">·</td>';
      default: return '<td class="sw-c sw-k-pend" title="Sem registro">sem reg.</td>';
    }
  }

  const kpi = (rot, valor, un, sub) => `<article class="kpi" aria-label="${esc(rot)}"><span class="kpi-rot">${esc(rot)}</span><span class="kpi-valor">${valor}${un ? `<small>${esc(un)}</small>` : ''}</span>${sub ? `<span class="kpi-sub">${sub}</span>` : ''}</article>`;

  /* ---------- Lote ---------- */

  function iniciarLote(M, sid) {
    const col = M.cols.find((c) => c.s.id === sid);
    const L = { sid, pres: {}, pse: {}, psr: {}, modo: 'pse', valor: null };
    M.plano.atletas.forEach((id) => {
      const r = col.resp[id];
      if (r && r.faltou) L.pres[id] = 'falta';
      else { L.pres[id] = 'presente'; if (r) { L.pse[id] = r.pse; L.psr[id] = r.psr; } }
    });
    est.lote = L;
  }

  function painelLote(M) {
    const abertas = M.cols.filter((c) => c.st === 'aguardando' || c.st === 'semregistro');
    if (!abertas.length) return `<section class="card sw-lote" aria-labelledby="sw-lt-t"><div class="card-head"><h2 id="sw-lt-t">Lançar em lote</h2></div><p class="vazio" style="padding:4px 0">Todas as sessões que já aconteceram nesta semana estão registradas.</p></section>`;
    if (!est.loteAberto) return `<section class="card sw-lote" aria-labelledby="sw-lt-t"><div class="card-head"><h2 id="sw-lt-t">Lançar em lote</h2><span class="label num">${plural(abertas.length, 'sessão aguardando', 'sessões aguardando')}</span></div>
      <p class="hint" style="margin:0 0 10px">Escolha uma sessão, o valor de PSE ou PSR e toque nos atletas. O que os atletas já responderam pelo link entra sozinho.</p><button class="btn btn-primary" id="sw-lote-abrir">Lançar PSE e PSR em lote</button></section>`;
    if (!est.lote || !abertas.some((c) => c.s.id === est.lote.sid)) iniciarLote(M, abertas[0].s.id);
    const L = est.lote, col = M.cols.find((c) => c.s.id === L.sid);
    const ids = M.plano.atletas;
    const faltaPse = ids.filter((id) => L.pres[id] === 'presente' && L.pse[id] == null).length;
    const faltaPsr = ids.filter((id) => L.pres[id] === 'presente' && L.psr[id] == null).length;
    const paleta = L.modo === 'pse' ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] : L.modo === 'psr' ? [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] : null;
    const valorDe = (id) => (L.modo === 'pres' ? ({ presente: 'P', falta: 'F', justificada: 'J' }[L.pres[id]]) : L.pres[id] !== 'presente' ? '–' : (L[L.modo][id] == null ? '' : L[L.modo][id]));
    const tipo = TIPOS_SESSAO[col.s.tipo];
    return `
      <section class="card sw-lote" aria-labelledby="sw-lt-t">
        <div class="card-head"><h2 id="sw-lt-t">Lançar em lote</h2><button class="link-btn" id="sw-lote-fechar" style="margin:0">Fechar</button></div>
        <div class="sw-lote-top">
          <div class="field"><label class="label" for="sw-sessao">Sessão</label><select class="select" id="sw-sessao">${abertas.map((c) => `<option value="${c.s.id}" ${c.s.id === L.sid ? 'selected' : ''}>${DIAS[c.s.dia]} ${dd(c.data)}, ${TURNO[c.s.turno]} · ${esc(TIPOS_SESSAO[c.s.tipo].nome)}</option>`).join('')}</select></div>
          <div class="seg-ctl" role="group" aria-label="O que lançar">
            ${[['pse', 'PSE'], ['psr', 'PSR'], ['pres', 'Presença']].map(([k, n]) => `<button class="seg-btn" data-modo="${k}" aria-pressed="${L.modo === k}">${n}</button>`).join('')}
          </div>
        </div>
        <p class="sw-dica"><span class="dot" style="background:var(${tipo.cor});margin:0"></span>${esc(tipo.nome)} · ${col.s.dur} min · PSE planejado ${col.s.pse}. ${L.modo === 'pse' ? 'Escolha o PSE e toque nos atletas.' : L.modo === 'psr' ? 'Escolha o PSR (10 é totalmente recuperado) e toque nos atletas.' : 'Escolha a situação e toque nos atletas.'}</p>
        <div class="sw-paleta" role="group" aria-label="Valor a aplicar">
          ${L.modo === 'pres'
            ? [['presente', 'Presente'], ['falta', 'Faltou'], ['justificada', 'Falta justificada']].map(([k, n]) => `<button class="sw-pv wide" data-valor="${k}" aria-pressed="${L.valor === k}">${n}</button>`).join('')
            : paleta.map((v) => `<button class="sw-pv" data-valor="${v}" aria-pressed="${L.valor === v}" aria-label="${L.modo.toUpperCase()} ${v}">${v}</button>`).join('')}
        </div>
        <div class="sw-atletas" role="group" aria-label="Atletas">
          ${ids.map((id) => `<button class="sw-at ${L.pres[id] !== 'presente' ? 'ausente' : ''}" data-at="${id}" aria-label="${esc(ATLETAS[id].nome)}, ${L.modo === 'pres' ? L.pres[id] : `${L.modo.toUpperCase()} ${valorDe(id) === '' ? 'sem valor' : valorDe(id)}`}"><span>${esc(prim(id))}</span><b class="num ${valorDe(id) === '' && L.pres[id] === 'presente' ? 'vazio' : ''}">${valorDe(id) === '' ? '·' : valorDe(id)}</b></button>`).join('')}
        </div>
        <div class="actions" style="margin-top:12px">
          <button class="btn btn-sm" id="sw-preencher" ${L.valor == null || L.modo === 'pres' ? 'disabled' : ''}>Aplicar a todos que faltam</button>
          <button class="btn btn-sm" id="sw-respostas">Reaproveitar respostas dos atletas</button>
        </div>
        <p class="sw-status" role="status">${faltaPse ? `Falta o PSE de ${plural(faltaPse, 'atleta presente', 'atletas presentes')}. ` : 'PSE completo. '}${faltaPsr ? `PSR pendente para ${plural(faltaPsr, 'atleta', 'atletas')} (pode ficar para depois).` : 'PSR completo.'}</p>
        <div class="actions"><button class="btn btn-primary" id="sw-salvar" ${faltaPse ? 'disabled' : ''}>Salvar o registro desta sessão</button>
          <small class="hint" style="margin:0">Notas, fundamentos e jogadas ficam no <button class="link-btn" id="sw-ir-reg" style="margin:0">Registro do treino</button>.</small></div>
      </section>`;
  }

  /* ---------- Tela ---------- */

  function render(root, foco) {
    raiz = root;
    const planoId = window.Farol.compartilhado.planoId;
    const plano = dados.plano(planoId);
    if (est.sem == null || est.sem >= plano.semanas.length) est.sem = plano.semanaAtual >= 0 ? plano.semanaAtual : 0;
    const semana = plano.semanas[est.sem];
    const M = montar(plano, semana);
    const L = M.linhas;
    const temDado = L.some((l) => l.respondidas > 0);
    const dadas = M.cols.filter((c) => c.st !== 'futuro').length;
    const respostasTot = L.reduce((a, l) => a + l.respondidas, 0), esperadas = L.length * dadas;
    const pseMed = media(L.map((l) => l.pseM).filter((v) => v != null)), psrMed = media(L.map((l) => l.psrM).filter((v) => v != null));
    const cargaMed = media(L.filter((l) => l.respondidas).map((l) => l.carga));
    const nAt = L.filter((l) => l.nivel !== 'ok').length, nCrit = L.filter((l) => l.nivel === 'crit').length;
    const nDor = L.filter((l) => l.dor >= 2).length;
    const tm = dados.TIPOS_MICRO[semana.microTipo];
    const eAtual = est.sem === plano.semanaAtual;

    // Gráfico: PSE e PSR médios de cada sessão contra o PSE planejado
    const ptsMed = M.cols.map((c) => {
      const v = L.map((l) => l.celulas[M.cols.indexOf(c)]).filter((x) => x.k === 'reg' || x.k === 'rel');
      return { pse: v.length ? media(v.map((x) => x.pse).filter((q) => q != null)) : null, psr: v.length ? media(v.map((x) => x.psr).filter((q) => q != null)) : null };
    });
    const rot = M.cols.map((c) => `${DIAS[c.s.dia]} ${TURNO[c.s.turno][0].toUpperCase()}`);
    const cfg = {
      rotulo: 'PSE e PSR médios por sessão', rotuloX: 'Sessão', altura: 210, yMin: 0, yMax: 10, nMarcas: 5, margemEsq: 34,
      x: rot, tituloDica: (i) => `${DIAS[M.cols[i].s.dia]} ${dd(M.cols[i].data)}, ${TURNO[M.cols[i].s.turno]} · ${TIPOS_SESSAO[M.cols[i].s.tipo].nome}`,
      series: [
        { id: 'alvo', nome: 'PSE planejado', tipo: 'barra', cor: 'plano', opac: 0.3, y: M.cols.map((c) => c.s.pse) },
        { id: 'pse', nome: 'PSE médio', tipo: 'linha', cor: 'b', y: ptsMed.map((p) => (p.pse == null ? null : +p.pse.toFixed(1))), fmt: (v) => dec(v), rotuloUltimo: false },
        { id: 'psr', nome: 'PSR médio', tipo: 'linha', cor: 'a', y: ptsMed.map((p) => (p.psr == null ? null : +p.psr.toFixed(1))), fmt: (v) => dec(v), rotuloUltimo: false },
      ],
      fmtY: (v) => String(v),
      nota: 'Linha de PSE acima das barras: o treino pesou mais do que o planejado. PSR em queda com PSE alto é o sinal de sobrecarga. Sessões sem dado ficam em branco.',
    };

    const ordem = { crit: 0, warn: 1, ok: 2 };
    const atencao = L.filter((l) => l.nivel !== 'ok').sort((a, b) => ordem[a.nivel] - ordem[b.nivel]);
    const sonoMed = media(L.map((l) => l.sono).filter((v) => v != null)), dispMed = media(L.map((l) => l.disp).filter((v) => v != null));

    const linha = (l) => {
      const sit = l.sit;
      return `<tr class="${sit && sit.tipo === 'lesao' ? 'sw-fora' : ''}">
        <th scope="row" class="sw-nome"><span class="sw-nome-i">${l.nivel === 'ok' ? '' : `<span class="selo-ic selo-${l.nivel}" role="img" aria-label="${NOME_NIVEL[l.nivel]}" title="${NOME_NIVEL[l.nivel]}">${ICO[l.nivel]}</span>`}<span><b>${esc(ATLETAS[l.id].nome)}</b>${sit ? `<small class="sw-sit ${sit.tipo}">${sit.tipo === 'lesao' ? 'Lesionado' : sit.tipo === 'retorno' ? 'Em retorno' : 'Dúvida'}, ${esc(sit.local.toLowerCase())}</small>` : ''}</span></span></th>
        ${l.celulas.map((c) => celula(c, M.alvoPse)).join('')}
        <td class="r num">${l.respondidas ? num(l.carga) : '–'}${l.pctPlano != null ? `<small class="sw-pc">${Math.round(l.pctPlano)}% do plano</small>` : ''}</td>
        <td class="r num">${l.acwr != null ? dec(l.acwr, 2) : '–'}</td>
        <td class="sw-bem">${l.dor == null && l.sono == null ? '<span class="sw-nd">sem relato</span>' : `${l.dor != null ? `<span class="sw-b ${l.dor >= 2 ? 'ruim' : ''}">${DOR_ROT[l.dor]}</span>` : ''}${l.sono != null ? `<span class="sw-b ${l.sono <= 2 ? 'ruim' : ''}">sono ${l.sono}/5</span>` : ''}${l.disp != null ? `<span class="sw-b ${l.disp <= 2 ? 'ruim' : ''}">disp. ${l.disp}/5</span>` : ''}`}</td>
      </tr>`;
    };

    root.innerHTML = `
      <header class="page-head">
        <div>
          <span class="chip" style="margin-bottom:10px">Dados de exemplo</span>
          <h1>Resposta da semana</h1>
          <p class="lead">Como os atletas estão respondendo ao microciclo: esforço (PSE), recuperação (PSR), dor, sono e disposição, sessão por sessão, com o semáforo de cada um.</p>
        </div>
        <div class="field"><label class="label" for="sw-plano">Turma ou atleta</label>
          <select class="select" id="sw-plano">${dados.planos.map((p) => `<option value="${p.id}" ${p.id === plano.id ? 'selected' : ''}>${esc(p.nome)} (${esc(p.detalhe)})</option>`).join('')}</select></div>
      </header>

      <div class="sw-nav">
        <button class="btn btn-icon" id="sw-ant" aria-label="Semana anterior" ${est.sem === 0 ? 'disabled' : ''}>‹</button>
        <div class="sw-nav-t"><b>Semana ${semana.n} · ${dd(semana.inicio)} a ${dd(semana.inicio + 6 * DIA)}</b><small>${esc(tm.nome)} · ${num(semana.planejado)} UA planejadas · ${plural(M.cols.length, 'sessão', 'sessões')}${eAtual ? ' · semana atual' : ''}</small></div>
        <button class="btn btn-icon" id="sw-prox" aria-label="Próxima semana" ${est.sem >= plano.semanas.length - 1 ? 'disabled' : ''}>›</button>
        ${eAtual ? '' : '<button class="link-btn" id="sw-hoje" style="margin:0">Ir para a semana atual</button>'}
      </div>
      ${est.aviso ? `<div class="aviso-ok" role="status">${esc(est.aviso)}</div>` : ''}

      ${temDado ? `
      <div class="kpis sc-kpis">
        ${kpi('Respostas', esperadas ? Math.round((100 * respostasTot) / esperadas) : '–', '%', `${respostasTot} de ${esperadas} possíveis nas sessões que já aconteceram`)}
        ${kpi('PSE médio', pseMed == null ? 'n/d' : dec(pseMed), '/10', M.alvoPse ? `planejado ${dec(M.alvoPse)}` : '')}
        ${kpi('PSR médio', psrMed == null ? 'n/d' : dec(psrMed), '/10', '10 é totalmente recuperado')}
        ${kpi('Carga por atleta', cargaMed == null ? 'n/d' : num(cargaMed), 'UA', M.cargaPlano ? `${Math.round((100 * cargaMed) / M.cargaPlano)}% do plano até agora` : '')}
        ${kpi('Em atenção', String(nAt), `de ${L.length}`, nCrit ? `${plural(nCrit, 'em alerta', 'em alerta')}` : 'ninguém em alerta')}
        ${kpi('Dor relatada', String(nDor), '', sonoMed != null ? `sono médio ${dec(sonoMed)}/5 · disposição ${dec(dispMed)}/5` : 'sem relatos de bem-estar')}
      </div>` : `<section class="card an-vazio"><h2>Sem respostas nesta semana</h2><p>${M.cols.every((c) => c.st === 'futuro') ? 'A semana ainda não começou.' : 'Ainda não há registros nem respostas dos atletas. Registre as sessões ou envie o link da turma na tela Registro do treino.'}</p></section>`}

      <section class="card" aria-labelledby="sw-q-t">
        <div class="card-head"><div><h2 id="sw-q-t">Atletas por sessão</h2><p class="gf-sub">Cada célula mostra PSE / PSR. Números inclinados e com borda tracejada são relatos do atleta, ainda sem registro do professor.</p></div></div>
        <div class="table-scroll">
          <table class="an-tab sw-tab">
            <thead><tr><th>Atleta</th>${M.cols.map((c) => { const t = TIPOS_SESSAO[c.s.tipo]; return `<th class="sw-h" title="${esc(t.nome)} · ${c.s.dur} min · PSE planejado ${c.s.pse}"><span class="num">${DIAS[c.s.dia]} ${dd(c.data)}</span><small>${TURNO[c.s.turno]}</small><small><span class="dot" style="background:var(${t.cor});margin:0 4px 0 0"></span>${esc(t.curto || t.nome)} · ${c.s.pse}</small></th>`; }).join('')}<th class="r">Carga (UA)</th><th class="r" title="Carga da semana ÷ média das 4 últimas semanas. Só em semana completa.">ACWR</th><th>Bem-estar</th></tr></thead>
            <tbody>${L.map(linha).join('')}</tbody>
          </table>
        </div>
        <div class="sw-leg" aria-hidden="true"><span><span class="sw-v alto">7</span> PSE bem acima do planejado</span><span><span class="sw-v baixo">4</span> PSR baixo (5 ou menos)</span><span><i class="sw-amostra"></i> relato do atleta</span><span><b class="sw-dor">•</b> relatou dor</span></div>
      </section>

      <div class="an-grade">
        <div class="an-col">
          ${temDado ? G.cartao('g-sem', { titulo: 'Esforço e recuperação na semana', sub: 'PSE e PSR médios de cada sessão, contra o PSE planejado.', ...cfg }) : ''}
          ${painelLote(M)}
        </div>
        <aside class="an-lado">
          <section class="card" aria-labelledby="sw-at-t">
            <div class="card-head"><h2 id="sw-at-t">Atenção nesta semana</h2><span class="label">${plural(atencao.length, 'atleta', 'atletas')}</span></div>
            ${atencao.length ? `<ul class="an-aten">${atencao.map((l) => `<li>${selo(l.nivel)}<div><b>${esc(ATLETAS[l.id].nome)}</b><small>${esc(l.motivos.map((m) => m.texto).join(' · '))}</small>
              ${l.sit ? `<small class="sw-sit ${l.sit.tipo}">Já em acompanhamento de saúde</small>` : (l.dor >= 2 ? `<button class="link-btn" data-saude="${l.id}|${l.dor}" style="margin:2px 0 0">Registrar queixa de saúde</button>` : '')}</div></li>`).join('')}</ul>`
              : '<p class="vazio" style="padding:4px 0">Ninguém fora dos limites nesta semana.</p>'}
          </section>
          <details class="card an-como">
            <summary>Como lemos estes números</summary>
            <ul class="ideias">
              <li><b>PSE</b> é o esforço percebido (1 a 10) e <b>PSR</b> a recuperação percebida (0 a 10, onde 10 é totalmente recuperado).</li>
              <li><b>Carga</b>: duração × PSE das sessões em que o atleta esteve presente. <b>% do plano</b> compara com o planejado das sessões que já aconteceram.</li>
              <li><b>Alerta</b>: dor forte, PSR até 5 com PSE acima do alvo, ou ACWR acima de 1,5.</li>
              <li><b>Atenção</b>: dor moderada, PSR até 5,5, sono ou disposição 2 ou menos, presença abaixo de 60%, ACWR fora de 0,8 a 1,3 ou semana monótona.</li>
              <li>ACWR só aparece em semana completa, com pelo menos 3 semanas anteriores. O semáforo ajuda a olhar primeiro para quem precisa; a decisão é sua.</li>
            </ul>
          </details>
        </aside>
      </div>`;

    if (temDado) G.ativar(root, 'g-sem', cfg);
    ligar(root, M);
    if (foco) { const f = root.querySelector(foco); if (f) f.focus({ preventScroll: true }); }
  }

  function ligar(root, M) {
    const $ = (s) => root.querySelector(s);
    const refazer = (aviso, foco) => { est.aviso = aviso || ''; const y = window.scrollY; render(root, foco); window.scrollTo({ top: y }); };
    $('#sw-plano').addEventListener('change', (e) => { window.Farol.compartilhado.planoId = e.target.value; est.sem = null; est.lote = null; refazer('', '#sw-plano'); });
    $('#sw-ant').addEventListener('click', () => { est.sem--; est.lote = null; refazer('', '#sw-ant'); });
    $('#sw-prox').addEventListener('click', () => { est.sem++; est.lote = null; refazer('', '#sw-prox'); });
    const hoje = $('#sw-hoje'); if (hoje) hoje.addEventListener('click', () => { est.sem = null; est.lote = null; refazer('', '#sw-ant'); });
    root.querySelectorAll('[data-saude]').forEach((b) => b.addEventListener('click', () => {
      const [id, dor] = b.dataset.saude.split('|');
      window.Farol.ir('saude', { novo: { atleta: id, tipo: 'duvida', texto: `Relato de ${DOR_ROT[+dor]} no treino` } });
    }));

    const ab = $('#sw-lote-abrir'); if (ab) ab.addEventListener('click', () => { est.loteAberto = true; render(root, '#sw-sessao'); });
    const fe = $('#sw-lote-fechar'); if (fe) fe.addEventListener('click', () => { est.loteAberto = false; est.lote = null; refazer('', '#sw-lote-abrir'); });
    const L = est.lote;
    if (!L || !$('#sw-sessao')) return;
    const col = M.cols.find((c) => c.s.id === L.sid);
    const re = (foco) => { const y = window.scrollY; render(root, foco); window.scrollTo({ top: y }); };
    $('#sw-sessao').addEventListener('change', (e) => { iniciarLote(M, e.target.value); re('#sw-sessao'); });
    root.querySelectorAll('[data-modo]').forEach((b) => b.addEventListener('click', () => { L.modo = b.dataset.modo; L.valor = null; re(`[data-modo="${L.modo}"]`); }));
    root.querySelectorAll('[data-valor]').forEach((b) => b.addEventListener('click', () => { const v = L.modo === 'pres' ? b.dataset.valor : Number(b.dataset.valor); L.valor = L.valor === v ? null : v; re(`[data-valor="${b.dataset.valor}"]`); }));
    root.querySelectorAll('[data-at]').forEach((b) => b.addEventListener('click', () => {
      const id = b.dataset.at;
      if (L.valor == null) { est.aviso = ''; re(`[data-at="${id}"]`); return; }
      if (L.modo === 'pres') L.pres[id] = L.valor;
      else if (L.pres[id] === 'presente') L[L.modo][id] = L[L.modo][id] === L.valor ? null : L.valor;
      re(`[data-at="${id}"]`);
    }));
    $('#sw-preencher').addEventListener('click', () => { M.plano.atletas.forEach((id) => { if (L.pres[id] === 'presente' && L[L.modo][id] == null) L[L.modo][id] = L.valor; }); re('#sw-preencher'); });
    $('#sw-respostas').addEventListener('click', () => {
      M.plano.atletas.forEach((id) => { const r = col.resp[id]; if (!r) return; if (r.faltou) L.pres[id] = 'falta'; else { L.pres[id] = 'presente'; if (L.pse[id] == null) L.pse[id] = r.pse; if (L.psr[id] == null) L.psr[id] = r.psr; } });
      re('#sw-respostas');
    });
    $('#sw-ir-reg').addEventListener('click', () => window.Farol.ir('treino-registro', { planoId: M.plano.id, abrir: { semana: M.semana.idx, sessaoId: L.sid } }));
    $('#sw-salvar').addEventListener('click', () => {
      const ids = M.plano.atletas;
      const meso = M.plano.mesos.find((m) => m.id === M.semana.meso);
      const reg = {
        duracao: col.s.dur, professores: M.plano.professores.slice(0, 2), jogadas: [],
        fundamentos: ['tecnica', 'tatica', 'jogo'].includes(col.s.tipo) && meso ? meso.pauta.fundamentos.filter((f) => f.prio === 'alta').slice(0, 2).map((f) => f.id) : [],
        notas: '', presenca: {}, pse: {}, psr: {}, notasAtleta: {},
      };
      ids.forEach((id) => { reg.presenca[id] = L.pres[id]; if (L.pres[id] === 'presente') { reg.pse[id] = L.pse[id]; if (L.psr[id] != null) reg.psr[id] = L.psr[id]; } });
      dados.registrarTreino(M.plano.id, M.semana, col.s, reg);
      const pend = ids.filter((id) => reg.presenca[id] === 'presente' && reg.psr[id] == null).length;
      est.lote = null;
      refazer(`Registro de ${DIAS[col.s.dia]} ${dd(col.data)} salvo.${pend ? ` PSR pendente para ${plural(pend, 'atleta', 'atletas')}.` : ''}`, '#sw-lote-abrir');
    });
  }

  window.Farol.views = window.Farol.views || {};
  window.Farol.views['treinos-microciclo'] = (root, params) => {
    est.aviso = '';
    if (params && params.planoId) { window.Farol.compartilhado.planoId = params.planoId; est.sem = null; est.lote = null; }
    if (params && params.semana != null) est.sem = params.semana;
    if (params && params.lote) est.loteAberto = true;
    render(root);
  };
})();
