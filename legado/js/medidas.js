/* Medidas para comparar atletas e grupos.
   Juntam duas fontes: testes físicos (`resultados_testes`, aqui de exemplo, com duas avaliações) e
   o que vem do treino (carga, PSE, PSR e presença, calculados a partir dos registros de treino).
   Regra de justiça: comparar sempre dentro da mesma faixa etária e do mesmo gênero quando o assunto
   for desempenho; o valor bruto entre gêneros mostra diferença fisiológica, não de qualidade. */
(function () {
  const { hash, media, ms, clamp } = window.Farol.util;
  const { ATLETAS_LISTA, ATLETAS, TURMAS } = window.Farol.elenco;
  const { dados } = window.Farol;

  const AVALIACOES = { anterior: ms('2026-08-03'), atual: ms('2026-09-21') };

  // melhor: 'alto' (quanto maior, melhor), 'baixo' (quanto menor, melhor) ou null (sem certo ou errado).
  const TESTES = [
    { id: 'cmj', grupo: 'teste', nome: 'Salto vertical', un: 'cm', melhor: 'alto', casas: 0 },
    { id: 'sprint', grupo: 'teste', nome: 'Sprint de 10 m', un: 's', melhor: 'baixo', casas: 2 },
    { id: 'agil', grupo: 'teste', nome: 'Agilidade (teste T com cones)', un: 's', melhor: 'baixo', casas: 2 },
    { id: 'med', grupo: 'teste', nome: 'Arremesso de disco, 3 kg', un: 'm', melhor: 'alto', casas: 1 },
  ];
  const TREINO = [
    { id: 'carga', grupo: 'treino', nome: 'Carga semanal média', un: 'UA', melhor: null, casas: 0 },
    { id: 'pse', grupo: 'treino', nome: 'PSE médio', un: '', melhor: null, casas: 1 },
    { id: 'psr', grupo: 'treino', nome: 'PSR médio', un: '', melhor: 'alto', casas: 1 },
    { id: 'pres', grupo: 'treino', nome: 'Presença', un: '%', melhor: 'alto', casas: 0 },
  ];
  // Avaliação corporal: o peso não tem lado melhor nem ranking entre atletas, só a evolução do próprio atleta.
  const CORPO = [{ id: 'peso', grupo: 'corpo', nome: 'Peso corporal', un: 'kg', melhor: null, casas: 1 }];
  const METRICAS = [...TESTES, ...CORPO, ...TREINO];
  const metrica = (id) => METRICAS.find((m) => m.id === id);

  // Valores típicos (média, desvio) por teste, gênero e faixa. Servem só para gerar os dados de exemplo.
  const BASE = {
    cmj: { M: { 'Sub-18': 47, Adulto: 54 }, F: { 'Sub-16': 31, 'Sub-19': 38, Adulto: 40 }, sd: 5, ganho: 1.5, gsd: 1 },
    sprint: { M: { 'Sub-18': 1.86, Adulto: 1.78 }, F: { 'Sub-16': 2.12, 'Sub-19': 2.02, Adulto: 2.0 }, sd: 0.08, ganho: -0.03, gsd: 0.02 },
    agil: { M: { 'Sub-18': 10.5, Adulto: 10.0 }, F: { 'Sub-16': 11.7, 'Sub-19': 11.2, Adulto: 11.1 }, sd: 0.4, ganho: -0.1, gsd: 0.07 },
    med: { M: { 'Sub-18': 6.4, Adulto: 7.4 }, F: { 'Sub-16': 4.2, 'Sub-19': 5.0, Adulto: 5.3 }, sd: 0.5, ganho: 0.2, gsd: 0.15 },
  };

  // Nas contas cadastradas não há avaliações de exemplo: só entra o que o técnico lançar.
  const DEMO = !window.Farol.conta.guardaDados();

  function valorTeste(id, teste, quando) {
    if (!DEMO) return null;
    const a = ATLETAS[id];
    const b = BASE[teste];
    const centro = b[a.genero][a.faixa];
    const atual = centro + (hash(id + teste + 'v') - 0.5) * 2 * b.sd * 1.2;
    const ganho = b.ganho + (hash(id + teste + 'g') - 0.5) * 2 * b.gsd;
    const v = quando === 'anterior' ? atual - ganho : atual;
    const f = 10 ** metrica(teste).casas;
    return Math.round(v * f) / f;
  }

  /* ---------- Peso ---------- */

  const BASE_PESO = { M: { 'Sub-18': 70, Adulto: 80 }, F: { 'Sub-16': 56, 'Sub-19': 61, Adulto: 63 }, sd: 6 };
  const CHAVE_PESO = window.Farol.conta.chave('ft.avaliacao.v1');
  let pesosSalvos = {}; // { atletaId: [{ t, kg }] } lançados pelo técnico
  try { const g = JSON.parse(localStorage.getItem(CHAVE_PESO) || 'null'); if (g && g.peso) pesosSalvos = g.peso; } catch (e) { /* segue em memória */ }
  const gravarPeso = () => { try { localStorage.setItem(CHAVE_PESO, JSON.stringify({ peso: pesosSalvos })); } catch (e) { /* ignora */ } };

  // Histórico de peso do atleta, do mais antigo ao mais novo: as duas avaliações de exemplo mais o que o técnico lançou.
  function pesoSerie(id) {
    const a = ATLETAS[id];
    const atual = Math.round((BASE_PESO[a.genero][a.faixa] + (hash(id + 'peso') - 0.5) * 2 * BASE_PESO.sd) * 10) / 10;
    const anterior = Math.round((atual - (hash(id + 'pesog') - 0.5) * 2.4) * 10) / 10;
    const base = DEMO ? [{ t: AVALIACOES.anterior, kg: anterior, origem: 'avaliação' }, { t: AVALIACOES.atual, kg: atual, origem: 'avaliação' }] : [];
    const meus = (pesosSalvos[id] || []).map((x) => ({ ...x, origem: 'lançado' }));
    return [...base, ...meus].sort((x, y) => x.t - y.t);
  }
  function registrarPeso(id, t, kg) {
    pesosSalvos[id] = (pesosSalvos[id] || []).filter((x) => x.t !== t);
    pesosSalvos[id].push({ t, kg: Math.round(kg * 10) / 10 });
    gravarPeso();
  }
  function removerPeso(id, t) { pesosSalvos[id] = (pesosSalvos[id] || []).filter((x) => x.t !== t); gravarPeso(); }
  function valorPeso(id, quando) {
    const s = pesoSerie(id);
    if (!s.length) return null;
    return quando === 'anterior' ? (s.length > 1 ? s[s.length - 2].kg : null) : s[s.length - 1].kg;
  }

  // Treino: últimas 4 semanas completas do plano em que o atleta está.
  function treinoDe(id) {
    const plano = dados.planos.find((p) => p.mock && p.atletas.includes(id)) || dados.planos.find((p) => p.atletas.includes(id));
    if (!plano || plano.semanaAtual < 1) return null;
    const cargas = [], pse = [], psr = [];
    let pres = 0, tot = 0;
    for (let i = Math.max(0, plano.semanaAtual - 4); i < plano.semanaAtual; i++) {
      const r = plano.semanas[i].registro;
      if (!r || !r.completo) continue;
      const p = r.porAtleta[id];
      if (!p || !p.sessoes) continue;
      cargas.push(p.total); pse.push(...p.pse); psr.push(...p.psr);
      pres += p.presencas; tot += p.sessoes;
    }
    if (!tot) return null;
    return { carga: media(cargas), pse: media(pse), psr: media(psr), pres: (100 * pres) / tot };
  }

  function valor(id, m, quando = 'atual') {
    if (metrica(m).grupo === 'teste') return valorTeste(id, m, quando);
    if (metrica(m).grupo === 'corpo') return valorPeso(id, quando);
    if (quando === 'anterior') return null;
    const t = treinoDe(id);
    return t && t[m] != null ? t[m] : null;
  }

  /* ---------- Grupos ---------- */

  function listaGrupos() {
    const faixas = [...new Set(ATLETAS_LISTA.map((a) => a.faixa))];
    return {
      turmas: Object.values(TURMAS).map((t) => ({ id: `turma:${t.id}`, nome: t.nome, membros: t.atletas.slice() })),
      faixas: faixas.map((f) => ({ id: `faixa:${f}`, nome: f, membros: ATLETAS_LISTA.filter((a) => a.faixa === f).map((a) => a.id) })),
      generos: [
        { id: 'genero:M', nome: 'Masculino', membros: ATLETAS_LISTA.filter((a) => a.genero === 'M').map((a) => a.id) },
        { id: 'genero:F', nome: 'Feminino', membros: ATLETAS_LISTA.filter((a) => a.genero === 'F').map((a) => a.id) },
      ],
      todos: [{ id: 'todos', nome: 'Todos os atletas', membros: ATLETAS_LISTA.map((a) => a.id) }],
    };
  }
  const todosGrupos = () => { const g = listaGrupos(); return [...g.turmas, ...g.faixas, ...g.generos, ...g.todos]; };
  const grupo = (id) => todosGrupos().find((g) => g.id === id);
  const generosDe = (ids) => new Set(ids.map((i) => ATLETAS[i].genero));
  const mesmaFaixaGenero = (id) => ATLETAS_LISTA.filter((a) => a.faixa === ATLETAS[id].faixa && a.genero === ATLETAS[id].genero).map((a) => a.id);
  const turmaDe = (id) => Object.values(TURMAS).find((t) => t.atletas.includes(id)) || null;

  /* ---------- Estatística ---------- */

  const mediana = (v) => {
    if (!v.length) return null;
    const o = v.slice().sort((a, b) => a - b), m = Math.floor(o.length / 2);
    return o.length % 2 ? o[m] : (o[m - 1] + o[m]) / 2;
  };

  // Posição de v entre os valores de referência, de 0 a 100, onde 100 é o melhor.
  // Empates contam meio ponto. Sem certo ou errado, vale "quanto maior o valor".
  function posicao(v, ref, melhor) {
    if (v == null || !ref.length) return null;
    let pior = 0;
    ref.forEach((x) => {
      if (x === v) pior += 0.5;
      else if (melhor === 'baixo' ? x > v : x < v) pior += 1;
    });
    return Math.round((pior / ref.length) * 100);
  }

  const valoresDe = (ids, m, quando) => ids.map((i) => valor(i, m, quando)).filter((v) => v != null);

  function formatar(v, m) {
    if (v == null) return 'n/d';
    const mm = typeof m === 'string' ? metrica(m) : m;
    return Number(v).toLocaleString('pt-BR', { minimumFractionDigits: mm.casas, maximumFractionDigits: mm.casas });
  }

  window.Farol.medidas = {
    AVALIACOES, TESTES, CORPO, TREINO, METRICAS, pesoSerie, registrarPeso, removerPeso, metrica, valor, valoresDe,
    listaGrupos, grupo, generosDe, mesmaFaixaGenero, turmaDe,
    mediana, media, posicao, formatar,
  };
})();
