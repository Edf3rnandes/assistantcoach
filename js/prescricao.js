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
  // O treino físico é na areia: os únicos implementos são o disco (anilha), o cone e a escada de agilidade.
  const EQUIPS = ['Peso do corpo', 'Disco', 'Cone', 'Escada de agilidade'];
  const NIVEIS = { inic: 'Iniciante', inter: 'Intermediário', avan: 'Avançado' };
  // O que o exercício exige. As chaves são as mesmas das restrições do cadastro de saúde.
  const TAGS = { salto: 'Saltos', corrida: 'Corrida', ataque: 'Braço acima da cabeça', queda: 'Quedas e mergulhos' };
  const REGIOES = { tornozelo: 'Tornozelo', joelho: 'Joelho', quadril: 'Quadril', lombar: 'Lombar', ombro: 'Ombro', punho: 'Punho ou mão', coxa: 'Coxa' };
  // Palavras da região do corpo (cadastro de saúde) que ligam a cada região de carga.
  const CHAVE_REGIAO = { tornozelo: 'tornozelo', joelho: 'joelho', quadril: 'quadril', lombar: 'lombar', ombro: 'ombro', punho: 'punho', dedos: 'punho', coxa: 'coxa' };
  const CARGAS = { pc: 'Peso do corpo', kg: 'kg', pse: 'PSE' };

  /* ---------- Catálogo de exemplo ---------- */

  const E = (id, nome, cat, grupos, equip, nivel, tags, regioes, dica) => ({ id, nome, cat, grupos, equip, nivel, tags, regioes, video: '', dica });
  const EXERCICIOS = [
    E('e1', 'Agachamento com disco junto ao peito', 'forca', ['quad', 'glut'], 'Disco', 'inter', [], ['joelho', 'lombar'], 'Disco junto ao peito, cotovelos para baixo; desce até as coxas ficarem paralelas ao chão, com os pés firmes na areia.'),
    E('e2', 'Agachamento unilateral assistido', 'forca', ['quad', 'glut'], 'Peso do corpo', 'inter', [], ['joelho', 'tornozelo'], 'Desce sobre uma perna só, com a outra à frente; tronco firme e joelho alinhado com o pé.'),
    E('e3', 'Levantamento terra romeno com disco', 'forca', ['post', 'glut'], 'Disco', 'inter', [], ['lombar'], 'Disco rente às pernas, quadril para trás, coluna neutra.'),
    E('e4', 'Avanço caminhando com disco', 'forca', ['quad', 'glut'], 'Disco', 'inic', [], ['joelho', 'tornozelo'], 'Disco junto ao peito, passo longo, tronco alto; o joelho de trás quase toca a areia.'),
    E('e5', 'Elevação de quadril unilateral', 'forca', ['glut', 'post'], 'Peso do corpo', 'inic', [], [], 'Costas apoiadas, sobe o quadril apertando o glúteo, sem arquear a lombar.'),
    E('e6', 'Panturrilha unilateral na areia', 'forca', ['pant'], 'Peso do corpo', 'inic', [], ['tornozelo'], 'Sobe devagar, pausa de 1 segundo no alto, desce completo; a areia exige mais do tornozelo.'),
    E('e7', 'Flexão com as mãos sobre discos', 'forca', ['peito', 'bracos'], 'Disco', 'inter', [], ['ombro', 'punho'], 'Mãos apoiadas em dois discos no chão, maior amplitude e menos pressão no punho; corpo em linha reta.'),
    E('e8', 'Remada curvada com disco', 'forca', ['costas', 'bracos'], 'Disco', 'inter', [], ['lombar'], 'Tronco inclinado e firme, puxa o disco em direção ao umbigo.'),
    E('e9', 'Prancha com arrasto de disco', 'forca', ['costas', 'core'], 'Disco', 'inter', [], ['ombro', 'lombar'], 'Em prancha alta, arrasta o disco de um lado para o outro sem girar o quadril.'),
    E('e10', 'Desenvolvimento com disco', 'forca', ['ombro', 'bracos'], 'Disco', 'inter', ['ataque'], ['ombro'], 'Disco com as duas mãos, core firme; sobe sem arquear a lombar.'),
    E('e11', 'Flexão de braço', 'forca', ['peito', 'bracos'], 'Peso do corpo', 'inic', [], ['ombro', 'punho'], 'Corpo em linha reta, peito quase toca a areia.'),
    E('e12', 'Remada unilateral com disco', 'forca', ['costas'], 'Disco', 'inic', [], [], 'Um apoio no chão, cotovelo rente ao corpo, sem girar o tronco.'),
    E('e13', 'Flexora nórdica com parceiro', 'forca', ['post'], 'Peso do corpo', 'avan', [], ['joelho', 'coxa'], 'Um parceiro segura os tornozelos; quadril estendido, desce o mais lento possível e se ampara com as mãos.'),
    E('e14', 'Salto com contramovimento', 'potencia', ['quad', 'glut'], 'Peso do corpo', 'inic', ['salto'], ['tornozelo', 'joelho'], 'Desce rápido e sobe explosivo, aterrissa com os joelhos macios.'),
    E('e15', 'Salto sobre cones baixos', 'potencia', ['quad', 'glut'], 'Cone', 'inter', ['salto'], ['tornozelo', 'joelho'], 'Fila de cones pequenos; salta com os dois pés, aterrissa estável e encadeia o próximo.'),
    E('e16', 'Saltos reativos sobre cones', 'potencia', ['quad', 'pant'], 'Cone', 'avan', ['salto'], ['tornozelo', 'joelho'], 'Cinco cones em fila, contato curto com a areia e subida imediata, sem pausa entre os saltos.'),
    E('e17', 'Saltos horizontais na areia', 'potencia', ['quad', 'glut'], 'Peso do corpo', 'inter', ['salto'], ['tornozelo'], 'Séries de 5 saltos seguidos, ênfase em distância e na aterrissagem.'),
    E('e18', 'Arremesso de disco acima da cabeça', 'potencia', ['ombro', 'core'], 'Disco', 'inic', ['ataque'], ['ombro'], 'Disco leve; do quadril ao ombro, o corpo todo participa e solta à frente.'),
    E('e19', 'Arremesso rotacional de disco', 'potencia', ['core'], 'Disco', 'inic', [], ['lombar'], 'Gira a partir do quadril e solta o disco na frente do corpo, sem arquear a lombar.'),
    E('e20', 'Agachamento com salto', 'potencia', ['quad', 'glut'], 'Peso do corpo', 'inic', ['salto'], ['joelho', 'tornozelo'], 'Agacha até 90 graus e salta alto, braços ajudam no impulso.'),
    E('e21', 'Balanço de disco', 'potencia', ['glut', 'post'], 'Disco', 'inter', [], ['lombar'], 'Disco com as duas mãos; o movimento vem do quadril, os braços só conduzem.'),
    E('e22', 'Sprint de 10 metros na areia', 'potencia', ['quad', 'post'], 'Cone', 'inic', ['corrida'], ['coxa', 'tornozelo'], 'Largada e chegada marcadas com cones; primeiros passos curtos e rápidos, tronco inclinado.'),
    E('e23', 'Sprint com mudança de direção entre cones', 'potencia', ['quad', 'post'], 'Cone', 'inter', ['corrida'], ['tornozelo', 'joelho'], 'Freia com o pé de fora, abaixa o centro de gravidade na curva do cone.'),
    E('e24', 'Puxada de disco do chão ao peito', 'potencia', ['corpo'], 'Disco', 'inter', ['ataque'], ['ombro', 'lombar'], 'Extensão completa de quadril antes de puxar; técnica antes de carga.'),
    E('e25', 'Prancha frontal', 'core', ['core'], 'Peso do corpo', 'inic', [], [], 'Corpo em linha reta, glúteos e abdômen contraídos.'),
    E('e26', 'Prancha lateral', 'core', ['core', 'ombro'], 'Peso do corpo', 'inic', [], ['ombro'], 'Quadril alto, ombro sobre o cotovelo.'),
    E('e27', 'Dead bug', 'core', ['core'], 'Peso do corpo', 'inic', [], [], 'Lombar colada na areia, braço e perna opostos descem juntos.'),
    E('e28', 'Prancha com toque no disco', 'core', ['core', 'ombro'], 'Disco', 'inic', [], ['ombro'], 'Em prancha, toca o disco à frente alternando as mãos sem balançar o quadril.'),
    E('e29', 'Rotação russa com disco', 'core', ['core'], 'Disco', 'inic', [], ['lombar'], 'Tronco inclinado, gira os ombros e não só os braços.'),
    E('e30', 'Elevação de pernas deitado', 'core', ['core'], 'Peso do corpo', 'inter', [], ['lombar'], 'Lombar no chão, sobe as pernas controlando a descida, sem balançar.'),
    E('e31', 'Rotação externa de ombro com disco leve', 'prevencao', ['ombro'], 'Disco', 'inic', [], ['ombro'], 'Deitado de lado, cotovelo colado ao corpo, disco de 1 a 2 kg; movimento lento e curto.'),
    E('e32', 'Y, T e W deitado de bruços', 'prevencao', ['ombro', 'costas'], 'Peso do corpo', 'inic', [], ['ombro'], 'Barriga na areia, polegares para cima, escápulas ativas.'),
    E('e33', 'Equilíbrio unipodal na areia', 'prevencao', ['tornoz', 'pant'], 'Peso do corpo', 'inic', [], ['tornozelo'], 'A areia já é instável: joelho levemente flexionado, olhar à frente.'),
    E('e34', 'Adução de quadril deitado de lado', 'prevencao', ['aduc'], 'Peso do corpo', 'inter', [], ['coxa', 'quadril'], 'Perna de baixo sobe até a de cima; quadril alinhado, sobe e desce devagar.'),
    E('e35', 'Marcha lenta na escada de agilidade', 'prevencao', ['tornoz'], 'Escada de agilidade', 'inic', [], ['tornozelo'], 'Caminha pelos quadrados na ponta dos pés, no calcanhar e de lado; amplitude completa e sem pressa.'),
    E('e36', 'Aterrissagem controlada', 'prevencao', ['quad', 'glut'], 'Peso do corpo', 'inic', ['salto'], ['joelho', 'tornozelo'], 'Aterrissa e congela por 2 segundos, joelhos alinhados com os pés.'),
    E('e37', 'Mobilidade de tornozelo com joelho à frente', 'mobilidade', ['tornoz'], 'Peso do corpo', 'inic', [], ['tornozelo'], 'Em avanço, leva o joelho à frente do pé sem tirar o calcanhar da areia.'),
    E('e38', 'Alongamento do flexor de quadril', 'mobilidade', ['quad'], 'Peso do corpo', 'inic', [], ['quadril'], 'Joelho na areia, abdômen firme, empurra o quadril à frente.'),
    E('e39', 'Rotação torácica no solo', 'mobilidade', ['costas', 'core'], 'Peso do corpo', 'inic', [], [], 'Deitado de lado, abre o braço de cima e segue com os olhos.'),
    E('e40', 'Mobilidade de ombro com disco', 'mobilidade', ['ombro'], 'Disco', 'inic', [], ['ombro'], 'Disco leve em círculos amplos acima da cabeça e à frente, sem forçar o fim do movimento.'),
    E('e41', 'Gato-camelo e agachamento profundo', 'mobilidade', ['core', 'quad'], 'Peso do corpo', 'inic', [], [], 'Alterna a coluna redonda e estendida, depois agacha fundo com calcanhares na areia.'),
    E('e42', 'Corrida contínua leve na areia', 'cond', ['corpo'], 'Peso do corpo', 'inic', ['corrida'], ['tornozelo', 'joelho'], 'Ritmo em que dá para conversar, 20 a 30 minutos.'),
    E('e43', 'Circuito de defesa e mergulho entre cones', 'cond', ['corpo'], 'Cone', 'inter', ['corrida', 'queda'], ['ombro', 'punho'], 'Cones marcam as posições; séries curtas e intensas, volta caminhando.'),
    E('e44', 'Caminhada forte na areia', 'cond', ['quad', 'post'], 'Peso do corpo', 'inic', [], [], 'Passo firme na areia molhada, sem salto nem corrida: boa opção de condicionamento durante o retorno de lesões.'),
    E('e45', 'Deslocamento lateral e de costas entre cones', 'cond', ['corpo'], 'Cone', 'inic', [], [], 'Passos laterais e de costas em ritmo leve entre dois cones, baixo impacto.'),
    E('e46', 'Escada de agilidade: um pé em cada quadrado', 'potencia', ['pant', 'corpo'], 'Escada de agilidade', 'inic', ['corrida'], ['tornozelo'], 'Passos curtos e rápidos, um pé por quadrado, olhar à frente e braços soltos.'),
    E('e47', 'Escada de agilidade: lateral com duas entradas', 'potencia', ['quad', 'aduc'], 'Escada de agilidade', 'inter', ['corrida'], ['tornozelo', 'joelho'], 'Entra com os dois pés em cada quadrado, deslocando-se de lado; quadril baixo.'),
    E('e48', 'Escada de agilidade: saltos com os dois pés', 'potencia', ['pant', 'quad'], 'Escada de agilidade', 'inter', ['salto'], ['tornozelo'], 'Salta quadrado a quadrado com os dois pés, contato curto e tronco alto.'),
    E('e49', 'Caminhada com disco junto ao peito', 'forca', ['core', 'costas'], 'Disco', 'inic', [], ['lombar'], 'Disco junto ao peito, tronco ereto, passos curtos na areia por 20 a 30 metros.'),
  ];

  const I = (ex, series, reps, carga, valor, desc, obs) => ({ ex, series, reps: String(reps), carga, valor: valor == null ? null : valor, desc, obs: obs || '' });
  const PLANOS = [
    { id: 'm1', nome: 'Força de base, inferiores', objetivo: 'Construir força geral de pernas e quadril na fase de base, na areia.', fase: 'base', itens: [I('e1', 4, 8, 'kg', null, 120, 'Disco de 10 a 15 kg'), I('e3', 3, 8, 'kg', null, 120), I('e4', 3, 10, 'kg', null, 90), I('e5', 3, 12, 'pc', null, 60), I('e6', 3, 12, 'pc', null, 60), I('e25', 3, '40s', 'pc', null, 45)] },
    { id: 'm2', nome: 'Força de base, superiores e core', objetivo: 'Força de tronco e ombros para atacar, sacar e se proteger.', fase: 'base', itens: [I('e7', 4, 8, 'kg', null, 90), I('e8', 4, 8, 'kg', null, 90), I('e10', 3, 10, 'kg', null, 90), I('e9', 3, 8, 'kg', null, 90), I('e28', 3, 10, 'pc', null, 45), I('e26', 3, '30s', 'pc', null, 45)] },
    { id: 'm3', nome: 'Potência e salto, fase específica', objetivo: 'Transformar a força em salto e velocidade.', fase: 'especifico', itens: [I('e14', 4, 5, 'pc', null, 90), I('e15', 4, 4, 'pc', null, 90), I('e21', 4, 10, 'kg', null, 90), I('e18', 3, 6, 'kg', null, 75, 'Disco de 2 a 5 kg'), I('e22', 6, '10 m', 'pc', null, 60), I('e19', 3, 8, 'kg', null, 60)] },
    { id: 'm4', nome: 'Prevenção de ombro e tornozelo', objetivo: 'Reduzir o risco das lesões mais comuns do vôlei de praia.', fase: null, itens: [I('e31', 3, 15, 'kg', null, 30, 'Disco de 1 a 2 kg'), I('e32', 3, 8, 'pc', null, 45), I('e33', 3, '30s', 'pc', null, 30), I('e35', 3, '2 voltas', 'pc', null, 30), I('e36', 3, 6, 'pc', null, 45), I('e34', 3, '20s', 'pc', null, 45)] },
    { id: 'm5', nome: 'Mobilidade e recuperação ativa', objetivo: 'Soltar o corpo depois de semana pesada ou jogo.', fase: 'competicao', itens: [I('e37', 2, 10, 'pc', null, 20), I('e38', 2, '30s', 'pc', null, 20), I('e39', 2, 10, 'pc', null, 20), I('e40', 2, 10, 'pc', null, 20), I('e41', 2, 10, 'pc', null, 20), I('e44', 1, '15 min', 'pse', 3, 0)] },
    { id: 'm6', nome: 'Retorno de tornozelo, sem impacto', objetivo: 'Manter condicionamento e força enquanto o tornozelo se recupera.', fase: null, itens: [I('e44', 1, '20 min', 'pse', 4, 0), I('e5', 3, 12, 'pc', null, 60), I('e27', 3, 10, 'pc', null, 30), I('e28', 3, 10, 'pc', null, 30), I('e35', 3, '2 voltas', 'pc', null, 30, 'Dentro da dor tolerável'), I('e12', 3, 10, 'kg', null, 60)] },
    { id: 'm7', nome: 'Agilidade na areia', objetivo: 'Pés rápidos e mudança de direção com escada e cones.', fase: 'especifico', itens: [I('e46', 4, '2 voltas', 'pc', null, 45), I('e47', 4, '2 voltas', 'pc', null, 45), I('e48', 3, '2 voltas', 'pc', null, 60), I('e23', 4, '1 circuito', 'pc', null, 60), I('e45', 3, '30 s', 'pc', null, 30), I('e43', 3, '40 s', 'pse', 7, 60)] },
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

  const VERSAO_CAT = 2;
  const CHAVE = window.Farol.conta.chave('ft.prescricao.v1');
  const DEMO = !window.Farol.conta.guardaDados(); // conta cadastrada começa sem prescrições de exemplo (os modelos de treino ficam)
  let exercicios = EXERCICIOS.map((x) => ({ ...x }));
  let planos = PLANOS.map((x) => ({ ...x, itens: x.itens.map((i) => ({ ...i })) }));
  let prescricoes = !DEMO ? [] : PRESCRICOES.map((x) => ({ ...x, aj: {}, exec: x.exec ? execExemplo(x) : null }));
  let seq = { e: 100, m: 100, p: 100 };
  try {
    const g = JSON.parse(localStorage.getItem(CHAVE) || 'null');
    if (g && g.exercicios && g.planos && g.prescricoes) {
      exercicios = g.exercicios; planos = g.planos; prescricoes = g.prescricoes; seq = g.seq || seq;
      // Catálogo novo (treino na areia: peso do corpo, disco, cone e escada de agilidade): o conteúdo de fábrica guardado antes é trocado;
      // o que o técnico criou (ids acima de 100) fica, com o equipamento ajustado quando não existe mais.
      if (g.v !== VERSAO_CAT) {
        const custom = (x) => Number(String(x.id).replace(/\D/g, '')) > 100;
        exercicios = EXERCICIOS.map((x) => ({ ...x })).concat(exercicios.filter(custom).map((x) => ({ ...x, equip: EQUIPS.includes(x.equip) ? x.equip : 'Peso do corpo' })));
        planos = PLANOS.map((x) => ({ ...x, itens: x.itens.map((i) => ({ ...i })) })).concat(planos.filter(custom).map((m) => ({ ...m, itens: m.itens.map((i) => ({ ...i, carga: i.carga === 'pct' ? 'kg' : i.carga, valor: i.carga === 'pct' ? null : i.valor })) })));
      }
    }
    if (DEMO) PRESCRICOES.filter((x) => x.exec && !prescricoes.some((p) => p.id === x.id)).forEach((x) => prescricoes.push({ ...x, aj: {}, exec: execExemplo(x) }));
    if (DEMO) prescricoes.forEach((p) => { const seed = PRESCRICOES.find((x) => x.id === p.id && x.exec); if (seed && p.status === 'feita' && p.exec === undefined) { p.exec = seed.exec; p.exec = execExemplo(p); if (p.id === 'p2') p.data = seed.data; } });
  } catch (e) { /* segue em memória */ }
  const gravar = () => { try { localStorage.setItem(CHAVE, JSON.stringify({ v: VERSAO_CAT, exercicios, planos, prescricoes, seq })); } catch (e) { /* ignora */ } };
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
