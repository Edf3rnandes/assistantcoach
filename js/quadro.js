/* Quadro técnico
   Quadra de areia 16 × 8 m (duas duplas, rede ao centro) para desenhar uma jogada ou um exercício em quadros.
   Dois modos que compartilham o mesmo desenho:
     - tela cheia (menu Treino > Quadro técnico), com detalhes e biblioteca;
     - gaveta "Quadro rápido", que abre sobre qualquer tela (registro, microciclo, depois o scout)
       sem sair dela e sem perder o desenho.
   As medidas são em metros: x de 0 a 16 (rede em 8), y de 0 a 8. Nossa dupla joga à esquerda.
   Na vertical (celular) a quadra é girada: nossa dupla fica embaixo, como na maioria dos apps de quadro. */
(function () {
  const { util, elenco } = window.Farol;
  const { esc, plural } = util;
  const { FUNDAMENTOS } = elenco;

  const TAGS = { saque: 'Saque', sideout: 'Side-out', break: 'Break point', defesa: 'Defesa', bloqueio: 'Bloqueio', transicao: 'Transição', exercicio: 'Exercício', outro: 'Outro' };
  const FERRAMENTAS = [['mover', 'Mover'], ['desloc', 'Deslocar'], ['bola', 'Bola'], ['ataque', 'Ataque']];
  const ESTILO_SETA = {
    desloc: { cor: '--ink', w: 0.15, dash: '' },
    bola: { cor: '--court-ball', w: 0.16, dash: '0.42 0.3' },
    ataque: { cor: '--crit', w: 0.3, dash: '' },
  };
  const OBJETOS = { cone: 'Cone', arco: 'Arco', escada: 'Escada', alvo: 'Alvo', bola: 'Bola extra' };
  const VB = { x: -3, y: -2.4, w: 22, h: 12.8 };
  const LIM = { x0: -2.6, x1: 18.6, y0: -2.0, y1: 9.8 };
  const NUCLEO = ['a1', 'a2', 'b1', 'b2'];
  const DURACAO = { pausa: 700, move: 1300 };
  const copiar = (o) => JSON.parse(JSON.stringify(o));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const P = (x, y) => ({ x, y });
  const F = (j, bola, setas, legenda) => ({ j, bola, setas: setas || [], legenda: legenda || '', objs: [] });
  const S = (t, x1, y1, x2, y2) => ({ t, x1, y1, x2, y2 });

  /* ---------- Biblioteca ---------- */

  const SEMENTES = [
    {
      id: 'j1', titulo: 'Saque float na zona 1 e bloqueio na paralela', tag: 'saque', fundamento: 'saque',
      desc: 'Saque float no atleta de baixo. O bloqueador observa o levantador adversário e fecha a paralela, enquanto o defensor cobre a diagonal.',
      nomes: { a1: 'Def', a2: 'Bloq', b1: 'R1', b2: 'R2' },
      frames: [
        F({ a1: P(-1.2, 6.2), a2: P(6.7, 2.2), b1: P(12.6, 5.6), b2: P(12.4, 2.4) }, P(-1.2, 6.2), [S('bola', -0.9, 6.2, 12.2, 5.7)], 'Saque float no atleta de baixo da quadra adversária.'),
        F({ a1: P(2.8, 5.4), a2: P(6.7, 2.4), b1: P(12.8, 5.6), b2: P(11.4, 2.5) }, P(12.8, 5.6), [S('bola', 12.5, 5.5, 11.7, 3.0), S('desloc', 2.8, 5.4, 3.6, 5.2)], 'Recepção. O defensor entra na quadra; o bloqueador acompanha o levantador.'),
        F({ a1: P(3.2, 5.6), a2: P(7.4, 3.0), b1: P(11.4, 4.2), b2: P(10.4, 2.6) }, P(10.4, 2.0), [S('ataque', 11.0, 4.0, 5.5, 6.9)], 'Bloqueio fecha a paralela e o defensor cobre a diagonal.'),
      ],
    },
    {
      id: 'j2', titulo: 'Side-out: recepção, levantamento e ataque em diagonal', tag: 'sideout', fundamento: 'sideout',
      desc: 'Recepção no atleta de cima, o parceiro levanta junto à rede e o recebedor ataca em diagonal.',
      nomes: { a1: 'Lev', a2: 'Rec', b1: 'Sac', b2: 'Blq' },
      frames: [
        F({ a1: P(3.2, 5.4), a2: P(3.0, 2.4), b1: P(17.2, 2.2), b2: P(9.2, 5.2) }, P(17.2, 2.2), [S('bola', 16.9, 2.2, 3.4, 2.5)], 'Saque adversário no atleta de cima.'),
        F({ a1: P(4.8, 5.0), a2: P(3.2, 2.6), b1: P(15.2, 4.0), b2: P(9.0, 5.0) }, P(3.2, 2.6), [S('bola', 3.2, 2.6, 6.3, 4.0), S('desloc', 4.8, 5.0, 6.4, 4.2)], 'Passe alto para a rede; o parceiro se desloca para levantar.'),
        F({ a1: P(6.4, 4.2), a2: P(4.4, 2.8), b1: P(13.4, 4.8), b2: P(9.0, 3.6) }, P(6.4, 3.4), [S('ataque', 5.0, 2.8, 13.0, 6.4)], 'Levantamento curto e ataque em diagonal.'),
      ],
    },
    {
      id: 'j3', titulo: 'Defesa em dupla: bloqueio na linha, defensor na diagonal', tag: 'defesa', fundamento: 'defesa',
      desc: 'O bloqueador fecha a linha e empurra o ataque para onde o defensor já está.',
      nomes: { a1: 'Def', a2: 'Bloq', b1: 'Atq', b2: 'Lev' },
      frames: [
        F({ a1: P(3.4, 5.0), a2: P(7.0, 3.6), b1: P(10.0, 3.8), b2: P(11.8, 5.2) }, P(10.6, 4.4), [S('ataque', 10.2, 3.6, 3.6, 6.2)], 'Atacante adversário chega pela diagonal.'),
        F({ a1: P(3.6, 6.0), a2: P(7.2, 3.8), b1: P(9.4, 3.2), b2: P(11.8, 5.2) }, P(3.6, 6.3), [], 'Bloqueio na linha; o defensor já está na diagonal e levanta a bola.'),
      ],
    },
  ];

  const normal = (j) => {
    j.pecas = j.pecas || NUCLEO.slice();
    j.fundo = j.fundo || 'quadra';
    j.frames.forEach((f) => { f.objs = f.objs || []; f.setas = f.setas || []; });
    return j;
  };

  const CHAVE = 'ft.jogadas.v2';
  function carregar() {
    try {
      const txt = localStorage.getItem(CHAVE);
      if (txt) { const v = JSON.parse(txt); if (Array.isArray(v) && v.length) return v.map(normal); }
    } catch (e) { /* sem armazenamento */ }
    return copiar(SEMENTES).map(normal);
  }
  let lib = carregar();
  const gravar = () => { try { localStorage.setItem(CHAVE, JSON.stringify(lib)); } catch (e) { /* sem armazenamento */ } };
  let seq = 100;
  let seqObj = 0;

  function nova() {
    return normal({
      id: null, titulo: '', tag: 'sideout', fundamento: 'sideout', desc: '',
      nomes: { a1: 'Def', a2: 'Bloq', b1: 'R1', b2: 'R2' },
      frames: [F({ a1: P(3.0, 5.6), a2: P(6.8, 2.6), b1: P(12.6, 5.4), b2: P(11.0, 2.4) }, P(3.4, 6.5), [], '')],
    });
  }

  let ed = normal(copiar(lib[0]));
  const ui = {
    ferr: 'mover', atual: 0, sel: null, tocando: false, aviso: '', confirmaExcluir: null,
    desfazer: [], refazer: [], paleta: false, vertical: null, ativo: false,
  };

  /* ---------- Desenho ---------- */

  function objSvg(o, mini) {
    let forma = '';
    if (o.t === 'cone') forma = '<polygon points="0,-0.5 0.44,0.4 -0.44,0.4" class="qd-cone"/>';
    else if (o.t === 'arco') forma = '<circle r="0.75" class="qd-arco"/>';
    else if (o.t === 'alvo') forma = '<circle r="0.6" class="qd-alvo"/><circle r="0.18" class="qd-alvo-p"/>';
    else if (o.t === 'bola') forma = '<circle r="0.34" class="qd-bolac"/>';
    else if (o.t === 'escada') {
      let degraus = '';
      for (let x = -1.2; x <= 1.21; x += 0.4) degraus += `<line x1="${x.toFixed(1)}" y1="-0.45" x2="${x.toFixed(1)}" y2="0.45"/>`;
      forma = `<rect x="-1.6" y="-0.45" width="3.2" height="0.9" class="qd-escada"/><g class="qd-degraus">${degraus}</g>`;
    }
    return `<g class="qd-peca qd-obj" data-pec="obj:${o.id}" data-rot="${o.rot || 0}" transform="translate(${o.x} ${o.y}) rotate(${o.rot || 0})" ${mini ? '' : `tabindex="0" role="button" aria-label="${esc(OBJETOS[o.t])}"`}>
      ${mini ? '' : '<circle class="qd-halo" r="1.1"/>'}${forma}</g>`;
  }

  function svgQuadro(frame, meta, o = {}) {
    const mini = !!o.mini;
    const id = o.id || 'q';
    const vertical = !!o.vertical && !mini;
    const sel = o.sel;
    const vb = vertical ? `0 0 ${VB.h} ${VB.w}` : `${VB.x} ${VB.y} ${VB.w} ${VB.h}`;
    const mundo = vertical ? `matrix(0 -1 1 0 ${-VB.y} ${VB.x + VB.w})` : '';
    const girar = (x, y) => (vertical ? ` transform="rotate(90 ${x} ${y})"` : '');
    const rotulo = (x, y, t) => `<text x="${x}" y="${y}" text-anchor="middle" class="qd-txt"${girar(x, y)}>${t}</text>`;

    const marcador = (k) => `<marker id="${id}-m-${k}" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="4" markerHeight="4" orient="auto"><path d="M0 0 L10 5 L0 10 z" style="fill:var(${ESTILO_SETA[k].cor})"/></marker>`;

    const setas = frame.setas.map((s, i) => {
      const e = ESTILO_SETA[s.t];
      const ativa = !mini && sel && sel.tipo === 'seta' && sel.i === i;
      return `<g class="qd-seta${ativa ? ' sel' : ''}" data-seta="${i}">
        ${mini ? '' : `<line x1="${s.x1}" y1="${s.y1}" x2="${s.x2}" y2="${s.y2}" class="hit"/>`}
        <line x1="${s.x1}" y1="${s.y1}" x2="${s.x2}" y2="${s.y2}" style="stroke:var(${e.cor});stroke-width:${e.w + (ativa ? 0.1 : 0)}" ${e.dash ? `stroke-dasharray="${e.dash}"` : ''} stroke-linecap="round" marker-end="url(#${id}-m-${s.t})"/>
      </g>`;
    }).join('');

    const objetos = (frame.objs || []).map((ob) => objSvg(ob, mini)).join('');

    const pecas = meta.pecas.map((k) => {
      const p = frame.j[k];
      if (!p) return '';
      const eq = k[0];
      return `<g class="qd-peca qd-${eq}" data-pec="${k}" transform="translate(${p.x} ${p.y})" ${mini ? '' : `tabindex="0" role="button" aria-label="Jogador ${esc(meta.nomes[k])}"`}>
        ${mini ? '' : '<circle class="qd-halo" r="1.1"/>'}<circle r="0.72"/><text y="0.19" text-anchor="middle"${vertical ? ' transform="rotate(90)"' : ''}>${esc(String(meta.nomes[k]).slice(0, 4))}</text></g>`;
    }).join('');

    const bola = `<g class="qd-peca qd-bola" data-pec="bola" transform="translate(${frame.bola.x} ${frame.bola.y})" ${mini ? '' : 'tabindex="0" role="button" aria-label="Bola"'}>${mini ? '' : '<circle class="qd-halo" r="1.0"/>'}<circle r="0.36"/></g>`;

    const rede = meta.fundo === 'livre' ? '' : `
      <line x1="8" y1="-0.7" x2="8" y2="8.7" class="qd-rede"/>
      <circle cx="8" cy="-0.7" r="0.2" class="qd-poste"/><circle cx="8" cy="8.7" r="0.2" class="qd-poste"/>`;

    return `<svg viewBox="${vb}" ${mini ? 'aria-hidden="true"' : 'id="qd-svg" role="group" aria-label="Quadra de areia 16 por 8 metros"'} xmlns="http://www.w3.org/2000/svg">
      <defs>${marcador('desloc')}${marcador('bola')}${marcador('ataque')}</defs>
      <g${mini ? '' : ' id="qd-mundo"'}${mundo ? ` transform="${mundo}"` : ''}>
        <rect x="${VB.x}" y="${VB.y}" width="${VB.w}" height="${VB.h}" class="qd-areia"/>
        <rect x="0" y="0" width="16" height="8" class="qd-quadra${meta.fundo === 'livre' ? ' livre' : ''}"/>
        ${rede}
        ${mini ? '' : `${meta.fundo === 'livre' ? '' : rotulo(8, -1.15, 'REDE')}${rotulo(8, 9.55, '16 m')}${rotulo(-1.6, 4.15, '8 m')}`}
        ${setas}${objetos}${bola}${pecas}
      </g>
    </svg>`;
  }

  /* ---------- Tela ---------- */

  function mistura(a, b, k) {
    const lerp = (p, q) => ({ x: p.x + (q.x - p.x) * k, y: p.y + (q.y - p.y) * k });
    const j = {};
    Object.keys(a.j).forEach((id) => { j[id] = b.j[id] ? lerp(a.j[id], b.j[id]) : a.j[id]; });
    const objs = (a.objs || []).map((o) => { const q = (b.objs || []).find((x) => x.id === o.id); return q ? { ...o, ...lerp(o, q) } : o; });
    return { j, bola: lerp(a.bola, b.bola), setas: a.setas, objs, legenda: a.legenda };
  }

  let renderRaiz = null;
  let modo = 'completo';
  const frame = () => ed.frames[ui.atual];
  const parar = () => { ui.tocando = false; };
  const iconeDesfazer = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/></svg>';
  const iconeRefazer = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 14l5-5-5-5"/><path d="M20 9H10a6 6 0 0 0 0 12h3"/></svg>';
  const iconeLixo = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>';

  function tela(root, m) {
    renderRaiz = root;
    modo = m || modo;
    ui.ativo = true;
    if (ui.vertical == null) ui.vertical = modo === 'painel' || window.matchMedia('(max-width: 760px)').matches;

    const selecionado = ui.sel;
    const podeApagar = selecionado && (selecionado.tipo === 'seta' || selecionado.tipo === 'obj' || (selecionado.tipo === 'peca' && !NUCLEO.includes(selecionado.id)));
    const objSel = selecionado && selecionado.tipo === 'obj' ? frame().objs.find((o) => o.id === selecionado.id) : null;
    const nPecas = (eq) => ed.pecas.filter((k) => k[0] === eq).length;

    const blocoQuadro = `
      <div class="qd-wrap ${ui.ferr !== 'mover' ? 'desenhando' : ''} ${ui.tocando ? 'tocando' : ''} ${ui.vertical ? 'vertical' : ''}" id="qd-wrap"></div>
      <div class="qd-eq" aria-hidden="true"><span><i class="qd-pt qd-pt-a"></i>Nossa dupla</span><span><i class="qd-pt qd-pt-b"></i>Adversários</span><span><i class="qd-pt qd-pt-bola"></i>Bola</span></div>`;

    const blocoFerr = `
      <div class="qd-barra" role="toolbar" aria-label="Ferramentas do quadro">
        <button class="qd-ic" id="qd-desfazer" aria-label="Desfazer" ${ui.desfazer.length ? '' : 'disabled'}>${iconeDesfazer}</button>
        <button class="qd-ic" id="qd-refazer" aria-label="Refazer" ${ui.refazer.length ? '' : 'disabled'}>${iconeRefazer}</button>
        <span class="qd-sep"></span>
        ${FERRAMENTAS.map(([k, n]) => `<button class="qd-fer" data-ferr="${k}" aria-pressed="${ui.ferr === k}">${n}</button>`).join('')}
        <span class="qd-sep"></span>
        <button class="qd-fer" id="qd-mais" aria-expanded="${ui.paleta}" aria-controls="qd-paleta">+ Peça</button>
        ${objSel && objSel.t === 'escada' ? '<button class="qd-fer" id="qd-girar">Girar</button>' : ''}
        <button class="qd-ic" id="qd-apagar" aria-label="Apagar item selecionado" title="Apagar item selecionado" ${podeApagar ? '' : 'disabled'}>${iconeLixo}</button>
      </div>
      <div class="qd-paleta" id="qd-paleta" ${ui.paleta ? '' : 'hidden'}>
        <button class="btn btn-sm" data-add="peca:a" ${nPecas('a') >= 8 ? 'disabled' : ''}>Jogador nosso</button>
        <button class="btn btn-sm" data-add="peca:b" ${nPecas('b') >= 8 ? 'disabled' : ''}>Jogador adversário</button>
        ${Object.entries(OBJETOS).map(([k, n]) => `<button class="btn btn-sm" data-add="obj:${k}">${n}</button>`).join('')}
      </div>`;

    const blocoFrames = `
      <div class="qd-controle">
        <div class="actions">
          <button class="btn btn-sm" id="qd-ant" aria-label="Quadro anterior" ${ui.atual === 0 || ui.tocando ? 'disabled' : ''}>‹</button>
          <span class="label num" id="qd-pos">Quadro ${ui.atual + 1} de ${ed.frames.length}</span>
          <button class="btn btn-sm" id="qd-prox" aria-label="Próximo quadro" ${ui.atual >= ed.frames.length - 1 || ui.tocando ? 'disabled' : ''}>›</button>
          <button class="btn btn-sm" id="qd-add" ${ui.tocando ? 'disabled' : ''}>Novo quadro</button>
          <button class="btn btn-sm" id="qd-del" ${ed.frames.length < 2 || ui.tocando ? 'disabled' : ''}>Excluir quadro</button>
          <button class="btn btn-sm" id="qd-auto" ${ui.atual > 0 && !ui.tocando ? '' : 'disabled'} title="Cria no quadro anterior as setas até as posições deste quadro">Setas até aqui</button>
        </div>
        <button class="btn btn-primary" id="qd-tocar" ${ed.frames.length < 2 ? 'disabled' : ''}>${ui.tocando ? 'Parar' : 'Tocar'}</button>
      </div>
      <div class="qd-faixa" id="qd-faixa" role="group" aria-label="Quadros da jogada"></div>
      <div class="field" style="margin-top:10px">
        <label class="label" for="qd-legenda">Legenda deste quadro</label>
        <input class="input" id="qd-legenda" type="text" maxlength="140" placeholder="O que acontece neste momento?" value="${esc(frame().legenda)}" ${ui.tocando ? 'disabled' : ''}>
      </div>`;

    const blocoOpcoes = `
      <div class="qd-opcoes">
        <button class="btn btn-sm" id="qd-girar-q" aria-pressed="${ui.vertical}">${ui.vertical ? 'Quadra na horizontal' : 'Quadra na vertical'}</button>
        <button class="btn btn-sm" id="qd-inverter">Inverter lados</button>
        <button class="btn btn-sm" id="qd-fundo">${ed.fundo === 'livre' ? 'Usar quadra com rede' : 'Usar área livre'}</button>
      </div>`;

    const dica = ui.ferr === 'mover'
      ? 'Arraste as peças. Toque numa seta ou peça para selecionar e use a lixeira para apagar.'
      : 'Arraste sobre a quadra para traçar a seta. Volte para Mover para posicionar as peças.';

    if (modo === 'painel') {
      root.innerHTML = `
        <div class="qd qd-painel">
          <div class="qd-topo">
            <input class="input sm" id="qd-titulo" type="text" maxlength="90" placeholder="Título da jogada ou exercício" value="${esc(ed.titulo)}" aria-label="Título">
            <button class="btn btn-primary btn-sm" id="qd-salvar-rapido">${ed.id ? 'Salvar' : 'Salvar na biblioteca'}</button>
          </div>
          <div id="qd-aviso">${ui.aviso ? `<div class="aviso-ok" role="status">${esc(ui.aviso)}</div>` : ''}</div>
          ${blocoQuadro}
          ${blocoFerr}
          <p class="hint" id="qd-dica">${dica}</p>
          ${blocoFrames}
          ${blocoOpcoes}
          <div class="qd-abrir">
            <label class="label" for="qd-lib-sel">Abrir da biblioteca</label>
            <select class="select sm" id="qd-lib-sel" style="min-width:0;width:100%">
              <option value="">Escolha uma jogada…</option>
              ${lib.map((j) => `<option value="${j.id}">${esc(j.titulo)}</option>`).join('')}
            </select>
            <button class="btn btn-sm" id="qd-nova">Nova jogada</button>
          </div>
        </div>`;
    } else {
      root.innerHTML = `
        <header class="page-head">
          <div>
            <span class="chip" style="margin-bottom:10px">Dados de exemplo</span>
            <h1>Quadro técnico</h1>
            <p class="lead">Desenhe a jogada ou o exercício em quadros: posicione as duplas e a bola, trace os deslocamentos, use cones e escadas e toque como animação. O quadro também abre sobre qualquer tela pelo botão “Quadro rápido”.</p>
          </div>
          <button class="btn" id="qd-nova">Nova jogada</button>
        </header>

        <div id="qd-aviso">${ui.aviso ? `<div class="aviso-ok" role="status">${esc(ui.aviso)}</div>` : ''}</div>

        <section class="card qd qd-completo" aria-labelledby="h-qd">
          <div class="card-head">
            <h2 id="h-qd">${ed.titulo ? esc(ed.titulo) : 'Jogada sem título'}</h2>
          </div>
          <div class="qd-linha">
            <div class="qd-col-quadra">
              ${blocoQuadro}
              ${blocoFerr}
              <p class="hint" id="qd-dica">${dica}</p>
            </div>
            <div class="qd-col-lado">
              ${blocoFrames}
              ${blocoOpcoes}
            </div>
          </div>
        </section>

        <section class="card" aria-labelledby="h-det">
          <div class="card-head"><h2 id="h-det">Detalhes da jogada</h2></div>
          <form id="qd-form" novalidate>
            <div class="form-grid">
              <div class="field field-wide"><label class="label" for="qd-titulo">Título</label><input class="input" id="qd-titulo" type="text" maxlength="90" value="${esc(ed.titulo)}" placeholder="Ex.: Saque na zona 5 com cobertura"></div>
              <div class="field"><label class="label" for="qd-tag">Situação de jogo</label>
                <select class="select" id="qd-tag" style="min-width:0">${Object.entries(TAGS).map(([k, n]) => `<option value="${k}" ${k === ed.tag ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
              <div class="field"><label class="label" for="qd-fund">Fundamento principal</label>
                <select class="select" id="qd-fund" style="min-width:0">${Object.values(FUNDAMENTOS).map((f) => `<option value="${f.id}" ${f.id === ed.fundamento ? 'selected' : ''}>${esc(f.nome)}</option>`).join('')}</select></div>
            </div>
            <div class="field"><label class="label" for="qd-desc">Descrição</label>
              <textarea class="input" id="qd-desc" rows="3" maxlength="400" placeholder="Explique a ideia em duas ou três frases.">${esc(ed.desc)}</textarea></div>
            <fieldset class="reg-fund" style="margin-top:12px"><legend class="label">Nomes nas peças (até 4 letras)</legend>
              <div class="qd-nomes">
                ${ed.pecas.map((k) => `<div class="field"><label class="label" for="qd-n-${k}">${k[0] === 'a' ? 'Nosso' : 'Adversário'} ${k.slice(1)}</label><input class="input sm" id="qd-n-${k}" data-nome="${k}" type="text" maxlength="4" value="${esc(ed.nomes[k])}"></div>`).join('')}
              </div>
            </fieldset>
            <p class="form-erro" id="qd-erro" role="alert" hidden></p>
            <div class="actions" style="margin-top:14px">
              <button class="btn btn-primary" type="submit">${ed.id ? 'Salvar alterações' : 'Salvar na biblioteca'}</button>
              ${ed.id ? '<button class="btn" type="button" id="qd-copia">Salvar como cópia</button>' : ''}
            </div>
          </form>
        </section>

        <section class="card" aria-labelledby="h-lib">
          <div class="card-head"><h2 id="h-lib">Biblioteca de jogadas</h2><span class="label num">${plural(lib.length, 'jogada', 'jogadas')}</span></div>
          ${lib.length ? `<div class="qd-lib">${lib.map((j) => `
            <article class="qd-card">
              <div class="qd-card-svg">${svgQuadro(j.frames[0], j, { mini: true, id: `lb${j.id}` })}</div>
              <div class="qd-card-corpo">
                <h3>${esc(j.titulo)}</h3>
                <div class="chips"><span class="chip">${esc(TAGS[j.tag] || 'Outro')}</span><span class="chip">${plural(j.frames.length, 'quadro', 'quadros')}</span></div>
                <div class="actions">
                  <button class="btn btn-sm btn-primary" data-lib-abrir="${j.id}">Abrir</button>
                  <button class="btn btn-sm" data-lib-dup="${j.id}">Duplicar</button>
                  ${ui.confirmaExcluir === j.id
                    ? `<button class="btn btn-sm btn-danger" data-lib-exc-sim="${j.id}">Confirmar exclusão</button><button class="btn btn-sm" data-lib-exc-nao>Manter</button>`
                    : `<button class="link-btn" style="margin:0" data-lib-exc="${j.id}">Excluir</button>`}
                </div>
              </div>
            </article>`).join('')}</div>` : '<p class="vazio">Nenhuma jogada salva ainda.</p>'}
          <p class="hint">As jogadas salvas podem ser marcadas no registro de cada treino.</p>
        </section>`;
    }

    ui.aviso = '';
    root.querySelector('#qd-wrap').innerHTML = svgQuadro(frame(), ed, { id: 'qd', vertical: ui.vertical, sel: ui.sel });
    desenhaFaixa();
    ligar();
  }

  function desenhaFaixa() {
    const faixa = renderRaiz.querySelector('#qd-faixa');
    faixa.innerHTML = ed.frames.map((f, i) => `
      <button class="qd-mini" data-frame="${i}" aria-pressed="${i === ui.atual}" aria-label="Quadro ${i + 1} de ${ed.frames.length}">
        <span class="qd-mini-svg">${svgQuadro(f, ed, { mini: true, id: `mf${i}` })}</span>
        <span class="num">${i + 1}</span>
      </button>`).join('');
    faixa.querySelectorAll('[data-frame]').forEach((b) => b.addEventListener('click', () => { parar(); ui.atual = Number(b.dataset.frame); ui.sel = null; render(); }));
  }

  function render() { if (renderRaiz) tela(renderRaiz); }

  const snapshot = () => copiar({ frames: ed.frames, nomes: ed.nomes, pecas: ed.pecas, fundo: ed.fundo, atual: ui.atual });
  function empilhar() {
    ui.desfazer.push(snapshot());
    if (ui.desfazer.length > 40) ui.desfazer.shift();
    ui.refazer = [];
  }
  function restaurar(s) {
    ed.frames = s.frames; ed.nomes = s.nomes; ed.pecas = s.pecas; ed.fundo = s.fundo;
    ui.atual = Math.min(s.atual, s.frames.length - 1); ui.sel = null;
  }

  function apagarSelecionado() {
    const s = ui.sel;
    if (!s) return;
    empilhar();
    if (s.tipo === 'seta') frame().setas.splice(s.i, 1);
    else if (s.tipo === 'obj') ed.frames.forEach((f) => { f.objs = f.objs.filter((o) => o.id !== s.id); });
    else if (s.tipo === 'peca' && !NUCLEO.includes(s.id)) {
      ed.pecas = ed.pecas.filter((k) => k !== s.id);
      ed.frames.forEach((f) => { delete f.j[s.id]; });
    }
    ui.sel = null;
    render();
  }

  /* ---------- Comportamento ---------- */

  function ligar() {
    const root = renderRaiz;
    const q = (s) => root.querySelector(s);

    q('#qd-nova').addEventListener('click', () => { parar(); ed = nova(); Object.assign(ui, { atual: 0, sel: null, desfazer: [], refazer: [], confirmaExcluir: null, paleta: false }); render(); });
    root.querySelectorAll('[data-ferr]').forEach((b) => b.addEventListener('click', () => { ui.ferr = b.dataset.ferr; ui.sel = null; render(); }));

    q('#qd-desfazer').addEventListener('click', () => { const s = ui.desfazer.pop(); if (!s) return; ui.refazer.push(snapshot()); restaurar(s); render(); });
    q('#qd-refazer').addEventListener('click', () => { const s = ui.refazer.pop(); if (!s) return; ui.desfazer.push(snapshot()); restaurar(s); render(); });
    q('#qd-apagar').addEventListener('click', apagarSelecionado);
    q('#qd-mais').addEventListener('click', () => { ui.paleta = !ui.paleta; q('#qd-paleta').hidden = !ui.paleta; q('#qd-mais').setAttribute('aria-expanded', String(ui.paleta)); });
    const girarObj = q('#qd-girar');
    if (girarObj) girarObj.addEventListener('click', () => {
      empilhar();
      ed.frames.forEach((f) => f.objs.forEach((o) => { if (o.id === ui.sel.id) o.rot = ((o.rot || 0) + 90) % 360; }));
      render();
    });

    root.querySelectorAll('[data-add]').forEach((b) => b.addEventListener('click', () => {
      const [tipo, v] = b.dataset.add.split(':');
      empilhar();
      if (tipo === 'peca') {
        let n = 1; while (ed.pecas.includes(`${v}${n}`)) n++;
        const id = `${v}${n}`;
        ed.pecas.push(id);
        ed.nomes[id] = String(n);
        const base = v === 'a' ? P(3.2 + (n % 4) * 0.7, 3.0 + (n % 3) * 1.0) : P(12.2 - (n % 4) * 0.7, 3.0 + (n % 3) * 1.0);
        ed.frames.forEach((f) => { f.j[id] = { ...base }; });
        ui.sel = { tipo: 'peca', id };
      } else {
        const id = `o${++seqObj}_${Date.now() % 100000}`;
        const n = frame().objs.length;
        ed.frames.forEach((f) => f.objs.push({ id, t: v, x: 4 + (n % 5) * 0.9, y: 3.4 + (n % 3) * 0.9, rot: 0 }));
        ui.sel = { tipo: 'obj', id };
      }
      render();
    }));

    q('#qd-inverter').addEventListener('click', () => {
      empilhar();
      const esp = (p) => { p.x = +(16 - p.x).toFixed(2); };
      ed.frames.forEach((f) => {
        Object.values(f.j).forEach(esp); esp(f.bola);
        f.objs.forEach(esp);
        f.setas.forEach((s) => { s.x1 = +(16 - s.x1).toFixed(2); s.x2 = +(16 - s.x2).toFixed(2); });
      });
      render();
    });
    q('#qd-girar-q').addEventListener('click', () => { ui.vertical = !ui.vertical; render(); });
    q('#qd-fundo').addEventListener('click', () => { empilhar(); ed.fundo = ed.fundo === 'livre' ? 'quadra' : 'livre'; render(); });

    q('#qd-auto').addEventListener('click', () => {
      const ant = ed.frames[ui.atual - 1], atu = frame();
      empilhar();
      ant.setas = ant.setas.filter((x) => !x.auto);
      const mexeu = (a, b) => Math.hypot(b.x - a.x, b.y - a.y) > 0.6;
      ed.pecas.forEach((k) => { if (ant.j[k] && atu.j[k] && mexeu(ant.j[k], atu.j[k])) ant.setas.push({ ...S('desloc', ant.j[k].x, ant.j[k].y, atu.j[k].x, atu.j[k].y), auto: true }); });
      ant.objs.forEach((o) => { const b = atu.objs.find((x) => x.id === o.id); if (b && mexeu(o, b)) ant.setas.push({ ...S('desloc', o.x, o.y, b.x, b.y), auto: true }); });
      if (mexeu(ant.bola, atu.bola)) ant.setas.push({ ...S('bola', ant.bola.x, ant.bola.y, atu.bola.x, atu.bola.y), auto: true });
      ui.aviso = 'Setas criadas no quadro anterior.';
      render();
    });

    /* quadros */
    q('#qd-ant').addEventListener('click', () => { ui.atual--; ui.sel = null; render(); });
    q('#qd-prox').addEventListener('click', () => { ui.atual++; ui.sel = null; render(); });
    q('#qd-add').addEventListener('click', () => {
      empilhar();
      const f = frame();
      const n = F(copiar(f.j), copiar(f.bola), [], '');
      n.objs = copiar(f.objs);
      ed.frames.splice(ui.atual + 1, 0, n);
      ui.atual++; ui.sel = null;
      render();
      q('#qd-legenda').focus();
    });
    q('#qd-del').addEventListener('click', () => { empilhar(); ed.frames.splice(ui.atual, 1); ui.atual = Math.max(0, ui.atual - 1); ui.sel = null; render(); });
    q('#qd-legenda').addEventListener('input', (e) => { frame().legenda = e.target.value; });

    /* animação */
    q('#qd-tocar').addEventListener('click', () => {
      if (ui.tocando) { parar(); render(); return; }
      ui.tocando = true; ui.sel = null; ui.atual = 0;
      render();
      let i = 0, t0 = null;
      const passo = (ts) => {
        if (!ui.tocando || !root.isConnected) { ui.tocando = false; return; }
        if (t0 == null) t0 = ts;
        const t = ts - t0;
        const k = Math.min(1, Math.max(0, (t - DURACAO.pausa) / DURACAO.move));
        const suave = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        const a = ed.frames[i], b = ed.frames[i + 1];
        const cur = root.querySelector('#qd-wrap');
        if (!cur) { ui.tocando = false; return; }
        cur.innerHTML = svgQuadro(mistura(a, b, suave), ed, { id: 'qd', vertical: ui.vertical });
        const leg = root.querySelector('#qd-legenda'); if (leg) leg.value = a.legenda;
        root.querySelectorAll('.qd-mini').forEach((m, n) => m.setAttribute('aria-pressed', String(n === i)));
        const pos = root.querySelector('#qd-pos'); if (pos) pos.textContent = `Quadro ${i + 1} de ${ed.frames.length}`;
        if (t >= DURACAO.pausa + DURACAO.move) {
          i++; t0 = null;
          if (i >= ed.frames.length - 1) { ui.tocando = false; ui.atual = ed.frames.length - 1; render(); return; }
        }
        requestAnimationFrame(passo);
      };
      requestAnimationFrame(passo);
    });

    /* quadra: arrastar peças e traçar setas */
    const wrap = q('#qd-wrap');
    const ponto = (e) => {
      const svg = wrap.querySelector('svg');
      const mundo = svg.querySelector('#qd-mundo');
      const pt = svg.createSVGPoint();
      pt.x = e.clientX; pt.y = e.clientY;
      const r = pt.matrixTransform(mundo.getScreenCTM().inverse());
      return { x: r.x, y: r.y };
    };
    const posDe = (k) => {
      if (k === 'bola') return frame().bola;
      if (k.startsWith('obj:')) return frame().objs.find((o) => o.id === k.slice(4));
      return frame().j[k];
    };
    const marcarSel = () => {
      wrap.querySelectorAll('.sel').forEach((el) => el.classList.remove('sel'));
      if (!ui.sel) return;
      const alvo = ui.sel.tipo === 'seta' ? wrap.querySelector(`[data-seta="${ui.sel.i}"]`)
        : wrap.querySelector(`[data-pec="${ui.sel.tipo === 'obj' ? `obj:${ui.sel.id}` : ui.sel.id}"]`);
      if (alvo) alvo.classList.add('sel');
    };
    marcarSel();
    let arrasto = null;
    let traco = null;

    wrap.addEventListener('pointerdown', (e) => {
      if (ui.tocando) return;
      const p = ponto(e);
      if (ui.ferr === 'mover') {
        const peca = e.target.closest('[data-pec]');
        const seta = e.target.closest('[data-seta]');
        if (peca) {
          const k = peca.dataset.pec;
          const pos = posDe(k);
          ui.sel = k === 'bola' ? null : k.startsWith('obj:') ? { tipo: 'obj', id: k.slice(4) } : { tipo: 'peca', id: k };
          arrasto = { k, dx: pos.x - p.x, dy: pos.y - p.y, antes: snapshot(), mexeu: false, el: peca };
          wrap.setPointerCapture(e.pointerId);
          marcarSel();
          e.preventDefault();
        } else if (seta) {
          ui.sel = { tipo: 'seta', i: Number(seta.dataset.seta) };
          marcarSel();
          q('#qd-apagar').disabled = false;
        } else {
          ui.sel = null; marcarSel(); q('#qd-apagar').disabled = true;
        }
      } else {
        let ini = p, melhor = 0.95;
        const alvos = [...ed.pecas.map((k) => posDe(k)), frame().bola, ...frame().objs];
        alvos.forEach((pos) => { const d = Math.hypot(pos.x - p.x, pos.y - p.y); if (d < melhor) { melhor = d; ini = { x: pos.x, y: pos.y }; } });
        const mundo = wrap.querySelector('#qd-mundo');
        const linha = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        const est = ESTILO_SETA[ui.ferr];
        linha.setAttribute('x1', ini.x); linha.setAttribute('y1', ini.y); linha.setAttribute('x2', ini.x); linha.setAttribute('y2', ini.y);
        linha.setAttribute('style', `stroke:var(${est.cor});stroke-width:${est.w};stroke-linecap:round;opacity:.7;pointer-events:none`);
        if (est.dash) linha.setAttribute('stroke-dasharray', est.dash);
        mundo.appendChild(linha);
        traco = { ini, linha };
        wrap.setPointerCapture(e.pointerId);
        e.preventDefault();
      }
    });

    wrap.addEventListener('pointermove', (e) => {
      if (arrasto) {
        const p = ponto(e);
        const pos = posDe(arrasto.k);
        pos.x = clamp(p.x + arrasto.dx, LIM.x0, LIM.x1);
        pos.y = clamp(p.y + arrasto.dy, LIM.y0, LIM.y1);
        arrasto.mexeu = true;
        arrasto.el.setAttribute('transform', `translate(${pos.x} ${pos.y}) rotate(${arrasto.el.dataset.rot || 0})`);
      } else if (traco) {
        const p = ponto(e);
        traco.linha.setAttribute('x2', p.x); traco.linha.setAttribute('y2', p.y);
      }
    });

    wrap.addEventListener('pointerup', (e) => {
      if (arrasto) {
        if (arrasto.mexeu) { ui.desfazer.push(arrasto.antes); ui.refazer = []; if (ui.desfazer.length > 40) ui.desfazer.shift(); }
        arrasto = null;
        render();
      } else if (traco) {
        const p = ponto(e);
        traco.linha.remove();
        if (Math.hypot(p.x - traco.ini.x, p.y - traco.ini.y) >= 0.6) {
          empilhar();
          frame().setas.push(S(ui.ferr, +traco.ini.x.toFixed(2), +traco.ini.y.toFixed(2), +clamp(p.x, LIM.x0, LIM.x1).toFixed(2), +clamp(p.y, LIM.y0, LIM.y1).toFixed(2)));
          ui.sel = { tipo: 'seta', i: frame().setas.length - 1 };
          render();
        }
        traco = null;
      }
    });
    wrap.addEventListener('pointercancel', () => { if (traco) { traco.linha.remove(); traco = null; } arrasto = null; render(); });

    wrap.addEventListener('keydown', (e) => {
      const peca = e.target.closest('[data-pec]');
      if (!peca || ui.tocando) return;
      const passo = e.shiftKey ? 1 : 0.25;
      const d = { ArrowLeft: [-passo, 0], ArrowRight: [passo, 0], ArrowUp: [0, -passo], ArrowDown: [0, passo] }[e.key];
      if (!d) return;
      e.preventDefault();
      empilhar();
      const k = peca.dataset.pec;
      const pos = posDe(k);
      pos.x = clamp(pos.x + d[0], LIM.x0, LIM.x1); pos.y = clamp(pos.y + d[1], LIM.y0, LIM.y1);
      render();
      const novo = renderRaiz.querySelector(`[data-pec="${k}"]`); if (novo) novo.focus();
    });

    /* título e salvamento */
    const titulo = q('#qd-titulo');
    titulo.addEventListener('input', (e) => { ed.titulo = e.target.value; const h = q('#h-qd'); if (h) h.textContent = ed.titulo || 'Jogada sem título'; });

    const salvar = (copia) => {
      const erro = q('#qd-erro');
      if (!ed.titulo.trim()) {
        if (erro) { erro.textContent = 'Dê um título à jogada antes de salvar.'; erro.hidden = false; }
        else { ui.aviso = ''; q('#qd-aviso').innerHTML = '<div class="form-erro" role="alert">Dê um título à jogada antes de salvar.</div>'; }
        titulo.focus();
        return;
      }
      const registro = copiar({ ...ed, titulo: ed.titulo.trim() });
      if (copia || !ed.id) { registro.id = `j${++seq}`; lib.push(registro); }
      else { const i = lib.findIndex((j) => j.id === ed.id); lib[i] = registro; }
      ed.id = registro.id;
      gravar();
      window.dispatchEvent(new CustomEvent('ft:jogada-salva', { detail: { id: registro.id, titulo: registro.titulo } }));
      ui.aviso = copia ? 'Cópia salva na biblioteca.' : 'Jogada salva na biblioteca.';
      render();
    };
    const sr = q('#qd-salvar-rapido'); if (sr) sr.addEventListener('click', () => salvar(false));

    const form = q('#qd-form');
    if (form) {
      q('#qd-tag').addEventListener('change', (e) => { ed.tag = e.target.value; });
      q('#qd-fund').addEventListener('change', (e) => { ed.fundamento = e.target.value; });
      q('#qd-desc').addEventListener('input', (e) => { ed.desc = e.target.value; });
      root.querySelectorAll('[data-nome]').forEach((i) => i.addEventListener('input', () => {
        ed.nomes[i.dataset.nome] = i.value.trim() || '?';
        q('#qd-wrap').innerHTML = svgQuadro(frame(), ed, { id: 'qd', vertical: ui.vertical, sel: ui.sel });
        q('#qd-faixa').querySelectorAll('.qd-mini-svg').forEach((el, n) => { el.innerHTML = svgQuadro(ed.frames[n], ed, { mini: true, id: `mf${n}` }); });
      }));
      form.addEventListener('submit', (e) => { e.preventDefault(); salvar(false); });
      const cp = q('#qd-copia'); if (cp) cp.addEventListener('click', () => salvar(true));
    }

    /* biblioteca */
    const abrir = (id) => {
      parar();
      ed = normal(copiar(lib.find((j) => j.id === id)));
      Object.assign(ui, { atual: 0, sel: null, desfazer: [], refazer: [], confirmaExcluir: null, aviso: '' });
      render();
    };
    const sel = q('#qd-lib-sel'); if (sel) sel.addEventListener('change', () => { if (sel.value) abrir(sel.value); });
    root.querySelectorAll('[data-lib-abrir]').forEach((b) => b.addEventListener('click', () => { abrir(b.dataset.libAbrir); window.scrollTo({ top: 0, behavior: 'smooth' }); }));
    root.querySelectorAll('[data-lib-dup]').forEach((b) => b.addEventListener('click', () => {
      const j = copiar(lib.find((x) => x.id === b.dataset.libDup));
      j.id = `j${++seq}`; j.titulo = `${j.titulo} (cópia)`;
      lib.push(j); gravar(); ui.aviso = 'Jogada duplicada.'; render();
    }));
    root.querySelectorAll('[data-lib-exc]').forEach((b) => b.addEventListener('click', () => { ui.confirmaExcluir = b.dataset.libExc; render(); }));
    root.querySelectorAll('[data-lib-exc-sim]').forEach((b) => b.addEventListener('click', () => {
      lib = lib.filter((j) => j.id !== b.dataset.libExcSim);
      if (ed.id === b.dataset.libExcSim) ed.id = null;
      ui.confirmaExcluir = null; gravar(); ui.aviso = 'Jogada excluída.'; render();
    }));
    root.querySelectorAll('[data-lib-exc-nao]').forEach((b) => b.addEventListener('click', () => { ui.confirmaExcluir = null; render(); }));
  }

  // Delete apaga o item selecionado, quando o foco não está num campo de texto.
  document.addEventListener('keydown', (e) => {
    if (!ui.ativo || !renderRaiz || !renderRaiz.isConnected || !ui.sel) return;
    if ((e.key === 'Delete' || e.key === 'Backspace') && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) {
      e.preventDefault();
      apagarSelecionado();
    }
  });

  window.Farol.quadro = {
    listar: () => lib.map((j) => ({ id: j.id, titulo: j.titulo, tag: j.tag })),
    obter: (id) => lib.find((j) => j.id === id) || null,
    mini: (j) => svgQuadro(j.frames[0], j, { mini: true, id: `x${j.id}` }),
    // Monta o quadro dentro de qualquer elemento (a gaveta usa o modo "painel").
    montar: (el, m) => { parar(); tela(el, m); },
    desmontar: () => { parar(); if (renderRaiz && !renderRaiz.isConnected) renderRaiz = null; },
  };
  window.Farol.views = window.Farol.views || {};
  window.Farol.views['treino-quadro'] = (root) => { window.Farol.gaveta && window.Farol.gaveta.fechar(); parar(); tela(root, 'completo'); };
})();
