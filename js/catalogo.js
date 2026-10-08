/* Conteúdo fixo do produto: fundamentos do vôlei de praia, fases, tipos de treino e exercícios físicos de partida. */
(function (AC) {
  const FUNDAMENTOS = [
    { id: 'saque', nome: 'Saque', tipos: ['Viagem', 'Flutuante', 'Flutuante em suspensão', 'Direcionado por zona', 'No jogador', 'Agressivo x seguro'] },
    { id: 'recepcao', nome: 'Recepção', tipos: ['Manchete', 'Toque', 'Contra saque viagem', 'Contra saque flutuante', 'Leitura e posicionamento', 'Chamada (quem pega)'] },
    { id: 'levantamento', nome: 'Levantamento', tipos: ['Toque', 'Manchete', 'Rede e fora da rede', 'Bola ruim', 'Para zona definida'] },
    { id: 'ataque', nome: 'Ataque', tipos: ['Diagonal', 'Paralela', 'Cut (diagonal fechada)', 'Largada', 'Chip / poke', 'Bola alta de potência', 'Bola ruim'] },
    { id: 'bloqueio', nome: 'Bloqueio', tipos: ['Temporização', 'Ofensivo', 'Linha', 'Diagonal', 'Leitura do levantamento', 'Bloquear ou ficar (fake)'] },
    { id: 'defesa', nome: 'Defesa', tipos: ['Manchete', 'Rolamento / peixinho', 'Largada', 'Bola de potência', 'Defesa do bloqueio', 'Posicionamento por zonas'] },
    { id: 'transicao', nome: 'Transição', tipos: ['Cobertura de ataque', 'Defesa para ataque', 'Bola de graça (free ball)'] },
    { id: 'movimentacao', nome: 'Movimentação na areia', tipos: ['Deslocamento lateral', 'Frente e trás', 'Saída de bloqueio', 'Aproximação de ataque', 'Salto na areia'] },
    { id: 'tatica', nome: 'Tática e jogo', tipos: ['Side-out', 'Break point', 'Bloqueio e defesa (sistema)', 'Sinais e comunicação', 'Leitura do adversário', 'Final de set e tie-break', 'Jogo 2x2 reduzido'] },
    { id: 'mental', nome: 'Mental e parceria', tipos: ['Rotina pré-saque', 'Reação ao erro', 'Pressão de placar', 'Confiança e comunicação'] },
  ];

  const FASES = [
    { id: 'base', nome: 'Base', cor: '#2f9ab3', desc: 'Volume e técnica básica, construir a capacidade física', pseAlvo: 5, perfil: '3:1' },
    { id: 'desenvolvimento', nome: 'Desenvolvimento', cor: '#2f7d5a', desc: 'Fundamentos de jogo com intensidade crescente', pseAlvo: 6, perfil: '3:1' },
    { id: 'precompetitivo', nome: 'Pré-competitivo', cor: '#d98a00', desc: 'Situações de jogo, tática e ritmo de competição', pseAlvo: 7, perfil: '2:1' },
    { id: 'competitivo', nome: 'Competitivo', cor: '#d9480f', desc: 'Competir e manter, ajustes por adversário', pseAlvo: 6, perfil: 'plana' },
    { id: 'polimento', nome: 'Polimento', cor: '#7048e8', desc: 'Reduzir carga e afinar para a competição principal', pseAlvo: 5, perfil: 'polimento' },
    { id: 'recuperacao', nome: 'Recuperação', cor: '#868e96', desc: 'Transição: descanso ativo e retorno gradual', pseAlvo: 3, perfil: 'plana' },
  ];

  /* Tópicos sugeridos por fase: fundamento, tipos e prioridade. */
  const SUGESTOES_FASE = {
    base: [
      { fundamento: 'movimentacao', tipos: ['Deslocamento lateral', 'Frente e trás'], foco: 'Eficiência de passada na areia', prioridade: 'alta' },
      { fundamento: 'defesa', tipos: ['Manchete', 'Posicionamento por zonas'], foco: 'Plataforma e base', prioridade: 'alta' },
      { fundamento: 'recepcao', tipos: ['Manchete'], foco: 'Plataforma estável e passe na meta', prioridade: 'media' },
      { fundamento: 'saque', tipos: ['Flutuante'], foco: 'Consistência e controle de zona', prioridade: 'media' },
      { fundamento: 'levantamento', tipos: ['Toque'], foco: 'Altura e distância da rede', prioridade: 'baixa' },
    ],
    desenvolvimento: [
      { fundamento: 'ataque', tipos: ['Diagonal', 'Paralela'], foco: 'Ataque com direção e variação de ritmo', prioridade: 'alta' },
      { fundamento: 'saque', tipos: ['Viagem', 'Direcionado por zona'], foco: 'Saque agressivo com controle', prioridade: 'alta' },
      { fundamento: 'bloqueio', tipos: ['Temporização', 'Linha'], foco: 'Tempo de salto e posição das mãos', prioridade: 'media' },
      { fundamento: 'defesa', tipos: ['Rolamento / peixinho', 'Bola de potência'], foco: 'Defesa em deslocamento', prioridade: 'media' },
      { fundamento: 'tatica', tipos: ['Side-out'], foco: 'Complexo de side-out', prioridade: 'media' },
    ],
    precompetitivo: [
      { fundamento: 'tatica', tipos: ['Side-out', 'Break point'], foco: 'Rendimento do side-out e do break point', prioridade: 'alta' },
      { fundamento: 'tatica', tipos: ['Bloqueio e defesa (sistema)', 'Sinais e comunicação'], foco: 'Sistema defensivo e sinais', prioridade: 'alta' },
      { fundamento: 'saque', tipos: ['No jogador', 'Agressivo x seguro'], foco: 'Escolha do saque por situação', prioridade: 'media' },
      { fundamento: 'ataque', tipos: ['Largada', 'Cut (diagonal fechada)', 'Bola ruim'], foco: 'Resolver bola ruim e variar o ataque', prioridade: 'media' },
    ],
    competitivo: [
      { fundamento: 'tatica', tipos: ['Leitura do adversário', 'Final de set e tie-break'], foco: 'Ajustes por adversário e fechamento de set', prioridade: 'alta' },
      { fundamento: 'mental', tipos: ['Pressão de placar', 'Reação ao erro'], foco: 'Foco ponto a ponto', prioridade: 'alta' },
      { fundamento: 'saque', tipos: ['Direcionado por zona'], foco: 'Manter o saque afiado', prioridade: 'media' },
    ],
    polimento: [
      { fundamento: 'saque', tipos: ['Viagem', 'Flutuante'], foco: 'Ritmo e sensação de bola, pouco volume', prioridade: 'alta' },
      { fundamento: 'tatica', tipos: ['Side-out', 'Sinais e comunicação'], foco: 'Revisar o plano de jogo', prioridade: 'alta' },
      { fundamento: 'mental', tipos: ['Rotina pré-saque', 'Confiança e comunicação'], foco: 'Rotinas de competição', prioridade: 'media' },
    ],
    recuperacao: [
      { fundamento: 'movimentacao', tipos: ['Deslocamento lateral'], foco: 'Movimento leve e lúdico', prioridade: 'baixa' },
      { fundamento: 'levantamento', tipos: ['Toque', 'Manchete'], foco: 'Toque de bola sem impacto', prioridade: 'baixa' },
    ],
  };

  const FOCO_FISICO_FASE = {
    base: ['Resistência aeróbia', 'Força', 'Core e estabilidade'],
    desenvolvimento: ['Potência e saltos', 'Força', 'Prevenção de lesões'],
    precompetitivo: ['Velocidade e agilidade', 'Resistência intermitente'],
    competitivo: ['Potência e saltos', 'Mobilidade'],
    polimento: ['Mobilidade', 'Recuperação'],
    recuperacao: ['Mobilidade', 'Recuperação'],
  };

  const TIPOS_TREINO = [
    { id: 'tecnico', nome: 'Técnico' },
    { id: 'tatico', nome: 'Tático' },
    { id: 'treino-jogo', nome: 'Treino-jogo' },
    { id: 'fisico', nome: 'Físico' },
    { id: 'misto', nome: 'Técnico + físico' },
    { id: 'competicao', nome: 'Competição' },
    { id: 'recuperacao', nome: 'Recuperação' },
    { id: 'avaliacao', nome: 'Avaliação' },
  ];

  const FOCOS_FISICOS = ['Força', 'Potência e saltos', 'Velocidade e agilidade', 'Resistência aeróbia', 'Resistência intermitente', 'Core e estabilidade', 'Prevenção de lesões', 'Mobilidade', 'Recuperação'];

  const BLOCOS_FISICOS = ['Aquecimento', 'Principal', 'Complementar', 'Volta à calma'];

  const CATEGORIAS_EX = ['Aquecimento', 'Força', 'Potência e saltos', 'Velocidade e agilidade', 'Condicionamento', 'Core e estabilidade', 'Prevenção de lesões', 'Mobilidade'];

  /* Escalas: PSE (esforço percebido, ao sair) e PSR (recuperação percebida, ao chegar), de 0 a 10. */
  const PSE_ROTULOS = ['Repouso', 'Muito leve', 'Leve', 'Moderado', 'Um pouco forte', 'Forte', 'Forte+', 'Muito forte', 'Muito forte+', 'Quase máximo', 'Máximo'];
  const PSR_ROTULOS = ['Nada recuperado', 'Muito mal recuperado', 'Mal recuperado', 'Pouco recuperado', 'Recuperação razoável', 'Recuperado em parte', 'Razoavelmente bem', 'Bem recuperado', 'Muito bem recuperado', 'Quase pleno', 'Plenamente recuperado'];

  /* Exercícios de partida (peso do corpo, areia e material simples). O técnico edita e cria os seus. */
  const ex = (nome, categoria, regiao, equip, dica) => ({ nome, categoria, regiao, equip, dica });
  const EXERCICIOS = [
    ex('Trote leve na areia', 'Aquecimento', 'Corpo todo', 'Areia', 'Cadência baixa, ombros soltos.'),
    ex('Mobilidade de quadril e tornozelo', 'Aquecimento', 'Quadril e tornozelo', 'Peso do corpo', 'Amplitude sem dor, 8 a 10 repetições por lado.'),
    ex('Ativação de ombro com rotação externa', 'Aquecimento', 'Ombro', 'Elástico leve', 'Cotovelo junto ao corpo, controle na volta.'),
    ex('Skipping e passadas laterais', 'Aquecimento', 'Corpo todo', 'Areia', 'Contato rápido com o solo.'),
    ex('Agachamento com peso do corpo', 'Força', 'Pernas', 'Peso do corpo', 'Joelhos alinhados com os pés.'),
    ex('Afundo andando', 'Força', 'Pernas e glúteos', 'Peso do corpo', 'Passada longa, tronco alto.'),
    ex('Agachamento búlgaro', 'Força', 'Pernas e glúteos', 'Banco ou degrau', 'Joelho da frente sem passar o pé.'),
    ex('Ponte de glúteo unilateral', 'Força', 'Glúteos e posterior', 'Peso do corpo', 'Quadril nivelado, pausa de 1 s no alto.'),
    ex('Flexão de braço', 'Força', 'Peito, ombro e tríceps', 'Peso do corpo', 'Corpo em linha, escápulas ativas.'),
    ex('Remada invertida', 'Força', 'Costas', 'Barra baixa ou TRX', 'Puxar levando as escápulas juntas.'),
    ex('Agachamento com salto', 'Potência e saltos', 'Pernas', 'Areia', 'Aterrissagem silenciosa, joelhos alinhados.'),
    ex('Salto em profundidade na areia', 'Potência e saltos', 'Pernas', 'Areia e caixote baixo', 'Contato mínimo e subida explosiva.'),
    ex('Saltos horizontais seguidos', 'Potência e saltos', 'Pernas', 'Areia', 'Equilíbrio na aterrissagem antes do próximo.'),
    ex('Salto de bloqueio com deslocamento', 'Potência e saltos', 'Pernas e ombros', 'Areia', 'Dois passos laterais, salto e mãos à frente.'),
    ex('Arremesso de bola medicinal por cima', 'Potência e saltos', 'Tronco e ombros', 'Bola medicinal', 'Gesto de ataque, tronco participa.'),
    ex('Arranque curto de 5 m', 'Velocidade e agilidade', 'Pernas', 'Areia e cones', 'Inclinação à frente nos 3 primeiros passos.'),
    ex('Deslocamento em T', 'Velocidade e agilidade', 'Pernas', 'Cones', 'Frente, laterais e volta de costas.'),
    ex('Escada de agilidade', 'Velocidade e agilidade', 'Pés', 'Escada', 'Pés rápidos, olhar à frente.'),
    ex('Mergulho e levanta (peixinho)', 'Velocidade e agilidade', 'Corpo todo', 'Areia', 'Cair com o peito, levantar rápido.'),
    ex('Tiros de 15 a 20 m', 'Condicionamento', 'Corpo todo', 'Areia', 'Intensidade alta, pausa completa.'),
    ex('Intermitente 15 s por 15 s', 'Condicionamento', 'Corpo todo', 'Areia', 'Ritmo constante nas séries.'),
    ex('Corrida contínua leve', 'Condicionamento', 'Corpo todo', 'Areia ou piso firme', 'Conversar durante a corrida.'),
    ex('Prancha frontal', 'Core e estabilidade', 'Abdômen', 'Peso do corpo', 'Quadril alinhado, respiração contínua.'),
    ex('Prancha lateral', 'Core e estabilidade', 'Oblíquos', 'Peso do corpo', 'Quadril alto, sem girar o tronco.'),
    ex('Dead bug', 'Core e estabilidade', 'Abdômen', 'Peso do corpo', 'Lombar colada no chão.'),
    ex('Bird dog', 'Core e estabilidade', 'Lombar e glúteos', 'Peso do corpo', 'Braço e perna opostos, sem rodar.'),
    ex('Rotação de tronco com elástico', 'Core e estabilidade', 'Oblíquos', 'Elástico', 'Girar pelo tronco, braços firmes.'),
    ex('Equilíbrio unipodal em superfície instável', 'Prevenção de lesões', 'Tornozelo', 'Areia ou disco', 'Olhos abertos, depois fechados.'),
    ex('Elevação de panturrilha excêntrica', 'Prevenção de lesões', 'Panturrilha e tendão', 'Degrau', 'Subir com dois pés, descer em 3 s com um.'),
    ex('Nórdico assistido', 'Prevenção de lesões', 'Posterior de coxa', 'Parceiro', 'Descida lenta, ajuda só no final.'),
    ex('Rotação externa de ombro com elástico', 'Prevenção de lesões', 'Manguito rotador', 'Elástico', 'Sem compensar com o tronco.'),
    ex('Y-T-W no chão', 'Prevenção de lesões', 'Escápulas', 'Peso do corpo', 'Polegares para cima, sem encolher os ombros.'),
    ex('Mobilidade de ombro com bastão', 'Mobilidade', 'Ombro', 'Bastão ou elástico', 'Braços retos, sem arquear a lombar.'),
    ex('Alongamento dinâmico de quadril', 'Mobilidade', 'Quadril', 'Peso do corpo', 'Movimento contínuo e controlado.'),
    ex('Liberação miofascial com rolo', 'Mobilidade', 'Pernas e costas', 'Rolo', 'Devagar, parar nos pontos sensíveis.'),
    ex('Respiração e alongamento final', 'Mobilidade', 'Corpo todo', 'Peso do corpo', 'Expirar longo, relaxar a musculatura.'),
  ];

  AC.cat = {
    FUNDAMENTOS, FASES, SUGESTOES_FASE, FOCO_FISICO_FASE, TIPOS_TREINO, FOCOS_FISICOS, BLOCOS_FISICOS, CATEGORIAS_EX,
    PSE_ROTULOS, PSR_ROTULOS, EXERCICIOS,
    fundamento: (id) => FUNDAMENTOS.find((f) => f.id === id),
    fase: (id) => FASES.find((f) => f.id === id),
    tipoTreino: (id) => TIPOS_TREINO.find((t) => t.id === id),
  };
})((window.AC = window.AC || {}));
