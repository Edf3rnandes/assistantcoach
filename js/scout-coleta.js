/* Coleta ao vivo do scout (rota `scout-coleta`)
   O placar é a tela de entrada: azul é a nossa dupla, vermelho é o adversário.
   - Toque no + do lado que fez o ponto e escolha como foi (ataque, bloqueio, ace, erro deles, outro).
   - TOQUE registra o padrão; SEGURE o botão e deslize para escolher o detalhe numa roda (diagonal, paralela, viagem,
     flutuante…). Soltar no centro vale como "geral". Também dá para tocar nas fatias, ou usar Shift+Enter no teclado.
   - Erro nosso: no + do adversário, "Erro nosso" pergunta qual fundamento e quem errou.
   - Sem ponto (recepção, defesa, ataque defendido, saque em jogo): faixa abaixo do placar, com a mesma regra.
   - O sistema calcula placar, sets, sacador, troca de lado e tempo técnico. O quadro técnico abre por cima.
   Cada ação vira uma linha em `acoes_scout`; desfazer tira a última. */
(function () {
  const { util, scoutDados: D, scoutUI: UI } = window.Farol;
  const { esc, clamp } = util;
  const F = D.FUND;
  const nm = D.nomeCurto;

  const live = { jogoId: null, quem: null, pop: null, aviso: '', ultimoMsg: '' };
  let raiz = null, relogio = null, radialAtivo = null, popEl = null;

  /* ---------- Ícones ---------- */

  const IC = {
    ataque: '<circle cx="12" cy="12" r="9"/><path d="M3.6 9.5c5 1 11 1 16.800 0M3.600 14.500c5-1 11-1 16.800 0M12 3a14 14 0 0 1 0 18"/>',
    bloqueio: '<rect x="3" y="5" width="18" height="14" rx="1.500"/><path d="M3 10h18M3 15h18M9 5v5M15 10v5M9 15v4"/>',
    ace: '<rect x="4" y="3" width="16" height="18" rx="2.500"/><path d="M8.500 17l3.500-10 3.500 10M9.800 13.500h4.400"/>',
    erro: '<circle cx="12" cy="12" r="9"/><path d="M8.500 8.500l7 7M15.500 8.500l-7 7"/>',
    outro: '<circle cx="12" cy="12" r="9"/><path d="M9.500 9.500a2.500 2.500 0 1 1 3.500 2.300c-.7.400-1 .9-1 1.700M12 17v.1"/>',
    recepcao: '<path d="M3 16h18M6 16l-2.500-7M18 16l2.500-7"/><circle cx="12" cy="8" r="3"/>',
    defesa: '<path d="M12 3l8 3v5c0 5-3.500 8.500-8 10-4.500-1.500-8-5-8-10V6z"/>',
    saque: '<circle cx="12" cy="14" r="6"/><path d="M12 8V3M9 5l3-2 3 2"/>',
    seta: '<path d="M9 6l6 6-6 6"/>',
  };
  const ic = (k, t = 28) => `<svg width="${t}" height="${t}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[k]}</svg>`;

  /* ---------- O que cada botão registra ---------- */

  const tiposDe = (fund, res) => { const f = F[fund]; const r = f.res.find((x) => x.id === res); return (r && r.tipos) || f.tipos || []; };
  const opcoesTipo = (fund, res) => tiposDe(fund, res).map(([id, rot]) => ({ rot, patch: { tipo: id } }));

  // `quem`: 'live' (atleta escolhido), 'sacador' ou 'adv'. `ativo(e)`: quando faz sentido.
  const ACOES = {
    ataque: { rot: 'Ataque', ic: 'ataque', base: { fund: 'ataque', res: 'ponto', quem: 'live' }, opcoes: () => opcoesTipo('ataque', 'ponto'), titulo: 'Tipo de ataque' },
    bloqueio: { rot: 'Bloqueio', ic: 'bloqueio', base: { fund: 'bloqueio', res: 'ponto', quem: 'live' } },
    ace: { rot: 'Ace', ic: 'ace', base: { fund: 'saque', res: 'ace', quem: 'sacador' }, opcoes: () => opcoesTipo('saque', 'ace'), titulo: 'Tipo de saque', ativo: (e) => e.sac === 'nos', dica: 'só quando a nossa dupla saca' },
    erroAdv: { rot: 'Erro deles', ic: 'erro', base: { fund: 'adv', res: 'erro', quem: 'adv' }, opcoes: () => opcoesTipo('adv', 'erro').filter((o) => o.patch.tipo !== 'outro'), titulo: 'Qual erro' },
    outroNos: { rot: 'Outro', ic: 'outro', base: { fund: 'adv', res: 'erro', quem: 'adv', tipo: 'outro' } },

    atqAdv: { rot: 'Ataque deles', ic: 'ataque', base: { fund: 'adv', res: 'ponto', quem: 'adv', tipo: 'ataque' } },
    aceAdv: { rot: 'Saque deles', ic: 'ace', base: { fund: 'adv', res: 'ponto', quem: 'adv', tipo: 'saque' }, ativo: (e) => e.sac === 'adv', dica: 'só quando eles sacam' },
    bloqAdv: { rot: 'Bloqueio deles', ic: 'bloqueio', base: { fund: 'adv', res: 'ponto', quem: 'adv', tipo: 'bloqueio' } },
    erroNos: { rot: 'Erro nosso', ic: 'erro', sub: 'erroNosso' },
    outroAdv: { rot: 'Outro', ic: 'outro', base: { fund: 'adv', res: 'ponto', quem: 'adv', tipo: 'outro' } },

    eSaque: { rot: 'Saque', ic: 'saque', base: { fund: 'saque', res: 'erro', quem: 'sacador' }, opcoes: () => opcoesTipo('saque', 'erro'), titulo: 'Tipo de saque', ativo: (e) => e.sac === 'nos', dica: 'só quando a nossa dupla saca' },
    eRecepcao: { rot: 'Recepção', ic: 'recepcao', base: { fund: 'recepcao', res: 'r0', quem: 'live' }, ativo: (e) => e.sac === 'adv', dica: 'só quando eles sacam' },
    eAtaque: { rot: 'Ataque', ic: 'ataque', base: { fund: 'ataque', res: 'erro', quem: 'live' }, opcoes: () => [{ rot: 'Erro', patch: { res: 'erro' } }, { rot: 'Bloqueado', patch: { res: 'bloq' } }], titulo: 'Como perdeu' },
    eDefesa: { rot: 'Defesa', ic: 'defesa', base: { fund: 'defesa', res: 'erro', quem: 'live' } },
    eBloqueio: { rot: 'Bloqueio', ic: 'bloqueio', base: { fund: 'bloqueio', res: 'erro', quem: 'live' } },

    sRecepcao: { rot: 'Recepção', ic: 'recepcao', base: { fund: 'recepcao', res: 'r2', quem: 'live' }, opcoes: () => [{ rot: 'Perfeita', patch: { res: 'r3' } }, { rot: 'Boa', patch: { res: 'r2' } }, { rot: 'Ruim', patch: { res: 'r1' } }], titulo: 'Qualidade da recepção', dicaPadrao: 'boa' },
    sDefesa: { rot: 'Defesa', ic: 'defesa', base: { fund: 'defesa', res: 'boa', quem: 'live' } },
    sAtaque: { rot: 'Ataque defendido', ic: 'ataque', base: { fund: 'ataque', res: 'jogo', quem: 'live' }, opcoes: () => opcoesTipo('ataque', 'jogo'), titulo: 'Tipo de ataque' },
    sSaque: { rot: 'Saque em jogo', ic: 'saque', base: { fund: 'saque', res: 'jogo', quem: 'sacador' }, opcoes: () => opcoesTipo('saque', 'jogo'), titulo: 'Tipo de saque' },
  };
  const MENUS = {
    nos: ['ataque', 'bloqueio', 'ace', 'erroAdv', 'outroNos'],
    adv: ['atqAdv', 'aceAdv', 'bloqAdv', 'erroNos', 'outroAdv'],
    erroNosso: ['eSaque', 'eRecepcao', 'eAtaque', 'eDefesa', 'eBloqueio'],
    semPonto: ['sRecepcao', 'sDefesa', 'sAtaque', 'sSaque'],
  };

  /* ---------- Estado de quem está na bola ---------- */

  function padrao(j) {
    const e = D.estado(j);
    if (!live.quem || !j.dupla.includes(live.quem)) live.quem = j.dupla[0];
    if (e.sac === 'nos' && !e.iniciado) live.quem = e.sacador;
  }
  // Depois de uma ação que não encerra a jogada, passa a vez para o parceiro (recepção e defesa viram ataque dele).
  function proximo(j, ev) {
    if (ev.fund === 'recepcao' || ev.fund === 'defesa') live.quem = j.dupla.find((x) => x !== ev.quem) || live.quem;
  }

  /* ---------- Roda de detalhes (segurar e deslizar) ---------- */

  const R_IN = 44, R_OUT = 128;
  const pol = (cx, cy, r, a) => [cx + r * Math.cos((a * Math.PI) / 180), cy + r * Math.sin((a * Math.PI) / 180)];
  function fatia(cx, cy, a0, a1) {
    const [x0, y0] = pol(cx, cy, R_OUT, a0), [x1, y1] = pol(cx, cy, R_OUT, a1), [x2, y2] = pol(cx, cy, R_IN + 4, a1), [x3, y3] = pol(cx, cy, R_IN + 4, a0);
    const grande = a1 - a0 > 180 ? 1 : 0;
    return `M${x0.toFixed(1)} ${y0.toFixed(1)}A${R_OUT} ${R_OUT} 0 ${grande} 1 ${x1.toFixed(1)} ${y1.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}A${R_IN + 4} ${R_IN + 4} 0 ${grande} 0 ${x3.toFixed(1)} ${y3.toFixed(1)}Z`;
  }

  function fecharRadial() {
    if (!radialAtivo) return;
    const { el, aoFechar } = radialAtivo;
    el.remove(); radialAtivo = null;
    if (aoFechar) aoFechar();
  }

  function abrirRadial(cfg) {
    fecharRadial();
    const L = R_OUT + 6;
    const cx = clamp(cfg.x, L + 4, innerWidth - L - 4), cy = clamp(cfg.y, L + 64, innerHeight - L - 76);
    const n = cfg.opcoes.length, passo = 360 / n;
    const el = document.createElement('div');
    el.className = 'sc-rad';
    el.setAttribute('role', 'menu');
    el.setAttribute('aria-label', cfg.titulo || 'Detalhe');
    const fatias = cfg.opcoes.map((o, i) => {
      const meio = -90 + i * passo, a0 = meio - passo / 2 + 0.8, a1 = meio + passo / 2 - 0.8;
      const [tx, ty] = pol(L, L, (R_IN + R_OUT) / 2 + 6, meio);
      return `<g class="sc-rad-f" data-i="${i}" role="menuitem" tabindex="0" aria-label="${esc(o.rot)}"><path d="${fatia(L, L, a0, a1)}"/><text x="${tx.toFixed(1)}" y="${ty.toFixed(1)}" text-anchor="middle" dominant-baseline="middle">${esc(o.rot)}</text></g>`;
    }).join('');
    el.innerHTML = `
      <button class="sc-rad-fundo" type="button" aria-label="Fechar o detalhe"></button>
      <div class="sc-rad-caixa" style="left:${(cx - L).toFixed(0)}px;top:${(cy - L).toFixed(0)}px;width:${L * 2}px;height:${L * 2}px">
        <div class="sc-rad-t">${esc(cfg.titulo || '')}</div>
        <svg viewBox="0 0 ${L * 2} ${L * 2}" width="${L * 2}" height="${L * 2}" class="sc-rad-svg ${cfg.lado || ''}" focusable="false">
          <circle cx="${L}" cy="${L}" r="${R_OUT + 3}" class="sc-rad-disco"/>
          ${fatias}
          <g class="sc-rad-c" data-i="centro" role="menuitem" tabindex="0" aria-label="Geral, sem detalhe"><circle cx="${L}" cy="${L}" r="${R_IN}"/><text x="${L}" y="${L}" text-anchor="middle" dominant-baseline="middle">geral</text></g>
        </svg>
      </div>`;
    document.body.appendChild(el);
    if (navigator.vibrate) { try { navigator.vibrate(14); } catch (e) { /* sem vibração */ } }

    // A direção vale a partir de onde o dedo começou, mesmo que a roda tenha sido empurrada para dentro da tela.
    const ctl = { el, cx, cy, ox: cfg.ox != null ? cfg.ox : cx, oy: cfg.oy != null ? cfg.oy : cy, hover: null, aoFechar: cfg.aoFechar, cfg };
    const marcar = (h) => {
      ctl.hover = h;
      el.querySelectorAll('[data-i]').forEach((g) => g.classList.toggle('on', g.dataset.i === String(h)));
    };
    ctl.mover = (x, y) => {
      const dx = x - ctl.ox, dy = y - ctl.oy, d = Math.hypot(dx, dy);
      if (d < R_IN) return marcar('centro');
      if (d > R_OUT + 30) return marcar(null);
      let a = (Math.atan2(dy, dx) * 180) / Math.PI + 90 + passo / 2;
      a = ((a % 360) + 360) % 360;
      marcar(Math.floor(a / passo) % n);
    };
    ctl.escolher = (h) => {
      const o = h === 'centro' ? null : cfg.opcoes[Number(h)];
      const fn = cfg.aoEscolher;
      fecharRadial();
      fn(o);
    };
    // O "clique" que o navegador cria ao soltar o dedo não pode escolher nada por acidente.
    const eco = () => ctl.soltoEm && performance.now() - ctl.soltoEm < 300;
    el.querySelector('.sc-rad-fundo').addEventListener('click', () => { if (!eco()) fecharRadial(); });
    el.querySelectorAll('[data-i]').forEach((g) => {
      g.addEventListener('click', () => { if (!eco()) ctl.escolher(g.dataset.i); });
      g.addEventListener('keydown', (e) => {
        const todos = [...el.querySelectorAll('[data-i]')];
        const k = todos.indexOf(g);
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ctl.escolher(g.dataset.i); }
        else if (e.key === 'Escape') { e.preventDefault(); fecharRadial(); }
        else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); todos[(k + 1) % todos.length].focus(); }
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); todos[(k - 1 + todos.length) % todos.length].focus(); }
      });
    });
    radialAtivo = ctl;
    return ctl;
  }

  // Liga um botão: toque = padrão; segurar = roda; teclado: Enter = padrão, Shift+Enter = roda.
  function ligarGesto(btn, { padrao: aoToque, detalhe }) {
    let timer = null, ctl = null, mexeu = false, x0 = 0, y0 = 0, ignorarClick = false;
    const abrir = (x, y, foco) => {
      const d = detalhe();
      if (!d) return null;
      const c = abrirRadial({ ...d, x, y, ox: x, oy: y, aoEscolher: (o) => { if (o) d.aoEscolher(o); else aoToque(); } });
      if (foco) { const f = c.el.querySelector('[data-i="centro"]'); if (f) f.focus(); }
      return c;
    };
    btn.addEventListener('contextmenu', (e) => e.preventDefault());
    btn.addEventListener('pointerdown', (e) => {
      if (btn.disabled || btn.getAttribute('aria-disabled') === 'true' || (e.pointerType === 'mouse' && e.button !== 0)) return;
      mexeu = false; x0 = e.clientX; y0 = e.clientY; ctl = null;
      try { btn.setPointerCapture(e.pointerId); } catch (er) { /* ok */ }
      if (detalhe()) {
        timer = setTimeout(() => {
          const r = btn.getBoundingClientRect();
          ctl = abrir(r.left + r.width / 2, r.top + r.height / 2, false);
          if (ctl) ctl.mover(x0, y0);
        }, 330);
      }
    });
    btn.addEventListener('pointermove', (e) => {
      if (Math.hypot(e.clientX - x0, e.clientY - y0) > 10) mexeu = true;
      if (radialAtivo && ctl && radialAtivo === ctl) ctl.mover(e.clientX, e.clientY);
    });
    btn.addEventListener('pointerup', (e) => {
      clearTimeout(timer); timer = null;
      ignorarClick = true; setTimeout(() => { ignorarClick = false; }, 60);
      if (ctl && radialAtivo === ctl) {
        ctl.soltoEm = performance.now();
        // Soltou sobre uma fatia (ou o centro, depois de deslizar): escolhe. Soltou sem mexer: a roda fica para tocar.
        ctl.mover(e.clientX, e.clientY);
        if (ctl.hover != null && (mexeu || ctl.hover !== 'centro')) ctl.escolher(ctl.hover);
        else if (ctl.hover == null && mexeu) fecharRadial();
        return;
      }
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (btn.disabled || btn.getAttribute('aria-disabled') === 'true') return;
      aoToque();
    });
    btn.addEventListener('pointercancel', () => { clearTimeout(timer); if (ctl && radialAtivo === ctl) fecharRadial(); });
    btn.addEventListener('click', (e) => {
      if (ignorarClick) return;
      if (e.detail !== 0) return; // clique de ponteiro já tratado em pointerup
      if (btn.disabled || btn.getAttribute('aria-disabled') === 'true') return;
      if (e.shiftKey) { const r = btn.getBoundingClientRect(); abrir(r.left + r.width / 2, r.top + r.height / 2, true); } else aoToque();
    });
    btn.addEventListener('keydown', (e) => {
      if (e.key === 'ContextMenu' || (e.key === 'F10' && e.shiftKey)) { e.preventDefault(); const r = btn.getBoundingClientRect(); abrir(r.left + r.width / 2, r.top + r.height / 2, true); }
    });
  }

  /* ---------- Registro ---------- */

  function registrar(id, a, patch) {
    const j = D.jogo(id), e = D.estado(j);
    const base = { ...a.base, ...(patch || {}) };
    const quem = base.quem === 'live' ? live.quem : base.quem === 'sacador' ? (e.sacador || live.quem) : 'adv';
    const ev = D.registrar(id, { quem, fund: base.fund, res: base.res, tipo: base.tipo || null });
    if (!ev) return null;
    const j2 = D.jogo(id);
    if (ev.ponto) padrao(j2); else proximo(j2, ev);
    live.ultimoMsg = UI.descrever(j2, ev);
    return ev;
  }

  /* ---------- Popup do ponto ---------- */

  function fecharPop() {
    fecharRadial();
    if (popEl) { popEl.remove(); popEl = null; }
    live.pop = null;
    document.removeEventListener('keydown', teclaPop, true);
  }
  function teclaPop(e) { if (e.key === 'Escape' && !radialAtivo) { e.stopPropagation(); fecharPop(); const b = raiz && raiz.querySelector(`[data-lado="${(live.ultimoLado || 'nos')}"]`); if (b) b.focus(); } }

  function abrirPop(id, lado, menu) {
    const j = D.jogo(id), e = D.estado(j);
    fecharPop();
    live.pop = { lado, menu: menu || lado };
    const chaves = MENUS[live.pop.menu];
    const nomeLado = lado === 'nos' ? D.rotuloDupla(j.dupla) : j.adv;
    const titulo = live.pop.menu === 'erroNosso' ? 'Quem errou e em quê?' : lado === 'nos' ? 'Ponto da nossa dupla: como foi?' : 'Ponto deles: como foi?';
    const precisaQuem = live.pop.menu === 'erroNosso' || lado === 'nos';
    popEl = document.createElement('div');
    popEl.className = 'sc-pop';
    popEl.setAttribute('role', 'dialog'); popEl.setAttribute('aria-modal', 'true'); popEl.setAttribute('aria-label', titulo);
    popEl.innerHTML = `
      <button class="sc-pop-fundo" type="button" aria-label="Fechar"></button>
      <div class="sc-pop-card ${lado}">
        <div class="sc-pop-barra"><i></i></div>
        <div class="sc-pop-h"><b>${esc(titulo)}</b><span>${esc(nomeLado)}</span></div>
        ${precisaQuem ? `<div class="sc-quem sc-quem-pop" role="group" aria-label="Quem fez">${j.dupla.map((a) => `<button type="button" class="sc-q" data-quem="${a}" aria-pressed="${live.quem === a}"><span class="sc-av">${esc(nm(a)[0])}</span>${esc(nm(a))}${e.sacador === a && e.sac === 'nos' ? '<small>saca</small>' : ''}</button>`).join('')}</div>` : ''}
        <div class="sc-grade" role="group" aria-label="Como foi o ponto">
          ${chaves.map((k) => {
            const a = ACOES[k], off = a.ativo && !a.ativo(e);
            return `<button type="button" class="sc-acao ${a.sub ? 'sub' : ''}" data-acao="${k}" ${off ? 'aria-disabled="true"' : ''} ${a.opcoes ? 'aria-haspopup="menu" aria-keyshortcuts="Shift+Enter"' : ''} title="${off ? esc(a.dica) : a.opcoes ? 'Toque para o padrão. Segure e deslize para o detalhe.' : ''}">
              <span class="sc-acao-i">${ic(a.ic, 30)}</span><span class="sc-acao-r">${esc(a.rot)}</span>${a.opcoes ? '<span class="sc-acao-d" aria-hidden="true">segure</span>' : ''}${a.sub ? `<span class="sc-acao-d" aria-hidden="true">${ic('seta', 14)}</span>` : ''}</button>`;
          }).join('')}
        </div>
        <p class="sc-pop-dica">Toque registra o padrão. <b>Segure e deslize</b> nos botões com “segure” para escolher o detalhe.</p>
        <button type="button" class="btn sc-pop-cancela">${live.pop.menu === 'erroNosso' ? 'Voltar' : 'Cancelar'}</button>
      </div>`;
    document.body.appendChild(popEl);
    document.addEventListener('keydown', teclaPop, true);
    live.ultimoLado = lado;

    const $$ = (s) => popEl.querySelectorAll(s);
    popEl.querySelector('.sc-pop-fundo').addEventListener('click', fecharPop);
    popEl.querySelector('.sc-pop-cancela').addEventListener('click', () => { if (live.pop.menu === 'erroNosso') abrirPop(id, 'adv'); else fecharPop(); });
    $$('.sc-q').forEach((b) => b.addEventListener('click', () => { live.quem = b.dataset.quem; $$('.sc-q').forEach((o) => o.setAttribute('aria-pressed', String(o === b))); }));
    $$('[data-acao]').forEach((b) => {
      const k = b.dataset.acao, a = ACOES[k];
      const fim = (patch) => { const ev = registrar(id, a, patch); fecharPop(); redesenhar(id, ev ? '#sc-ultima' : null); };
      if (a.sub) { b.addEventListener('click', () => abrirPop(id, lado, a.sub)); return; }
      ligarGesto(b, {
        padrao: () => { if (a.ativo && !a.ativo(D.estado(D.jogo(id)))) return; fim(null); },
        detalhe: () => (a.opcoes && (!a.ativo || a.ativo(D.estado(D.jogo(id)))) ? { titulo: a.titulo, opcoes: a.opcoes(), lado, aoEscolher: (o) => fim(o.patch) } : null),
      });
    });
    const primeiro = popEl.querySelector('.sc-acao:not([aria-disabled="true"])'); if (primeiro) primeiro.focus();
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
    clearInterval(relogio); fecharPop();
    const j = D.jogo(id);
    if (!j) { root.innerHTML = '<p class="vazio">Jogo não encontrado. <button class="link-btn" id="sc-volta">Voltar aos jogos</button></p>'; root.querySelector('#sc-volta').addEventListener('click', () => window.Farol.ir('analise-scout', {})); return; }
    if (live.jogoId !== id) { live.jogoId = id; live.quem = null; live.ultimoMsg = ''; }
    padrao(j);
    const e = D.estado(j), fmt = D.FORMATOS[j.formato];
    const [pa, pb] = j.dupla;
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
      const desfazivel = !!ultimo && ultimo.ponto === k;
      return `<div class="sc-lado ${k}">
        <span class="sc-lado-n">${esc(nome)}</span>
        <span class="sc-saq">${saca ? `<i></i>${nos ? `Saque: ${esc(nm(e.sacador))}` : 'Saque deles'}` : ''}</span>
        <b class="sc-pts num" aria-live="polite">${pts}</b>
        <div class="sc-botoes">
          <button class="sc-mais" type="button" data-lado="${k}" aria-label="Ponto ${nos ? 'da nossa dupla' : 'do adversário'}: escolher como foi" ${e.encerrado ? 'disabled' : ''}>+</button>
          <button class="sc-menos" type="button" data-menos="${k}" aria-label="Desfazer o último ponto ${nos ? 'da nossa dupla' : 'do adversário'}" ${desfazivel ? '' : 'disabled'}>−</button>
        </div></div>`;
    };
    const semPonto = e.encerrado ? '' : `
      <section class="sc-sem" aria-labelledby="sc-sem-t">
        <div class="sc-sem-h"><h2 id="sc-sem-t">Sem ponto</h2><span>Toque = padrão · <b>segure</b> = detalhe</span></div>
        <div class="sc-quem" role="group" aria-label="Quem está na bola">${j.dupla.map((a) => `<button type="button" class="sc-q" data-quem="${a}" aria-pressed="${live.quem === a}"><span class="sc-av">${esc(nm(a)[0])}</span>${esc(nm(a))}${e.sacador === a && e.sac === 'nos' ? '<small>saca</small>' : ''}</button>`).join('')}</div>
        <div class="sc-faixa">${MENUS.semPonto.map((k) => { const a = ACOES[k]; return `<button type="button" class="sc-acao mini" data-sp="${k}" aria-haspopup="${a.opcoes ? 'menu' : 'false'}" aria-keyshortcuts="Shift+Enter"><span class="sc-acao-i">${ic(a.ic, 24)}</span><span class="sc-acao-r">${esc(a.rot)}</span>${a.opcoes ? '<span class="sc-acao-d" aria-hidden="true">segure</span>' : ''}</button>`; }).join('')}</div>
      </section>`;
    const recentes = j.eventos.slice(-6).reverse();
    const ult = ultimo;
    const destino = ult && F[ult.fund].destino && !e.encerrado;

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
        ${prompt}${fim}${semPonto}

        <section class="card sc-ult" id="sc-ultima" tabindex="-1" aria-labelledby="sc-ult-t" aria-live="polite">
          <div class="card-head"><h2 id="sc-ult-t">Última ação</h2><span class="label num">${j.eventos.length} no jogo</span></div>
          ${ult ? `<p class="sc-ult-d"><b>${esc(UI.descrever(j, ult))}</b>${ult.ponto ? ` <span class="sc-pt ${ult.ponto}">${ult.ponto === 'nos' ? 'ponto nosso' : 'ponto deles'}</span>` : ''}</p>` : '<p class="vazio" style="padding:2px 0">Nenhuma ação ainda. Toque no + de quem fez o ponto ou use a faixa Sem ponto.</p>'}
          ${destino ? `<div class="sc-dest-w"><span class="label">Para onde foi? <small>(opcional)</small></span><span class="sc-rede">Rede</span><div class="sc-dest" role="group" aria-label="Destino na quadra do adversário">${[0, 1, 2, 3, 4, 5, 6, 7, 8].map((k) => `<button type="button" data-dest="${k}" aria-pressed="${ult.dest === k}" aria-label="${['Perto da rede', 'Meio', 'Fundo'][Math.floor(k / 3)]}, ${['esquerda', 'centro', 'direita'][k % 3]}">${ult.dest === k ? '●' : ''}</button>`).join('')}</div><span class="sc-rede">Fundo</span></div>` : ''}
        </section>

        <details class="card sc-hist"><summary>Últimas ações <span class="num">(${recentes.length})</span></summary>
          ${recentes.length ? `<ol class="sc-lista">${recentes.map((ev) => `<li><span>${esc(UI.descrever(j, ev))}</span>${ev.ponto ? `<b class="sc-pt ${ev.ponto}">${ev.ponto === 'nos' ? 'nosso' : 'deles'}</b>` : ''}</li>`).join('')}</ol>` : ''}
          <div class="actions" style="margin-top:10px">${e.encerrado ? '' : `<button class="link-btn" id="sc-encerrar" style="margin:0" ${e.iniciado ? '' : 'disabled'}>Encerrar o jogo agora</button>`}</div>
        </details>
      </div>`;

    // Relógio do jogo
    if (!e.encerrado && j.iniciadoEm) relogio = setInterval(() => { const t = root.querySelector('#sc-rel-t'); if (!t) { clearInterval(relogio); return; } t.textContent = tempo(D.jogo(id)); }, 1000);

    const $ = (s) => root.querySelector(s);
    $('#sc-voltar').addEventListener('click', () => window.Farol.ir('analise-scout', {}));
    $('#sc-quadro').addEventListener('click', () => window.Farol.gaveta.abrir());
    $('#sc-desfazer').addEventListener('click', () => { D.desfazer(id); live.ultimoMsg = ''; redesenhar(id, '#sc-desfazer'); });
    const enc = $('#sc-encerrar'); if (enc) enc.addEventListener('click', () => { D.encerrar(id); const jj = D.jogo(id); jj.fimEm = Date.now(); redesenhar(id, '#sc-rel'); });
    const rel = $('#sc-rel'); if (rel) rel.addEventListener('click', () => window.Farol.ir('analise-scout', { jogo: id }));
    const corr = $('#sc-corrigir'); if (corr) corr.addEventListener('click', () => { D.desfazer(id); D.reabrir(id); redesenhar(id, '[data-lado="nos"]'); });
    root.querySelectorAll('[data-inicio]').forEach((b) => b.addEventListener('click', () => { const [sac, k] = b.dataset.inicio.split(':'); D.definirInicio(id, e.set, sac, +k); live.quem = null; redesenhar(id, `[data-inicio="${b.dataset.inicio}"]`); }));
    root.querySelectorAll('.sc-sem [data-quem]').forEach((b) => b.addEventListener('click', () => { live.quem = b.dataset.quem; redesenhar(id, `.sc-sem [data-quem="${b.dataset.quem}"]`); }));
    root.querySelectorAll('[data-lado]').forEach((b) => b.addEventListener('click', () => abrirPop(id, b.dataset.lado)));
    root.querySelectorAll('[data-menos]').forEach((b) => b.addEventListener('click', () => { D.desfazer(id); redesenhar(id, `[data-lado="${b.dataset.menos}"]`); }));
    root.querySelectorAll('[data-dest]').forEach((b) => b.addEventListener('click', () => { const k = Number(b.dataset.dest); D.ajustarUltimo(id, { dest: ult.dest === k ? null : k }); redesenhar(id, `[data-dest="${k}"]`); }));
    root.querySelectorAll('[data-sp]').forEach((b) => {
      const a = ACOES[b.dataset.sp];
      const fim2 = (patch) => { registrar(id, a, patch); redesenhar(id, '#sc-ultima'); };
      ligarGesto(b, { padrao: () => fim2(null), detalhe: () => (a.opcoes ? { titulo: a.titulo, opcoes: a.opcoes(), lado: 'nos', aoEscolher: (o) => fim2(o.patch) } : null) });
    });
  }

  window.Farol.views = window.Farol.views || {};
  window.Farol.views['scout-coleta'] = (root, params) => {
    const id = (params && params.jogo) || live.jogoId;
    coleta(root, id);
  };
})();
