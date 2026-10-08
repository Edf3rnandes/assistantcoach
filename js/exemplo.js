/* Dados de exemplo para conhecer o sistema. Só entram quando o técnico pede, e substituem o que existe. */
(function (AC) {
  const { addDias, segundaDe, hojeISO, fimMeso, fatoresCarga } = AC.calc;

  function gerar() {
    const uid = AC.store.uid;
    const hoje = hojeISO();
    const seg0 = segundaDe(hoje);

    const nomes = [
      ['Ana Beatriz', 'Bloqueadora'], ['Camila', 'Defensora'], ['Júlia', 'Bloqueadora'], ['Marina', 'Defensora'],
      ['Rafael', 'Bloqueador'], ['Lucas', 'Defensor'], ['Pedro', 'Bloqueador'], ['Thiago', 'Defensor'],
    ];
    const atletas = nomes.map(([nome, funcao]) => ({ id: uid(), nome, funcao, nascimento: '', ativo: true, obs: '', parceiroId: null }));
    for (let i = 0; i < atletas.length; i += 2) { atletas[i].parceiroId = atletas[i + 1].id; atletas[i + 1].parceiroId = atletas[i].id; }
    atletas[3].obs = 'Dor leve no ombro direito, acompanhar nos ataques';

    /* Quatro mesociclos: dois já passaram parcialmente, o atual está na semana 3. */
    const T = (fundamento, tipos, foco, prioridade) => ({ id: uid(), fundamento, tipos, foco, prioridade });
    const meso = (nome, fase, semIni, semanas, perfil, cargaRef, enfase, topicos, fisico) => ({
      id: uid(), nome, fase, inicio: addDias(seg0, 7 * semIni), semanas, perfil, cargaRef, enfase, topicos, fisico, notas: '',
    });
    const mesos = [
      meso('Base geral', 'base', -6, 4, '3:1', 1700, 'Construir base de movimento e consistência nos fundamentos de controle.', [
        T('movimentacao', ['Deslocamento lateral', 'Frente e trás'], 'Eficiência de passada na areia', 'alta'),
        T('defesa', ['Manchete', 'Posicionamento por zonas'], 'Plataforma e base', 'alta'),
        T('recepcao', ['Manchete'], 'Passe na meta', 'media'),
        T('saque', ['Flutuante'], 'Consistência e controle de zona', 'media'),
      ], ['Resistência aeróbia', 'Força', 'Core e estabilidade']),
      meso('Desenvolvimento de ataque e saque', 'desenvolvimento', -2, 4, '3:1', 2000, 'Ganhar agressividade no saque e variação no ataque, sem perder controle.', [
        T('ataque', ['Diagonal', 'Paralela'], 'Ataque com direção e variação de ritmo', 'alta'),
        T('saque', ['Viagem', 'Direcionado por zona'], 'Saque agressivo com controle', 'alta'),
        T('bloqueio', ['Temporização', 'Linha'], 'Tempo de salto e mãos à frente', 'media'),
        T('defesa', ['Rolamento / peixinho', 'Bola de potência'], 'Defesa em deslocamento', 'media'),
        T('tatica', ['Side-out'], 'Complexo de side-out', 'media'),
      ], ['Potência e saltos', 'Força', 'Prevenção de lesões']),
      meso('Pré-competitivo', 'precompetitivo', 2, 3, '2:1', 2100, 'Transformar a técnica em decisões de jogo sob placar.', [
        T('tatica', ['Side-out', 'Break point'], 'Rendimento de side-out e break point', 'alta'),
        T('tatica', ['Bloqueio e defesa (sistema)', 'Sinais e comunicação'], 'Sistema defensivo e sinais', 'alta'),
        T('saque', ['No jogador', 'Agressivo x seguro'], 'Escolha do saque por situação', 'media'),
      ], ['Velocidade e agilidade', 'Resistência intermitente']),
      meso('Competitivo e polimento', 'polimento', 5, 2, 'polimento', 1500, 'Chegar descansado, com rotinas claras e o plano de jogo revisado.', [
        T('mental', ['Rotina pré-saque', 'Pressão de placar'], 'Rotinas de competição', 'alta'),
        T('tatica', ['Leitura do adversário', 'Final de set e tie-break'], 'Ajustes e fechamento de set', 'alta'),
      ], ['Mobilidade', 'Recuperação']),
    ];
    const fimMacro = fimMeso(mesos[3]);
    const perio = {
      id: uid(),
      nome: `Temporada ${hoje.slice(0, 4)}`,
      objetivo: 'Chegar ao circuito estadual com saque agressivo e side-out acima de 65%.',
      inicio: mesos[0].inicio,
      fim: fimMacro,
      mesociclos: mesos,
      competicoes: [
        { id: uid(), nome: 'Torneio de preparação', data: addDias(seg0, 7 * 4 + 5), prioridade: 'B' },
        { id: uid(), nome: 'Circuito Estadual, etapa final', data: addDias(seg0, 7 * 6 + 5), prioridade: 'A' },
      ],
    };

    /* Treinos: segunda, terça, quinta e sexta, do início ao dia de hoje (planejados daí em diante nesta semana). */
    const treinos = [];
    const agenda = [
      { dow: 0, tipo: 'tecnico', min: 100, fund: ['saque', 'recepcao'], titulo: 'Saque e recepção' },
      { dow: 1, tipo: 'fisico', min: 70, fund: [], titulo: 'Físico: potência e saltos' },
      { dow: 3, tipo: 'tatico', min: 110, fund: ['ataque', 'defesa'], titulo: 'Ataque e defesa' },
      { dow: 4, tipo: 'treino-jogo', min: 100, fund: ['tatica'], titulo: 'Treino-jogo 2x2' },
    ];
    const rnd = (() => { let s = 7; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; }; })();
    const limite = (v) => Math.max(0, Math.min(10, Math.round(v)));
    for (let w = -6; w <= 0; w++) {
      const segSemana = addDias(seg0, 7 * w);
      const m = mesos.find((x) => segSemana >= segundaDe(x.inicio) && segSemana <= fimMeso(x));
      if (!m) continue;
      const fator = fatoresCarga(m.perfil, m.semanas)[Math.round((new Date(segSemana) - new Date(segundaDe(m.inicio))) / (7 * 86400000))] || 1;
      for (const a of agenda) {
        const data = addDias(segSemana, a.dow);
        const feito = data <= hoje;
        const topicosFund = m.topicos.filter((tp) => a.fund.includes(tp.fundamento) || (a.fund.length && tp.prioridade === 'alta' && a.dow === 3));
        const fundamentos = a.fund.length
          ? (topicosFund.length ? topicosFund : [{ fundamento: a.fund[0], tipos: [] }]).slice(0, 2).map((tp) => ({ fundamento: tp.fundamento, tipos: tp.tipos ? tp.tipos.slice(0, 1) : [] }))
          : [];
        const pseBase = (a.tipo === 'fisico' ? 6 : a.tipo === 'treino-jogo' ? 6.5 : 5.5) * (0.75 + 0.25 * fator);
        const presencas = {};
        atletas.forEach((at, i) => {
          const presente = rnd() > 0.07;
          presencas[at.id] = feito
            ? { presente, psr: presente ? limite(7.5 - (i === 3 ? 2 : 0) - (a.dow === 0 ? 1 : 0) + (rnd() - 0.5) * 3) : null, pse: presente ? limite(pseBase + (rnd() - 0.5) * 2.4 + (i === 3 ? 1 : 0)) : null, obs: '' }
            : { presente: true, psr: null, pse: null, obs: '' };
        });
        treinos.push({
          id: uid(), data, feito, tipo: a.tipo, titulo: a.titulo, duracao: a.min, pseAlvo: Math.round(pseBase),
          local: 'Areia', fundamentos,
          atividades: a.tipo === 'fisico' ? [] : [
            { id: uid(), descricao: 'Aquecimento com bola e deslocamentos', min: 15 },
            { id: uid(), descricao: a.fund.length ? `Bloco de ${a.titulo.toLowerCase()} em duplas com meta de acertos` : 'Circuito', min: 45 },
            { id: uid(), descricao: 'Jogo condicionado 2x2 até 15 pontos', min: a.min - 70 },
          ],
          fisico: null, presencas,
          notas: feito && a.dow === 3 ? 'Ritmo bom no ataque; defesa de largada ainda lenta.' : '',
        });
      }
    }

    /* Biblioteca de treinos físicos prontos. */
    const nomeEx = (n) => AC.store.e.exercicios.find((e) => e.nome === n);
    const item = (nomeExercicio, series, reps, carga, descanso, obs) => {
      const e = nomeEx(nomeExercicio);
      return { id: uid(), exId: e ? e.id : null, nome: nomeExercicio, series, reps, carga, descanso, obs: obs || '' };
    };
    const planos = [
      {
        id: uid(), nome: 'Potência na areia', foco: ['Potência e saltos', 'Velocidade e agilidade'], duracao: 60, pseAlvo: 7,
        notas: 'Qualidade acima de volume: parar a série se a altura do salto cair.',
        blocos: [
          { id: uid(), nome: 'Aquecimento', itens: [item('Trote leve na areia', 1, '5 min', 'Leve', 0), item('Skipping e passadas laterais', 2, '20 m', 'Leve', 20), item('Mobilidade de quadril e tornozelo', 1, '8 repetições', 'Peso do corpo', 0)] },
          { id: uid(), nome: 'Principal', itens: [item('Agachamento com salto', 4, '6', 'Máxima altura', 90), item('Salto de bloqueio com deslocamento', 4, '5 por lado', 'Máxima altura', 90), item('Arranque curto de 5 m', 6, '1', 'Máxima velocidade', 60)] },
          { id: uid(), nome: 'Volta à calma', itens: [item('Respiração e alongamento final', 1, '5 min', '', 0)] },
        ],
      },
      {
        id: uid(), nome: 'Prevenção de ombro e tornozelo', foco: ['Prevenção de lesões', 'Core e estabilidade'], duracao: 40, pseAlvo: 4,
        notas: '',
        blocos: [
          { id: uid(), nome: 'Principal', itens: [item('Rotação externa de ombro com elástico', 3, '12', 'Elástico leve', 45), item('Y-T-W no chão', 3, '8 cada', 'Peso do corpo', 45), item('Equilíbrio unipodal em superfície instável', 3, '30 s por perna', '', 30), item('Elevação de panturrilha excêntrica', 3, '10', 'Peso do corpo', 45), item('Prancha lateral', 3, '30 s por lado', '', 30)] },
        ],
      },
    ];

    return { versao: 1, atletas, periodizacoes: [perio], treinos, planosFisicos: planos };
  }

  AC.exemplo = {
    carregar() {
      const base = AC.store.e;
      const dados = gerar();
      AC.store.substituir({ ...dados, exercicios: base.exercicios });
    },
  };
})((window.AC = window.AC || {}));
