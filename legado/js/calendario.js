/* Calendário de competições (`competicoes`) e o planejamento de cada uma:
   duplas, viagem e orçamento, equipe de professores e resultados.
   Os dados são do clube, não de um plano: o mesmo campeonato pode ser alvo de um plano e etapa de outro. */
(function () {
  const { ms } = window.Farol.util;
  const HOJE = window.Farol.util.HOJE;
  const { ATLETAS } = window.Farol.elenco;

  const COMPETICOES = {
    c0: { id: 'c0', nome: 'Torneio de Abertura da Temporada', data: ms('2026-09-12'), fim: ms('2026-09-13'), local: 'João Pessoa/PB', nivel: 'Estadual', categorias: ['Sub-18 Masc', 'Adulto Masc', 'Adulto Fem', 'Sub-19 Fem'] },
    c1: { id: 'c1', nome: 'Paraibano de Areia, etapa 1', data: ms('2026-10-17'), fim: ms('2026-10-18'), local: 'João Pessoa/PB', nivel: 'Estadual', categorias: ['Sub-16 Fem', 'Sub-18 Masc', 'Adulto Masc', 'Adulto Fem', 'Sub-19 Fem'] },
    c2: { id: 'c2', nome: 'Circuito Nordestino Sub-18, final', data: ms('2026-11-27'), fim: ms('2026-11-29'), local: 'Maceió/AL', nivel: 'Regional', categorias: ['Sub-18 Masc'] },
    c3: { id: 'c3', nome: 'Open João Pessoa Adulto', data: ms('2026-11-14'), fim: ms('2026-11-15'), local: 'João Pessoa/PB', nivel: 'Aberto', categorias: ['Adulto Masc', 'Adulto Fem'] },
    c4: { id: 'c4', nome: 'Seletiva Brasileiro Sub-19', data: ms('2026-12-05'), fim: ms('2026-12-06'), local: 'Recife/PE', nivel: 'Regional', categorias: ['Sub-19 Fem'] },
    c5: { id: 'c5', nome: 'Campeonato Brasileiro Sub-18', data: ms('2027-04-10'), fim: ms('2027-04-11'), local: 'Rio de Janeiro/RJ', nivel: 'Nacional', categorias: ['Sub-18 Masc'] },
    c6: { id: 'c6', nome: 'Paraibano de Areia, etapa 2', data: ms('2027-02-13'), fim: ms('2027-02-14'), local: 'João Pessoa/PB', nivel: 'Estadual', categorias: ['Sub-16 Fem', 'Sub-18 Masc', 'Adulto Masc', 'Adulto Fem'] },
    c7: { id: 'c7', nome: 'Circuito Nordestino Sub-18, abertura', data: ms('2027-07-17'), fim: ms('2027-07-18'), local: 'Natal/RN', nivel: 'Regional', categorias: ['Sub-18 Masc'] },
    c8: { id: 'c8', nome: 'Open Nordeste Adulto', data: ms('2027-04-03'), fim: ms('2027-04-04'), local: 'Salvador/BA', nivel: 'Aberto', categorias: ['Adulto Masc', 'Adulto Fem'] },
    c9: { id: 'c9', nome: 'Brasileiro Sub-19, final', data: ms('2027-04-10'), fim: ms('2027-04-11'), local: 'Rio de Janeiro/RJ', nivel: 'Nacional', categorias: ['Sub-19 Fem'] },
  };

  // Categorias: faixa × (masculino, feminino, misto), mais as que já aparecem em competições ou equipes (por exemplo, as de exemplo antigas).
  const categorias = () => {
    const E = window.Farol.elenco;
    const base = E.cadastro.FAIXAS.flatMap((f) => ['Masc', 'Fem', 'Misto'].map((g) => `${f} ${g}`));
    const extras = [...Object.values(COMPETICOES).flatMap((c) => c.categorias || []), ...Object.values(E.TURMAS).flatMap((t) => t.categorias || [])];
    return [...new Set([...base, ...extras])].sort((a, b) => E.cadastro.idadeLimite(E.cadastro.parseCategoria(a).faixa) - E.cadastro.idadeLimite(E.cadastro.parseCategoria(b).faixa) || a.localeCompare(b));
  };
  const NIVEIS = ['Estadual', 'Regional', 'Nacional', 'Aberto', 'Amistoso'];
  const CATEGORIAS_ORCAMENTO = {
    inscricao: 'Inscrição',
    transporte: 'Transporte',
    hospedagem: 'Hospedagem',
    alimentacao: 'Alimentação',
    outros: 'Outros',
  };
  const STATUS_DUPLA = {
    confirmada: { nome: 'Confirmada', desc: 'Inscrição feita e dupla confirmada' },
    prevista: { nome: 'Prevista', desc: 'Planejada, ainda sem confirmação' },
    reserva: { nome: 'Reserva', desc: 'Entra se alguma dupla não puder ir' },
  };
  const FUNCOES_EQUIPE = ['Técnico principal', 'Auxiliar técnico', 'Preparador físico', 'Fisioterapeuta', 'Chefe de delegação'];

  let seq = 0;
  const novoId = (p) => `${p}${++seq}`;

  const dupla = (id, a, b, cat, status) => ({ id, a, b, cat, status });
  const item = (id, it, cat, previsto, real) => ({ id, item: it, cat, previsto, real: real == null ? null : real });

  const PLANEJ = {
    c0: {
      duplas: [
        dupla('d1', 'a1', 'a2', 'Sub-18 Masc', 'confirmada'),
        dupla('d2', 'a3', 'a4', 'Sub-18 Masc', 'confirmada'),
        dupla('d3', 'a5', 'a6', 'Sub-18 Masc', 'confirmada'),
        dupla('d4', 'a7', 'a8', 'Sub-18 Masc', 'confirmada'),
        dupla('d5', 'b1', 'b2', 'Adulto Masc', 'confirmada'),
        dupla('d6', 'c1', 'c2', 'Adulto Fem', 'confirmada'),
        dupla('d7', 'e1', 'e2', 'Sub-19 Fem', 'confirmada'),
      ],
      viagem: { necessaria: false, saida: '', retorno: '', chegada: '', transporte: '', hospedagem: '', alimentacao: '', bateBola: { data: '2026-09-11', hora: '16:00', local: 'Praia de Tambaú' } },
      orcamento: [item('o1', 'Inscrições (7 duplas)', 'inscricao', 840, 840), item('o2', 'Água e lanche', 'alimentacao', 300, 280)],
      equipe: [{ profId: 'p1', funcao: 'Técnico principal' }, { profId: 'p2', funcao: 'Auxiliar técnico' }],
      resultados: [
        { id: 'r1', duplaId: 'd1', fase: 'Semifinal', colocacao: '3º lugar', v: 4, d: 1, obs: 'Perdeu a semi em três sets longos. Saque oscilou no terceiro.' },
        { id: 'r2', duplaId: 'd2', fase: 'Quartas de final', colocacao: '5º lugar', v: 3, d: 1, obs: '' },
        { id: 'r3', duplaId: 'd3', fase: 'Fase de grupos', colocacao: '9º lugar', v: 1, d: 2, obs: 'Recepção abaixo do esperado.' },
        { id: 'r4', duplaId: 'd4', fase: 'Oitavas de final', colocacao: '9º lugar', v: 2, d: 1, obs: '' },
        { id: 'r5', duplaId: 'd5', fase: 'Final', colocacao: '2º lugar', v: 5, d: 1, obs: 'Vice-campeões.' },
        { id: 'r6', duplaId: 'd6', fase: 'Semifinal', colocacao: '4º lugar', v: 3, d: 2, obs: '' },
        { id: 'r7', duplaId: 'd7', fase: 'Final', colocacao: 'Campeãs', v: 5, d: 0, obs: 'Sem perder sets.' },
      ],
      notas: 'Primeira competição da temporada. Serviu para testar as duplas formadas na base.',
    },
    c1: {
      duplas: [
        dupla('d1', 'a1', 'a2', 'Sub-18 Masc', 'confirmada'),
        dupla('d2', 'a3', 'a4', 'Sub-18 Masc', 'confirmada'),
        dupla('d3', 'a5', 'a6', 'Sub-18 Masc', 'confirmada'),
        dupla('d4', 'a7', 'a8', 'Sub-18 Masc', 'prevista'),
        dupla('d5', 'a9', 'a10', 'Sub-18 Masc', 'prevista'),
        dupla('d6', 'a11', 'a12', 'Sub-18 Masc', 'reserva'),
        dupla('d7', 'b1', 'b2', 'Adulto Masc', 'confirmada'),
        dupla('d8', 'c1', 'c2', 'Adulto Fem', 'prevista'),
        dupla('d9', 'e1', 'e2', 'Sub-19 Fem', 'confirmada'),
      ],
      viagem: { necessaria: false, saida: '', retorno: '', chegada: '', transporte: '', hospedagem: '', alimentacao: '', bateBola: { data: '2026-10-16', hora: '15:30', local: 'Praia de Tambaú, quadra 3' } },
      orcamento: [item('o1', 'Inscrições (9 duplas)', 'inscricao', 1080, null), item('o2', 'Água, lanche e gelo', 'alimentacao', 350, null)],
      equipe: [{ profId: 'p1', funcao: 'Técnico principal' }, { profId: 'p2', funcao: 'Auxiliar técnico' }],
      resultados: [],
      notas: 'Competição em casa. Usar para testar o plano de jogo do side-out.',
    },
    c2: {
      duplas: [
        dupla('d1', 'a1', 'a2', 'Sub-18 Masc', 'confirmada'),
        dupla('d2', 'a3', 'a4', 'Sub-18 Masc', 'confirmada'),
        dupla('d3', 'a5', 'a6', 'Sub-18 Masc', 'prevista'),
        dupla('d4', 'a7', 'a8', 'Sub-18 Masc', 'prevista'),
        dupla('d5', 'a9', 'a10', 'Sub-18 Masc', 'reserva'),
      ],
      viagem: {
        necessaria: true, saida: '2026-11-25', retorno: '2026-11-30', chegada: '26/11 às 12h',
        transporte: 'Duas vans locadas, saída às 5h da sede',
        hospedagem: 'Hotel Ponta Verde, 4 diárias, quartos triplos',
        alimentacao: 'Café incluso. Almoço e jantar a R$ 70 por pessoa/dia, pagos pelo clube',
        bateBola: { data: '2026-11-26', hora: '16:00', local: 'Quadras da Praia de Pajuçara' },
      },
      orcamento: [
        item('o1', 'Inscrições (5 duplas)', 'inscricao', 750, null),
        item('o2', 'Vans locadas (2) e combustível', 'transporte', 4200, null),
        item('o3', 'Hotel, 4 diárias', 'hospedagem', 6400, null),
        item('o4', 'Almoço e jantar', 'alimentacao', 3150, null),
        item('o5', 'Kit de fisioterapia e gelo', 'outros', 400, null),
      ],
      equipe: [{ profId: 'p1', funcao: 'Técnico principal' }, { profId: 'p2', funcao: 'Auxiliar técnico' }, { profId: 'p4', funcao: 'Fisioterapeuta' }],
      resultados: [],
      notas: 'Competição alvo do Ciclo 1. Chegar um dia antes para ajustar fuso de jogo e fazer bate-bola na areia local.',
    },
    c3: {
      duplas: [
        dupla('d1', 'b1', 'b2', 'Adulto Masc', 'prevista'),
        dupla('d2', 'b3', 'b4', 'Adulto Masc', 'prevista'),
        dupla('d3', 'c1', 'c2', 'Adulto Fem', 'prevista'),
        dupla('d4', 'c3', 'c4', 'Adulto Fem', 'prevista'),
      ],
      viagem: { necessaria: false, saida: '', retorno: '', chegada: '', transporte: '', hospedagem: '', alimentacao: '', bateBola: { data: '', hora: '', local: '' } },
      orcamento: [],
      equipe: [{ profId: 'p1', funcao: 'Técnico principal' }],
      resultados: [],
      notas: '',
    },
    c4: {
      duplas: [dupla('d1', 'e1', 'e2', 'Sub-19 Fem', 'prevista')],
      viagem: { necessaria: true, saida: '2026-12-04', retorno: '2026-12-07', chegada: '', transporte: 'Ônibus intermunicipal', hospedagem: '', alimentacao: '', bateBola: { data: '', hora: '', local: '' } },
      orcamento: [item('o1', 'Inscrição', 'inscricao', 150, null)],
      equipe: [],
      resultados: [],
      notas: 'Definir hospedagem e quem acompanha.',
    },
  };

  const semPlanejamento = () => ({
    duplas: [],
    viagem: { necessaria: false, saida: '', retorno: '', chegada: '', transporte: '', hospedagem: '', alimentacao: '', bateBola: { data: '', hora: '', local: '' } },
    orcamento: [],
    equipe: [],
    resultados: [],
    notas: '',
  });

  const plan = (id) => (PLANEJ[id] = PLANEJ[id] || semPlanejamento());
  const fimDe = (c) => c.fim || c.data;
  const passada = (c) => fimDe(c) < HOJE;

  // Quem viaja: atletas das duplas confirmadas e a equipe técnica.
  function quemVai(id) {
    const p = plan(id);
    const atletas = [];
    p.duplas.filter((d) => d.status === 'confirmada').forEach((d) => { atletas.push(d.a, d.b); });
    return { atletas: [...new Set(atletas)], equipe: p.equipe.map((e) => e.profId) };
  }

  function orcamentoTotais(id) {
    const o = plan(id).orcamento;
    const previsto = o.reduce((a, i) => a + (Number(i.previsto) || 0), 0);
    const real = o.reduce((a, i) => a + (i.real == null ? 0 : Number(i.real) || 0), 0);
    const comReal = o.filter((i) => i.real != null).length;
    return { previsto, real, comReal, itens: o.length };
  }

  // Situação do preparo, em quatro frentes, para o semáforo da lista.
  function prontidao(id) {
    const c = COMPETICOES[id];
    const p = plan(id);
    const conf = p.duplas.filter((d) => d.status === 'confirmada').length;
    const prev = p.duplas.filter((d) => d.status === 'prevista').length;
    const v = p.viagem;
    const itens = [];

    itens.push({
      chave: 'duplas', nome: 'Duplas',
      estado: conf > 0 && prev === 0 ? 'ok' : p.duplas.length ? 'parcial' : 'vazio',
      texto: p.duplas.length ? `${conf} confirmada${conf === 1 ? '' : 's'}${prev ? `, ${prev} prevista${prev === 1 ? '' : 's'}` : ''}` : 'Nenhuma dupla',
    });

    if (!v.necessaria) {
      itens.push({ chave: 'viagem', nome: 'Viagem', estado: 'na', texto: 'Sem viagem' });
    } else {
      const falta = [];
      if (!v.saida || !v.retorno) falta.push('datas');
      if (!v.transporte) falta.push('transporte');
      if (!v.hospedagem) falta.push('hospedagem');
      if (!p.orcamento.length) falta.push('orçamento');
      itens.push({
        chave: 'viagem', nome: 'Viagem',
        estado: falta.length === 0 ? 'ok' : falta.length >= 3 ? 'vazio' : 'parcial',
        texto: falta.length ? `Falta: ${falta.join(', ')}` : 'Roteiro completo',
      });
    }

    itens.push({
      chave: 'equipe', nome: 'Equipe',
      estado: p.equipe.length ? 'ok' : 'vazio',
      texto: p.equipe.length ? `${p.equipe.length} professor${p.equipe.length === 1 ? '' : 'es'}` : 'Ninguém definido',
    });

    if (passada(c)) {
      itens.push({
        chave: 'resultados', nome: 'Resultados',
        estado: p.resultados.length >= Math.max(1, conf) ? 'ok' : p.resultados.length ? 'parcial' : 'vazio',
        texto: p.resultados.length ? `${p.resultados.length} de ${conf} duplas` : 'Não lançados',
      });
    }
    return itens;
  }

  /* ---------- Edição ---------- */

  const api = {
    COMPETICOES, categorias, NIVEIS, CATEGORIAS_ORCAMENTO, STATUS_DUPLA, FUNCOES_EQUIPE,
    plan, fimDe, passada, quemVai, orcamentoTotais, prontidao,
    lista: () => Object.values(COMPETICOES).sort((a, b) => a.data - b.data),

    criar(dados) {
      const id = novoId('cx');
      COMPETICOES[id] = { id, ...dados };
      PLANEJ[id] = semPlanejamento();
      return id;
    },
    atualizar(id, patch) { Object.assign(COMPETICOES[id], patch); },

    adicionarDupla(id, d) {
      const p = plan(id);
      const motivo = window.Farol.elenco.cadastro.validarDupla(d.a, d.b, d.cat, new Date(COMPETICOES[id].data).getUTCFullYear());
      if (motivo) return { erro: motivo };
      if (p.duplas.some((x) => [x.a, x.b].includes(d.a) || [x.a, x.b].includes(d.b))) {
        const quem = p.duplas.find((x) => [x.a, x.b].includes(d.a) || [x.a, x.b].includes(d.b));
        const nome = [quem.a, quem.b].map((a) => ATLETAS[a].nome).join(' e ');
        return { erro: `Um dos atletas já está na dupla ${nome}.` };
      }
      p.duplas.push({ id: novoId('d'), ...d });
      return {};
    },
    alterarDupla(id, duplaId, patch) { Object.assign(plan(id).duplas.find((d) => d.id === duplaId), patch); },
    removerDupla(id, duplaId) {
      const p = plan(id);
      p.duplas = p.duplas.filter((d) => d.id !== duplaId);
      p.resultados = p.resultados.filter((r) => r.duplaId !== duplaId);
    },

    salvarViagem(id, patch) {
      const v = plan(id).viagem;
      const { bateBola, ...resto } = patch;
      Object.assign(v, resto);
      if (bateBola) Object.assign(v.bateBola, bateBola);
    },

    adicionarItem(id, it) { plan(id).orcamento.push({ id: novoId('o'), real: null, ...it }); },
    alterarItem(id, itemId, patch) { Object.assign(plan(id).orcamento.find((i) => i.id === itemId), patch); },
    removerItem(id, itemId) { const p = plan(id); p.orcamento = p.orcamento.filter((i) => i.id !== itemId); },

    adicionarProf(id, profId, funcao) {
      const p = plan(id);
      if (!p.equipe.some((e) => e.profId === profId)) p.equipe.push({ profId, funcao });
    },
    removerProf(id, profId) { const p = plan(id); p.equipe = p.equipe.filter((e) => e.profId !== profId); },

    salvarResultado(id, r) {
      const p = plan(id);
      const i = p.resultados.findIndex((x) => x.duplaId === r.duplaId);
      if (i >= 0) p.resultados[i] = { ...p.resultados[i], ...r };
      else p.resultados.push({ id: novoId('r'), ...r });
    },
    removerResultado(id, duplaId) { const p = plan(id); p.resultados = p.resultados.filter((r) => r.duplaId !== duplaId); },

    salvarNotas(id, texto) { plan(id).notas = texto; },
  };

  // Conta cadastrada: começa sem competições de exemplo e guarda as do técnico neste aparelho.
  // Cada função que altera algo passa a gravar logo depois.
  const CONTA = window.Farol.conta;
  if (CONTA.guardaDados()) {
    const CH = CONTA.chave('competicoes');
    [COMPETICOES, PLANEJ].forEach((o) => Object.keys(o).forEach((k) => { delete o[k]; }));
    try {
      const g = JSON.parse(localStorage.getItem(CH) || 'null');
      if (g) { Object.assign(COMPETICOES, g.competicoes || {}); Object.assign(PLANEJ, g.planej || {}); seq = g.seq || 0; }
    } catch (e) { /* começa vazio */ }
    const gravar = () => { try { localStorage.setItem(CH, JSON.stringify({ competicoes: COMPETICOES, planej: PLANEJ, seq })); } catch (e) { /* ignora */ } };
    ['criar', 'atualizar', 'adicionarDupla', 'alterarDupla', 'removerDupla', 'salvarViagem', 'adicionarItem', 'alterarItem', 'removerItem',
      'adicionarProf', 'removerProf', 'salvarResultado', 'removerResultado', 'salvarNotas'].forEach((nome) => {
      const f = api[nome];
      api[nome] = (...args) => { const r = f(...args); gravar(); return r; };
    });
  }

  window.Farol = window.Farol || {};
  window.Farol.calendario = api;
})();
