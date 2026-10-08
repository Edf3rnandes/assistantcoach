/* Dados de exemplo para conhecer o sistema. Só entram quando o técnico pede, e substituem o que existe. */
(function (AC) {
  const { addDias, segundaDe, hojeISO } = AC.calc;

  function gerar() {
    const uid = AC.store.uid;
    const hoje = hojeISO();
    const seg0 = segundaDe(hoje);

    const nasc = (anos, mmdd) => `${Number(hoje.slice(0, 4)) - anos}-${mmdd}`;
    const dados = [
      ['Ana Beatriz', 'F', 'bloqueio', nasc(17, '03-14'), '(83) 99811-2001', true],
      ['Camila', 'F', 'defesa', nasc(16, '09-02'), '(83) 99811-2002', true],
      ['Júlia', 'F', 'bloqueio', '', '', false],
      ['Marina', 'F', 'defesa', nasc(18, '11-23'), '(83) 99811-2004', true],
      ['Rafael', 'M', 'bloqueio', nasc(17, '06-30'), '(83) 99811-2005', true],
      ['Lucas', 'M', 'defesa', nasc(16, '01-19'), '(83) 99811-2006', true],
      ['Pedro', 'M', 'ambos', nasc(17, '08-08'), '', false],
      ['Thiago', 'M', 'defesa', '', '', false],
    ];
    const atletas = dados.map(([nome, sexo, acao, nascimento, contato, ok]) => ({
      id: uid(), nome, sexo, acao, lado: '', nascimento, contato, responsavel: '', consentimento: ok ? hoje : '', ativo: true, obs: '', parceiroId: null,
    }));
    for (let i = 0; i < atletas.length; i += 2) { atletas[i].parceiroId = atletas[i + 1].id; atletas[i + 1].parceiroId = atletas[i].id; }
    atletas[3].obs = 'Dor leve no ombro direito, acompanhar nos ataques';

    /* Quatro competições na temporada: a primeira A fica no meio do ciclo, e a segunda A fecha a temporada. */
    const sab = (sem) => addDias(seg0, 7 * sem + 5);
    const perio = {
      id: uid(),
      nome: `Temporada ${hoje.slice(0, 4)}`,
      objetivo: 'Chegar ao circuito estadual com saque agressivo e side-out acima de 65%.',
      inicio: addDias(seg0, -7 * 6),
      fim: addDias(seg0, 7 * 15 - 1),
      mesociclos: [],
      competicoes: [
        { id: uid(), nome: 'Torneio local', data: sab(1), prioridade: 'C', situacao: 'confirmada' },
        { id: uid(), nome: 'Circuito Estadual, 1ª etapa', data: sab(5), prioridade: 'A', situacao: 'confirmada' },
        { id: uid(), nome: 'Torneio regional', data: sab(9), prioridade: 'B', situacao: 'provisoria' },
        { id: uid(), nome: 'Circuito Estadual, final', data: sab(13), prioridade: 'A', situacao: 'confirmada' },
      ],
    };

    /* Os mesociclos saem da mesma regra que o sistema usa para reorganizar pelas competições. */
    const REF = { base: 1700, desenvolvimento: 2000, precompetitivo: 2100, polimento: 1700, competitivo: 1600, recuperacao: 900 };
    const NOMES_FASE = { base: 'Base', desenvolvimento: 'Desenvolvimento', precompetitivo: 'Pré-competitivo', polimento: 'Polimento', competitivo: 'Competição', recuperacao: 'Recuperação' };
    const prop = AC.calc.propostaMesos(perio, addDias(perio.inicio, -1));
    perio.mesociclos = prop.novos.map((n) => {
      const f = AC.cat.fase(n.fase);
      const alvo = ['precompetitivo', 'polimento', 'competitivo'].includes(n.fase) && n.alvo ? ` · ${n.alvo}` : '';
      return {
        id: uid(), nome: `${NOMES_FASE[n.fase]}${alvo}${n.partes > 1 ? ` (${n.parte}/${n.partes})` : ''}`, fase: n.fase, inicio: n.inicio, semanas: n.semanas,
        perfil: f.perfil, cargaRef: REF[n.fase], enfase: f.desc,
        topicos: (AC.cat.SUGESTOES_FASE[n.fase] || []).map((t) => ({ id: uid(), ...t, tipos: [...t.tipos] })),
        fisico: [...(AC.cat.FOCO_FISICO_FASE[n.fase] || [])], notas: '',
      };
    });
    const cal = AC.calc.calendarioCarga(perio);

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
      const semCal = cal.find((c) => c.seg === segSemana);
      const m = semCal && semCal.meso;
      if (!m) continue;
      const fator = semCal.fator == null ? 1 : semCal.fator;
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
