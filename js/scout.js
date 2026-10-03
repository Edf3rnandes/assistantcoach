/* Scout
   Duas telas:
   - `scout-coleta`: coleta ao vivo, pensada para uma mão e para o celular na beira da quadra. Escolhe quem fez, o
     fundamento e o resultado (3 toques no máximo; o sistema já sugere o próximo passo). O placar, o sacador e a troca
     de lado são calculados sozinhos. O quadro técnico abre por cima sem sair da coleta.
   - `analise-scout`: jogos (lista e novo jogo), relatório (jogo ou período, atleta e dupla, mapas, metas de treino)
     e treino de fundamento (contagem de acertos por atleta num exercício).
   O mesmo registro serve para jogo de competição e treino-jogo; o fundamento é a versão mínima, só acerto e erro. */
(function () {
  const { util, elenco, scoutDados: D, graficos: G, calendario: CAL } = window.Farol;
  const { esc, num, dec, dd, plural, HOJE, DIA } = util;
  const { ATLETAS, TURMAS } = elenco;
  const F = D.FUND;
  const nm = D.nomeCurto;

  const est = {
    aba: 'jogos', sel: null, filtroTipo: 'todos', novo: null, excluir: null,
    rel: { periodo: 'tudo', tipo: 'todos', dupla: 'todas' },
    treino: null, novoTreino: null, aviso: '',
  };
  const live = { jogoId: null, quem: null, fund: null, tipo: null, dest: null, foco: null };
  let raiz = null;

  const pct = (v) => (v == null ? '–' : `${Math.round(v)}%`);
  const nota = (v) => (v == null ? '–' : dec(v, 1));
  const chaveDupla = (j) => j.dupla.slice().sort().join('+');
  const dataLonga = (t) => `${dd(t)}/${new Date(t).getUTCFullYear()}`;

  function tituloJogo(j) {
    const c = j.origem && j.origem.compId ? CAL.COMPETICOES[j.origem.compId] : null;
    const t = j.origem && j.origem.turmaId ? TURMAS[j.origem.turmaId] : null;
    return c ? `${j.titulo} · ${c.nome}` : t ? `${j.titulo} · ${t.nome}` : j.titulo;
  }
  const versus = (j) => `${D.rotuloDupla(j.dupla)} × ${j.adv}`;

  function resumoSets(j) {
    const e = D.estado(j);
    const partes = e.sets.map((s) => `${s.a}–${s.b}`);
    if (!e.encerrado && e.iniciado) partes.push(`${e.a}–${e.b}`);
    return partes.join(' · ') || 'sem pontos';
  }

  function seloResultado(j) {
    const e = D.estado(j);
    if (!e.encerrado) return `<span class="sc-sel sc-and"><i></i>Em andamento</span>`;
    return e.vencedor === 'nos'
      ? '<span class="sc-sel sc-vit"><svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.5l3.2 3.2L13 4.6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>Vitória</span>'
      : '<span class="sc-sel sc-der"><svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>Derrota</span>';
  }

  function kpi(o) {
    return `<article class="kpi" aria-label="${esc(o.rot)}">
      <span class="kpi-rot">${esc(o.rot)}</span>
      <span class="kpi-valor">${o.valor}${o.un ? `<small>${esc(o.un)}</small>` : ''}</span>
      ${o.sub ? `<span class="kpi-sub">${o.sub}</span>` : ''}
    </article>`;
  }

  /* ====================================================================
     COLETA AO VIVO
     ==================================================================== */

  function padrao(j) {
    const e = D.estado(j);
    live.tipo = null; live.dest = null;
    if (e.sac === 'nos') { live.quem = e.sacador; live.fund = 'saque'; }
    else { live.quem = live.quem && j.dupla.includes(live.quem) ? live.quem : j.dupla[0]; live.fund = 'recepcao'; }
  }

  // Depois de uma ação que não encerra a jogada, sugere o que costuma vir em seguida.
  function proximo(j, ev) {
    const parc = j.dupla.find((x) => x !== ev.quem) || j.dupla[0];
    live.tipo = null; live.dest = null;
    if (ev.fund === 'recepcao' || ev.fund === 'defesa') { live.quem = parc; live.fund = 'ataque'; }
    else live.fund = 'defesa';
  }

  const descrever = (j, ev) => {
    const f = F[ev.fund], r = f.res.find((x) => x.id === ev.res);
    return ev.quem === 'adv' ? `Adversário · ${r.nome}` : `${nm(ev.quem)} · ${f.nome} · ${r.nome}`;
  };

  function coleta(root, id) {
    const j = D.jogo(id);
    if (!j) { root.innerHTML = '<p class="vazio">Jogo não encontrado. <button class="link-btn" id="sc-volta">Voltar aos jogos</button></p>'; root.querySelector('#sc-volta').addEventListener('click', () => window.Farol.ir('analise-scout', {})); return; }
    if (live.jogoId !== id) { live.jogoId = id; live.quem = null; padrao(j); }
    if (!live.quem) padrao(j);
    const e = D.estado(j);
    const fmt = D.FORMATOS[j.formato];
    const [pa, pb] = j.dupla;
    const ultimo = j.eventos[j.eventos.length - 1];
    let aviso = '';
    if (ultimo && ultimo.ponto && !e.encerrado) {
      if (e.tempoTecnico) aviso = `Tempo técnico: ${e.a + e.b} pontos somados.`;
      else if (e.trocaAgora) aviso = `Troca de lado: ${e.a + e.b} pontos somados.`;
    }
    const nSets = fmt.sets * 2 - 1;
    const fund = live.quem === 'adv' ? 'adv' : live.fund === 'adv' ? 'saque' : live.fund;
    const def = F[fund];

    const op = (attr, val, pressed, rot, sub) => `<button class="sc-op" type="button" ${attr}="${val}" aria-pressed="${pressed}">${rot}${sub ? `<small>${sub}</small>` : ''}</button>`;
    const quemBtns = [pa, pb].map((a) => op('data-quem', a, live.quem === a, esc(nm(a)), e.sac === 'nos' && e.sacador === a ? 'saca' : '')).join('')
      + op('data-quem', 'adv', live.quem === 'adv', 'Adversário', e.sac === 'adv' ? 'saca' : '');

    const prompt = !e.iniciado && !e.encerrado ? `
      <section class="sc-inicio card" aria-label="Quem saca primeiro">
        <div class="sc-inicio-t"><b>${e.sets.length ? `Set ${e.set + 1} começa.` : 'Antes de começar.'}</b> Quem saca primeiro?
          ${e.sets.length ? `<small>${e.sets.map((s, i) => `Set ${i + 1}: ${s.a}–${s.b}`).join(' · ')}</small>` : ''}</div>
        <div class="sc-quem">
          ${[0, 1].map((k) => op('data-inicio', `nos:${k}`, e.sac === 'nos' && e.idx === k, esc(nm(j.dupla[k])), 'nós')).join('')}
          ${op('data-inicio', 'adv:0', e.sac === 'adv', 'Adversário', 'eles')}
        </div>
      </section>` : '';

    const fim = e.encerrado ? `
      <section class="sc-fim card" role="status">
        <div><span class="label">Jogo encerrado</span><h2>${e.vencedor === 'nos' ? 'Vitória' : 'Derrota'} por ${e.ganhos} set${e.ganhos === 1 ? '' : 's'} a ${e.perdidos}</h2><p class="num">${esc(resumoSets(j))}</p></div>
        <div class="actions"><button class="btn btn-primary" id="sc-rel">Ver relatório</button><button class="btn" id="sc-corrigir">Corrigir o último ponto</button></div>
      </section>` : '';

    const entrada = e.encerrado ? '' : `
      <section class="sc-entrada" aria-label="Registrar ação">
        <div class="sc-bloco"><span class="label">Quem</span><div class="sc-quem" role="group" aria-label="Quem fez a ação">${quemBtns}</div></div>
        ${live.quem === 'adv' ? '' : `<div class="sc-bloco"><span class="label">Fundamento</span><div class="sc-fund" role="group" aria-label="Fundamento">
          ${D.ORDEM_FUND.map((k) => op('data-fund', k, fund === k, F[k].curto)).join('')}</div></div>`}
        <div class="sc-bloco"><span class="label">Resultado</span><div class="sc-res" role="group" aria-label="Resultado de ${esc(def.nome.toLowerCase())}">
          ${def.res.map((r) => `<button class="sc-rb ${r.ponto === 'nos' ? 'nos' : r.ponto === 'adv' ? 'adv' : 'cont'}" type="button" data-res="${r.id}"><span>${esc(r.nome)}</span><small>${r.ponto === 'nos' ? 'ponto nosso' : r.ponto === 'adv' ? 'ponto deles' : 'a jogada segue'}</small></button>`).join('')}
        </div></div>
        ${def.tipos || def.destino ? `<details class="sc-extra" ${live.tipo || live.dest != null ? 'open' : ''}>
          <summary>Tipo e destino <small>(opcional${live.tipo || live.dest != null ? ', preenchido' : ''})</small></summary>
          ${def.tipos ? `<div class="sc-chips" role="group" aria-label="Tipo">${def.tipos.map(([k, n]) => `<button class="sc-chip" type="button" data-tipo="${k}" aria-pressed="${live.tipo === k}">${esc(n)}</button>`).join('')}</div>` : ''}
          ${def.destino ? `<div class="sc-dest-w"><span class="sc-rede">Rede</span><div class="sc-dest" role="group" aria-label="Para onde foi na quadra do adversário">
            ${[0, 1, 2, 3, 4, 5, 6, 7, 8].map((k) => `<button type="button" data-dest="${k}" aria-pressed="${live.dest === k}" aria-label="${['Perto da rede', 'Meio', 'Fundo'][Math.floor(k / 3)]}, ${['esquerda', 'centro', 'direita'][k % 3]}">${live.dest === k ? '●' : ''}</button>`).join('')}</div><span class="sc-rede">Fundo</span></div>` : ''}
        </details>` : ''}
      </section>`;

    const recentes = j.eventos.slice(-6).reverse();

    root.innerHTML = `
      <div class="sc-coleta">
        <div class="sc-top">
          <button class="link-btn" id="sc-voltar" style="margin:0">‹ Jogos</button>
          <div class="actions">
            <button class="btn btn-sm" id="sc-quadro" type="button">Quadro</button>
            <button class="btn btn-sm" id="sc-desfazer" type="button" ${j.eventos.length ? '' : 'disabled'}>Desfazer</button>
          </div>
        </div>
        <div><h1 class="sc-h1">${esc(tituloJogo(j))}</h1><p class="sc-sub">${esc(versus(j))} · ${esc(fmt.nome)}</p></div>

        <section class="sc-placar" aria-label="Placar" aria-live="polite">
          <div class="sc-time"><span class="sc-time-nome">${esc(D.rotuloDupla(j.dupla))}</span><b class="sc-pts num">${e.a}</b>
            <span class="sc-saque">${e.sac === 'nos' && !e.encerrado ? `<i></i>Saque: ${esc(nm(e.sacador))}` : ''}</span></div>
          <div class="sc-meio"><span>${fmt.sets > 1 || e.sets.length ? `Set ${Math.min(e.set + 1, nSets)}${nSets > 1 ? ` de ${nSets}` : ''}` : 'Set único'}</span>
            <b class="num">${e.ganhos} – ${e.perdidos}</b>${e.sets.length ? `<small class="num">${e.sets.map((s) => `${s.a}–${s.b}`).join(' · ')}</small>` : ''}</div>
          <div class="sc-time adv"><span class="sc-time-nome">${esc(j.adv)}</span><b class="sc-pts num">${e.b}</b>
            <span class="sc-saque">${e.sac === 'adv' && !e.encerrado ? '<i></i>Saque deles' : ''}</span></div>
        </section>
        ${aviso ? `<div class="sc-aviso" role="status"><b>${esc(aviso)}</b></div>` : ''}
        ${prompt}${fim}${entrada}

        <section class="card sc-log" aria-labelledby="sc-log-t">
          <div class="card-head"><h2 id="sc-log-t">Últimas ações</h2><span class="label num">${j.eventos.length} no jogo</span></div>
          ${recentes.length ? `<ol class="sc-lista">${recentes.map((ev) => `<li><span>${esc(descrever(j, ev))}</span>${ev.ponto ? `<b class="sc-pt ${ev.ponto}">${ev.ponto === 'nos' ? 'ponto nosso' : 'ponto deles'}</b>` : ''}</li>`).join('')}</ol>` : '<p class="vazio" style="padding:4px 0">Nenhuma ação ainda. Escolha quem, o fundamento e o resultado.</p>'}
          <div class="actions" style="margin-top:12px">
            ${e.encerrado ? '' : `<button class="link-btn" id="sc-encerrar" style="margin:0" ${e.iniciado ? '' : 'disabled'}>Encerrar o jogo agora</button>`}
          </div>
        </section>
      </div>`;

    const $ = (s) => root.querySelector(s);
    const refazer = (foco) => { live.foco = foco || null; coleta(root, id); window.scrollTo({ top: window.scrollY }); const f = live.foco && root.querySelector(live.foco); if (f) f.focus({ preventScroll: true }); };

    $('#sc-voltar').addEventListener('click', () => window.Farol.ir('analise-scout', {}));
    $('#sc-quadro').addEventListener('click', () => window.Farol.gaveta.abrir());
    $('#sc-desfazer').addEventListener('click', () => { D.desfazer(id); padrao(D.jogo(id)); refazer('#sc-desfazer'); });
    const encerrar = $('#sc-encerrar');
    if (encerrar) encerrar.addEventListener('click', () => { D.encerrar(id); refazer('#sc-rel'); });
    const rel = $('#sc-rel');
    if (rel) rel.addEventListener('click', () => window.Farol.ir('analise-scout', { jogo: id }));
    const corr = $('#sc-corrigir');
    if (corr) corr.addEventListener('click', () => { D.desfazer(id); D.reabrir(id); padrao(D.jogo(id)); refazer('[data-res]'); });

    root.querySelectorAll('[data-inicio]').forEach((b) => b.addEventListener('click', () => {
      const [sac, k] = b.dataset.inicio.split(':');
      D.definirInicio(id, e.set, sac, +k);
      padrao(D.jogo(id));
      refazer(`[data-inicio="${b.dataset.inicio}"]`);
    }));
    root.querySelectorAll('[data-quem]').forEach((b) => b.addEventListener('click', () => {
      live.quem = b.dataset.quem;
      if (live.quem === 'adv') live.fund = 'adv';
      else if (live.fund === 'adv') live.fund = e.sac === 'nos' ? 'saque' : 'recepcao';
      live.tipo = null; live.dest = null;
      refazer(`[data-quem="${live.quem}"]`);
    }));
    root.querySelectorAll('[data-fund]').forEach((b) => b.addEventListener('click', () => { live.fund = b.dataset.fund; live.tipo = null; live.dest = null; refazer(`[data-fund="${live.fund}"]`); }));
    root.querySelectorAll('[data-tipo]').forEach((b) => b.addEventListener('click', () => { live.tipo = live.tipo === b.dataset.tipo ? null : b.dataset.tipo; refazer(`[data-tipo="${b.dataset.tipo}"]`); }));
    root.querySelectorAll('[data-dest]').forEach((b) => b.addEventListener('click', () => { const k = +b.dataset.dest; live.dest = live.dest === k ? null : k; refazer(`[data-dest="${k}"]`); }));
    root.querySelectorAll('[data-res]').forEach((b) => b.addEventListener('click', () => {
      const ev = D.registrar(id, { quem: live.quem, fund, res: b.dataset.res, tipo: def.tipos ? live.tipo : null, dest: def.destino ? live.dest : null });
      if (!ev) return;
      if (ev.ponto) padrao(D.jogo(id)); else proximo(D.jogo(id), ev);
      refazer(`[data-res="${b.dataset.res}"]`);
    }));
  }

  /* ====================================================================
     PEÇAS DO RELATÓRIO
     ==================================================================== */

  const COR_ORIGEM = { ace: 'var(--s-tecnica)', ataque: 'var(--s-tatica)', bloqueio: 'var(--s-jogo)', erroAdv: 'var(--s-recuperacao)' };
  const COR_PERDA = { erroSaque: 'var(--s-fisico)', erroRec: 'var(--s-tecnica)', erroAtaque: 'var(--s-tatica)', bloqueado: 'var(--s-jogo)', erroDef: 'var(--s-recuperacao)', erroBloq: 'var(--beam)', pontoAdv: 'var(--ink-2)' };

  function barraEmpilhada(titulo, itens, total) {
    const lista = itens.filter((x) => x.v > 0);
    return `<div class="sc-emp"><div class="sc-emp-h"><b>${esc(titulo)}</b><span class="num">${total} pontos</span></div>
      <div class="stack" style="height:14px" role="img" aria-label="${esc(titulo)}: ${esc(lista.map((x) => `${x.nome} ${x.v}`).join(', '))}">${lista.map((x) => `<i style="width:${(x.v / (total || 1)) * 100}%;background:${x.cor}"></i>`).join('')}</div>
      <ul class="an-mix">${itens.map((x) => `<li><span class="dot" style="background:${x.cor};margin:0"></span><span>${esc(x.nome)}</span><b class="num">${x.v}</b><span class="num an-pc">${total ? Math.round((x.v / total) * 100) : 0}%</span></li>`).join('')}</ul></div>`;
  }

  function origemPontos(S) {
    const g = S.ganhos, p = S.perdas;
    return `<div class="sc-duas">
      ${barraEmpilhada('Pontos que fizemos', [
        { nome: 'Ataque', v: g.ataque, cor: COR_ORIGEM.ataque }, { nome: 'Bloqueio', v: g.bloqueio, cor: COR_ORIGEM.bloqueio },
        { nome: 'Ace', v: g.ace, cor: COR_ORIGEM.ace }, { nome: 'Erro deles', v: g.erroAdv, cor: COR_ORIGEM.erroAdv },
      ], S.pontos.nos)}
      ${barraEmpilhada('Pontos que demos', [
        { nome: 'Ponto deles', v: p.pontoAdv, cor: COR_PERDA.pontoAdv }, { nome: 'Erro de recepção ou ace', v: p.erroRec, cor: COR_PERDA.erroRec },
        { nome: 'Erro de ataque', v: p.erroAtaque, cor: COR_PERDA.erroAtaque }, { nome: 'Ataque bloqueado', v: p.bloqueado, cor: COR_PERDA.bloqueado },
        { nome: 'Erro de saque', v: p.erroSaque, cor: COR_PERDA.erroSaque }, { nome: 'Erro de defesa', v: p.erroDef, cor: COR_PERDA.erroDef },
        { nome: 'Erro de bloqueio', v: p.erroBloq, cor: COR_PERDA.erroBloq },
      ], S.pontos.adv)}
    </div>`;
  }

  // Mapa de destino na quadra do adversário, 3 × 3. O círculo cresce com a quantidade.
  function mapa(titulo, grade, ponto) {
    const total = grade.reduce((a, v) => a + v, 0);
    if (!total) return `<div class="sc-mapa"><b>${esc(titulo)}</b><p class="vazio" style="padding:8px 0">Sem destino registrado.</p></div>`;
    const mx = Math.max(...grade);
    const W = 252, H = 262, cw = 78, ch = 80, x0 = 9, y0 = 24;
    const cel = grade.map((v, k) => {
      const gx = x0 + (k % 3) * (cw + 3), gy = y0 + Math.floor(k / 3) * (ch + 3);
      const r = v ? 5 + 15 * Math.sqrt(v / mx) : 0;
      const kill = ponto && v >= 3 ? Math.round((100 * ponto[k]) / v) : null;
      return `<rect x="${gx}" y="${gy}" width="${cw}" height="${ch}" rx="6" class="sc-m-cel"/>
        ${v ? `<circle cx="${gx + cw / 2}" cy="${gy + 22}" r="${r.toFixed(1)}" class="sc-m-b"/>` : ''}
        <text x="${gx + cw / 2}" y="${gy + 56}" text-anchor="middle" class="sc-m-t">${v ? `${v} · ${Math.round((100 * v) / total)}%` : '–'}</text>
        ${kill != null ? `<text x="${gx + cw / 2}" y="${gy + 72}" text-anchor="middle" class="sc-m-k">ponto ${kill}%</text>` : ''}`;
    }).join('');
    const topo = grade.map((v, k) => [v, k]).sort((a, b) => b[0] - a[0])[0][1];
    return `<div class="sc-mapa"><b>${esc(titulo)}</b>
      <svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="${esc(titulo)}: mais usada, ${['perto da rede', 'meio', 'fundo'][Math.floor(topo / 3)]}, ${['esquerda', 'centro', 'direita'][topo % 3]}, com ${grade[topo]} de ${total}">
        <line x1="${x0}" x2="${W - x0}" y1="12" y2="12" class="sc-m-rede"/><text x="${W / 2}" y="9" text-anchor="middle" class="sc-m-n">rede</text>${cel}</svg></div>`;
  }

  function tabelaAtletas(S, ids) {
    const R = D.REF;
    const lista = ids.filter((id) => S.atletas[id]);
    if (!lista.length) return '<p class="vazio">Sem ações dos atletas neste recorte.</p>';
    const marca = (fora, txt) => (fora ? `<span class="fora" title="Fora da referência do clube">${txt}</span>` : txt);
    const linha = (id) => {
      const a = S.atletas[id];
      return `<tr>
        <td class="sc-n1"><b>${esc(ATLETAS[id].nome)}</b></td>
        <td class="r num">${a.saque.n || '–'}</td><td class="r num">${pct(a.saque.acePct)}</td><td class="r num">${a.saque.n >= 5 ? marca(a.saque.erroPct > R.saqueErro.v, pct(a.saque.erroPct)) : '–'}</td>
        <td class="r num">${a.rec.n || '–'}</td><td class="r num">${a.rec.n >= 5 ? marca(a.rec.nota < R.recNota.v, nota(a.rec.nota)) : '–'}</td><td class="r num">${pct(a.rec.p3Pct)}</td>
        <td class="r num">${a.atq.n || '–'}</td><td class="r num">${pct(a.atq.killPct)}</td><td class="r num">${a.atq.n >= 5 ? marca(a.atq.ef < R.ataqueEf.v, pct(a.atq.ef)) : '–'}</td>
        <td class="r num">${a.blo.ponto}</td>
        <td class="r num">${a.def.n >= 5 ? marca(a.def.boaPct < R.defesa.v, pct(a.def.boaPct)) : '–'}</td>
        <td class="r num"><b>${a.pontos}</b> / ${a.erros}</td></tr>`;
    };
    return `<div class="table-scroll"><table class="an-tab sc-tab">
      <thead>
        <tr class="sc-g"><th></th><th colspan="3" class="r">Saque</th><th colspan="3" class="r">Recepção</th><th colspan="3" class="r">Ataque</th><th class="r">Bloq.</th><th class="r">Defesa</th><th class="r">Pontos</th></tr>
        <tr><th>Atleta</th><th class="r">Total</th><th class="r">Ace</th><th class="r">Erro</th><th class="r">Total</th><th class="r">Nota</th><th class="r">Perf.</th><th class="r">Total</th><th class="r">Ponto</th><th class="r">Efic.</th><th class="r">Pontos</th><th class="r">Boas</th><th class="r" title="Pontos feitos / erros que deram ponto">Fez / deu</th></tr>
      </thead>
      <tbody>${lista.map(linha).join('')}</tbody></table></div>
      <p class="hint">Nota de recepção vai de 0 a 3. Eficiência de ataque é (pontos − erros − bloqueados) ÷ ataques. <span class="fora">Amarelo</span> marca valor fora da referência do clube, com pelo menos 5 ações.</p>`;
  }

  function kpisDe(S) {
    const T = S.total;
    return `<div class="kpis sc-kpis">${[
      kpi({ rot: 'Pontos ganhos', valor: S.aproveit == null ? 'n/d' : Math.round(S.aproveit), un: '%', sub: `${S.pontos.nos} a ${S.pontos.adv}` }),
      kpi({ rot: 'Side-out', valor: S.sideout == null ? 'n/d' : Math.round(S.sideout), un: '%', sub: `ganhos recebendo o saque (${S.so.v} de ${S.so.n}). Referência ${D.REF.sideout.v}%` }),
      kpi({ rot: 'Break point', valor: S.breakp == null ? 'n/d' : Math.round(S.breakp), un: '%', sub: `ganhos com o nosso saque (${S.bp.v} de ${S.bp.n}). Referência ${D.REF.breakp.v}%` }),
      kpi({ rot: 'Recepção', valor: T.rec.nota == null ? 'n/d' : dec(T.rec.nota, 1), un: '/3', sub: `${T.rec.n} recepções, ${pct(T.rec.p3Pct)} perfeitas` }),
      kpi({ rot: 'Ataque', valor: T.atq.ef == null ? 'n/d' : Math.round(T.atq.ef), un: '%', sub: `eficiência em ${T.atq.n} ataques, ${pct(T.atq.killPct)} de ponto` }),
      kpi({ rot: 'Saque', valor: T.saque.acePct == null ? 'n/d' : dec(T.saque.acePct, 0), un: '% ace', sub: `${pct(T.saque.erroPct)} de erro em ${T.saque.n} saques` }),
    ].join('')}</div>`;
  }

  /* ====================================================================
     RELATÓRIO DE UM JOGO
     ==================================================================== */

  function relatorioJogo(el, j) {
    const S = D.estatisticas([j]);
    const e = D.estado(j);
    // Saldo de pontos (nós menos eles) jogada a jogada
    const x = [], saldo = [], marcas = [];
    let s = 0, n = 0, setAnt = 0;
    j.eventos.filter((ev) => ev.ponto).forEach((ev) => {
      n++; s += ev.ponto === 'nos' ? 1 : -1;
      if (ev.set !== setAnt) { marcas.push({ i: n - 1, rotulo: `Set ${ev.set + 1}` }); setAnt = ev.set; }
      x.push(String(n)); saldo.push(s);
    });
    const lim = Math.max(3, ...saldo.map(Math.abs));
    const cfgSaldo = {
      rotulo: 'Saldo de pontos', rotuloX: 'Jogada', altura: 210, yMin: -lim, yMax: lim, nMarcas: 4, margemEsq: 38,
      x, tituloDica: (i) => `Jogada ${i + 1}`, marcasX: marcas,
      series: [{ id: 'saldo', nome: 'Saldo (nós menos eles)', tipo: 'linha', cor: 'a', y: saldo, fmt: (v) => (v > 0 ? `+${v}` : String(v)), rotuloUltimo: false }],
      fmtY: (v) => (v > 0 ? `+${v}` : String(v)),
      nota: 'Acima de zero, estamos na frente. As linhas verticais marcam o começo de cada set.',
    };

    const pontos = j.eventos.filter((ev) => ev.ponto);
    let a = 0, b = 0, setC = -1;
    const linhas = pontos.map((ev) => {
      if (ev.set !== setC) { setC = ev.set; a = 0; b = 0; }
      if (ev.ponto === 'nos') a++; else b++;
      return `<li><span class="num sc-tl-p">${ev.set + 1}º · ${a}–${b}</span><span>${esc(descrever(j, ev))}</span><b class="sc-pt ${ev.ponto}">${ev.ponto === 'nos' ? 'nosso' : 'deles'}</b></li>`;
    });

    el.innerHTML = `
      <div><button class="link-btn" id="sc-lista" style="margin:0">‹ Todos os jogos</button></div>
      <header class="page-head">
        <div>
          <span class="chip" style="margin-bottom:10px">Dados de exemplo</span>
          <h1>${esc(tituloJogo(j))}</h1>
          <p class="lead num">${dataLonga(j.data)} · ${esc(versus(j))} · ${esc(resumoSets(j))}</p>
        </div>
        <div class="actions">${seloResultado(j)}${e.encerrado ? '' : '<button class="btn btn-primary" id="sc-cont">Continuar a coleta</button>'}</div>
      </header>
      ${S.pontos.nos + S.pontos.adv ? kpisDe(S) : '<section class="card an-vazio"><h2>Sem ações registradas</h2><p>Comece a coleta para ver o relatório.</p></section>'}
      ${n >= 4 ? G.cartao('g-saldo', { titulo: 'Como o jogo andou', sub: 'Diferença de pontos a cada jogada.', ...cfgSaldo }) : ''}
      ${S.pontos.nos + S.pontos.adv ? `<section class="card" aria-labelledby="sc-or-t"><div class="card-head"><h2 id="sc-or-t">De onde vieram os pontos</h2></div>${origemPontos(S)}</section>` : ''}
      <section class="card" aria-labelledby="sc-at-t"><div class="card-head"><h2 id="sc-at-t">Atletas neste jogo</h2></div>${tabelaAtletas(S, j.dupla)}</section>
      ${S.dest.saque.some((v) => v) || S.dest.ataque.some((v) => v) ? `<section class="card" aria-labelledby="sc-mp-t"><div class="card-head"><h2 id="sc-mp-t">Para onde foram os saques e ataques</h2><span class="label">quadra do adversário</span></div><div class="sc-mapas">${mapa('Saque', S.dest.saque)}${mapa('Ataque', S.dest.ataque, S.dest.ataquePonto)}</div></section>` : ''}
      <details class="card sc-tl"><summary>Todas as jogadas (${pontos.length})</summary><ol class="sc-lista sc-tl-l">${linhas.join('')}</ol></details>`;

    G.ativar(el, 'g-saldo', cfgSaldo);
    el.querySelector('#sc-lista').addEventListener('click', () => { est.sel = null; render(raiz); window.scrollTo({ top: 0 }); });
    const c = el.querySelector('#sc-cont');
    if (c) c.addEventListener('click', () => window.Farol.ir('scout-coleta', { jogo: j.id }));
  }

  /* ====================================================================
     ABA JOGOS
     ==================================================================== */

  function formNovo() {
    const f = est.novo;
    const comps = CAL.lista().filter((c) => CAL.plan(c.id).duplas.some((d) => d.status === 'confirmada'));
    const comp = CAL.COMPETICOES[f.compId];
    const duplas = comp ? CAL.plan(f.compId).duplas.filter((d) => d.status === 'confirmada') : [];
    const turma = TURMAS[f.turmaId];
    const opt = (v, n, sel) => `<option value="${v}" ${sel ? 'selected' : ''}>${esc(n)}</option>`;
    const par = f.tipo === 'jogo' ? (duplas.find((d) => d.id === f.duplaId) ? [duplas.find((d) => d.id === f.duplaId).a, duplas.find((d) => d.id === f.duplaId).b] : null) : [f.a, f.b];
    const valido = par && par[0] && par[1] && par[0] !== par[1];

    return `
      <section class="card sc-form" aria-labelledby="sc-nv-t">
        <div class="card-head"><h2 id="sc-nv-t">Novo jogo</h2></div>
        <div class="seg-ctl" role="group" aria-label="Tipo de jogo" style="margin-bottom:14px">
          <button class="seg-btn" type="button" data-nv-tipo="jogo" aria-pressed="${f.tipo === 'jogo'}">Jogo de competição</button>
          <button class="seg-btn" type="button" data-nv-tipo="treino" aria-pressed="${f.tipo === 'treino'}">Treino-jogo</button>
        </div>
        <div class="form-grid">
          ${f.tipo === 'jogo' ? `
            <div class="field"><label class="label" for="nv-comp">Competição</label><select class="select" id="nv-comp">${comps.map((c) => opt(c.id, `${dd(c.data)} · ${c.nome}`, c.id === f.compId)).join('')}</select></div>
            <div class="field"><label class="label" for="nv-dupla">Nossa dupla</label><select class="select" id="nv-dupla">${duplas.map((d) => opt(d.id, `${D.rotuloDupla([d.a, d.b])} (${d.cat})`, d.id === f.duplaId)).join('')}</select></div>
            <div class="field"><label class="label" for="nv-titulo">Fase</label><input class="input" id="nv-titulo" value="${esc(f.titulo)}" maxlength="40" placeholder="Quartas de final"></div>`
          : `
            <div class="field"><label class="label" for="nv-turma">Turma</label><select class="select" id="nv-turma">${Object.values(TURMAS).map((t) => opt(t.id, t.nome, t.id === f.turmaId)).join('')}</select></div>
            <div class="field"><label class="label" for="nv-a">Atleta 1</label><select class="select" id="nv-a">${turma.atletas.map((id) => opt(id, ATLETAS[id].nome, id === f.a)).join('')}</select></div>
            <div class="field"><label class="label" for="nv-b">Atleta 2</label><select class="select" id="nv-b">${turma.atletas.map((id) => opt(id, ATLETAS[id].nome, id === f.b)).join('')}</select></div>`}
          <div class="field"><label class="label" for="nv-adv">Adversários</label><input class="input" id="nv-adv" value="${esc(f.adv)}" maxlength="40" placeholder="Silva e Moura"></div>
          <div class="field"><label class="label" for="nv-fmt">Formato</label><select class="select" id="nv-fmt">${Object.entries(D.FORMATOS).map(([k, x]) => opt(k, x.nome, k === f.formato)).join('')}</select></div>
          <div class="field"><label class="label" for="nv-sac">Quem saca primeiro</label><select class="select" id="nv-sac">
            ${par && par[0] ? `${opt('nos:0', `Nós, ${nm(par[0])}`, f.sac === 'nos:0')}${opt('nos:1', `Nós, ${par[1] ? nm(par[1]) : '…'}`, f.sac === 'nos:1')}` : opt('nos:0', 'Nós', true)}${opt('adv:0', 'Eles', f.sac === 'adv:0')}</select></div>
        </div>
        ${valido ? '' : '<p class="hint" style="margin:0 0 10px">Escolha dois atletas diferentes.</p>'}
        <div class="actions"><button class="btn btn-primary" id="nv-ok" ${valido ? '' : 'disabled'}>Começar a coletar</button><button class="btn" id="nv-cancela">Cancelar</button></div>
      </section>`;
  }

  function abrirNovo(pre) {
    const comps = CAL.lista().filter((c) => CAL.plan(c.id).duplas.some((d) => d.status === 'confirmada'));
    const alvo = comps.slice().sort((a, b) => Math.abs(a.data - HOJE) - Math.abs(b.data - HOJE))[0];
    const compId = (pre && pre.compId) || (alvo && alvo.id);
    const dp = compId ? CAL.plan(compId).duplas.filter((d) => d.status === 'confirmada') : [];
    const t = TURMAS.sub18;
    est.novo = {
      tipo: pre && pre.turmaId ? 'treino' : 'jogo', compId, duplaId: (pre && pre.duplaId) || (dp[0] && dp[0].id), titulo: '', adv: '',
      turmaId: (pre && pre.turmaId) || 'sub18', a: t.atletas[0], b: t.atletas[1], formato: 'melhor3', sac: 'nos:0',
    };
    if (est.novo.tipo === 'treino') est.novo.formato = 'set21';
  }

  function listaJogos(el) {
    const todos = D.jogos();
    const visiveis = todos.filter((j) => est.filtroTipo === 'todos' || j.tipo === est.filtroTipo);
    const andamento = visiveis.filter((j) => D.estado(j).encerrado === false);
    const fin = visiveis.filter((j) => D.estado(j).encerrado);

    const card = (j) => {
      const e = D.estado(j);
      const emAnd = !e.encerrado;
      const confirma = est.excluir === j.id;
      return `<article class="sc-jogo ${emAnd ? 'andamento' : ''}">
        <div class="sc-jogo-d num"><b>${dd(j.data)}</b><small>${j.tipo === 'jogo' ? 'Competição' : 'Treino-jogo'}</small></div>
        <div class="sc-jogo-m"><b>${esc(tituloJogo(j))}</b><span>${esc(versus(j))}</span><span class="num sc-sets">${esc(resumoSets(j))}</span></div>
        <div class="sc-jogo-r"><span class="sc-big num">${emAnd ? `${e.a} – ${e.b}` : `${e.ganhos} – ${e.perdidos}`}</span>${seloResultado(j)}</div>
        <div class="sc-jogo-a actions">
          ${emAnd ? `<button class="btn btn-primary btn-sm" data-cont="${j.id}">Continuar</button>` : ''}
          <button class="btn btn-sm" data-rel="${j.id}">Relatório</button>
          ${confirma ? `<button class="btn btn-sm btn-danger" data-exc-ok="${j.id}">Excluir mesmo</button><button class="btn btn-sm" data-exc-no>Manter</button>` : `<button class="link-btn" data-exc="${j.id}" style="margin:0" aria-label="Excluir o jogo ${esc(versus(j))}">Excluir</button>`}
        </div>
      </article>`;
    };

    el.innerHTML = `
      <div class="sc-barra">
        <div class="seg-ctl" role="group" aria-label="Filtrar jogos">
          ${[['todos', 'Todos'], ['jogo', 'Competição'], ['treino', 'Treino-jogo']].map(([k, n]) => `<button class="seg-btn" data-ft="${k}" aria-pressed="${est.filtroTipo === k}">${n}</button>`).join('')}
        </div>
        ${est.novo ? '' : '<button class="btn btn-primary" id="sc-novo">Novo jogo</button>'}
      </div>
      ${est.novo ? formNovo() : ''}
      ${andamento.length ? `<section aria-labelledby="sc-and-t"><h2 id="sc-and-t" class="sc-h2">Em andamento</h2><div class="sc-jogos">${andamento.map(card).join('')}</div></section>` : ''}
      <section aria-labelledby="sc-fin-t"><h2 id="sc-fin-t" class="sc-h2">Jogos encerrados <span class="label num">${fin.length}</span></h2>
        ${fin.length ? `<div class="sc-jogos">${fin.map(card).join('')}</div>` : '<p class="vazio">Nenhum jogo neste filtro.</p>'}</section>
      <p class="hint">Dica: durante a coleta, o botão Quadro (aqui embaixo) abre o quadro técnico por cima, sem sair do jogo.</p>`;

    const $ = (s) => el.querySelector(s);
    const nv = $('#sc-novo');
    if (nv) nv.addEventListener('click', () => { abrirNovo(); render(raiz, '#nv-comp'); });
    el.querySelectorAll('[data-ft]').forEach((b) => b.addEventListener('click', () => { est.filtroTipo = b.dataset.ft; render(raiz, `[data-ft="${b.dataset.ft}"]`); }));
    el.querySelectorAll('[data-cont]').forEach((b) => b.addEventListener('click', () => window.Farol.ir('scout-coleta', { jogo: b.dataset.cont })));
    el.querySelectorAll('[data-rel]').forEach((b) => b.addEventListener('click', () => { est.sel = b.dataset.rel; render(raiz); window.scrollTo({ top: 0 }); }));
    el.querySelectorAll('[data-exc]').forEach((b) => b.addEventListener('click', () => { est.excluir = b.dataset.exc; render(raiz, `[data-exc-ok="${b.dataset.exc}"]`); }));
    el.querySelectorAll('[data-exc-ok]').forEach((b) => b.addEventListener('click', () => { D.excluir(b.dataset.excOk); est.excluir = null; render(raiz, '#sc-novo'); }));
    el.querySelectorAll('[data-exc-no]').forEach((b) => b.addEventListener('click', () => { est.excluir = null; render(raiz); }));

    if (est.novo) ligarForm(el);
  }

  function ligarForm(el) {
    const f = est.novo;
    const $ = (s) => el.querySelector(s);
    const ler = () => {
      const v = (s) => { const x = $(s); return x ? x.value : null; };
      if (f.tipo === 'jogo') { f.titulo = v('#nv-titulo') ?? f.titulo; } else { f.a = v('#nv-a') || f.a; f.b = v('#nv-b') || f.b; }
      f.adv = v('#nv-adv') ?? f.adv; f.formato = v('#nv-fmt') || f.formato; f.sac = v('#nv-sac') || f.sac;
    };
    el.querySelectorAll('[data-nv-tipo]').forEach((b) => b.addEventListener('click', () => { ler(); f.tipo = b.dataset.nvTipo; f.formato = f.tipo === 'treino' ? 'set21' : 'melhor3'; f.sac = 'nos:0'; render(raiz, `[data-nv-tipo="${f.tipo}"]`); }));
    const re = (sel) => { const x = $(sel); if (x) x.addEventListener('change', () => { ler(); if (sel === '#nv-comp') { f.compId = x.value; const d = CAL.plan(f.compId).duplas.filter((q) => q.status === 'confirmada'); f.duplaId = d[0] && d[0].id; } if (sel === '#nv-dupla') f.duplaId = x.value; if (sel === '#nv-turma') { f.turmaId = x.value; const t = TURMAS[f.turmaId]; f.a = t.atletas[0]; f.b = t.atletas[1] || t.atletas[0]; } if (sel === '#nv-a' || sel === '#nv-b') f.sac = 'nos:0'; render(raiz, sel); }); };
    ['#nv-comp', '#nv-dupla', '#nv-turma', '#nv-a', '#nv-b'].forEach(re);
    $('#nv-cancela').addEventListener('click', () => { est.novo = null; render(raiz, '#sc-novo'); });
    $('#nv-ok').addEventListener('click', () => {
      ler();
      const dp = f.tipo === 'jogo' ? CAL.plan(f.compId).duplas.find((d) => d.id === f.duplaId) : null;
      const dupla = f.tipo === 'jogo' ? [dp.a, dp.b] : [f.a, f.b];
      const [sac, idx] = f.sac.split(':');
      const j = D.criarJogo({
        tipo: f.tipo, titulo: f.titulo.trim() || (f.tipo === 'jogo' ? 'Jogo' : 'Treino-jogo'), adv: f.adv.trim() || 'Adversários', dupla, formato: f.formato,
        origem: f.tipo === 'jogo' ? { compId: f.compId, duplaId: f.duplaId } : { turmaId: f.turmaId }, sacaPrimeiro: sac, idx: +idx,
        data: f.tipo === 'jogo' ? (CAL.COMPETICOES[f.compId].data <= HOJE ? CAL.COMPETICOES[f.compId].data : HOJE) : HOJE,
      });
      est.novo = null;
      window.Farol.ir('scout-coleta', { jogo: j.id });
    });
  }

  /* ====================================================================
     ABA RELATÓRIO (período)
     ==================================================================== */

  function jogosDoFiltro() {
    const f = est.rel;
    let l = D.jogos().filter((j) => j.eventos.length);
    if (f.tipo !== 'todos') l = l.filter((j) => j.tipo === f.tipo);
    if (f.periodo !== 'tudo') l = l.filter((j) => j.data >= HOJE - +f.periodo * DIA);
    if (f.dupla !== 'todas') l = l.filter((j) => chaveDupla(j) === f.dupla);
    return l;
  }

  function relatorioPeriodo(el) {
    const todas = D.jogos().filter((j) => j.eventos.length);
    const duplas = [...new Map(todas.map((j) => [chaveDupla(j), D.rotuloDupla(j.dupla)])).entries()];
    const lista = jogosDoFiltro();
    const filtros = `
      <div class="sc-filtros">
        <div class="field"><label class="label" for="rf-dupla">Dupla</label><select class="select" id="rf-dupla"><option value="todas">Todas as duplas</option>${duplas.map(([k, n]) => `<option value="${k}" ${est.rel.dupla === k ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></div>
        <div class="field"><label class="label" for="rf-tipo">Tipo</label><select class="select" id="rf-tipo">${[['todos', 'Competição e treino'], ['jogo', 'Só competição'], ['treino', 'Só treino-jogo']].map(([k, n]) => `<option value="${k}" ${est.rel.tipo === k ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
        <div class="field"><label class="label" for="rf-per">Período</label><select class="select" id="rf-per">${[['tudo', 'Toda a temporada'], ['90', 'Últimos 90 dias'], ['30', 'Últimos 30 dias']].map(([k, n]) => `<option value="${k}" ${est.rel.periodo === k ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
      </div>`;
    if (!lista.length) {
      el.innerHTML = `${filtros}<section class="card an-vazio"><h2>Sem jogos neste recorte</h2><p>Mude os filtros ou colete um jogo na aba Jogos.</p></section>`;
      ligarFiltros(el);
      return;
    }
    const S = D.estatisticas(lista);
    const sug = D.sugestoes(S);
    const ord = lista.slice().sort((a, b) => a.data - b.data);
    const porJogo = ord.map((j) => D.estatisticas([j]));
    const cfgEvo = {
      rotulo: 'Side-out e break point jogo a jogo', rotuloX: 'Jogo', altura: 210, yMin: 0, yMax: 100, nMarcas: 4, margemEsq: 40,
      x: ord.map((j, i) => String(i + 1)), tituloDica: (i) => `Jogo ${i + 1} · ${dd(ord[i].data)} · ${tituloJogo(ord[i])}`,
      series: [
        { id: 'so', nome: 'Side-out', tipo: 'linha', cor: 'a', y: porJogo.map((s) => (s.so.n >= 5 ? Math.round(s.sideout) : null)), fmt: (v) => `${v}%`, rotuloUltimo: false },
        { id: 'bp', nome: 'Break point', tipo: 'linha', cor: 'b', y: porJogo.map((s) => (s.bp.n >= 5 ? Math.round(s.breakp) : null)), fmt: (v) => `${v}%`, rotuloUltimo: false },
      ],
      faixa: { de: D.REF.breakp.v, ate: D.REF.sideout.v, rotulo: 'referências do clube (40% e 60%)' },
      fmtY: (v) => `${v}%`,
      nota: 'Side-out é o ponto ganho quando recebemos o saque; break point, quando sacamos. Quem recebe bem e ataca bem ganha o jogo.',
    };
    const ids = Object.keys(S.atletas);

    el.innerHTML = `
      ${filtros}
      <p class="sc-resumo">${plural(lista.length, 'jogo', 'jogos')} · ${plural(S.sets, 'set', 'sets')} · ${S.vitorias} ${S.vitorias === 1 ? 'vitória' : 'vitórias'}</p>
      ${kpisDe(S)}
      <div class="an-grade">
        <div class="an-col">
          ${lista.length > 1 ? G.cartao('g-evo', { titulo: 'Evolução jogo a jogo', sub: 'Side-out e break point de cada jogo, em ordem de data.', ...cfgEvo }) : ''}
          <section class="card" aria-labelledby="sc-or2-t"><div class="card-head"><h2 id="sc-or2-t">De onde vêm os pontos</h2></div>${origemPontos(S)}</section>
          <section class="card" aria-labelledby="sc-at2-t"><div class="card-head"><h2 id="sc-at2-t">Atletas</h2><span class="label">${plural(ids.length, 'atleta', 'atletas')}</span></div>${tabelaAtletas(S, ids.sort((a, b) => ATLETAS[a].nome.localeCompare(ATLETAS[b].nome)))}</section>
          <section class="card" aria-labelledby="sc-mp2-t"><div class="card-head"><h2 id="sc-mp2-t">Saques e ataques na quadra</h2><span class="label">quadra do adversário</span></div>
            <div class="sc-mapas">${mapa('Saque', S.dest.saque)}${mapa('Ataque', S.dest.ataque, S.dest.ataquePonto)}</div></section>
        </div>
        <aside class="an-lado">
          <section class="card" aria-labelledby="sc-sg-t">
            <div class="card-head"><h2 id="sc-sg-t">Foco para o treino</h2><span class="label">${plural(sug.length, 'sugestão', 'sugestões')}</span></div>
            ${sug.length ? `<ul class="sc-sug">${sug.map((s, i) => `<li><div><b>${esc(s.titulo)}</b><small>${esc(s.motivo)}</small></div><button class="btn btn-sm" data-sug="${i}">Criar treino de fundamento</button></li>`).join('')}</ul>`
              : '<p class="vazio" style="padding:4px 0">Nenhum ponto fraco claro pelas referências do clube neste recorte.</p>'}
            <p class="hint">As metas partem das referências do clube e do que o scout mostrou. O treino vira uma contagem de acertos na aba Fundamento.</p>
          </section>
          <details class="card an-como">
            <summary>Referências do clube</summary>
            <ul class="ideias">${Object.values(D.REF).map((r) => `<li><b>${esc(r.nome)}</b>: ${esc(r.un === '%' ? `${r.v}%` : String(r.v).replace('.', ','))}, ${esc(r.texto)}.</li>`).join('')}
              <li>São valores de partida. Ajuste com a comissão técnica quando houver histórico do clube.</li></ul>
          </details>
        </aside>
      </div>`;
    if (lista.length > 1) G.ativar(el, 'g-evo', cfgEvo);
    ligarFiltros(el);
    el.querySelectorAll('[data-sug]').forEach((b) => b.addEventListener('click', () => {
      const s = sug[+b.dataset.sug];
      est.aba = 'fund'; est.treino = null;
      est.novoTreino = { fund: s.fund, nome: s.nome, meta: s.meta, turmaId: 'sub18' };
      render(raiz, '#nt-nome'); window.scrollTo({ top: 0 });
    }));
  }

  function ligarFiltros(el) {
    [['#rf-dupla', 'dupla'], ['#rf-tipo', 'tipo'], ['#rf-per', 'periodo']].forEach(([sel, k]) => {
      el.querySelector(sel).addEventListener('change', (e) => { est.rel[k] = e.target.value; render(raiz, sel); });
    });
  }

  /* ====================================================================
     ABA FUNDAMENTO
     ==================================================================== */

  const mediaPct = (t) => {
    const v = Object.values(t.regs).filter((r) => r.t > 0);
    return v.length ? (100 * v.reduce((a, r) => a + r.a, 0)) / v.reduce((a, r) => a + r.t, 0) : null;
  };

  function anterior(t) {
    return D.treinos().filter((x) => x.id !== t.id && x.nome === t.nome && x.fund === t.fund && x.data <= t.data && mediaPct(x) != null).sort((a, b) => b.data - a.data)[0] || null;
  }

  function fundamentos(el) {
    if (est.treino) { contador(el, D.treino(est.treino)); return; }
    const lista = D.treinos();
    const nt = est.novoTreino;
    const form = nt ? `
      <section class="card sc-form" aria-labelledby="sc-nt-t">
        <div class="card-head"><h2 id="sc-nt-t">Novo treino de fundamento</h2></div>
        <div class="form-grid">
          <div class="field"><label class="label" for="nt-fund">Fundamento</label><select class="select" id="nt-fund">${D.ORDEM_FUND.map((k) => `<option value="${k}" ${nt.fund === k ? 'selected' : ''}>${F[k].nome}</option>`).join('')}</select></div>
          <div class="field"><label class="label" for="nt-nome">Exercício</label><input class="input" id="nt-nome" value="${esc(nt.nome)}" maxlength="60" placeholder="Saque na zona 1, 10 bolas"></div>
          <div class="field"><label class="label" for="nt-turma">Turma</label><select class="select" id="nt-turma">${Object.values(TURMAS).map((t) => `<option value="${t.id}" ${nt.turmaId === t.id ? 'selected' : ''}>${esc(t.nome)}</option>`).join('')}</select></div>
          <div class="field"><label class="label" for="nt-meta">Meta de acerto (%)</label><input class="input num" id="nt-meta" type="number" min="10" max="100" step="5" value="${nt.meta}"></div>
        </div>
        <p class="hint" style="margin:0 0 10px">Acerto é a bola que cumpriu o critério do exercício (por exemplo, caiu na zona). Combine o critério antes de contar.</p>
        <div class="actions"><button class="btn btn-primary" id="nt-ok">Começar a contar</button><button class="btn" id="nt-cancela">Cancelar</button></div>
      </section>` : '';

    el.innerHTML = `
      <div class="sc-barra"><p class="sc-resumo" style="margin:0">Contagem de acertos por atleta num exercício, sem placar.</p>${nt ? '' : '<button class="btn btn-primary" id="nt-novo">Novo treino de fundamento</button>'}</div>
      ${form}
      <section aria-labelledby="sc-fl-t"><h2 id="sc-fl-t" class="sc-h2">Treinos registrados <span class="label num">${lista.length}</span></h2>
        ${lista.length ? `<div class="sc-jogos">${lista.map((t) => {
          const m = mediaPct(t), ant = anterior(t);
          const dlt = m != null && ant ? m - mediaPct(ant) : null;
          const conta = Object.values(t.regs).reduce((a, r) => a + r.t, 0);
          return `<article class="sc-jogo">
            <div class="sc-jogo-d num"><b>${dd(t.data)}</b><small>${esc(F[t.fund].nome)}</small></div>
            <div class="sc-jogo-m"><b>${esc(t.nome)}</b><span>${esc(TURMAS[t.turmaId].nome)} · ${plural(Object.keys(t.regs).length, 'atleta', 'atletas')} · ${conta} bolas</span></div>
            <div class="sc-jogo-r"><span class="sc-big num">${m == null ? '–' : Math.round(m)}%</span><span class="sc-meta">meta ${t.meta}%${dlt != null && Math.abs(dlt) >= 0.5 ? ` · ${dlt > 0 ? '+' : '−'}${Math.round(Math.abs(dlt))} pts desde o último` : ''}</span></div>
            <div class="sc-jogo-a actions"><button class="btn btn-sm" data-ft-abre="${t.id}">${t.data === HOJE ? 'Continuar contagem' : 'Abrir'}</button></div></article>`;
        }).join('')}</div>` : '<p class="vazio">Nenhum treino de fundamento ainda.</p>'}</section>`;

    const $ = (s) => el.querySelector(s);
    const novo = $('#nt-novo');
    if (novo) novo.addEventListener('click', () => { est.novoTreino = { fund: 'saque', nome: '', meta: 70, turmaId: 'sub18' }; render(raiz, '#nt-nome'); });
    el.querySelectorAll('[data-ft-abre]').forEach((b) => b.addEventListener('click', () => { est.treino = b.dataset.ftAbre; render(raiz); window.scrollTo({ top: 0 }); }));
    if (nt) {
      const ler = () => { nt.fund = $('#nt-fund').value; nt.nome = $('#nt-nome').value; nt.turmaId = $('#nt-turma').value; nt.meta = Math.max(10, Math.min(100, +$('#nt-meta').value || 70)); };
      ['#nt-fund', '#nt-turma'].forEach((s) => $(s).addEventListener('change', () => { ler(); render(raiz, s); }));
      $('#nt-cancela').addEventListener('click', () => { est.novoTreino = null; render(raiz, '#nt-novo'); });
      $('#nt-ok').addEventListener('click', () => {
        ler();
        const t = D.criarTreino({ fund: nt.fund, nome: nt.nome.trim() || `${F[nt.fund].nome} em exercício`, turmaId: nt.turmaId, meta: nt.meta });
        est.novoTreino = null; est.treino = t.id; render(raiz); window.scrollTo({ top: 0 });
      });
    }
  }

  function contador(el, t) {
    if (!t) { est.treino = null; fundamentos(el); return; }
    const turma = TURMAS[t.turmaId];
    const m = mediaPct(t), ant = anterior(t);
    const serie = D.treinos().filter((x) => x.nome === t.nome && x.fund === t.fund).sort((a, b) => a.data - b.data);
    const cfg = {
      rotulo: 'Acerto médio da turma neste exercício', rotuloX: 'Treino', altura: 190, yMin: 0, yMax: 100, nMarcas: 4, margemEsq: 40,
      x: serie.map((x) => dd(x.data)), tituloDica: (i) => `${dataLonga(serie[i].data)}`,
      series: [
        { id: 'm', nome: 'Acerto da turma', tipo: 'linha', cor: 'a', y: serie.map((x) => { const v = mediaPct(x); return v == null ? null : Math.round(v); }), fmt: (v) => `${v}%`, rotuloUltimo: false },
        { id: 'meta', nome: 'Meta', tipo: 'linha', cor: 'c', y: serie.map((x) => x.meta), fmt: (v) => `${v}%`, rotuloUltimo: false },
      ],
      fmtY: (v) => `${v}%`,
    };
    const ordem = turma.atletas.slice().sort((a, b) => ATLETAS[a].nome.localeCompare(ATLETAS[b].nome));
    const linha = (id) => {
      const r = t.regs[id] || { t: 0, a: 0 };
      const p = r.t ? (100 * r.a) / r.t : null;
      return `<li class="sc-ct ${r.t ? '' : 'zero'}" data-id="${id}">
        <div class="sc-ct-h"><b>${esc(ATLETAS[id].nome)}</b><span class="num"><span class="sc-ct-n">${r.a} de ${r.t}</span> <b class="${p != null && p >= t.meta ? 'sc-ok' : ''}">${p == null ? '–' : `${Math.round(p)}%`}</b></span></div>
        <div class="sc-meter" role="img" aria-label="${p == null ? 'sem bolas' : `${Math.round(p)}% de acerto, meta ${t.meta}%`}"><i style="width:${p || 0}%"></i><u style="left:${t.meta}%"></u></div>
        <div class="sc-ct-b"><button class="sc-ac" type="button" data-ac="${id}">Acerto</button><button class="sc-er" type="button" data-er="${id}">Erro</button><button class="sc-un" type="button" data-un="${id}" aria-label="Desfazer última bola de ${esc(nm(id))}" ${r.t ? '' : 'disabled'}>↶</button></div>
      </li>`;
    };
    el.innerHTML = `
      <div><button class="link-btn" id="ct-volta" style="margin:0">‹ Treinos de fundamento</button></div>
      <header class="page-head">
        <div><h1>${esc(t.nome)}</h1><p class="lead num">${dataLonga(t.data)} · ${esc(F[t.fund].nome)} · ${esc(turma.nome)}</p></div>
        <div class="sc-resumo-ct"><span class="label">Turma</span><b class="num">${m == null ? '–' : `${Math.round(m)}%`}</b><small>meta ${t.meta}%${ant ? ` · ${m - mediaPct(ant) >= 0 ? '+' : '−'}${Math.round(Math.abs(m - mediaPct(ant)))} pts desde ${dd(ant.data)}` : ''}</small></div>
      </header>
      <ul class="sc-cts">${ordem.map(linha).join('')}</ul>
      ${serie.length > 1 ? G.cartao('g-ft', { titulo: 'Evolução neste exercício', sub: 'Acerto médio da turma em cada treino.', ...cfg }) : ''}
      <div class="actions"><button class="btn" id="ct-exc">Excluir este treino</button></div>`;
    if (serie.length > 1) G.ativar(el, 'g-ft', cfg);
    const $ = (s) => el.querySelector(s);
    $('#ct-volta').addEventListener('click', () => { est.treino = null; render(raiz); window.scrollTo({ top: 0 }); });
    const re = (foco) => { const y = window.scrollY; render(raiz); window.scrollTo({ top: y }); const f = raiz.querySelector(foco); if (f) f.focus({ preventScroll: true }); };
    el.querySelectorAll('[data-ac]').forEach((b) => b.addEventListener('click', () => { D.contar(t.id, b.dataset.ac, true); re(`[data-ac="${b.dataset.ac}"]`); }));
    el.querySelectorAll('[data-er]').forEach((b) => b.addEventListener('click', () => { D.contar(t.id, b.dataset.er, false); re(`[data-er="${b.dataset.er}"]`); }));
    el.querySelectorAll('[data-un]').forEach((b) => b.addEventListener('click', () => { D.desfazerContagem(t.id, b.dataset.un); re(`[data-un="${b.dataset.un}"]:not(:disabled), [data-ac="${b.dataset.un}"]`); }));
    $('#ct-exc').addEventListener('click', () => { if ($('#ct-exc').dataset.sim) { D.excluirTreino(t.id); est.treino = null; render(raiz); } else { $('#ct-exc').dataset.sim = '1'; $('#ct-exc').textContent = 'Excluir mesmo?'; $('#ct-exc').classList.add('btn-danger'); } });
  }

  /* ====================================================================
     TELA
     ==================================================================== */

  const ABAS = [['jogos', 'Jogos'], ['rel', 'Relatório'], ['fund', 'Fundamento']];

  function render(root, foco) {
    if (est.sel && D.jogo(est.sel)) {
      root.innerHTML = '<div class="corpo" id="sc-corpo"></div>';
      relatorioJogo(root.querySelector('#sc-corpo'), D.jogo(est.sel));
      return;
    }
    est.sel = null;
    root.innerHTML = `
      <header class="page-head">
        <div>
          <span class="chip" style="margin-bottom:10px">Dados de exemplo</span>
          <h1>Scout</h1>
          <p class="lead">Registre o jogo ou o treino-jogo ponto a ponto e veja o que a dupla faz bem e o que levar para o treino.</p>
        </div>
      </header>
      <div class="tabs" role="tablist" aria-label="Áreas do scout">
        ${ABAS.map(([k, n]) => `<button class="tab" role="tab" data-aba-tab="${k}" id="sc-tab-${k}" aria-selected="${k === est.aba}" aria-controls="sc-corpo" tabindex="${k === est.aba ? 0 : -1}"><span class="tab-nome">${n}</span></button>`).join('')}
      </div>
      <div id="sc-corpo" class="corpo" role="tabpanel" aria-labelledby="sc-tab-${est.aba}"></div>`;
    const corpo = root.querySelector('#sc-corpo');
    if (est.aba === 'jogos') listaJogos(corpo); else if (est.aba === 'rel') relatorioPeriodo(corpo); else fundamentos(corpo);

    root.querySelectorAll('[data-aba-tab]').forEach((b, i, todos) => {
      b.addEventListener('click', () => { est.aba = b.dataset.abaTab; est.treino = null; render(root, `#sc-tab-${est.aba}`); });
      b.addEventListener('keydown', (e) => {
        const passo = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (!passo) return;
        e.preventDefault();
        est.aba = todos[(i + passo + todos.length) % todos.length].dataset.abaTab; est.treino = null;
        render(root, `#sc-tab-${est.aba}`);
      });
    });
    if (foco) { const f = root.querySelector(foco); if (f) f.focus({ preventScroll: true }); }
  }

  window.Farol.views = window.Farol.views || {};
  window.Farol.views['analise-scout'] = (root, params) => {
    raiz = root;
    est.sel = params && params.jogo ? params.jogo : null;
    if (params && params.aba) est.aba = params.aba;
    if (params && params.novo) { est.aba = 'jogos'; abrirNovo(params.novo); }
    if (params && params.novoTreino) { est.aba = 'fund'; est.treino = null; est.novoTreino = { fund: 'saque', nome: '', meta: 70, turmaId: 'sub18' }; }
    render(root);
  };
  window.Farol.views['scout-coleta'] = (root, params) => {
    raiz = root;
    const id = (params && params.jogo) || live.jogoId;
    coleta(root, id);
  };
})();
