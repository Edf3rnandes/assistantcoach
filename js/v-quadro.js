/* Quadro da temporada: a onda de intensidade, as semanas na ordem dos dias e, embaixo, o detalhe de cada dia
   (treino de quadra e treino físico) para o técnico ajustar. Serve para o computador e para o celular. */
(function (AC) {
  const { h, svg, pintar, chip, dm, plural, milhar, num } = AC.ui;
  const { calc, cat, store } = AC;
  const S = () => store.e;

  const DIA_NOME = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  const DIA_ABR = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const INT_ORDEM = ['leve', 'media', 'alta'];
  const INT_CURTA = { leve: 'Leve', media: 'Mod.', alta: 'Alta' };
  const COR_GRUPO = { K1: '#ffb347', K2: '#4fc3f7', N: '#aab4bd' };
  const COR_FUND = { saque: '#4fc3f7', recepcao: '#ffc93c', levantamento: '#ff9a3c', ataque: '#ff5d5d', bloqueio: '#5b8cff', defesa: '#2fd0b0', transicao: '#b08cff' };
  const COR_COMP = { A: '#e5484d', B: '#f2a900', C: '#8d98a2' };
  const COR_FIS = '#e879f9';
  const JANELA = 8;
  /* Que exercícios da biblioteca servem para cada capacidade física. */
  const CATEGORIAS_DA_CAPACIDADE = {
    'Força': ['Força'], 'Potência e saltos': ['Potência e saltos'], 'Velocidade e agilidade': ['Velocidade e agilidade'],
    'Resistência aeróbia': ['Condicionamento'], 'Resistência intermitente': ['Condicionamento'], 'Core e estabilidade': ['Core e estabilidade'],
    'Prevenção de lesões': ['Prevenção de lesões'], 'Mobilidade': ['Mobilidade', 'Aquecimento'], 'Recuperação': ['Mobilidade'],
  };

  const dow = (d) => new Date(calc.ms(d)).getUTCDay();
  const ordemDia = (d) => (d + 6) % 7;
  const nomeTipo = (id) => (cat.tipoTreino(id) || { nome: id }).nome;
  const corFund = (id) => COR_FUND[id] || '#aab4bd';
  const mesCurto = (d) => new Date(calc.ms(d)).toLocaleDateString('pt-BR', { month: 'short', timeZone: 'UTC' }).replace('.', '');
  const css = (el, texto) => { el.style.cssText = texto; return el; };
  const clone = (x) => JSON.parse(JSON.stringify(x));

  /* Nome do treino: os fundamentos do dia, ou o tipo quando não houver. */
  function tituloDe(x) {
    if (x.tipo === 'competicao') return `Competição: ${x.titulo}`;
    if (x.fundamentos.length) return x.fundamentos.map((f) => cat.fundamento(f.fundamento).nome).join(' + ');
    return nomeTipo(x.tipo);
  }

  /* Curva suave por uma lista de pontos [x, y]. */
  function curva(pts) {
    if (pts.length < 2) return '';
    let d = `M${pts[0][0].toFixed(2)},${pts[0][1].toFixed(2)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += ` C${c1[0].toFixed(2)},${c1[1].toFixed(2)} ${c2[0].toFixed(2)},${c2[1].toFixed(2)} ${p2[0].toFixed(2)},${p2[1].toFixed(2)}`;
    }
    return d;
  }

  function quadro(perio, hoje) {
    const raiz = h('div', { class: 'quadro' });
    const segHoje = calc.segundaDe(hoje);
    const cal0 = calc.calendarioCarga(perio);
    if (!cal0.length) return raiz;
    const idxHoje = cal0.findIndex((w) => w.seg === segHoje);
    let sel = idxHoje >= 0 ? idxHoje : hoje < cal0[0].seg ? 0 : cal0.length - 1;
    let janela = Math.floor(sel / JANELA);
    let diaAberto = null;   // null: escolher sozinho; false: tudo fechado; ou a data aberta

    const gravar = () => store.salvar();
    /* Ajustes do dia ficam em perio.dias[data]; "fn" recebe o que já existe e devolve o novo. */
    const ajustar = (data, fn) => {
      perio.dias = perio.dias || {};
      const novo = fn(clone(perio.dias[data] || {}));
      if (Object.keys(novo).length) perio.dias[data] = novo; else delete perio.dias[data];
      gravar(); desenhar();
    };
    const ajustarFis = (data, fn) => ajustar(data, (o) => { o.fisico = fn(o.fisico || {}); return o; });

    const treinosDe = (data) => S().treinos.filter((t) => t.data === data);
    const estadoDoDia = (data) => {
      const ts = treinosDe(data);
      if (ts.some((t) => t.feito)) return { rotulo: 'Feito', cls: 'feito' };
      if (data < hoje) return { rotulo: 'Sem registro', cls: 'sem' };
      if (data === hoje) return { rotulo: 'Hoje', cls: 'hoje' };
      return { rotulo: 'Previsto', cls: '' };
    };
    const abrirPadrao = (sessoes) => {
      const treino = sessoes.filter((x) => x.tipo !== 'competicao');
      const prox = treino.find((x) => x.data >= hoje && !treinosDe(x.data).some((t) => t.feito));
      return (prox || treino[0] || { data: null }).data;
    };

    function desenhar() {
      const plano = calc.planoDeSessoes(perio);
      const cal = calc.calendarioCarga(perio);
      const n = cal.length;
      sel = Math.max(0, Math.min(n - 1, sel));
      const totalJanelas = Math.ceil(n / JANELA);
      janela = Math.max(0, Math.min(totalJanelas - 1, janela));
      const a = janela * JANELA, b = Math.min(n - 1, a + JANELA - 1);
      const semanas = cal.slice(a, b + 1), nj = semanas.length;
      const w = cal[sel];
      const sessoesDe = (wk) => (plano[wk.seg] || { sessoes: [] }).sessoes;
      const sessoes = sessoesDe(w);
      if (diaAberto === null || (diaAberto && !sessoes.some((x) => x.data === diaAberto && x.tipo !== 'competicao'))) diaAberto = abrirPadrao(sessoes) || false;
      const irSemana = (i, aberto) => () => {
        sel = i; janela = Math.floor(i / JANELA); diaAberto = aberto === undefined ? null : aberto; desenhar();
        if (aberto) requestAnimationFrame(() => { const el = raiz.querySelector('.qd-dia.aberto'); if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); });
      };
      const mudarJanela = (d) => () => { const j = Math.max(0, Math.min(totalJanelas - 1, janela + d)); if (j === janela) return; janela = j; sel = Math.max(j * JANELA, Math.min(Math.min(n - 1, j * JANELA + JANELA - 1), sel)); diaAberto = null; desenhar(); };

      /* Dias de treino da periodização, na ordem da semana, e competições fora desses dias */
      const dias = calc.diasOrdenados(perio.diasTreino);
      const foraDosDias = (wk) => (wk.eventos || []).filter((c) => !dias.includes(dow(c.data)));
      const temFds = semanas.some((wk) => foraDosDias(wk).length);

      /* ----- Onda ----- */
      const X = (i, f) => ((i - a + f) / nj) * 100;
      const Y = (p) => 86 - ((p - 1) / 8) * 70;
      const pontos = [], fisicos = [], faixas = [];
      let trecho = [], trechos = [];
      semanas.forEach((wk, k) => {
        const i = a + k;
        const itens = sessoesDe(wk).map((x) => ({ data: x.data, p: x.tipo === 'competicao' ? 9 : x.pse, cor: x.tipo === 'competicao' ? COR_COMP[x.competicao.prioridade] || COR_COMP.C : COR_GRUPO[x.grupo] || COR_GRUPO.N, comp: x.tipo === 'competicao', fis: x.fisico && x.fisico.on }));
        foraDosDias(wk).forEach((c) => itens.push({ data: c.data, p: 9, cor: COR_COMP[c.prioridade] || COR_COMP.C, comp: true }));
        itens.sort((p, q) => p.data.localeCompare(q.data));
        if (!itens.length && trecho.length) { trechos.push(trecho); trecho = []; }
        itens.forEach((it) => {
          const x = X(i, (ordemDia(dow(it.data)) + 0.5) / 7), y = Y(it.p);
          trecho.push([x, y]);
          pontos.push({ x, y, cor: it.cor, comp: it.comp, sel: i === sel });
          if (it.fis) fisicos.push({ x, y });
        });
        (wk.eventos || []).forEach((c) => faixas.push({ x: X(i, ordemDia(dow(c.data)) / 7), w: 100 / nj / 7, cor: COR_COMP[c.prioridade] || COR_COMP.C }));
      });
      if (trecho.length) trechos.push(trecho);
      const linha = trechos.filter((t) => t.length > 1).map(curva).join(' ');
      const vol = semanas.map((wk, k) => (wk.fator == null ? null : [X(a + k, 0.5), 92 - Math.min(1.15, wk.fator) * 55])).filter(Boolean);
      const area = vol.length > 1 ? `${curva(vol)} L${vol[vol.length - 1][0].toFixed(2)},92 L${vol[0][0].toFixed(2)},92 Z` : '';

      const onda = h('div', { class: 'qd-onda', role: 'group', 'aria-label': `Intensidade das semanas ${a + 1} a ${b + 1}` });
      const s = svg('svg', { viewBox: '0 0 100 100', preserveAspectRatio: 'none', 'aria-hidden': 'true' });
      faixas.forEach((f) => s.append(svg('rect', { x: f.x, y: 0, width: f.w, height: 100, fill: f.cor, opacity: 0.28 })));
      s.append(svg('rect', { x: X(sel, 0), y: 0, width: 100 / nj, height: 100, fill: 'rgba(255,255,255,.12)' }));
      [Y(3), Y(5.5), Y(8)].forEach((y) => s.append(svg('line', { x1: 0, x2: 100, y1: y, y2: y, class: 'qd-grade-linha' })));
      if (area) s.append(svg('path', { d: area, class: 'qd-area' }));
      if (linha) s.append(svg('path', { d: linha, class: 'qd-linha' }));
      onda.append(s);
      [['ALTA', Y(8)], ['LEVE', Y(3)]].forEach(([t, y]) => onda.append(css(h('span', { class: 'qd-nivel' }, t), `top:${y}%`)));
      pontos.forEach((p) => onda.append(css(h('span', { class: 'qd-ponto' + (p.comp ? ' comp' : '') }), `left:${p.x}%;top:${p.y}%;background:${p.cor}`)));
      fisicos.forEach((p) => onda.append(css(h('span', { class: 'qd-fisq' }), `left:${p.x}%;top:${p.y}%`)));
      semanas.forEach((wk, k) => onda.append(css(h('button', { class: 'qd-col', type: 'button', 'aria-label': `Semana ${a + k + 1}, ${dm(wk.seg)}`, onclick: irSemana(a + k) }), `left:${(k / nj) * 100}%;width:${100 / nj}%`)));

      /* ----- Botões das semanas ----- */
      const faixaSemanas = h('div', { class: 'qd-semanas' }, semanas.map((wk, k) => {
        const i = a + k, f = wk.fase ? cat.fase(wk.fase) : null;
        const btn = h('button', { class: 'qd-sem' + (i === sel ? ' on' : '') + (wk.seg === segHoje ? ' hoje' : ''), type: 'button', 'aria-label': `Semana ${i + 1}, ${dm(wk.seg)}`, 'aria-pressed': String(i === sel), onclick: irSemana(i) },
          h('b', null, `S${i + 1}`), h('span', null, dm(wk.seg)),
          css(h('i', { class: 'qd-fase' }), `background:${f ? f.cor : 'transparent'}`),
          (wk.eventos || []).map((c) => css(h('em', { class: 'qd-copa' }, c.prioridade), `background:${COR_COMP[c.prioridade] || COR_COMP.C}`)));
        css(btn, `left:${(k / nj) * 100}%;width:${100 / nj}%`);
        return btn;
      }));

      /* ----- Grade com os dias em ordem (computador) ----- */
      const grade = h('div', { class: 'qd-grade', style: { '--n': nj } });
      const celula = (wk, i, dowDia) => {
        const x = sessoesDe(wk).find((s) => s.dow === dowDia);
        if (!x) return h('div', { class: 'qd-vazio' });
        const comp = x.tipo === 'competicao';
        const listras = comp ? [COR_COMP[x.competicao.prioridade] || COR_COMP.C] : (x.fundamentos.length ? x.fundamentos.map((f) => corFund(f.fundamento)) : [COR_GRUPO.N]);
        const fis = x.fisico && x.fisico.on ? h('span', { class: 'qd-bfis' }, `Físico · ${x.fisico.capacidade} · ${x.fisico.duracao} min`) : h('span', { class: 'qd-bfis vazio' }, comp ? '' : 'sem físico');
        const btn = h('button', { class: 'qd-bloco' + (i === sel && x.data === diaAberto ? ' sel' : '') + (comp ? ' comp' : ''), type: 'button', style: { '--c': comp ? COR_COMP[x.competicao.prioridade] || COR_COMP.C : COR_GRUPO[x.grupo] || COR_GRUPO.N }, onclick: irSemana(i, comp ? null : x.data) },
          h('span', { class: 'qd-listra' }, listras.map((c) => css(h('i'), `background:${c}`))),
          h('b', null, tituloDe(x)),
          h('small', null, comp ? h('span', null, 'Competição') : [h('span', null, x.grupo === 'N' || !x.grupo ? 'Geral' : x.grupo), h('span', { class: 'qd-int ' + x.intensidade }, INT_CURTA[x.intensidade]), h('span', null, `${x.duracao} min`)]),
          fis);
        return btn;
      };
      dias.forEach((d) => {
        grade.append(h('div', { class: 'qd-rot' }, h('b', null, DIA_NOME[d])));
        semanas.forEach((wk, k) => grade.append(celula(wk, a + k, d)));
      });
      if (temFds) {
        grade.append(h('div', { class: 'qd-rot' }, h('b', null, 'Outros dias'), h('span', null, 'competições')));
        semanas.forEach((wk, k) => {
          const cs = foraDosDias(wk);
          grade.append(cs.length ? h('button', { class: 'qd-bloco comp', type: 'button', style: { '--c': COR_COMP[cs[0].prioridade] || COR_COMP.C }, onclick: irSemana(a + k, null) },
            h('span', { class: 'qd-listra' }, css(h('i'), `background:${COR_COMP[cs[0].prioridade] || COR_COMP.C}`)), h('b', null, cs.map((c) => c.nome).join(' + ')), h('small', null, h('span', null, `${DIA_ABR[dow(cs[0].data)]} ${dm(cs[0].data)}`), h('span', null, `prioridade ${cs[0].prioridade}`))) : h('div', { class: 'qd-vazio' }));
        });
      }
      /* A seleção da semana inteira também aparece na grade */
      const colSel = h('div', { class: 'qd-sel-col' });
      css(colSel, `left:calc(var(--rot) + (100% - var(--rot)) * ${sel - a} / ${nj});width:calc((100% - var(--rot)) / ${nj})`);
      const gradeBox = h('div', { class: 'qd-gradebox' }, dias.length ? [colSel, grade] : h('p', { class: 'dica' }, 'Escolha os dias de treino da equipe para ver os treinos de cada semana.'));

      /* ----- Painel da semana ----- */
      const fase = w.fase ? cat.fase(w.fase) : null;
      const treinoSess = sessoes.filter((x) => x.tipo !== 'competicao');
      const kk = (g) => (treinoSess.length ? Math.round((treinoSess.filter((x) => x.grupo === g).length / treinoSess.length) * 100) : 0);
      const cQuadra = plano[w.seg] && plano[w.seg].carga, cFis = calc.cargaFisica(sessoes);
      const prox = (perio.competicoes || []).filter((c) => c.situacao !== 'cancelada' && c.data >= calc.addDias(w.seg, w.eventos.length ? 7 : 0)).sort((p, q) => p.data.localeCompare(q.data))[0];
      const barra = (pct, cor) => h('span', { class: 'qd-barra' }, css(h('i'), `width:${pct}%;background:${cor}`));
      const painel = h('section', { class: 'card qd-painel-semana' },
        h('div', { class: 'qd-s-topo' },
          h('span', { class: 'qd-s-num' }, `S${sel + 1}`),
          h('div', null, h('strong', null, `${dm(w.seg)} a ${dm(calc.addDias(w.seg, 6))}`),
            h('div', { class: 'chips' }, fase ? chip(fase.nome, { cor: fase.cor, pequeno: true }) : chip('sem mesociclo', { pequeno: true }), w.seg === segHoje ? chip('hoje', { pequeno: true, ativo: true }) : null))),
        w.meso ? h('a', { class: 'muted', href: `#/periodizacao/${perio.id}/${w.meso.id}` }, w.meso.nome) : null,
        w.fator != null ? h('div', { class: 'qd-linha-barra' }, h('span', null, 'Volume'), barra(Math.min(100, Math.round(w.fator * 100)), fase ? fase.cor : 'var(--brand)'), h('b', null, `${Math.round(w.fator * 100)}%`)) : null,
        treinoSess.length ? h('div', { class: 'qd-duas' },
          h('div', { class: 'qd-linha-barra' }, h('span', null, 'K1'), barra(kk('K1'), COR_GRUPO.K1), h('b', null, `${kk('K1')}%`)),
          h('div', { class: 'qd-linha-barra' }, h('span', null, 'K2'), barra(kk('K2'), COR_GRUPO.K2), h('b', null, `${kk('K2')}%`))) : null,
        h('div', { class: 'qd-numeros' },
          h('div', null, h('b', null, cQuadra ? milhar(cQuadra) : '—'), h('span', null, 'carga de quadra')),
          h('div', null, h('b', null, cFis ? milhar(cFis) : '—'), h('span', null, 'carga do físico')),
          h('div', null, h('b', null, w.pse == null ? '—' : w.pse), h('span', null, 'PSE alvo da fase'))),
        w.intencao ? h('p', { class: 'dica' }, w.intencao) : null,
        (w.eventos || []).map((c) => h('div', { class: 'qd-comp' }, css(h('b', null, c.prioridade), `background:${COR_COMP[c.prioridade] || COR_COMP.C}`), h('span', null, `${c.nome} · ${dm(c.data)}${c.situacao === 'provisoria' ? ' (a confirmar)' : ''}`))),
        prox ? h('p', { class: 'dica' }, `${w.eventos.length ? 'Depois: ' : 'Próxima: '}${prox.nome} (${prox.prioridade}) em ${plural(calc.diffDias(w.seg, calc.segundaDe(prox.data)) / 7, 'semana', 'semanas')}, ${dm(prox.data)}.`) : null);

      /* ----- Dias da semana (cartões que abrem para detalhar) ----- */
      const lista = h('section', { class: 'qd-dias' },
        h('div', { class: 'titulo-linha' }, h('h2', null, `Dias da semana ${sel + 1}`), h('span', { class: 'dica' }, sessoes.some((x) => x.tipo !== 'competicao') ? 'Toque num dia para detalhar' : '')));
      if (!sessoes.length && !foraDosDias(w).length) {
        lista.append(h('p', { class: 'dica' }, !w.meso ? 'Esta semana está fora dos mesociclos.' : !dias.length ? 'Escolha os dias de treino da equipe para ver os treinos desta semana.' : 'Sem treinos previstos nesta semana.'));
      }
      sessoes.forEach((x) => lista.append(cartaoDia(x, w)));
      foraDosDias(w).forEach((c) => lista.append(h('div', { class: 'qd-dia comp' }, h('div', { class: 'qd-dia-topo' }, h('span', { class: 'qd-dia-nome' }, `${DIA_NOME[dow(c.data)]} · ${dm(c.data)}`), css(h('span', { class: 'qd-k' }, c.prioridade), `background:${COR_COMP[c.prioridade] || COR_COMP.C};color:#fff`)),
        h('div', { class: 'qd-dia-foco' }, c.nome), h('div', { class: 'dica' }, 'Dia de competição, sem treino da equipe.'))));

      /* ----- Montagem ----- */
      const meses = `${mesCurto(semanas[0].seg)}${mesCurto(semanas[0].seg) !== mesCurto(calc.addDias(semanas[nj - 1].seg, 6)) ? ' a ' + mesCurto(calc.addDias(semanas[nj - 1].seg, 6)) : ''}`;
      const painelOnda = h('div', { class: 'qd-painel' },
        h('div', { class: 'qd-nav' },
          h('button', { class: 'qd-seta', type: 'button', 'aria-label': 'Semanas anteriores', disabled: janela === 0, onclick: mudarJanela(-1) }, '‹'),
          h('div', { class: 'qd-nav-meio' }, h('b', null, `Semanas ${a + 1} a ${b + 1}`), h('span', null, meses)),
          h('button', { class: 'qd-seta', type: 'button', 'aria-label': 'Próximas semanas', disabled: janela >= totalJanelas - 1, onclick: mudarJanela(1) }, '›')),
        onda, faixaSemanas, gradeBox,
        h('div', { class: 'qd-leg' },
          h('span', null, css(h('i'), `background:${COR_GRUPO.K1}`), 'K1 side-out'), h('span', null, css(h('i'), `background:${COR_GRUPO.K2}`), 'K2 saque e defesa'),
          h('span', null, css(h('i', { class: 'q' }), `background:${COR_FIS}`), 'físico'), h('span', null, 'A onda mostra a intensidade (PSE alvo) de cada dia de treino.')));
      pintar(raiz, painelOnda, painel, lista);
    }

    /* Cartão de um dia: o resumo fica sempre visível e, tocando, abre o detalhe para editar. */
    function cartaoDia(x, w) {
      const comp = x.tipo === 'competicao';
      const aberto = !comp && x.data === diaAberto;
      const est = estadoDoDia(x.data);
      const it = cat.INTENSIDADES[x.intensidade];
      const listras = comp ? [COR_COMP[x.competicao.prioridade] || COR_COMP.C] : (x.fundamentos.length ? x.fundamentos.map((f) => corFund(f.fundamento)) : [COR_GRUPO.N]);
      const cabeca = h(comp ? 'div' : 'button', { class: 'qd-dia-cab', type: comp ? null : 'button', 'aria-expanded': comp ? null : String(aberto), onclick: comp ? null : () => { diaAberto = aberto ? false : x.data; desenhar(); } },
        h('div', { class: 'qd-dia-topo' },
          h('span', { class: 'qd-dia-nome' }, `${DIA_ABR[x.dow]} · ${dm(x.data)}`),
          h('span', { class: 'qd-est ' + est.cls }, est.rotulo),
          h('span', { class: 'esp' }),
          x.grupo && !comp ? css(h('span', { class: 'qd-k' }, x.grupo === 'N' ? 'Geral' : x.grupo), `background:${COR_GRUPO[x.grupo]}`) : null,
          comp ? css(h('span', { class: 'qd-k' }, x.competicao.prioridade), `background:${COR_COMP[x.competicao.prioridade] || COR_COMP.C};color:#fff`) : chip(it.nome, { cor: it.cor, pequeno: true }),
          comp ? null : h('span', { class: 'qd-seta-dia', 'aria-hidden': 'true' }, aberto ? '▴' : '▾')),
        h('span', { class: 'qd-faixa' }, listras.map((c) => css(h('i'), `background:${c}`))),
        h('div', { class: 'qd-dia-foco' }, tituloDe(x)),
        !comp && x.fundamentos.length ? h('div', { class: 'chips' }, x.fundamentos.map((f) => h('span', { class: 'qd-fchip' }, css(h('i'), `background:${corFund(f.fundamento)}`), cat.fundamento(f.fundamento).nome + (f.tipos.length && f.tipos.length <= 2 ? ': ' + f.tipos.join(', ') : '')))) : null,
        comp ? h('div', { class: 'dica' }, 'Dia de competição: sem treino previsto.') : h('div', { class: 'dica' }, `${x.duracao} min · PSE alvo ${x.pse}${x.motivo ? ' · ' + x.motivo : ''}${x.ajustado ? ' · ajustado' : ''}`),
        comp ? null : (x.fisico.on
          ? h('div', { class: 'qd-fis-linha' }, h('b', null, `Físico · ${x.fisico.capacidade}`), h('span', null, `${x.fisico.duracao} min · ${cat.INTENSIDADES[x.fisico.intensidade].nome.toLowerCase()}${x.fisico.exercicios.length ? ' · ' + plural(x.fisico.exercicios.length, 'exercício', 'exercícios') : ' · escolher exercícios'}`))
          : h('div', { class: 'qd-fis-linha vazio' }, h('b', null, 'Sem físico neste dia'), h('span', null, 'Toque para adicionar'))));
      return h('div', { class: 'qd-dia' + (aberto ? ' aberto' : '') + (comp ? ' comp' : '') }, cabeca, aberto ? editor(x, w) : null);
    }

    /* Botões "−  valor  +" */
    const passo = (valor, unidade, menos, mais) => h('div', { class: 'qd-passo' },
      h('button', { type: 'button', 'aria-label': 'Menos 5', onclick: menos }, '−'), h('div', null, h('b', null, valor), ` ${unidade}`), h('button', { type: 'button', 'aria-label': 'Mais 5', onclick: mais }, '+'));
    const opcoesInt = (atual, aoEscolher, extra = '') => h('div', { class: 'qd-seg ' + extra, role: 'group' }, INT_ORDEM.map((k) => h('button', { type: 'button', class: k === atual ? 'on' : '', 'aria-pressed': String(k === atual), onclick: () => aoEscolher(k) }, cat.INTENSIDADES[k].nome)));

    function editor(x, w) {
      const data = x.data;
      const f = x.fisico;
      const ts = treinosDe(data);
      const mudarFund = (fn) => ajustar(data, (o) => { const l = clone(x.fundamentos); fn(l); o.fundamentos = l; return o; });

      /* Treino de quadra */
      const quadra = h('div', { class: 'qd-bloco-ed' },
        h('div', { class: 'qd-bt' }, h('b', null, 'Treino de quadra'), x.ajustado ? h('button', { class: 'link', type: 'button', onclick: () => ajustar(data, () => ({})) }, 'Voltar ao sugerido') : h('span', { class: 'dica' }, 'sugerido pela periodização')),
        h('div', { class: 'campo' }, h('span', { class: 'campo-rotulo' }, 'Intensidade'), opcoesInt(x.intensidade, (k) => ajustar(data, (o) => { o.intensidade = k; return o; }))),
        h('div', { class: 'campo' }, h('span', { class: 'campo-rotulo' }, 'Duração'), passo(x.duracao, 'min', () => ajustar(data, (o) => { o.duracao = Math.max(30, x.duracao - 5); return o; }), () => ajustar(data, (o) => { o.duracao = Math.min(180, x.duracao + 5); return o; }))),
        h('p', { class: 'dica' }, `PSE alvo ${x.pse} · carga de quadra ${milhar(x.pse * x.duracao)}`),
        x.fundamentos.map((fd, i) => {
          const def = cat.fundamento(fd.fundamento);
          return h('div', { class: 'campo' },
            h('span', { class: 'campo-rotulo qd-fund-rot' }, css(h('i'), `background:${corFund(fd.fundamento)}`), `${def.nome}: o que vamos trabalhar`,
              h('button', { class: 'icone', type: 'button', 'aria-label': `Tirar ${def.nome}`, onclick: () => mudarFund((l) => l.splice(i, 1)) }, '✕')),
            h('div', { class: 'chips' }, def.tipos.map((t) => chip(t, { ativo: fd.tipos.includes(t), onclick: () => mudarFund((l) => { const tp = l[i].tipos; l[i].tipos = tp.includes(t) ? tp.filter((y) => y !== t) : [...tp, t]; }) }))));
        }),
        h('details', { class: 'qd-mais' }, h('summary', null, '+ Incluir outro fundamento'),
          h('div', { class: 'chips' }, cat.FUNDAMENTOS.filter((d) => !x.fundamentos.some((fd) => fd.fundamento === d.id)).map((d) => chip(d.nome, { onclick: () => mudarFund((l) => l.push({ fundamento: d.id, tipos: [] })) })))),
        notaCampo(data, x.nota, data < hoje ? 'O que foi feito' : 'O que faremos'),
        registro(x, ts));

      /* Treino físico */
      const sug = f.sugestao;
      const frase = sug.previsto
        ? `A fase ${w.fase ? cat.fase(w.fase).nome : ''} pede ${sug.capacidade.toLowerCase()}: intensidade ${cat.INTENSIDADES[sug.intensidade].nome.toLowerCase()}, ${sug.duracao} min. Você pode trocar o estímulo, o tipo e os exercícios.`
        : `Pela periodização este dia fica sem físico. Se quiser colocar, a sugestão da fase é ${sug.capacidade.toLowerCase()}, ${sug.duracao} min.`;
      const cats = CATEGORIAS_DA_CAPACIDADE[f.capacidade] || [];
      const exs = S().exercicios.filter((e) => cats.includes(e.categoria));
      const fisico = h('div', { class: 'qd-bloco-ed fis' },
        h('div', { class: 'qd-bt' }, h('b', null, 'Treino físico'), f.on ? h('button', { class: 'link', type: 'button', onclick: () => ajustarFis(data, (o) => ({ ...o, on: false })) }, 'Tirar do dia') : null),
        h('div', { class: 'qd-sugestao' }, h('span', { 'aria-hidden': 'true' }, '◆'), h('div', null, frase)),
        f.on ? [
          h('div', { class: 'campo' }, h('span', { class: 'campo-rotulo' }, 'Estímulo: intensidade'), opcoesInt(f.intensidade, (k) => ajustarFis(data, (o) => ({ ...o, on: true, intensidade: k })), 'fis')),
          h('div', { class: 'campo' }, h('span', { class: 'campo-rotulo' }, 'Duração'), passo(f.duracao, 'min', () => ajustarFis(data, (o) => ({ ...o, on: true, duracao: Math.max(10, f.duracao - 5) })), () => ajustarFis(data, (o) => ({ ...o, on: true, duracao: Math.min(90, f.duracao + 5) })))),
          h('p', { class: 'dica' }, `PSE alvo ${f.pse} · carga do físico ${milhar(f.carga)}`),
          h('div', { class: 'campo' }, h('span', { class: 'campo-rotulo' }, 'Capacidade física (você escolhe)'),
            h('div', { class: 'chips' }, cat.FOCOS_FISICOS.map((c) => { const el = chip(c + (c === sug.capacidade && sug.previsto ? ' · sugerido' : ''), { ativo: c === f.capacidade, onclick: () => ajustarFis(data, (o) => ({ on: true, capacidade: c, ...(o.duracao ? { duracao: o.duracao } : {}) })) }); el.classList.add('fis'); return el; }))),
          h('div', { class: 'campo' }, h('span', { class: 'campo-rotulo' }, `Exercícios de ${f.capacidade.toLowerCase()} · ${f.exercicios.length ? plural(f.exercicios.length, 'escolhido', 'escolhidos') : 'nenhum escolhido'}`),
            exs.length ? h('div', { class: 'chips' }, exs.map((e) => { const el = chip(e.nome, { ativo: f.exercicios.includes(e.id), onclick: () => ajustarFis(data, (o) => { const l = o.exercicios || f.exercicios; return { ...o, on: true, exercicios: l.includes(e.id) ? l.filter((y) => y !== e.id) : [...l, e.id] }; }) }); el.classList.add('fis'); return el; }))
              : h('p', { class: 'dica' }, 'Nenhum exercício desta capacidade na biblioteca ainda.')),
          h('a', { class: 'link', href: '#/fisico/plano/novo' }, 'Montar um treino físico completo'),
        ] : h('button', { class: 'btn largo qd-add-fis', type: 'button', onclick: () => ajustarFis(data, (o) => ({ ...o, on: true })) }, '+ Adicionar treino físico neste dia'));
      return h('div', { class: 'qd-editor' }, quadra, fisico);
    }

    /* Anotação: grava ao sair do campo, sem refazer a tela enquanto digita. */
    function notaCampo(data, valor, rotulo) {
      const ta = h('textarea', { rows: 3, placeholder: 'Exercícios, jogos, pontos de atenção…', 'aria-label': rotulo, value: valor || '' });
      ta.addEventListener('change', () => {
        perio.dias = perio.dias || {};
        const o = perio.dias[data] || {};
        if (ta.value.trim()) o.nota = ta.value.trim(); else delete o.nota;
        if (Object.keys(o).length) perio.dias[data] = o; else delete perio.dias[data];
        gravar();
      });
      return h('label', { class: 'campo' }, h('span', { class: 'campo-rotulo' }, rotulo), ta);
    }

    /* Registro do dia: o que já foi registrado ou o atalho para registrar a partir do previsto. */
    function registro(x, ts) {
      if (!ts.length) {
        return h('div', { class: 'qd-registro' }, h('a', { class: 'btn primario largo', href: `#/treinos/novo?data=${x.data}&prev=0` }, x.data <= hoje ? 'Registrar treino, PSR e PSE' : 'Planejar como treino'));
      }
      return h('div', { class: 'qd-registro' }, ts.map((t) => {
        const ps = Object.values(t.presencas || {});
        const psr = calc.mediaSessao(t, 'psr'), pse = calc.mediaSessao(t, 'pse');
        return h('a', { class: 'qd-real', href: `#/treinos/${t.id}` },
          h('b', null, t.feito ? 'Registrado' : 'Planejado'),
          t.feito ? h('span', null, `${ps.filter((p) => p.presente).length}/${ps.length} presentes · chegada ${num(calc.arred(psr, 1))} · saída ${num(calc.arred(pse, 1))}`) : h('span', null, 'Toque para registrar'),
          h('span', { class: 'link' }, 'Abrir registro'));
      }));
    }

    desenhar();
    return raiz;
  }

  AC.quadro = quadro;
})((window.AC = window.AC || {}));
