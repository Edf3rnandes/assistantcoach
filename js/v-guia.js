/* Guia: o organograma da periodização e como as competições mudam volume, intensidade e intenção.
   Os números vêm de calc.js, então o desenho e o sistema nunca divergem. */
(function (AC) {
  const { h, svg, chip, num } = AC.ui;
  const { calc, cat, store } = AC;
  const M = calc.MOD_COMPETICAO;
  const pct = (f) => `${Math.round(f * 100)}%`;
  const fase = (id) => cat.fase(id);

  /* ---------- 1. Organograma da temporada ---------- */

  function organograma() {
    const no = (titulo, sub, define, calcula, filhos) => h('li', { class: 'org-no' },
      h('div', { class: 'org-caixa' }, h('strong', null, titulo), h('span', { class: 'muted' }, sub),
        h('dl', null, h('dt', null, 'Você define'), h('dd', null, define), h('dt', null, 'O sistema calcula'), h('dd', null, calcula))),
      filhos ? h('ul', { class: 'org-filhos' }, filhos) : null);
    return h('ul', { class: 'org' },
      no('Temporada', 'macrociclo · meses', 'Período, objetivo e as competições, cada uma com prioridade A, B ou C e a situação da data.', 'Linha do tempo e avisos (dois alvos muito próximos, competição fora do período).', [
        no('Mesociclo', 'fase · 2 a 6 semanas', 'Ênfase, tópicos de fundamentos (saque, ataque, defesa…), carga de referência e perfil de carga.', 'Fator de carga de cada semana e quantos treinos já trabalharam cada fundamento.', [
          no('Semana', 'microciclo', 'Quase nada: ela herda do mesociclo e das competições.', 'Volume (fator de carga), intensidade (PSE alvo) e a intenção da semana.', [
            no('Treino', 'sessão', 'Fundamentos, o que foi feito, treino físico e a PSR de chegada e a PSE de saída de cada atleta.', 'Carga (PSE × minutos), ACWR e atletas para olhar.'),
          ]),
        ]),
      ]));
  }

  /* ---------- 2. O que cada competição muda ---------- */

  function cartoesCompeticao() {
    const cartao = (letra, cor, titulo, linhas) => h('div', { class: 'comp-cartao', style: { '--cor': cor } },
      h('div', { class: 'comp-topo' }, h('span', { class: 'bolinha', style: { background: cor } }, letra), h('strong', null, titulo)),
      h('ul', null, linhas.map((l) => h('li', null, l))));
    return h('div', { class: 'grade3' },
      cartao('A', 'var(--bad)', 'Alvo da temporada', [
        'A temporada é montada de trás para frente a partir dela.',
        `Semana do polimento: volume ${pct(0.6)}, intensidade mantida.`,
        `Semana da competição: volume ${pct(M.A)}.`,
        `Semana seguinte: recuperação, volume ${pct(M.posA)}.`,
        'Depois a contagem recomeça para a próxima A.',
      ]),
      cartao('B', 'var(--warn)', 'Importante', [
        `Só a semana dela cai para ${pct(M.B)} (mini-polimento).`,
        `Semana seguinte: ${pct(M.posB)}.`,
        'A fase da temporada não muda: o ciclo rumo à A continua.',
        'Sem nenhuma A no calendário, a B vira o alvo.',
      ]),
      cartao('C', 'var(--muted)', 'Treino de ritmo', [
        'Nenhuma redução de carga.',
        'Entra no calendário para ganhar ritmo de jogo e dados.',
        'Pode ser competida cansado: é parte do treino.',
      ]));
  }

  /* ---------- Como cada semana é montada pelos dias de treino ---------- */

  function semanasPorDias() {
    const nomes = { alta: 'Alta', media: 'Moderada', leve: 'Leve' };
    const exemplos = [[2, [1, 4]], [3, [1, 3, 5]], [4, [1, 2, 4, 5]], [5, [1, 2, 3, 4, 5]]];
    return h('div', { class: 'dias-guia' }, exemplos.map(([n, dias]) => {
      const papeis = calc.papeisDe(n);
      return h('div', { class: 'dias-linha' }, h('strong', null, `${n} dias`),
        h('div', { class: 'dias-faixa' }, cat.DIAS_SEMANA.map((x) => {
          const k = dias.indexOf(x.d);
          const el = h('span', { class: 'dia-cel' + (k >= 0 ? ' on' : '') }, h('b', null, x.r), k >= 0 ? h('i', null, nomes[papeis[k]]) : null);
          if (k >= 0) el.style.setProperty('--cor', cat.INTENSIDADES[papeis[k]].cor);
          return el;
        })));
    }));
  }

  /* ---------- 3. Fluxo de decisão ---------- */

  function fluxo() {
    const passo = (titulo, corpo) => h('div', { class: 'passo' }, h('strong', null, titulo), corpo);
    const seta = () => h('div', { class: 'seta', 'aria-hidden': 'true' }, '↓');
    const linhaFase = (id, quando, texto) => h('div', { class: 'fase-linha' }, chip(fase(id).nome, { cor: fase(id).cor, pequeno: true }), h('span', { class: 'fase-quando' }, quando), h('span', { class: 'muted' }, texto));
    return h('div', { class: 'fluxo' },
      passo('1. Entrou uma competição ou a data mudou', h('p', { class: 'muted' }, 'Cadastre na periodização, com prioridade e situação (confirmada, a confirmar ou cancelada).')),
      seta(),
      passo('2. Qual é a prioridade?', h('p', { class: 'muted' }, 'A reorganiza a temporada. B reduz só a própria semana. C não muda a carga.')),
      seta(),
      passo('3. Quantas semanas faltam para a próxima A?', h('div', { class: 'fases' },
        linhaFase('base', '8 ou mais', 'volume e técnica; ondas de 3 semanas subindo e 1 de descarga'),
        linhaFase('desenvolvimento', '4 a 7', 'intensidade crescente nos fundamentos'),
        linhaFase('precompetitivo', '2 a 3', 'jogo, tática e ritmo de competição'),
        linhaFase('polimento', '1', 'menos volume, mesma intensidade'),
        linhaFase('competitivo', '0', 'semana da competição'),
        linhaFase('recuperacao', 'depois', 'regenerar; a contagem recomeça para a próxima A'))),
      seta(),
      passo('4. O sistema compara com os mesociclos que você cadastrou', h('p', { class: 'muted' }, 'Se não acompanham as competições, aparece o aviso "Os mesociclos não acompanham as competições" com a proposta.')),
      seta(),
      h('div', { class: 'grade2' },
        passo('Aplicar', h('p', { class: 'muted' }, 'Refaz só o futuro. O que já passou e a semana atual ficam como estão. Ênfase e fundamentos são copiados da mesma fase.')),
        passo('Manter como está', h('p', { class: 'muted' }, 'Nada muda. O aviso volta se outra data mudar.'))));
  }

  function tabelaIntervalo() {
    const linha = (gap, fases, nota) => h('div', { class: 'gap-linha' }, h('strong', null, gap), h('span', { class: 'chips' }, fases.map((f) => chip(fase(f).nome, { cor: fase(f).cor, pequeno: true }))), h('span', { class: 'dica' }, nota));
    return h('div', { class: 'gaps' },
      linha('1 a 3 semanas entre duas A', ['recuperacao', 'polimento'], 'Não dá para construir. Considere deixar uma delas como B.'),
      linha('4 a 5 semanas', ['recuperacao', 'precompetitivo', 'polimento'], 'Ciclo curto: manter e afinar.'),
      linha('6 a 9 semanas', ['recuperacao', 'desenvolvimento', 'precompetitivo', 'polimento'], 'Dá para desenvolver de novo antes de afinar.'),
      linha('10 semanas ou mais', ['recuperacao', 'base', 'desenvolvimento', 'precompetitivo', 'polimento'], 'Ciclo completo, com nova base.'));
  }

  /* ---------- 4. Volume e intensidade rumo a uma competição A ---------- */

  function graficoCiclo() {
    const ini = '2026-01-05';
    const perio = { inicio: ini, fim: calc.addDias(ini, 7 * 13 - 1), mesociclos: [], competicoes: [{ nome: 'Alvo', data: calc.addDias(ini, 7 * 11 + 5), prioridade: 'A' }] };
    const w = calc.planoIdeal(perio).semanas;
    const L = 34, passo = 26, W = L + w.length * passo + 6, ph = 104, topo = 18, gap = 44, A = topo + ph + gap + ph + 28;
    const el = svg('svg', { viewBox: `0 0 ${W} ${A}`, class: 'grafico guia', role: 'img', 'aria-label': 'Volume e intensidade planejados em cada semana rumo a uma competição A' });
    const yv = (f) => topo + ph * (1 - Math.min(f, 1.1) / 1.1);
    const yi = (p) => topo + ph + gap + ph * (1 - p / 10);
    el.append(svg('text', { x: 0, y: 10, class: 'g-rot', 'text-anchor': 'start' }, 'Volume (% da carga de referência)'));
    [0, 0.5, 1].forEach((g) => { el.append(svg('line', { x1: L - 4, x2: W - 4, y1: yv(g), y2: yv(g), class: 'g-grade' })); el.append(svg('text', { x: L - 8, y: yv(g) + 3, class: 'g-rot', 'text-anchor': 'end' }, `${g * 100}`)); });
    const y0 = topo + ph + gap - 10;
    el.append(svg('text', { x: 0, y: y0, class: 'g-rot', 'text-anchor': 'start' }, 'Intensidade (PSE alvo dos treinos)'));
    [0, 5, 10].forEach((g) => { el.append(svg('line', { x1: L - 4, x2: W - 4, y1: yi(g), y2: yi(g), class: 'g-grade' })); el.append(svg('text', { x: L - 8, y: yi(g) + 3, class: 'g-rot', 'text-anchor': 'end' }, g)); });
    const pts = [];
    w.forEach((s, i) => {
      const x = L + i * passo + 4;
      el.append(svg('rect', { x, y: yv(s.fator), width: passo - 8, height: Math.max(1, yv(0) - yv(s.fator)), rx: 3, fill: fase(s.fase).cor }));
      el.append(svg('text', { x: x + (passo - 8) / 2, y: yv(s.fator) - 3, class: 'g-val', 'text-anchor': 'middle' }, Math.round(s.fator * 100)));
      pts.push([x + (passo - 8) / 2, yi(s.pse)]);
      const rel = i - 11;
      el.append(svg('text', { x: x + (passo - 8) / 2, y: A - 8, class: 'g-rot' + (rel === 0 ? ' atual' : ''), 'text-anchor': 'middle' }, rel === 0 ? 'A' : rel > 0 ? `+${rel}` : `${rel}`));
    });
    el.append(svg('polyline', { points: pts.map((p) => p.join(',')).join(' '), class: 'g-linha g-pse' }));
    pts.forEach((p, i) => el.append(svg('circle', { cx: p[0], cy: p[1], r: 3.4, fill: fase(w[i].fase).cor, class: 'g-ponto-guia' })));
    return el;
  }

  function guia() {
    const raiz = h('div', { class: 'pagina-guia' });
    const periodizacoes = store.e.periodizacoes;
    raiz.append(
      h('a', { class: 'voltar', href: periodizacoes[0] ? `#/periodizacao/${periodizacoes[0].id}` : '#/periodizacao' }, '‹ Periodização'),
      h('h1', null, 'Como a competição muda a carga'),
      h('p', { class: 'sub' }, 'Volume, intensidade e intenção de cada semana quando há várias competições na mesma temporada.'),
      h('p', null, 'A regra de partida é a de quem compete bem: antes da competição alvo, reduzir o volume e manter a intensidade; depois dela, recuperar. Todo o resto da temporada se organiza em torno disso.'),
      h('section', null, h('h2', null, 'Como a temporada se organiza'), organograma()),
      h('section', null, h('h2', null, 'Como cada semana é montada'),
        h('p', { class: 'dica' }, 'Você escolhe os dias de treino da equipe. O sistema distribui a intensidade: o dia alto vem depois de descanso, e o leve fica perto do fim da semana. Os dias abaixo são exemplos; vale qualquer combinação.'),
        semanasPorDias(),
        h('ul', { class: 'regras' },
          h('li', null, 'A semana herda a fase e o volume do mesociclo. O volume muda a duração dos treinos; o número de dias não muda.'),
          h('li', null, 'PSE alvo do dia: a da fase, mais 1 no dia alto e menos 2 no dia leve.'),
          h('li', null, 'Véspera e dia seguinte de competição A ou B ficam leves. O dia da competição aparece como competição.'),
          h('li', null, 'Na base e no desenvolvimento, com 4 dias ou mais, o segundo dia é treino físico.'),
          h('li', null, 'Os fundamentos de cada treino vêm da ênfase do mesociclo, alternando os de prioridade alta.'))),
      h('section', null, h('h2', null, 'O que cada competição muda'), cartoesCompeticao()),
      h('section', null, h('h2', null, 'O que acontece quando uma data muda'), fluxo()),
      h('section', null, h('h2', null, 'Várias competições alvo na temporada'), h('p', { class: 'dica' }, 'Cada A reinicia a contagem. O que cabe entre duas A depende da distância:'), tabelaIntervalo()),
      h('section', null, h('h2', null, 'Semana a semana rumo a uma A'),
        h('p', { class: 'dica' }, 'Exemplo com 12 semanas até a competição (A) e uma de recuperação. As cores são as fases. Observe que o volume cai nas duas últimas semanas, mas a intensidade (PSE 7) se mantém no polimento.'),
        h('div', { class: 'rolagem-x' }, graficoCiclo())),
      h('section', null, h('h2', null, 'Como usar na sua temporada'),
        h('ol', { class: 'passos-simples' },
          h('li', null, 'Cadastre as competições com prioridade A, B ou C. Datas incertas ficam como "a confirmar".'),
          h('li', null, 'Toque em "Montar a partir das competições" para criar os mesociclos, e em "Reorganizar" quando uma data mudar.'),
          h('li', null, 'Em cada mesociclo, ajuste a ênfase e os fundamentos. A carga de referência é a semana cheia desejada, em PSE × minutos por atleta.'),
          h('li', null, 'Compare o planejado com o realizado em "Carga por semana": barras são o que os atletas fizeram e o traço é o planejado.')),
        periodizacoes.map((p) => h('a', { class: 'btn', href: `#/periodizacao/${p.id}` }, `Abrir ${p.nome}`))),
      h('p', { class: 'dica' }, `Os fatores (${pct(0.6)}, ${pct(M.posA)}, ${pct(M.B)}, ${pct(M.posB)}) são pontos de partida de planejamento, os mesmos para todos os atletas. Ajuste pela carga de referência e pelo perfil de cada mesociclo e confira sempre a PSR e a PSE reais da turma.`));
    return raiz;
  }

  AC.views = AC.views || {};
  AC.views.guia = guia;
})((window.AC = window.AC || {}));
