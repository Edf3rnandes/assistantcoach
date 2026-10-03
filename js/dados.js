/* Dados de exemplo (mock) usados enquanto o backend (Supabase, schema `ft`) não está ligado.
   Quando a integração entrar, só este arquivo é substituído por chamadas ao banco;
   as telas consomem a mesma forma de dados: planos -> mesociclos -> semanas. */
(function () {
  const DIA = 864e5;

  const ms = (iso) => {
    const [y, m, d] = iso.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  };
  const dd = (t) => {
    const x = new Date(t);
    return String(x.getUTCDate()).padStart(2, '0') + '/' + String(x.getUTCMonth() + 1).padStart(2, '0');
  };
  const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const mes = (t) => MESES[new Date(t).getUTCMonth()];
  const num = (v) => Math.round(v).toLocaleString('pt-BR');

  // "Hoje" fixo para a demonstração ficar estável.
  const HOJE = ms('2026-10-03');

  // Competições já existentes no calendário (`competicoes`).
  const COMPETICOES = {
    c1: { id: 'c1', nome: 'Paraibano de Areia, etapa 1', data: ms('2026-10-17') },
    c2: { id: 'c2', nome: 'Circuito Nordestino Sub-18, final', data: ms('2026-11-28') },
    c3: { id: 'c3', nome: 'Open João Pessoa Adulto', data: ms('2026-11-14') },
    c4: { id: 'c4', nome: 'Seletiva Brasileiro Sub-19', data: ms('2026-12-05') },
  };

  // Modelo de cada fase. `f` é a fração do pico de carga no início e no fim da fase.
  const FASES = {
    base: {
      nome: 'Base',
      cor: '--m-base',
      f: [0.62, 0.86],
      pse: [5, 6],
      foco: { forca: 55, potencia: 15, mobilidade: 30 },
      objetivo: 'Construir capacidade de trabalho e força geral. Volume cresce semana a semana, com intensidade controlada.',
    },
    especifico: {
      nome: 'Específico',
      cor: '--m-especifico',
      f: [0.9, 0.8],
      pse: [6, 8],
      foco: { forca: 35, potencia: 45, mobilidade: 20 },
      objetivo: 'Converter a força em potência e velocidade de salto. O volume cai aos poucos e a intensidade sobe.',
    },
    polimento: {
      nome: 'Polimento',
      cor: '--m-polimento',
      f: [0.6, 0.45],
      pse: [6, 7],
      foco: { forca: 20, potencia: 55, mobilidade: 25 },
      objetivo: 'Reduzir volume mantendo a intensidade, para o atleta chegar descansado e rápido à competição.',
    },
    competicao: {
      nome: 'Competição',
      cor: '--m-competicao',
      f: [0.5, 0.42],
      pse: [7, 9],
      foco: { forca: 15, potencia: 40, mobilidade: 45 },
      objetivo: 'Manter prontidão e recuperar entre jogos. Treino físico curto e de baixa fadiga.',
    },
    transicao: {
      nome: 'Transição',
      cor: '--m-transicao',
      f: [0.32, 0.26],
      pse: [3, 4],
      foco: { forca: 25, potencia: 5, mobilidade: 70 },
      objetivo: 'Descanso ativo, mobilidade e correção de desequilíbrios antes do próximo ciclo.',
    },
  };

  const PLANOS_BRUTOS = [
    {
      id: 'sub18',
      nome: 'Sub-18 Masculino',
      tipo: 'turma',
      detalhe: 'Turma · 14 atletas',
      inicio: '2026-08-03',
      pico: 3200,
      alvo: 'c2',
      competicoes: ['c1', 'c2'],
      fases: [['base', 6], ['especifico', 6], ['polimento', 2], ['competicao', 3], ['transicao', 3]],
    },
    {
      id: 'adulto',
      nome: 'Adulto Misto, areia',
      tipo: 'turma',
      detalhe: 'Turma · 10 atletas',
      inicio: '2026-08-10',
      pico: 3600,
      alvo: 'c3',
      competicoes: ['c1', 'c3'],
      fases: [['base', 5], ['especifico', 5], ['polimento', 2], ['competicao', 2], ['transicao', 3]],
    },
    {
      id: 'mariana',
      nome: 'Mariana Costa',
      tipo: 'atleta',
      detalhe: 'Individual · Sub-19',
      inicio: '2026-08-24',
      pico: 2700,
      alvo: 'c4',
      competicoes: ['c1', 'c4'],
      fases: [['base', 6], ['especifico', 6], ['polimento', 2], ['competicao', 2], ['transicao', 2]],
    },
  ];

  // Variação determinística da carga realizada em relação à planejada.
  const ruido = (i, s) => 0.9 + 0.2 * (0.5 + 0.5 * Math.sin(i * 12.9898 + s * 78.233));

  function montar(p, seed) {
    const inicio = ms(p.inicio);
    const mesos = [];
    const semanas = [];
    let n = 0;

    p.fases.forEach(([tipo, qtd], idx) => {
      const fase = FASES[tipo];
      const meso = {
        id: tipo,
        tipo,
        nome: fase.nome,
        cor: fase.cor,
        semanaIni: n,
        semanas: qtd,
        inicio: inicio + n * 7 * DIA,
        fim: inicio + (n + qtd) * 7 * DIA - DIA,
        fase,
        idx,
      };
      for (let k = 0; k < qtd; k++, n++) {
        const t = qtd === 1 ? 0 : k / (qtd - 1);
        let planejado = p.pico * (fase.f[0] + (fase.f[1] - fase.f[0]) * t);
        // Semana de descarga: a 4ª semana de fases longas (base e específico).
        const descarga = qtd >= 5 && k === 3 && (tipo === 'base' || tipo === 'especifico');
        if (descarga) planejado *= 0.75;
        const ini = inicio + n * 7 * DIA;
        const passada = ini + 6 * DIA < HOJE;
        semanas.push({
          n: n + 1,
          inicio: ini,
          meso: tipo,
          planejado: Math.round(planejado / 10) * 10,
          realizado: passada ? Math.round((planejado * ruido(n, seed)) / 10) * 10 : null,
          descarga,
        });
      }
      mesos.push(meso);
    });

    mesos.forEach((m) => {
      const sem = semanas.slice(m.semanaIni, m.semanaIni + m.semanas);
      m.mediaPlanejada = sem.reduce((a, s) => a + s.planejado, 0) / sem.length;
      m.picoPlanejado = Math.max(...sem.map((s) => s.planejado));
      m.competicoes = p.competicoes.map((id) => COMPETICOES[id]).filter((c) => c.data >= m.inicio && c.data <= m.fim + DIA - 1);
    });

    const semanaAtual = semanas.findIndex((s) => HOJE >= s.inicio && HOJE < s.inicio + 7 * DIA);
    const mesoAtual = semanaAtual >= 0 ? semanas[semanaAtual].meso : null;

    return {
      ...p,
      inicioMs: inicio,
      fimMs: inicio + n * 7 * DIA - DIA,
      mesos,
      semanas,
      semanaAtual, // índice, ou -1 se o plano ainda não começou / já acabou
      mesoAtual,
      comps: p.competicoes.map((id) => ({ ...COMPETICOES[id], alvo: id === p.alvo })),
    };
  }

  const planos = PLANOS_BRUTOS.map((p, i) => montar(p, i + 1));

  window.Farol = window.Farol || {};
  window.Farol.dados = { HOJE, DIA, FASES, COMPETICOES, planos };
  window.Farol.util = { DIA, ms, dd, mes, num };
})();
