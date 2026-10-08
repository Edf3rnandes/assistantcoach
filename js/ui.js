/* Peças de interface: criação de elementos, modal, aviso, formulários, escalas PSE/PSR e gráficos em SVG. */
(function (AC) {
  /* ---------- Elementos ---------- */

  function add(el, kids) {
    for (const k of kids) {
      if (k == null || k === false) continue;
      if (Array.isArray(k)) add(el, k);
      else el.append(k.nodeType ? k : document.createTextNode(String(k)));
    }
  }

  function h(tag, props, ...kids) {
    const el = document.createElement(tag);
    let valor;
    for (const [k, v] of Object.entries(props || {})) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'value') valor = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (k === 'dataset') Object.assign(el.dataset, v);
      else if (k === 'style' && typeof v === 'object') {
        for (const [p, x] of Object.entries(v)) { if (p.startsWith('--')) el.style.setProperty(p, x); else el.style[p] = x; }
      }
      else if (k in el && !k.includes('-')) el[k] = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
    add(el, kids);
    if (valor !== undefined) el.value = valor;
    return el;
  }

  /* Troca o conteúdo de um elemento aceitando listas aninhadas (replaceChildren não achata). */
  function pintar(el, ...kids) { el.replaceChildren(); add(el, kids); return el; }

  const NS = 'http://www.w3.org/2000/svg';
  function svg(tag, props, ...kids) {
    const el = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(props || {})) if (v != null) el.setAttribute(k, v);
    for (const k of kids.flat()) if (k != null) el.append(k.nodeType ? k : document.createTextNode(String(k)));
    return el;
  }

  /* ---------- Datas e números para mostrar ---------- */

  const DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
  const DIAS_LONGO = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
  const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const dow = (s) => new Date(AC.calc.ms(s)).getUTCDay();
  const dm = (s) => `${s.slice(8)}/${s.slice(5, 7)}`;
  const dataCurta = (s) => `${DIAS[dow(s)]}, ${dm(s)}`;
  const dataLonga = (s) => `${DIAS_LONGO[dow(s)]}, ${Number(s.slice(8))} de ${MESES[Number(s.slice(5, 7)) - 1]}`;
  const dataCompleta = (s) => `${dm(s)}/${s.slice(0, 4)}`;
  const num = (n) => (n == null ? '—' : String(n).replace('.', ','));
  const milhar = (n) => (n == null ? '—' : Math.round(n).toLocaleString('pt-BR'));
  const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

  /* ---------- Aviso e modal ---------- */

  let tempoAviso;
  function aviso(msg, erro) {
    let el = document.getElementById('aviso');
    if (!el) { el = h('div', { id: 'aviso', role: 'status' }); document.body.append(el); }
    el.textContent = msg;
    el.className = 'aviso on' + (erro ? ' erro' : '');
    clearTimeout(tempoAviso);
    tempoAviso = setTimeout(() => { el.className = 'aviso'; }, 2600);
  }

  /* corpo: nó ou função(fechar) que devolve o nó. Devolve { fechar }. */
  function modal(titulo, corpo, opcoes = {}) {
    const dlg = h('dialog', { class: 'modal' + (opcoes.largo ? ' largo' : '') });
    const fechar = (r) => { dlg.close(); dlg.remove(); if (opcoes.aoFechar) opcoes.aoFechar(r); };
    const conteudo = typeof corpo === 'function' ? corpo(fechar) : corpo;
    dlg.append(
      h('div', { class: 'modal-topo' }, h('h2', null, titulo), h('button', { class: 'icone', type: 'button', 'aria-label': 'Fechar', onclick: () => fechar() }, '✕')),
      h('div', { class: 'modal-corpo' }, conteudo),
    );
    dlg.addEventListener('cancel', (e) => { e.preventDefault(); fechar(); });
    dlg.addEventListener('click', (e) => { if (e.target === dlg) fechar(); });
    document.body.append(dlg);
    dlg.showModal();
    return { fechar };
  }

  function confirmar(texto, { ok = 'Confirmar', perigo = false, titulo = 'Confirmar' } = {}) {
    return new Promise((resolve) => {
      let resolvido = false;
      const fim = (v) => { if (!resolvido) { resolvido = true; resolve(v); } };
      modal(titulo, (fechar) => h('div', null,
        h('p', null, texto),
        h('div', { class: 'acoes' },
          h('button', { class: 'btn', type: 'button', onclick: () => { fim(false); fechar(); } }, 'Cancelar'),
          h('button', { class: 'btn ' + (perigo ? 'perigo' : 'primario'), type: 'button', onclick: () => { fim(true); fechar(); } }, ok),
        )), { aoFechar: () => fim(false) });
    });
  }

  /* ---------- Formulário ---------- */

  const campo = (rotulo, entrada, dica) =>
    h('label', { class: 'campo' }, h('span', { class: 'campo-rotulo' }, rotulo), entrada, dica ? h('span', { class: 'dica' }, dica) : null);

  const entrada = (tipo, valor, extra) => h('input', { type: tipo, value: valor == null ? '' : valor, ...extra });

  function selecao(opcoes, valor, extra) {
    return h('select', { ...extra, value: valor },
      opcoes.map((o) => h('option', { value: o.valor, selected: o.valor === valor }, o.rotulo)));
  }

  function chip(texto, { cor, ativo, onclick, titulo, pequeno } = {}) {
    const el = h(onclick ? 'button' : 'span', {
      class: 'chip' + (ativo ? ' ativo' : '') + (pequeno ? ' peq' : ''),
      type: onclick ? 'button' : null,
      title: titulo,
      onclick,
    }, texto);
    if (cor) el.style.setProperty('--cor', cor);
    return el;
  }

  /* Grupo de chips de escolha múltipla; devolve { el, valor() }. */
  function chipsMulti(opcoes, selecionados, aoMudar) {
    const sel = new Set(selecionados || []);
    const el = h('div', { class: 'chips' });
    const desenhar = () => {
      el.replaceChildren(...opcoes.map((o) => chip(o, {
        ativo: sel.has(o),
        onclick: () => { sel.has(o) ? sel.delete(o) : sel.add(o); desenhar(); if (aoMudar) aoMudar([...sel]); },
      })));
    };
    desenhar();
    return { el, valor: () => opcoes.filter((o) => sel.has(o)) };
  }

  /* Controle segmentado simples. */
  function segmentado(opcoes, valor, aoMudar) {
    const el = h('div', { class: 'seg', role: 'group' });
    let atual = valor;
    const desenhar = () => el.replaceChildren(...opcoes.map((o) => h('button', {
      type: 'button', class: o.valor === atual ? 'on' : '', 'aria-pressed': String(o.valor === atual),
      onclick: () => { atual = o.valor; desenhar(); aoMudar(atual); },
    }, o.rotulo)));
    desenhar();
    return el;
  }

  /* Escala de 0 a 10 que se atualiza sozinha (sem refazer a tela). tipo: 'pse' (alto = vermelho) ou 'psr' (baixo = vermelho). */
  function escala(tipo, valor, aoMudar) {
    const rotulos = tipo === 'pse' ? AC.cat.PSE_ROTULOS : AC.cat.PSR_ROTULOS;
    const legenda = h('span', { class: 'esc-leg' });
    const botoes = [];
    let atual = valor;
    const el = h('div', { class: 'escala ' + tipo },
      h('div', { class: 'esc-btns', role: 'group' }, Array.from({ length: 11 }, (_, i) => {
        const b = h('button', { type: 'button', 'data-v': i, onclick: () => definir(atual === i ? null : i, true) }, i);
        botoes.push(b);
        return b;
      })),
      legenda);
    function pinta() {
      botoes.forEach((b, i) => {
        const sel = atual === i;
        b.className = sel ? 'on ' + faixaEscala(tipo, i) : '';
        b.setAttribute('aria-pressed', String(sel));
      });
      legenda.textContent = atual == null ? '' : `${atual} · ${rotulos[atual]}`;
    }
    function definir(v, notificar) { atual = v; pinta(); if (notificar && aoMudar) aoMudar(v); }
    pinta();
    return { el, definir: (v) => definir(v, false), valor: () => atual };
  }

  function faixaEscala(tipo, v) {
    const ruim = tipo === 'pse' ? v : 10 - v;
    return ruim >= 8 ? 'f-alta' : ruim >= 6 ? 'f-media' : ruim >= 4 ? 'f-moderada' : 'f-baixa';
  }

  /* ---------- Gráficos ---------- */

  /* Barras de carga realizada, com o planejado como marca. itens: { rotulo, real, planejado, atual } */
  function graficoCarga(itens) {
    const L = 36 + itens.length * 44, A = 170, pb = 24, pt = 10;
    const max = Math.max(1, ...itens.map((i) => Math.max(i.real || 0, i.planejado || 0))) * 1.12;
    const y = (v) => pt + (A - pb - pt) * (1 - v / max);
    const el = svg('svg', { viewBox: `0 0 ${L} ${A}`, class: 'grafico', role: 'img', 'aria-label': 'Carga planejada e realizada por semana' });
    el.append(svg('line', { x1: 28, x2: L - 4, y1: y(0), y2: y(0), class: 'g-eixo' }));
    itens.forEach((it, i) => {
      const x = 32 + i * 44;
      if (it.real != null) {
        el.append(svg('rect', { x, y: y(it.real), width: 26, height: Math.max(1, y(0) - y(it.real)), rx: 3, class: 'g-barra' + (it.atual ? ' atual' : '') }));
        el.append(svg('text', { x: x + 13, y: y(it.real) - 3, class: 'g-val', 'text-anchor': 'middle' }, AC.ui.milhar(it.real)));
      }
      if (it.planejado != null) {
        el.append(svg('line', { x1: x - 4, x2: x + 30, y1: y(it.planejado), y2: y(it.planejado), class: 'g-plan' }));
      }
      el.append(svg('text', { x: x + 13, y: A - 8, class: 'g-rot' + (it.atual ? ' atual' : ''), 'text-anchor': 'middle' }, it.rotulo));
    });
    return el;
  }

  /* Duas linhas (chegada = PSR, saída = PSE) ao longo das últimas sessões. pontos: { rotulo, psr, pse } */
  function graficoLinhas(pontos) {
    const W = Math.max(260, 40 + pontos.length * 38), A = 150, pb = 22, pt = 8, pl = 22;
    const x = (i) => pl + 14 + i * ((W - pl - 28) / Math.max(1, pontos.length - 1 || 1));
    const y = (v) => pt + (A - pb - pt) * (1 - v / 10);
    const el = svg('svg', { viewBox: `0 0 ${W} ${A}`, class: 'grafico', role: 'img', 'aria-label': 'PSR de chegada e PSE de saída por treino' });
    [0, 5, 10].forEach((g) => {
      el.append(svg('line', { x1: pl, x2: W - 4, y1: y(g), y2: y(g), class: 'g-grade' }));
      el.append(svg('text', { x: pl - 5, y: y(g) + 3, class: 'g-rot', 'text-anchor': 'end' }, g));
    });
    for (const [campo, classe] of [['psr', 'g-psr'], ['pse', 'g-pse']]) {
      const pts = pontos.map((p, i) => (p[campo] == null ? null : [x(pontos.length === 1 ? 1 : i), y(p[campo])]));
      const trechos = [];
      let atual = [];
      pts.forEach((p) => { if (p) atual.push(p); else if (atual.length) { trechos.push(atual); atual = []; } });
      if (atual.length) trechos.push(atual);
      trechos.forEach((t) => {
        if (t.length > 1) el.append(svg('polyline', { points: t.map((p) => p.join(',')).join(' '), class: 'g-linha ' + classe }));
        t.forEach((p) => el.append(svg('circle', { cx: p[0], cy: p[1], r: 3.2, class: 'g-ponto ' + classe })));
      });
    }
    pontos.forEach((p, i) => el.append(svg('text', { x: x(pontos.length === 1 ? 1 : i), y: A - 6, class: 'g-rot', 'text-anchor': 'middle' }, p.rotulo)));
    return el;
  }

  AC.ui = {
    h, svg, add, pintar, dm, dataCurta, dataLonga, dataCompleta, num, milhar, plural,
    aviso, modal, confirmar, campo, entrada, selecao, chip, chipsMulti, segmentado, escala, faixaEscala,
    graficoCarga, graficoLinhas,
  };
})((window.AC = window.AC || {}));
