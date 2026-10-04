/* Exercícios e prescrição do treino físico (tabelas previstas: `exercicios`, `planos_treino`, `treino_prescrito`).
   - Catálogo: cada exercício tem categoria, grupos musculares, equipamento, nível, vídeo e dica técnica.
     `tags` dizem o que o exercício exige (salto, corrida, ataque acima da cabeça, queda) e `regioes` onde ele pesa
     (tornozelo, joelho, ombro…). É isso que permite cruzar com a saúde do atleta.
   - Plano de treino (modelo): lista ordenada de exercícios com séries, repetições, carga e descanso.
   - Prescrição: um plano aplicado a uma turma ou a atletas, numa data, opcionalmente ligado a uma sessão física do
     microciclo. Atletas com lesão ou restrição ativa aparecem com conflito e recebem sugestão de troca.
   - Execução: ao marcar como feita, o técnico informa a duração e o PSE de cada atleta (`exec`). Esse treino entra na carga
     total do atleta (duração × PSE), junto com o treino de quadra. Se a prescrição está ligada a uma sessão do microciclo,
     a carga já vem do registro dessa sessão e não é contada de novo.
   O que o técnico criar fica no navegador (`ft.prescricao.v1`). */
(function () {
  const { HOJE, DIA, ms, hash, clamp } = window.Farol.util;
  const { ATLETAS, TURMAS } = window.Farol.elenco;

  /* ---------- Vocabulário ---------- */

  const CATEGORIAS = { forca: 'Força', potencia: 'Potência', core: 'Core e estabilidade', prevencao: 'Prevenção', mobilidade: 'Mobilidade', cond: 'Condicionamento' };
  const GRUPOS = { quad: 'Quadríceps', post: 'Posterior de coxa', glut: 'Glúteos', pant: 'Panturrilha', aduc: 'Adutores', tornoz: 'Tornozelo', core: 'Core', ombro: 'Ombro', costas: 'Costas', peito: 'Peito', bracos: 'Braços', corpo: 'Corpo todo' };
  const EQUIPS = ['Peso do corpo', 'Barra', 'Halter', 'Kettlebell', 'Elástico', 'Medicine ball', 'Caixote', 'Areia', 'Barra fixa', 'Superfície instável', 'Bicicleta', 'Bastão'];
  const NIVEIS = { inic: 'Iniciante', inter: 'Intermediário', avan: 'Avançado' };
  // O que o exercício exige. As chaves são as mesmas das restrições do cadastro de saúde.
  const TAGS = { salto: 'Saltos', corrida: 'Corrida', ataque: 'Braço acima da cabeça', queda: 'Quedas e mergulhos' };
  const REGIOES = { tornozelo: 'Tornozelo', joelho: 'Joelho', quadril: 'Quadril', lombar: 'Lombar', ombro: 'Ombro', punho: 'Punho ou mão', coxa: 'Coxa' };
  // Palavras da região do corpo (cadastro de saúde) que ligam a cada região de carga.
  const CHAVE_REGIAO = { tornozelo: 'tornozelo', joelho: 'joelho', quadril: 'quadril', lombar: 'lombar', ombro: 'ombro', punho: 'punho', dedos: 'punho', coxa: 'coxa' };
  const CARGAS = { pc: 'Peso do corpo', kg: 'kg', pct: '% de 1RM', pse: 'PSE' };

  /* ---------- Catálogo de exemplo ---------- */

  const E = (id, nome, cat, grupos, equip, nivel, tags, regioes, dica) => ({ id, nome, cat, grupos, equip, nivel, tags, regioes, video: '', dica });
  const EXERCICIOS = [
    E('e1', 'Agachamento livre', 'forca', ['quad', 'glut'], 'Barra', 'inter', [], ['joelho', 'lombar'], 'Peito aberto, joelhos na linha dos pés, desce até as coxas ficarem paralelas ao chão.'),
    E('e2', 'Agachamento búlgaro', 'forca', ['quad', 'glut'], 'Halter', 'inter', [], ['joelho', 'tornozelo'], 'Pé de trás apoiado no banco, tronco firme, joelho da frente sem passar muito dos dedos.'),
    E('e3', 'Levantamento terra romeno', 'forca', ['post', 'glut'], 'Barra', 'inter', [], ['lombar'], 'Quadril para trás, coluna neutra, barra rente às pernas.'),
    E('e4', 'Avanço caminhando', 'forca', ['quad', 'glut'], 'Halter', 'inic', [], ['joelho', 'tornozelo'], 'Passo longo, tronco alto, joelho de trás quase toca o chão.'),
    E('e5', 'Elevação de quadril unilateral', 'forca', ['glut', 'post'], 'Peso do corpo', 'inic', [], [], 'Costas apoiadas, sobe o quadril apertando o glúteo, sem arquear a lombar.'),
    E('e6', 'Panturrilha em pé unilateral', 'forca', ['pant'], 'Halter', 'inic', [], ['tornozelo'], 'Sobe devagar, pausa de 1 segundo no alto, desce completo.'),
    E('e7', 'Supino com halteres', 'forca', ['peito', 'bracos'], 'Halter', 'inter', [], ['ombro'], 'Escápulas juntas, cotovelos a 45 graus do tronco.'),
    E('e8', 'Remada curvada', 'forca', ['costas', 'bracos'], 'Barra', 'inter', [], ['lombar'], 'Tronco inclinado e firme, puxa a barra em direção ao umbigo.'),
    E('e9', 'Barra fixa', 'forca', ['costas', 'bracos'], 'Barra fixa', 'avan', [], ['ombro'], 'Ombros longe das orelhas, queixo passa da barra, desce controlado.'),
    E('e10', 'Desenvolvimento com halteres', 'forca', ['ombro', 'bracos'], 'Halter', 'inter', ['ataque'], ['ombro'], 'Core firme, não arquear a lombar, sobe sem encostar os halteres.'),
    E('e11', 'Flexão de braço', 'forca', ['peito', 'bracos'], 'Peso do corpo', 'inic', [], ['ombro', 'punho'], 'Corpo em linha reta, peito quase toca o chão.'),
    E('e12', 'Remada unilateral com halter', 'forca', ['costas'], 'Halter', 'inic', [], [], 'Apoio no banco, cotovelo rente ao corpo, sem girar o tronco.'),
    E('e13', 'Flexora nórdica', 'forca', ['post'], 'Peso do corpo', 'avan', [], ['joelho', 'coxa'], 'Quadril estendido, desce o mais lento possível e se ampara com as mãos.'),
    E('e14', 'Salto com contramovimento', 'potencia', ['quad', 'glut'], 'Peso do corpo', 'inic', ['salto'], ['tornozelo', 'joelho'], 'Desce rápido e sobe explosivo, aterrissa com os joelhos macios.'),
    E('e15', 'Salto no caixote', 'potencia', ['quad', 'glut'], 'Caixote', 'inter', ['salto'], ['tornozelo', 'joelho'], 'Aterrissa com os dois pés no alto, desce andando.'),
    E('e16', 'Salto em profundidade', 'potencia', ['quad', 'pant'], 'Caixote', 'avan', ['salto'], ['tornozelo', 'joelho'], 'Cai do caixote e salta de imediato, contato curto com o chão.'),
    E('e17', 'Saltos horizontais na areia', 'potencia', ['quad', 'glut'], 'Areia', 'inter', ['salto'], ['tornozelo'], 'Séries de 5 saltos seguidos, ênfase em distância e na aterrissagem.'),
    E('e18', 'Arremesso de medicine ball acima da cabeça', 'potencia', ['ombro', 'core'], 'Medicine ball', 'inic', ['ataque'], ['ombro'], 'Do quadril ao ombro, o corpo todo participa do arremesso.'),
    E('e19', 'Arremesso rotacional de medicine ball', 'potencia', ['core'], 'Medicine ball', 'inic', [], ['lombar'], 'Gira a partir do quadril, solta a bola na frente do corpo.'),
    E('e20', 'Agachamento com salto', 'potencia', ['quad', 'glut'], 'Peso do corpo', 'inic', ['salto'], ['joelho', 'tornozelo'], 'Agacha até 90 graus e salta alto, braços ajudam no impulso.'),
    E('e21', 'Kettlebell swing', 'potencia', ['glut', 'post'], 'Kettlebell', 'inter', [], ['lombar'], 'O movimento vem do quadril, braços só conduzem.'),
    E('e22', 'Sprint de 10 metros na areia', 'potencia', ['quad', 'post'], 'Areia', 'inic', ['corrida'], ['coxa', 'tornozelo'], 'Primeiros passos curtos e rápidos, tronco inclinado.'),
    E('e23', 'Sprint com mudança de direção', 'potencia', ['quad', 'post'], 'Areia', 'inter', ['corrida'], ['tornozelo', 'joelho'], 'Freia com o pé de fora, abaixa o centro de gravidade na curva.'),
    E('e24', 'Arranque com halter', 'potencia', ['corpo'], 'Halter', 'avan', ['ataque'], ['ombro', 'lombar'], 'Extensão completa de quadril antes de puxar; técnica antes de carga.'),
    E('e25', 'Prancha frontal', 'core', ['core'], 'Peso do corpo', 'inic', [], [], 'Corpo em linha reta, glúteos e abdômen contraídos.'),
    E('e26', 'Prancha lateral', 'core', ['core', 'ombro'], 'Peso do corpo', 'inic', [], ['ombro'], 'Quadril alto, ombro sobre o cotovelo.'),
    E('e27', 'Dead bug', 'core', ['core'], 'Peso do corpo', 'inic', [], [], 'Lombar colada no chão, braço e perna opostos descem juntos.'),
    E('e28', 'Pallof press', 'core', ['core'], 'Elástico', 'inic', [], [], 'Resiste à rotação, empurra o elástico à frente sem girar o tronco.'),
    E('e29', 'Rotação russa com medicine ball', 'core', ['core'], 'Medicine ball', 'inic', [], ['lombar'], 'Tronco inclinado, gira os ombros e não só os braços.'),
    E('e30', 'Elevação de pernas na barra', 'core', ['core'], 'Barra fixa', 'avan', [], ['ombro', 'lombar'], 'Sem balançar, sobe as pernas controlando a descida.'),
    E('e31', 'Rotação externa de ombro com elástico', 'prevencao', ['ombro'], 'Elástico', 'inic', [], ['ombro'], 'Cotovelo colado ao corpo, movimento lento e curto.'),
    E('e32', 'Y, T e W no banco', 'prevencao', ['ombro', 'costas'], 'Halter', 'inic', [], ['ombro'], 'Peso leve, polegares para cima, escápulas ativas.'),
    E('e33', 'Equilíbrio unipodal instável', 'prevencao', ['tornoz', 'pant'], 'Superfície instável', 'inic', [], ['tornozelo'], 'Joelho levemente flexionado, olhar à frente.'),
    E('e34', 'Copenhagen', 'prevencao', ['aduc'], 'Peso do corpo', 'inter', [], ['coxa', 'quadril'], 'Pé de cima no banco, quadril alto, sobe e desce devagar.'),
    E('e35', 'Fortalecimento de tornozelo com elástico', 'prevencao', ['tornoz'], 'Elástico', 'inic', [], ['tornozelo'], 'Quatro direções, amplitude completa e sem pressa.'),
    E('e36', 'Aterrissagem controlada', 'prevencao', ['quad', 'glut'], 'Peso do corpo', 'inic', ['salto'], ['joelho', 'tornozelo'], 'Aterrissa e congela por 2 segundos, joelhos alinhados com os pés.'),
    E('e37', 'Mobilidade de tornozelo na parede', 'mobilidade', ['tornoz'], 'Peso do corpo', 'inic', [], ['tornozelo'], 'Joelho vai à parede sem tirar o calcanhar do chão.'),
    E('e38', 'Alongamento do flexor de quadril', 'mobilidade', ['quad'], 'Peso do corpo', 'inic', [], ['quadril'], 'Joelho no chão, abdômen firme, empurra o quadril à frente.'),
    E('e39', 'Rotação torácica no solo', 'mobilidade', ['costas', 'core'], 'Peso do corpo', 'inic', [], [], 'Deitado de lado, abre o braço de cima e segue com os olhos.'),
    E('e40', 'Mobilidade de ombro com bastão', 'mobilidade', ['ombro'], 'Bastão', 'inic', [], ['ombro'], 'Braços esticados, passa o bastão por cima da cabeça sem dobrar.'),
    E('e41', 'Gato-camelo e agachamento profundo', 'mobilidade', ['core', 'quad'], 'Peso do corpo', 'inic', [], [], 'Alterna a coluna redonda e estendida, depois agacha fundo com calcanhares no chão.'),
    E('e42', 'Corrida contínua leve', 'cond', ['corpo'], 'Areia', 'inic', ['corrida'], ['tornozelo', 'joelho'], 'Ritmo em que dá para conversar, 20 a 30 minutos.'),
    E('e43', 'Circuito de defesa e mergulho na areia', 'cond', ['corpo'], 'Areia', 'inter', ['corrida', 'queda'], ['ombro', 'punho'], 'Séries curtas e intensas, volta caminhando.'),
    E('e44', 'Bicicleta leve', 'cond', ['quad', 'post'], 'Bicicleta', 'inic', [], [], 'Sem impacto: boa opção de condicionamento durante o retorno de lesões.'),
    E('e45', 'Deslocamento na água', 'cond', ['corpo'], 'Peso do corpo', 'inic', [], [], 'Corrida e saltos leves na água na altura da cintura; baixíssimo impacto.'),
  ];

  const I = (ex, series, reps, carga, valor, desc, obs) => ({ ex, series, reps: String(reps), carga, valor: valor == null ? null : valor, desc, obs: obs || '' });
  const PLANOS = [
    { id: 'm1', nome: 'Força de base, inferiores', objetivo: 'Construir força geral de pernas e quadril na fase de base.', fase: 'base', itens: [I('e1', 4, 6, 'pct', 70, 150), I('e3', 3, 8, 'pct', 65, 120), I('e4', 3, 10, 'kg', null, 90), I('e5', 3, 12, 'pc', null, 60), I('e6', 3, 12, 'kg', null, 60), I('e25', 3, '40s', 'pc', null, 45)] },
    { id: 'm2', nome: 'Força de base, superiores e core', objetivo: 'Força de tronco e ombros para atacar, sacar e se proteger.', fase: 'base', itens: [I('e7', 4, 8, 'kg', null, 120), I('e8', 4, 8, 'kg', null, 120), I('e10', 3, 10, 'kg', null, 90), I('e9', 3, 'máx.', 'pc', null, 120), I('e28', 3, 10, 'pc', null, 45), I('e26', 3, '30s', 'pc', null, 45)] },
    { id: 'm3', nome: 'Potência e salto, fase específica', objetivo: 'Transformar a força em salto e velocidade.', fase: 'especifico', itens: [I('e14', 4, 5, 'pc', null, 90), I('e15', 4, 4, 'pc', null, 90), I('e21', 4, 10, 'kg', null, 90), I('e18', 3, 6, 'kg', null, 75, 'Bola de 3 kg'), I('e22', 6, '10 m', 'pc', null, 60), I('e19', 3, 8, 'kg', null, 60)] },
    { id: 'm4', nome: 'Prevenção de ombro e tornozelo', objetivo: 'Reduzir o risco das lesões mais comuns do vôlei de praia.', fase: null, itens: [I('e31', 3, 15, 'pc', null, 30, 'Elástico leve'), I('e32', 3, 8, 'kg', null, 45), I('e33', 3, '30s', 'pc', null, 30), I('e35', 3, 15, 'pc', null, 30), I('e36', 3, 6, 'pc', null, 45), I('e34', 3, '20s', 'pc', null, 45)] },
    { id: 'm5', nome: 'Mobilidade e recuperação ativa', objetivo: 'Soltar o corpo depois de semana pesada ou jogo.', fase: 'competicao', itens: [I('e37', 2, 10, 'pc', null, 20), I('e38', 2, '30s', 'pc', null, 20), I('e39', 2, 10, 'pc', null, 20), I('e40', 2, 10, 'pc', null, 20), I('e41', 2, 10, 'pc', null, 20), I('e44', 1, '15 min', 'pse', 3, 0)] },
    { id: 'm6', nome: 'Retorno de tornozelo, sem impacto', objetivo: 'Manter condicionamento e força enquanto o tornozelo se recupera.', fase: null, itens: [I('e44', 1, '20 min', 'pse', 4, 0), I('e5', 3, 12, 'pc', null, 60), I('e27', 3, 10, 'pc', null, 30), I('e28', 3, 10, 'pc', null, 30), I('e35', 3, 15, 'pc', null, 30, 'Dentro da dor tolerável'), I('e12', 3, 10, 'kg', null, 60)] },
  ];

  const prox = (offs) => HOJE + offs * DIA;

  // Execução de exemplo das prescrições já feitas: duração e PSE por atleta, com algumas faltas.
  function execExemplo(p) {
    const pse = {}, fez = {};
    window.Farol.elenco.TURMAS[p.alvo.turmaId].atletas.forEach((id) => {
      const r = hash(p.id + id + 'x');
      fez[id] = r < 0.9;
      if (fez[id]) pse[id] = clamp(Math.round(p.exec.base + (hash(p.id + id + 'e') - 0.5) * 3), 1, 10);
    });
    return { duracao: p.exec.duracao, fez, pse };
  }
  const PRESCRICOES = [
    { id: 'p1', plano: 'm3', alvo: { tipo: 'turma', turmaId: 'sub18' }, data: prox(2), sessao: null, status: 'prescrita', aj: {}, nota: 'Segunda: treino físico depois do aquecimento na areia.' },
    { id: 'p2', plano: 'm2', alvo: { tipo: 'turma', turmaId: 'adulto' }, data: prox(-14), sessao: null, status: 'feita', aj: {}, nota: '', exec: { duracao: 55, base: 6 } },
    { id: 'p4', plano: 'm4', alvo: { tipo: 'turma', turmaId: 'sub18' }, data: prox(-6), sessao: null, status: 'feita', aj: {}, nota: '', exec: { duracao: 40, base: 4 } },
    { id: 'p3', plano: 'm6', alvo: { tipo: 'atletas', ids: ['a9'] }, data: prox(2), sessao: null, status: 'prescrita', aj: {}, nota: 'Sem corrida e sem salto até a liberação da fisioterapia.' },
  ];

  /* ---------- Armazenamento ---------- */

  const CHAVE = 'ft.prescricao.v1';
  let exercicios = EXERCICIOS.map((x) => ({ ...x }));
  let planos = PLANOS.map((x) => ({ ...x, itens: x.itens.map((i) => ({ ...i })) }));
  let prescricoes = PRESCRICOES.map((x) => ({ ...x, aj: {}, exec: x.exec ? execExemplo(x) : null }));
  let seq = { e: 100, m: 100, p: 100 };
  try {
    const g = JSON.parse(localStorage.getItem(CHAVE) || 'null');
    if (g && g.exercicios && g.planos && g.prescricoes) { exercicios = g.exercicios; planos = g.planos; prescricoes = g.prescricoes; seq = g.seq || seq; }
    PRESCRICOES.filter((x) => x.exec && !prescricoes.some((p) => p.id === x.id)).forEach((x) => prescricoes.push({ ...x, aj: {}, exec: execExemplo(x) }));
    prescricoes.forEach((p) => { const seed = PRESCRICOES.find((x) => x.id === p.id && x.exec); if (seed && p.status === 'feita' && p.exec === undefined) { p.exec = seed.exec; p.exec = execExemplo(p); if (p.id === 'p2') p.data = seed.data; } });
  } catch (e) { /* segue em memória */ }
  const gravar = () => { try { localStorage.setItem(CHAVE, JSON.stringify({ exercicios, planos, prescricoes, seq })); } catch (e) { /* ignora */ } };
  const novoId = (p) => `${p}${++seq[p]}`;

  const ex = (id) => exercicios.find((x) => x.id === id) || null;
  const plano = (id) => planos.find((x) => x.id === id) || null;
  const presc = (id) => prescricoes.find((x) => x.id === id) || null;

  /* ---------- Cruzamento com a saúde ---------- */

  // Conflitos de um exercício para um atleta, a partir da ocorrência de saúde ativa (restrições e região do corpo).
  function conflito(atletaId, e) {
    const sit = window.Farol.elenco.situacaoDe ? window.Farol.elenco.situacaoDe(atletaId) : null;
    if (!sit || !e) return null;
    const motivos = [];
    const restr = (sit.restricoes || []).filter((r) => e.tags.includes(r));
    if (restr.length) motivos.push(`restrição: ${restr.map((r) => TAGS[r].toLowerCase()).join(', ')}`);
    const local = (sit.local || '').toLowerCase();
    const reg = e.regioes.filter((r) => Object.keys(CHAVE_REGIAO).some((k) => local.includes(k) && CHAVE_REGIAO[k] === r));
    if (reg.length) motivos.push(`pesa em ${reg.map((r) => REGIOES[r].toLowerCase()).join(', ')} (${sit.local.toLowerCase()})`);
    return motivos.length ? { motivos, tipo: sit.tipo } : null;
  }

  // Trocas possíveis: mesmo grupo ou categoria, sem conflito para o atleta, com os mais parecidos primeiro.
  function alternativas(atletaId, e) {
    return exercicios.filter((o) => o.id !== e.id && !conflito(atletaId, o))
      .map((o) => ({ o, pt: (o.cat === e.cat ? 3 : 0) + o.grupos.filter((g) => e.grupos.includes(g)).length * 2 + (o.equip === e.equip ? 1 : 0) }))
      .filter((x) => x.pt >= 2).sort((a, b) => b.pt - a.pt || a.o.nome.localeCompare(b.o.nome)).slice(0, 6).map((x) => x.o);
  }

  const atletasDe = (p) => (p.alvo.tipo === 'turma' ? TURMAS[p.alvo.turmaId].atletas.slice() : p.alvo.ids.slice());

  // Itens que cada atleta realmente faz: com a troca definida, o ajuste de carga e o conflito que sobrou.
  function itensDoAtleta(p, atletaId) {
    const m = plano(p.plano);
    const aj = (p.aj[atletaId] || {}).itens || {};
    return m.itens.map((it, i) => {
      const base = ex(it.ex);
      const a = aj[i] || {};
      const troca = a.ex ? ex(a.ex) : null;
      const efetivo = troca || base;
      return { i, it, base, troca, efetivo, kg: a.kg != null ? a.kg : null, conflito: conflito(atletaId, base), conflitoFinal: conflito(atletaId, efetivo) };
    });
  }

  const resumoConflitos = (p) => {
    const por = {};
    atletasDe(p).forEach((id) => {
      const itens = itensDoAtleta(p, id);
      const c = itens.filter((x) => x.conflito);
      if (c.length) por[id] = { total: c.length, resolvidos: c.filter((x) => x.troca && !x.conflitoFinal).length };
    });
    return por;
  };

  // Minutos estimados: 40 s por série de trabalho mais o descanso.
  const minutos = (m) => Math.round(m.itens.reduce((a, it) => a + it.series * (40 + (it.desc || 0)), 0) / 60);

  const API = {
    CATEGORIAS, GRUPOS, EQUIPS, NIVEIS, TAGS, REGIOES, CARGAS,
    exercicios: () => exercicios, ex, planos: () => planos, plano, prescricoes: () => prescricoes.slice().sort((a, b) => b.data - a.data), presc,
    conflito, alternativas, atletasDe, itensDoAtleta, resumoConflitos, minutos,
    usoDoExercicio: (id) => planos.filter((m) => m.itens.some((i) => i.ex === id)),

    salvarExercicio(d) {
      if (d.id) Object.assign(ex(d.id), d); else { d.id = novoId('e'); d.video = d.video || ''; exercicios.push(d); }
      gravar(); return d;
    },
    excluirExercicio(id) { exercicios = exercicios.filter((x) => x.id !== id); gravar(); },

    salvarPlano(d) {
      if (d.id && plano(d.id)) Object.assign(plano(d.id), d); else { d.id = novoId('m'); planos.push(d); }
      gravar(); return plano(d.id);
    },
    duplicarPlano(id) { const m = plano(id); const c = { ...m, id: novoId('m'), nome: `${m.nome} (cópia)`, itens: m.itens.map((i) => ({ ...i })) }; planos.push(c); gravar(); return c; },
    excluirPlano(id) { planos = planos.filter((x) => x.id !== id); prescricoes = prescricoes.filter((p) => p.plano !== id); gravar(); if (window.Farol.dados) window.Farol.dados.recarregar(); },

    prescrever(d) { const p = { id: novoId('p'), status: 'prescrita', aj: {}, nota: '', sessao: null, ...d }; prescricoes.push(p); gravar(); return p; },
    atualizarPrescricao(id, patch) { Object.assign(presc(id), patch); gravar(); },
    trocar(id, atletaId, i, exId) {
      const p = presc(id); p.aj[atletaId] = p.aj[atletaId] || { itens: {} }; p.aj[atletaId].itens[i] = p.aj[atletaId].itens[i] || {};
      if (exId) p.aj[atletaId].itens[i].ex = exId; else delete p.aj[atletaId].itens[i].ex;
      gravar();
    },
    carga(id, atletaId, i, kg) {
      const p = presc(id); p.aj[atletaId] = p.aj[atletaId] || { itens: {} }; p.aj[atletaId].itens[i] = p.aj[atletaId].itens[i] || {};
      if (kg == null || kg === '') delete p.aj[atletaId].itens[i].kg; else p.aj[atletaId].itens[i].kg = Number(kg);
      gravar();
    },
    sugerirTrocas(id) {
      const p = presc(id);
      atletasDe(p).forEach((aid) => itensDoAtleta(p, aid).forEach((x) => {
        if (!x.conflito || x.troca) return;
        const alt = alternativas(aid, x.base)[0];
        if (alt) API.trocar(id, aid, x.i, alt.id);
      }));
    },
    // Registra como foi o treino: duração e, por atleta, se fez e o PSE (1 a 10, ou vazio). Marca a prescrição como feita.
    registrarExecucao(id, exec) {
      const p = presc(id);
      p.exec = { duracao: exec.duracao, fez: exec.fez, pse: exec.pse };
      p.status = 'feita';
      gravar();
      if (window.Farol.dados) window.Farol.dados.recarregar();
    },
    reabrir(id) {
      presc(id).status = 'prescrita';
      gravar();
      if (window.Farol.dados) window.Farol.dados.recarregar();
    },
    // Treinos físicos que o atleta fez em [ini, fim) e que ainda não estão em nenhuma sessão do microciclo.
    execucoes(atletaId, ini, fim) {
      return prescricoes.filter((p) => p.status === 'feita' && p.exec && !p.sessao && p.data >= ini && p.data < fim
        && p.exec.fez[atletaId] && p.exec.pse[atletaId] != null && atletasDe(p).includes(atletaId))
        .map((p) => ({ id: p.id, data: p.data, nome: plano(p.plano).nome, dur: p.exec.duracao, pse: p.exec.pse[atletaId], carga: p.exec.duracao * p.exec.pse[atletaId] }));
    },
    excluirPrescricao(id) { prescricoes = prescricoes.filter((x) => x.id !== id); gravar(); if (window.Farol.dados) window.Farol.dados.recarregar(); },
    // Prescrições de um atleta daqui para frente (para a página do atleta).
    doAtleta(atletaId) {
      return prescricoes.filter((p) => p.status === 'prescrita' && p.data >= HOJE - DIA && atletasDe(p).includes(atletaId)).sort((a, b) => a.data - b.data);
    },
  };

  window.Farol.prescricao = API;
  // Os planos foram montados antes desta tela carregar: refaz para incluir o treino físico já feito.
  if (window.Farol.dados && window.Farol.dados.recarregar) window.Farol.dados.recarregar();
  void ms; void ATLETAS;
})();
