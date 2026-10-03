/* Shell do painel do profissional: navegação lateral e roteamento por hash (#treinos-periodizacao).
   Cada tela é uma função registrada em Farol.views[rota](elemento). */
(function () {
  const ICONS = {
    cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    lista: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    halter: '<path d="M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12"/>',
    check: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l3 3 5-6"/>',
    graf: '<path d="M3 20h18M6 16l4-5 3 3 5-7"/>',
    corpo: '<circle cx="12" cy="5" r="2.5"/><path d="M12 8v7M8 11h8M9 21l3-6 3 6"/>',
    chama: '<path d="M12 3c3 4 5 6.5 5 10a5 5 0 0 1-10 0c0-3.5 2-6 5-10z"/>',
    prato: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.5"/>',
    pulso: '<path d="M3 12h4l2-6 4 12 2-6h6"/>',
    olho: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    pessoas: '<circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0M16 5a3 3 0 0 1 0 6M18 20a6 6 0 0 0-3-5"/>',
    bola: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
    teste: '<path d="M10 3h4M11 3v6l-5 9a2 2 0 0 0 2 3h8a2 2 0 0 0 2-3l-5-9V3"/>',
    mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
    quadro: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 12h18M7 9l3 6 4-8 3 4"/>',
    versus: '<path d="M5 20V10M12 20V4M19 20v-7"/>',
    alvo: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    placar: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M12 4v16M7 9h2M15 9h2"/>',
  };
  const icon = (nome) =>
    `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[nome]}</svg>`;

  // `pronta` indica se a tela já foi construída; as demais mostram o que entra nela.
  const GRUPOS = [
    {
      titulo: 'Já existe',
      itens: [
        { id: 'ex-atletas', nome: 'Atletas e turmas', icone: 'pessoas', existente: true },
        { id: 'ex-sessoes', nome: 'Sessões de quadra', icone: 'bola', existente: true },
        { id: 'ex-testes', nome: 'Testes físicos', icone: 'teste', existente: true },
      ],
    },
    {
      titulo: 'Planejamento',
      itens: [
        { id: 'treinos-periodizacao', nome: 'Periodização', icone: 'cal', pronta: true },
        {
          id: 'treinos-microciclo', nome: 'Resposta da semana', icone: 'pulso',
          resumo: 'Como os atletas estão respondendo à semana: PSE, PSR e bem-estar.',
          bullets: [
            'Sessões da semana planejadas na Periodização, lado a lado com o que os atletas relataram.',
            'Por atleta: PSE, PSR, sono, dor e disposição, com semáforo e carga da semana (monotonia, strain, ACWR).',
            'Coleta em lote pelo técnico (toque em atleta × valor) ou pelo link do atleta.',
          ],
          tabelas: ['pse_sessao', 'wellness_diario'],
        },
      ],
    },
    {
      titulo: 'Treino',
      itens: [
        {
          id: 'treino-registro', nome: 'Registro do treino', icone: 'mic',
          resumo: 'Fale o que aconteceu no treino. O texto vira um registro organizado que o técnico revisa.',
          bullets: [
            'Gravação por áudio com transcrição em português.',
            'Texto separado em objetivo, blocos de exercício, correções e observações por atleta (@nome).',
            'Nota rápida de um toque durante o treino, com horário.',
            'Anexar jogadas do quadro técnico ao registro.',
          ],
          tabelas: ['registros_treino', 'notas_treino'],
        },
        {
          id: 'treino-quadro', nome: 'Quadro técnico', icone: 'quadro',
          resumo: 'Quadra de areia para desenhar posições, deslocamentos e ações, em sequência de quadros.',
          bullets: [
            'Quadra 16 × 8 m com rede, dois jogadores por lado, bola, setas de deslocamento, passe e ataque.',
            'Sequência de quadros (passo a passo) que roda como animação.',
            'Salvar como jogada ou exercício e reutilizar na biblioteca, no registro e no scout.',
            'Funciona com dedo ou caneta em tablet.',
          ],
          tabelas: ['jogadas'],
        },
        {
          id: 'treinos-biblioteca', nome: 'Exercícios e prescrição', icone: 'halter',
          resumo: 'Catálogo de exercícios e templates de treino físico, aplicados a atletas ou turmas.',
          bullets: ['Catálogo com grupo muscular, categoria e vídeo.', 'Template com séries, repetições, carga e descanso.', 'Aplicar a uma turma ou a um atleta.'],
          tabelas: ['exercicios', 'planos_treino', 'treino_prescrito'],
        },
      ],
    },
    {
      titulo: 'Análise',
      itens: [
        {
          id: 'analise-comparar', nome: 'Comparativos', icone: 'versus',
          resumo: 'Compare atleta, dupla, equipe, grupo, faixa etária e gênero, sempre contra uma referência justa.',
          bullets: [
            'Escolha "comparar A com B" e filtre por faixa etária, gênero, turma e período.',
            'Valores em percentil dentro da faixa e do gênero, além do valor bruto.',
            'Aviso quando o grupo de comparação tem poucos atletas.',
            'Visível só para o técnico.',
          ],
          tabelas: ['resultados_testes', 'pse_sessao', 'estatisticas_scout'],
        },
        {
          id: 'analise-scout', nome: 'Scout', icone: 'alvo',
          resumo: 'Scout de jogos de campeonato reaproveitado no treino. Ponto em discussão.',
          bullets: [
            'Jogo: registro completo, como já existe hoje.',
            'Treino-jogo: a mesma taxonomia de ações, em versão leve.',
            'Fundamento: contagem de acertos e tentativas de um exercício, em um toque.',
            'Metas de treino geradas a partir do scout dos jogos.',
          ],
          aberto: [
            'O que o scout atual registra hoje: por ponto, por ação, direção, tipo de ataque?',
            'Quem coleta e onde: o técnico sozinho, um auxiliar, ou depois pelo vídeo?',
            'O scout de treino deve ser comparável ao de jogo (mesma ficha) ou ser mais simples?',
          ],
          tabelas: ['jogos', 'acoes_scout'],
        },
      ],
    },
  ];

  const ROTAS = {};
  GRUPOS.forEach((g) => g.itens.forEach((i) => { ROTAS[i.id] = i; }));
  const PADRAO = 'treinos-periodizacao';

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function montarNav() {
    return GRUPOS.map((g) => `
      <div class="nav-group">
        <div class="nav-title">${esc(g.titulo)}</div>
        ${g.itens.map((i) => i.existente
          ? `<span class="nav-link" aria-disabled="true" title="Já existe no sistema atual, fora desta etapa">${icon(i.icone)}${esc(i.nome)}<span class="nav-tag">atual</span></span>`
          : `<a class="nav-link" href="#${i.id}" data-rota="${i.id}">${icon(i.icone)}${esc(i.nome)}${i.pronta ? '' : '<span class="nav-tag">em breve</span>'}</a>`).join('')}
      </div>`).join('');
  }

  function pendente(item) {
    return `
      <header class="page-head">
        <div>
          <h1>${esc(item.nome)}</h1>
          <p class="lead">${esc(item.resumo)}</p>
        </div>
      </header>
      <section class="card pending">
        <span class="label">Próxima etapa do frontend</span>
        <p>Esta tela ainda não foi montada. Ela vai conter:</p>
        <ul>${item.bullets.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>
        ${item.aberto ? `<span class="label">Para decidir</span><ul>${item.aberto.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>` : ''}
        ${item.tabelas.length ? `<p>Tabelas previstas no schema <code>ft</code>: ${item.tabelas.map((t) => `<code>${esc(t)}</code>`).join(' ')}</p>` : ''}
      </section>`;
  }

  function rotear() {
    const id = location.hash.slice(1);
    const rota = ROTAS[id] && !ROTAS[id].existente ? id : PADRAO;
    const item = ROTAS[rota];
    const main = document.getElementById('conteudo');

    document.querySelectorAll('.nav-link[data-rota]').forEach((a) => {
      if (a.dataset.rota === rota) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });

    const view = window.Farol.views && window.Farol.views[rota];
    if (item.pronta && view) view(main);
    else main.innerHTML = pendente(item);

    document.title = `${item.nome} | Farol Tático`;
    const nav = document.getElementById('nav');
    if (nav.dataset.open === 'true' && matchMedia('(max-width: 860px)').matches) fecharMenu();
  }

  function fecharMenu() {
    document.getElementById('nav').dataset.open = 'false';
    document.getElementById('menu-btn').setAttribute('aria-expanded', 'false');
  }

  function iniciar() {
    const nav = document.getElementById('nav');
    nav.innerHTML = montarNav();

    const btn = document.getElementById('menu-btn');
    btn.addEventListener('click', () => {
      const aberto = nav.dataset.open === 'true';
      nav.dataset.open = aberto ? 'false' : 'true';
      btn.setAttribute('aria-expanded', String(!aberto));
    });

    window.addEventListener('hashchange', rotear);
    rotear();
  }

  document.addEventListener('DOMContentLoaded', iniciar);
})();
