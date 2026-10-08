/* Coleta ao vivo do scout (rota `scout-coleta`)
   Poucos pontos para tocar: o placar é a entrada (azul é a nossa dupla, vermelho é o adversário).
   - Toque no + do lado que fez o ponto: abre UMA roda com quatro opções nas laterais; o centro, sem nome, é "outro".
       nosso ponto: Ataque · Bloqueio · Ace · Erro deles        ponto deles: Ataque · Saque · Bloqueio · Erro nosso
   - Também dá para segurar o + e deslizar até a opção, soltando em cima dela. Teclado: Enter e as setas.
   - A escolha já registra. Os detalhes (tipo de ataque, tipo de saque, qual erro, qualidade da recepção) são
     opcionais e aparecem como quatro botões na "Última ação", onde também se corrige o que foi marcado.
   - Jogada sem ponto (recepção, defesa, ataque defendido, saque em jogo): um botão só, com a mesma roda.
   - Placar, sets, sacador, troca de lado e tempo técnico são calculados. O quadro técnico abre por cima. */
(function () {
  const { util, scoutDados: D, scoutUI: UI } = window.Farol;
  const { esc, clamp } = util;
  const F = D.FUND;
  const nm = D.nomeCurto;

  const live = { jogoId: null, quem: null };
  let raiz = null, relogio = null, radialAtivo = null;

  /* ---------- Ícones ---------- */

  const IC = {
    ataque: '<circle cx="12" cy="12" r="9"/><path d="M3.600 9.500c5 1 11 1 16.800 0M3.600 14.500c5-1 11-1 16.800 0M12 3a14 14 0 0 1 0 18"/>',
    bloqueio: '<rect x="3" y="5" width="18" height="14" rx="1.500"/><path d="M3 10h18M3 15h18M9 5v5M15 10v5M9 15v4"/>',
    ace: '<rect x="4" y="3" width="16" height="18" rx="2.500"/><path d="M8.500 17l3.500-10 3.500 10M9.800 13.500h4.400"/>',
    erro: '<circle cx="12" cy="12" r="9"/><path d="M8.500 8.500l7 7M15.500 8.500l-7 7"/>',
    outro: '<circle cx="12" cy="12" r="9"/><path d="M9.500 9.500a2.500 2.500 0 1 1 3.500 2.300c-.7.400-1 .9-1 1.700M12 17v.1"/>',
    recepcao: '<path d="M3 16h18M6 16l-2.500-7M18 16l2.500-7"/><circle cx="12" cy="8" r="3"/>',
    defesa: '<path d="M12 3l8 3v5c0 5-3.500 8.500-8 10-4.500-1.500-8-5-8-10V6z"/>',
    saque: '<circle cx="12" cy="14" r="6"/><path d="M12 8V3M9 5l3-2 3 2"/>',
    jogada: '<circle cx="12" cy="12" r="9"/><path d="M12 7v10M7 12h10"/>',
  };
  const ic = (k, t = 24) => `<svg width="${t}" height="${t}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[k]}</svg>`;

  /* ---------- O que cada opção registra ---------- */

  // `quem`: 'live' (atleta escolhido), 'sacador' ou 'adv'. `ativo(e)`: quando a opção faz sentido.
  const A = {
    ataque: { rot: 'Ataque', ic: 'ataque', fund: 'ataque', res: 'ponto', quem: 'live' },
    bloqueio: { rot: 'Bloqueio', ic: 'bloqueio', fund: 'bloqueio', res: 'ponto', quem: 'live' },
    ace: { rot: 'Ace', ic: 'ace', fund: 'saque', res: 'ace', quem: 'sacador', ativo: (e) => e.sac === 'nos' },
    erroAdv: { rot: 'Erro deles', ic: 'erro', fund: 'adv', res: 'erro', quem: 'adv' },
    outroNos: { rot: 'Outro', ic: 'outro', fund: 'adv', res: 'erro', quem: 'adv', tipo: 'outro' },

    atqAdv: { rot: 'Ataque', ic: 'ataque', fund: 'adv', res: 'ponto', quem: 'adv', tipo: 'ataque' },
    saqAdv: { rot: 'Saque', ic: 'ace', fund: 'adv', res: 'ponto', quem: 'adv', tipo: 'saque', ativo: (e) => e.sac === 'adv' },
    bloqAdv: { rot: 'Bloqueio', ic: 'bloqueio', fund: 'adv', res: 'ponto', quem: 'adv', tipo: 'bloqueio' },
    erroNos: { rot: 'Erro nosso', ic: 'erro', abre: 'erroNosso' },
    outroAdv: { rot: 'Outro', ic: 'outro', fund: 'adv', res: 'ponto', quem: 'adv', tipo: 'outro' },

    eSaque: { rot: 'Saque', ic: 'saque', fund: 'saque', res: 'erro', quem: 'sacador', ativo: (e) => e.sac === 'nos' },
    eRecepcao: { rot: 'Recepção', ic: 'recepcao', fund: 'recepcao', res: 'r0', quem: 'live', ativo: (e) => e.sac === 'adv' },
    eAtaque: { rot: 'Ataque', ic: 'ataque', fund: 'ataque', res: 'erro', quem: 'live' },
    eDefesa: { rot: 'Defesa', ic: 'defesa', fund: 'defesa', res: 'erro', quem: 'live' },
    eOutro: { rot: 'Outro', ic: 'outro', fund: 'adv', res: 'ponto', quem: 'adv', tipo: 'outro' },

    sRecepcao: { rot: 'Recepção', ic: 'recepcao', fund: 'recepcao', res: 'r2', quem: 'live' },
    sAtaque: { rot: 'Ataque', ic: 'ataque', fund: 'ataque', res: 'jogo', quem: 'live' },
    sSaque: { rot: 'Saque', ic: 'saque', fund: 'saque', res: 'jogo', quem: 'sacador' },
    sDefesa: { rot: 'Defesa', ic: 'defesa', fund: 'defesa', res: 'boa', quem: 'live' },
  };
  // Sempre no máximo quatro nas laterais (em cima, à direita, embaixo, à esquerda) e o centro sem nome.
  const RODAS = {
    nos: { titulo: 'Ponto nosso', lado: 'nos', lat: ['ataque', 'bloqueio', 'ace', 'erroAdv'], centro: 'outroNos' },
    adv: { titulo: 'Ponto deles', lado: 'adv', lat: ['atqAdv', 'saqAdv', 'bloqAdv', 'erroNos'], centro: 'outroAdv' },
    erroNosso: { titulo: 'Erro nosso', lado: 'adv', lat: ['eSaque', 'eRecepcao', 'eAtaque', 'eDefesa'], centro: 'eOutro' },
    jogada: { titulo: 'Jogada sem ponto', lado: 'nos', lat: ['sRecepcao', 'sAtaque', 'sSaque', 'sDefesa'], centro: null },
  };

  // Detalhes opcionais da última ação: quatro botões no máximo.
  function detalhesDe(ev) {
    const tipos = (fund, res, so) => (F[fund].res.find((r) => r.id === res).tipos || F[fund].tipos || []).filter(([k]) => !so || so.includes(k)).map(([k, rot]) => ({ rot, patch: { tipo: k }, on: ev.tipo === k }));
    if (ev.fund === 'ataque') {
      if (ev.res === 'erro' || ev.res === 'bloq') return { titulo: 'Como perdeu', opcoes: [{ rot: 'Erro', patch: { res: 'erro' }, on: ev.res === 'erro' }, { rot: 'Bloqueado', patch: { res: 'bloq' }, on: ev.res === 'bloq' }] };
      return { titulo: 'Tipo de ataque', opcoes: tipos('ataque', ev.res) };
    }
    if (ev.fund === 'saque') return { titulo: 'Tipo de saque', opcoes: tipos('saque', ev.res) };
    if (ev.fund === 'recepcao') return { titulo: 'Qualidade da recepção', opcoes: [['r3', 'Perfeita'], ['r2', 'Boa'], ['r1', 'Ruim'], ['r0', 'Erro']].map(([k, rot]) => ({ rot, patch: { res: k }, on: ev.res === k })) };
    if (ev.fund === 'adv' && ev.res === 'erro') return { titulo: 'Qual erro', opcoes: tipos('adv', 'erro', ['saque', 'ataque', 'rede', 'fora']) };
    if (ev.fund === 'adv' && ev.res === 'ponto') return { titulo: 'Como eles fizeram', opcoes: tipos('adv', 'ponto') };
    return null;
  }

  /* ---------- Quem está na bola ---------- */

  function padrao(j) {
    const e = D.estado(j);
    if (!live.quem || !j.dupla.includes(live.quem)) live.quem = j.dupla[0];
    if (e.sac === 'nos' && !e.iniciado) live.quem = e.sacador;
  }
  // Depois de recepção ou defesa, a vez é do parceiro.
  function proximo(j, ev) {
    if (ev.fund === 'recepcao' || ev.fund === 'defesa') live.quem = j.dupla.find((x) => x !== ev.quem) || live.quem;
  }

  /* ---------- Roda ---------- */

  const R_IN = 40, R_OUT = 132;
  const pol = (cx, cy, r, a) => [cx + r * Math.cos((a * Math.PI) / 180), cy + r * Math.sin((a * Math.PI) / 180)];
  function fatia(cx, cy, a0, a1) {
    const [x0, y0] = pol(cx, cy, R_OUT, a0), [x1, y1] = pol(cx, cy, R_OUT, a1), [x2, y2] = pol(cx, cy, R_IN + 4, a1), [x3, y3] = pol(cx, cy, R_IN + 4, a0);
    const grande = a1 - a0 > 180 ? 1 : 0;
    return `M${x0.toFixed(1)} ${y0.toFixed(1)}A${R_OUT} ${R_OUT} 0 ${grande} 1 ${x1.toFixed(1)} ${y1.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}A${R_IN + 4} ${R_IN + 4} 0 ${grande} 0 ${x3.toFixed(1)} ${y3.toFixed(1)}Z`;
  }

  function fecharRadial() {
    if (!radialAtivo) return;
    const { el } = radialAtivo;
    el.remove(); radialAtivo = null;
  }

  // cfg: { titulo, lado, x, y, itens: [{ rot, ic, desativado }], centro: { rot, ic } | null, aoEscolher(i | 'centro') }
  function abrirRadial(cfg) {
    fecharRadial();
    const L = R_OUT + 6;
    const cx = clamp(cfg.x, L + 4, innerWidth - L - 4), cy = clamp(cfg.y, L + 64, innerHeight - L - 76);
    const n = cfg.itens.length, passo = 360 / n;
    const el = document.createElement('div');
    el.className = 'sc-rad';
    el.setAttribute('role', 'menu');
    el.setAttribute('aria-label', cfg.titulo);
    const fatias = cfg.itens.map((o, i) => {
      const meio = -90 + i * passo, a0 = meio - passo / 2 + 0.8, a1 = meio + passo / 2 - 0.8;
      const [tx, ty] = pol(L, L, (R_IN + R_OUT) / 2 + 8, meio);
      return `<g class="sc-rad-f ${o.desativado ? 'off' : ''}" data-i="${i}" role="menuitem" tabindex="${o.desativado ? -1 : 0}" ${o.desativado ? 'aria-disabled="true"' : ''} aria-label="${esc(o.rot)}${o.desativado && o.dica ? `, ${esc(o.dica)}` : ''}"><path d="${fatia(L, L, a0, a1)}"/>
        <g transform="translate(${(tx - 11).toFixed(1)} ${(ty - 28).toFixed(1)}) scale(0.92)" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" pointer-events="none">${IC[o.ic]}</g>
        <text x="${tx.toFixed(1)}" y="${(ty + 15).toFixed(1)}" text-anchor="middle">${esc(o.rot)}</text></g>`;
    }).join('');
    const c = cfg.centro;
    el.innerHTML = `
      <button class="sc-rad-fundo" type="button" aria-label="Fechar"></button>
      <div class="sc-rad-caixa" style="left:${(cx - L).toFixed(0)}px;top:${(cy - L).toFixed(0)}px;width:${L * 2}px;height:${L * 2}px">
        <div class="sc-rad-t">${esc(cfg.titulo)}</div>
        <svg viewBox="0 0 ${L * 2} ${L * 2}" width="${L * 2}" height="${L * 2}" class="sc-rad-svg ${cfg.lado || ''}" focusable="false">
          <circle cx="${L}" cy="${L}" r="${R_OUT + 3}" class="sc-rad-disco"/>
          ${fatias}
          <g class="sc-rad-c" data-i="centro" role="menuitem" tabindex="0" aria-label="${esc(c ? c.rot : 'Fechar')}"><circle cx="${L}" cy="${L}" r="${R_IN}"/>
            ${c ? `<g transform="translate(${L - 12} ${L - 12})" fill="none" stroke="#fff" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" pointer-events="none">${IC[c.ic]}</g>` : `<path d="M${L - 9} ${L - 9}l18 18M${L + 9} ${L - 9}l-18 18" stroke="#fff" stroke-width="2.4" stroke-linecap="round" pointer-events="none"/>`}</g>
        </svg>
      </div>`;
    document.body.appendChild(el);
    if (navigator.vibrate) { try { navigator.vibrate(12); } catch (e) { /* sem vibração */ } }

    // A direção vale a partir de onde o dedo começou, mesmo que a roda tenha sido empurrada para dentro da tela.
    const ctl = { el, ox: cfg.ox != null ? cfg.ox : cx, oy: cfg.oy != null ? cfg.oy : cy, hover: null, soltoEm: 0 };
    const marcar = (h) => { ctl.hover = h; el.querySelectorAll('[data-i]').forEach((g) => g.classList.toggle('on', g.dataset.i === String(h))); };
    ctl.mover = (x, y) => {
      const dx = x - ctl.ox, dy = y - ctl.oy, d = Math.hypot(dx, dy);
      if (d < R_IN) return marcar('centro');
      if (d > R_OUT + 34) return marcar(null);
      let a = (Math.atan2(dy, dx) * 180) / Math.PI + 90 + passo / 2;
      a = ((a % 360) + 360) % 360;
      const i = Math.floor(a / passo) % n;
      return marcar(cfg.itens[i].desativado ? null : i);
    };
    ctl.escolher = (h) => {
      if (h !== 'centro' && cfg.itens[Number(h)].desativado) return;
      if (h === 'centro' && !c) { fecharRadial(); return; }
      fecharRadial();
      cfg.aoEscolher(h === 'centro' ? 'centro' : Number(h));
    };
    // O "clique" que o navegador cria ao soltar o dedo não pode escolher nada por acidente.
    const eco = () => ctl.soltoEm && performance.now() - ctl.soltoEm < 250;
    el.querySelector('.sc-rad-fundo').addEventListener('click', () => { if (!eco()) fecharRadial(); });
    el.querySelectorAll('[data-i]').forEach((g) => {
      g.addEventListener('click', () => { if (!eco()) ctl.escolher(g.dataset.i); });
      g.addEventListener('keydown', (e) => {
        const todos = [...el.querySelectorAll('[data-i]:not([aria-disabled="true"])')];
        const k = todos.indexOf(g);
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ctl.escolher(g.dataset.i); }
        else if (e.key === 'Escape') { e.preventDefault(); fecharRadial(); if (cfg.volta) cfg.volta.focus(); }
        else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); todos[(k + 1) % todos.length].focus(); }
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); todos[(k - 1 + todos.length) % todos.length].focus(); }
      });
    });
    radialAtivo = ctl;
    return ctl;
  }

  // Botão que abre uma roda assim que é tocado. Segurar e deslizar escolhe ao soltar; tocar e soltar deixa a roda aberta.
  function ligarRoda(btn, montar) {
    let ctl = null, mexeu = false, x0 = 0, y0 = 0;
    const abrir = (x, y, foco) => {
      const cfg = montar();
      if (!cfg) return null;
      const c = abrirRadial({ ...cfg, x, y, ox: x, oy: y, volta: btn });
      if (foco) { const f = c.el.querySelector('[data-i="0"]'); if (f) f.focus(); }
      return c;
    };
    btn.addEventListener('contextmenu', (e) => e.preventDefault());
    btn.addEventListener('pointerdown', (e) => {
      if (btn.disabled || (e.pointerType === 'mouse' && e.button !== 0)) return;
      mexeu = false; x0 = e.clientX; y0 = e.clientY;
      try { btn.setPointerCapture(e.pointerId); } catch (er) { /* ok */ }
      const r = btn.getBoundingClientRect();
      ctl = abrir(r.left + r.width / 2, r.top + r.height / 2, false);
      if (ctl) { ctl.ox = x0; ctl.oy = y0; ctl.mover(x0, y0); }
    });
    btn.addEventListener('pointermove', (e) => {
      if (Math.hypot(e.clientX - x0, e.clientY - y0) > 10) mexeu = true;
      if (ctl && radialAtivo === ctl) ctl.mover(e.clientX, e.clientY);
    });
    btn.addEventListener('pointerup', (e) => {
      if (!ctl || radialAtivo !== ctl) return;
      ctl.soltoEm = performance.now();
      ctl.mover(e.clientX, e.clientY);
      if (mexeu && ctl.hover != null) ctl.escolher(ctl.hover);
      else if (mexeu && ctl.hover == null) fecharRadial();
    });
    btn.addEventListener('pointercancel', () => { if (ctl && radialAtivo === ctl) fecharRadial(); });
    btn.addEventListener('click', (e) => {
      if (e.detail !== 0 || btn.disabled) return; // clique de ponteiro já tratado
      const r = btn.getBoundingClientRect();
      abrir(r.left + r.width / 2, r.top + r.height / 2, true);
    });
  }

  /* ---------- Registro ---------- */

  function registrar(id, a, extra) {
    const j = D.jogo(id), e = D.estado(j);
    const quem = a.quem === 'live' ? live.quem : a.quem === 'sacador' ? (e.sacador || live.quem) : 'adv';
    const ev = D.registrar(id, { quem, fund: a.fund, res: a.res, tipo: a.tipo || null, ...(extra || {}) });
    if (!ev) return null;
    const j2 = D.jogo(id);
    if (ev.ponto) padrao(j2); else proximo(j2, ev);
    return ev;
  }

  // Corrige a última ação: muda o tipo, ou refaz a ação quando o resultado muda (por exemplo, recepção boa para erro).
  function refinar(id, patch) {
    const j = D.jogo(id), ev = j.eventos[j.eventos.length - 1];
    if (!ev) return;
    if (patch.res && patch.res !== ev.res) {
      const base = { quem: ev.quem, fund: ev.fund, res: patch.res, tipo: patch.tipo !== undefined ? patch.tipo : ev.tipo || null, dest: ev.dest };
      D.desfazer(id);
      const novo = D.registrar(id, base);
      const j2 = D.jogo(id);
      if (novo && novo.ponto) padrao(j2); else if (novo) proximo(j2, novo);
    } else D.ajustarUltimo(id, patch);
  }

  const itemDe = (k, e) => { const a = A[k]; const off = a.ativo && !a.ativo(e); return { rot: a.rot, ic: a.ic, desativado: off, dica: off ? (a.fund === 'saque' || k === 'saqAdv' ? 'só quando saca' : 'não vale agora') : '' }; };

  function montarRoda(id, nome) {
    const j = D.jogo(id), e = D.estado(j), def = RODAS[nome];
    const quem = def.lado === 'nos' && nome !== 'jogada' ? ` · ${nm(live.quem)}` : nome === 'erroNosso' || nome === 'jogada' ? ` · ${nm(live.quem)}` : '';
    return {
      titulo: `${def.titulo}${quem}`, lado: def.lado,
      itens: def.lat.map((k) => itemDe(k, e)),
      centro: def.centro ? { rot: `${A[def.centro].rot}, sem detalhe`, ic: A[def.centro].ic } : null,
      aoEscolher: (h) => {
        const k = h === 'centro' ? def.centro : def.lat[h];
        const a = A[k];
        if (a.abre) { const r = document.querySelector(`[data-roda="${nome}"]`); const b = r && r.getBoundingClientRect(); abrirRadial({ ...montarRoda(id, a.abre), x: b ? b.left + b.width / 2 : innerWidth / 2, y: b ? b.top + b.height / 2 : innerHeight / 2 }); return; }
        const ev = registrar(id, a);
        redesenhar(id, ev ? '#sc-ultima' : null);
      },
    };
  }

  /* ---------- Tela ---------- */

  function tempo(j) {
    if (!j.iniciadoEm) return '00:00';
    const fim = j.status === 'finalizado' ? (j.fimEm || Date.now()) : Date.now();
    const s = Math.max(0, Math.round((fim - j.iniciadoEm) / 1000));
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  }

  function redesenhar(id, foco) { const y = window.scrollY; coleta(raiz, id); window.scrollTo({ top: y }); const f = foco && raiz.querySelector(foco); if (f) f.focus({ preventScroll: true }); }

  function coleta(root, id) {
    raiz = root;
    clearInterval(relogio); fecharRadial();
    const j = D.jogo(id);
    if (!j) { root.innerHTML = '<p class="vazio">Jogo não encontrado. <button class="link-btn" id="sc-volta">Voltar aos jogos</button></p>'; root.querySelector('#sc-volta').addEventListener('click', () => window.Farol.ir('analise-scout', {})); return; }
    if (live.jogoId !== id) { live.jogoId = id; live.quem = null; }
    padrao(j);
    const e = D.estado(j), fmt = D.FORMATOS[j.formato];
    const ultimo = j.eventos[j.eventos.length - 1];
    let aviso = '';
    if (ultimo && ultimo.ponto && !e.encerrado) {
      if (e.tempoTecnico) aviso = `Tempo técnico: ${e.a + e.b} pontos somados.`;
      else if (e.trocaAgora) aviso = `Troca de lado: ${e.a + e.b} pontos somados.`;
    }
    const nSets = fmt.sets * 2 - 1;
    const prompt = !e.iniciado && !e.encerrado ? `
      <section class="sc-inicio card" aria-label="Quem saca primeiro">
        <div class="sc-inicio-t"><b>${e.sets.length ? `Set ${e.set + 1} começa.` : 'Antes de começar.'}</b> Quem saca primeiro?
          ${e.sets.length ? `<small>${e.sets.map((s, i) => `Set ${i + 1}: ${s.a}–${s.b}`).join(' · ')}</small>` : ''}</div>
        <div class="sc-quem">
          ${[0, 1].map((k) => `<button class="sc-op" type="button" data-inicio="nos:${k}" aria-pressed="${e.sac === 'nos' && e.idx === k}">${esc(nm(j.dupla[k]))}<small>nós</small></button>`).join('')}
          <button class="sc-op" type="button" data-inicio="adv:0" aria-pressed="${e.sac === 'adv'}">Adversário<small>eles</small></button>
        </div>
      </section>` : '';
    const fim = e.encerrado ? `
      <section class="sc-fim card" role="status">
        <div><span class="label">Jogo encerrado</span><h2>${e.vencedor === 'nos' ? 'Vitória' : 'Derrota'} por ${e.ganhos} set${e.ganhos === 1 ? '' : 's'} a ${e.perdidos}</h2><p class="num">${esc(UI.resumoSets(j))}</p></div>
        <div class="actions"><button class="btn btn-primary" id="sc-rel">Ver relatório</button><button class="btn" id="sc-corrigir">Corrigir o último ponto</button></div>
      </section>` : '';
    const lado = (k) => {
      const nos = k === 'nos', pts = nos ? e.a : e.b, nome = nos ? D.rotuloDupla(j.dupla) : j.adv;
      const saca = !e.encerrado && e.sac === k;
      return `<div class="sc-lado ${k}">
        <span class="sc-lado-n">${esc(nome)}</span>
        <span class="sc-saq">${saca ? `<i></i>${nos ? `Saque: ${esc(nm(e.sacador))}` : 'Saque deles'}` : ''}</span>
        <b class="sc-pts num" aria-live="polite">${pts}</b>
        <div class="sc-botoes">
          <button class="sc-mais" type="button" data-roda="${k}" aria-haspopup="menu" aria-label="Ponto ${nos ? 'da nossa dupla' : 'do adversário'}: escolher como foi" ${e.encerrado ? 'disabled' : ''}>+</button>
          <button class="sc-menos" type="button" data-menos="${k}" aria-label="Desfazer o último ponto ${nos ? 'da nossa dupla' : 'do adversário'}" ${ultimo && ultimo.ponto === k ? '' : 'disabled'}>−</button>
        </div></div>`;
    };
    const quemBloco = e.encerrado ? '' : `
      <section class="sc-acoes-w" aria-label="Quem está na bola e jogada sem ponto">
        <div class="sc-quem" role="group" aria-label="Quem está na bola">${j.dupla.map((a) => `<button type="button" class="sc-q" data-quem="${a}" aria-pressed="${live.quem === a}"><span class="sc-av">${esc(nm(a)[0])}</span>${esc(nm(a))}${e.sacador === a && e.sac === 'nos' ? '<small>saca</small>' : ''}</button>`).join('')}</div>
        <button type="button" class="sc-jogada" data-roda="jogada" aria-haspopup="menu">${ic('jogada', 22)}<span>Jogada sem ponto</span><small>recepção, defesa…</small></button>
      </section>`;
    const det = ultimo && !e.encerrado ? detalhesDe(ultimo) : null;
    const destino = ultimo && F[ultimo.fund].destino && !e.encerrado;
    const recentes = j.eventos.slice(-6).reverse();

    root.innerHTML = `
      <div class="sc-coleta">
        <div class="sc-top">
          <button class="link-btn" id="sc-voltar" style="margin:0">‹ Jogos</button>
          <span class="sc-relogio" title="Tempo de jogo"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg><span id="sc-rel-t" class="num">${tempo(j)}</span></span>
          <div class="actions"><button class="btn btn-sm" id="sc-quadro" type="button">Quadro</button><button class="btn btn-sm" id="sc-desfazer" type="button" ${j.eventos.length ? '' : 'disabled'}>Desfazer</button></div>
        </div>
        <p class="sc-sub"><b>${esc(UI.tituloJogo(j))}</b> · ${esc(fmt.nome)}</p>

        <section class="sc-quadra" aria-label="Placar">
          ${lado('nos')}${lado('adv')}
          <div class="sc-centro"><span>${fmt.sets > 1 || e.sets.length ? `Set ${Math.min(e.set + 1, nSets)}${nSets > 1 ? ` de ${nSets}` : ''}` : 'Set único'}</span><b class="num">${e.ganhos} – ${e.perdidos}</b>${e.sets.length ? `<small class="num">${e.sets.map((s) => `${s.a}–${s.b}`).join(' · ')}</small>` : ''}</div>
        </section>
        ${aviso ? `<div class="sc-aviso" role="status"><b>${esc(aviso)}</b></div>` : ''}
        ${prompt}${fim}${quemBloco}

        <section class="card sc-ult" id="sc-ultima" tabindex="-1" aria-labelledby="sc-ult-t" aria-live="polite">
          <div class="card-head"><h2 id="sc-ult-t">Última ação</h2><span class="label num">${j.eventos.length} no jogo</span></div>
          ${ultimo ? `<p class="sc-ult-d"><b>${esc(UI.descrever(j, ultimo))}</b>${ultimo.ponto ? ` <span class="sc-pt ${ultimo.ponto}">${ultimo.ponto === 'nos' ? 'ponto nosso' : 'ponto deles'}</span>` : ''}</p>` : '<p class="vazio" style="padding:2px 0">Nenhuma ação ainda. Toque no + de quem fez o ponto.</p>'}
          ${det ? `<div class="sc-det"><span class="label">${esc(det.titulo)} <small>(opcional, serve para corrigir)</small></span><div class="sc-det-b" role="group" aria-label="${esc(det.titulo)}">${det.opcoes.map((o, i) => `<button type="button" class="sc-chip" data-det="${i}" aria-pressed="${!!o.on}">${esc(o.rot)}</button>`).join('')}</div></div>` : ''}
          ${destino ? `<details class="sc-dest-det" ${ultimo.dest != null ? 'open' : ''}><summary>Destino na quadra <small>(opcional)</small></summary><div class="sc-dest-w"><span class="sc-rede">Rede</span><div class="sc-dest" role="group" aria-label="Destino na quadra do adversário">${[0, 1, 2, 3, 4, 5, 6, 7, 8].map((k) => `<button type="button" data-dest="${k}" aria-pressed="${ultimo.dest === k}" aria-label="${['Perto da rede', 'Meio', 'Fundo'][Math.floor(k / 3)]}, ${['esquerda', 'centro', 'direita'][k % 3]}">${ultimo.dest === k ? '●' : ''}</button>`).join('')}</div><span class="sc-rede">Fundo</span></div></details>` : ''}
        </section>

        <details class="card sc-hist"><summary>Últimas ações <span class="num">(${recentes.length})</span></summary>
          ${recentes.length ? `<ol class="sc-lista">${recentes.map((ev) => `<li><span>${esc(UI.descrever(j, ev))}</span>${ev.ponto ? `<b class="sc-pt ${ev.ponto}">${ev.ponto === 'nos' ? 'nosso' : 'deles'}</b>` : ''}</li>`).join('')}</ol>` : ''}
          <div class="actions" style="margin-top:10px">${e.encerrado ? '' : `<button class="link-btn" id="sc-encerrar" style="margin:0" ${e.iniciado ? '' : 'disabled'}>Encerrar o jogo agora</button>`}</div>
        </details>
      </div>`;

    if (!e.encerrado && j.iniciadoEm) relogio = setInterval(() => { const t = root.querySelector('#sc-rel-t'); if (!t) { clearInterval(relogio); return; } t.textContent = tempo(D.jogo(id)); }, 1000);

    const $ = (s) => root.querySelector(s);
    $('#sc-voltar').addEventListener('click', () => window.Farol.ir('analise-scout', {}));
    $('#sc-quadro').addEventListener('click', () => window.Farol.gaveta.abrir());
    $('#sc-desfazer').addEventListener('click', () => { D.desfazer(id); redesenhar(id, '#sc-desfazer'); });
    const enc = $('#sc-encerrar'); if (enc) enc.addEventListener('click', () => { D.encerrar(id); D.jogo(id).fimEm = Date.now(); redesenhar(id, '#sc-rel'); });
    const rel = $('#sc-rel'); if (rel) rel.addEventListener('click', () => window.Farol.ir('analise-scout', { jogo: id }));
    const corr = $('#sc-corrigir'); if (corr) corr.addEventListener('click', () => { D.desfazer(id); D.reabrir(id); redesenhar(id, '[data-roda="nos"]'); });
    root.querySelectorAll('[data-inicio]').forEach((b) => b.addEventListener('click', () => { const [sac, k] = b.dataset.inicio.split(':'); D.definirInicio(id, e.set, sac, +k); live.quem = null; redesenhar(id, `[data-inicio="${b.dataset.inicio}"]`); }));
    root.querySelectorAll('[data-quem]').forEach((b) => b.addEventListener('click', () => { live.quem = b.dataset.quem; redesenhar(id, `[data-quem="${b.dataset.quem}"]`); }));
    root.querySelectorAll('[data-menos]').forEach((b) => b.addEventListener('click', () => { D.desfazer(id); redesenhar(id, `[data-roda="${b.dataset.menos}"]`); }));
    root.querySelectorAll('[data-dest]').forEach((b) => b.addEventListener('click', () => { const k = Number(b.dataset.dest); D.ajustarUltimo(id, { dest: ultimo.dest === k ? null : k }); redesenhar(id, `[data-dest="${k}"]`); }));
    root.querySelectorAll('[data-det]').forEach((b) => b.addEventListener('click', () => { refinar(id, det.opcoes[Number(b.dataset.det)].patch); redesenhar(id, `[data-det="${b.dataset.det}"]`); }));
    root.querySelectorAll('[data-roda]').forEach((b) => { if (b.dataset.roda === 'nos' || b.dataset.roda === 'adv' || b.dataset.roda === 'jogada') ligarRoda(b, () => montarRoda(id, b.dataset.roda)); });
  }

  window.Farol.views = window.Farol.views || {};
  window.Farol.views['scout-coleta'] = (root, params) => {
    const id = (params && params.jogo) || live.jogoId;
    coleta(root, id);
  };
})();
