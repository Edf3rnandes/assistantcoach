/* Início (o dia do técnico) e Dados (backup, exemplo, apagar). */
(function (AC) {
  const { h, chip, modal, confirmar, aviso, dm, dataLonga, dataCurta, num, milhar, plural } = AC.ui;
  const { calc, cat, store } = AC;
  const S = () => store.e;

  const nomeTipo = (id) => (cat.tipoTreino(id) || { nome: id }).nome;
  const tituloTreino = (t) => t.titulo || nomeTipo(t.tipo);

  function passos() {
    const e = S();
    const lista = [
      { ok: e.atletas.length > 0, titulo: 'Cadastrar os atletas', texto: 'Cole a lista do elenco e envie o link para cada atleta completar a ficha.', href: '#/atletas' },
      { ok: e.periodizacoes.length > 0, titulo: 'Montar a periodização', texto: 'Mesociclos, ênfase e fundamentos de cada fase.', href: '#/periodizacao' },
      { ok: e.treinos.length > 0, titulo: 'Registrar o primeiro treino', texto: 'O que foi feito e como cada atleta chegou e saiu.', href: '#/treinos/novo' },
      { ok: e.planosFisicos.length > 0, titulo: 'Montar um treino físico', texto: 'Escolha exercícios e insira nos dias que quiser.', href: '#/fisico/plano/novo' },
    ];
    return h('div', { class: 'vazio' },
      h('h2', null, 'Vamos começar'),
      h('ol', { class: 'passos' }, lista.map((p) => h('li', { class: p.ok ? 'feito' : '' }, h('a', { href: p.href }, h('strong', null, p.titulo), h('span', { class: 'muted' }, p.texto))))),
      h('button', { class: 'btn', type: 'button', onclick: async () => {
        if (!e.atletas.length && !e.treinos.length && !e.periodizacoes.length) { AC.exemplo.carregar(); AC.redesenhar(); aviso('Dados de exemplo carregados.'); }
        else if (await confirmar('Os dados de exemplo substituem atletas, periodizações, treinos e treinos físicos atuais. Continuar?', { ok: 'Substituir', perigo: true })) { AC.exemplo.carregar(); AC.redesenhar(); }
      } }, 'Ver com dados de exemplo'));
  }

  function inicio() {
    const raiz = h('div');
    const hoje = calc.hojeISO();
    const e = S();
    raiz.append(h('h1', null, dataLonga(hoje).replace(/^./, (c) => c.toUpperCase())));
    if (!e.atletas.length || !e.periodizacoes.length || !e.treinos.length) raiz.append(passos());
    if (!e.atletas.length && !e.periodizacoes.length && !e.treinos.length) return raiz;

    /* Hoje */
    const deHoje = e.treinos.filter((t) => t.data === hoje);
    const secHoje = h('section', null, h('div', { class: 'titulo-linha' }, h('h2', null, 'Hoje'), h('a', { class: 'btn', href: `#/treinos/novo?data=${hoje}` }, '+ Treino')));
    const perioHoje = store.perioDaData(hoje);
    const previstosHoje = deHoje.length || !perioHoje ? [] : calc.sessoesDaData(perioHoje, hoje);
    if (!deHoje.length && !previstosHoje.length) secHoje.append(h('p', { class: 'dica' }, 'Nenhum treino marcado para hoje.'));
    previstosHoje.forEach((x, i) => {
      const it = cat.INTENSIDADES[x.intensidade];
      secHoje.append(h('a', { class: 'card clicavel previsto', href: `#/treinos/novo?data=${hoje}&prev=${i}` },
        h('div', { class: 'card-topo' }, h('strong', null, x.tipo === 'competicao' ? `Competição: ${x.titulo}` : nomeTipo(x.tipo)), x.tipo === 'competicao' ? chip('Previsto', { pequeno: true }) : chip(`Intensidade ${it.nome.toLowerCase()}`, { pequeno: true, cor: it.cor })),
        h('div', { class: 'muted' }, x.tipo === 'competicao' ? 'Previsto para hoje' : `Previsto: ${x.duracao} min · PSE alvo ${x.pse}${x.motivo ? ' · ' + x.motivo : ''}`),
        x.fundamentos.length ? h('div', { class: 'chips' }, x.fundamentos.map((f) => chip(cat.fundamento(f.fundamento).nome, { pequeno: true }))) : null,
        h('span', { class: 'toque' }, 'Toque para registrar')));
    });
    deHoje.forEach((t) => secHoje.append(h('a', { class: 'card clicavel', href: `#/treinos/${t.id}` },
      h('div', { class: 'card-topo' }, h('strong', null, tituloTreino(t)), chip(t.feito ? 'Realizado' : 'Registrar', { pequeno: true, cor: t.feito ? 'var(--ok)' : 'var(--brand)', ativo: !t.feito })),
      h('div', { class: 'muted' }, `${nomeTipo(t.tipo)} · ${t.duracao || 0} min`),
      (t.fundamentos || []).length ? h('div', { class: 'chips' }, t.fundamentos.map((f) => chip(cat.fundamento(f.fundamento).nome, { pequeno: true }))) : null)));
    raiz.append(secHoje);

    /* Pendentes de registro */
    const pend = e.treinos.filter((t) => !t.feito && t.data < hoje).sort((a, b) => b.data.localeCompare(a.data));
    if (pend.length) raiz.append(h('div', { class: 'alerta medio' }, h('strong', null, `${plural(pend.length, 'treino sem registro', 'treinos sem registro')}`),
      h('ul', null, pend.slice(0, 4).map((t) => h('li', null, h('a', { href: `#/treinos/${t.id}` }, `${dataCurta(t.data)} · ${tituloTreino(t)}`))))));

    /* Ênfase do mesociclo atual */
    const perio = store.perioDaData(hoje);
    const sit = perio ? calc.situacao(perio, hoje) : null;
    if (sit && sit.meso) {
      const m = sit.meso, f = cat.fase(m.fase);
      const cobs = calc.coberturaMeso(m, e.treinos);
      const ordem = { alta: 0, media: 1, baixa: 2 };
      cobs.sort((a, b) => ordem[a.topico.prioridade] - ordem[b.topico.prioridade]);
      raiz.append(h('section', null, h('h2', null, 'Ênfase do mesociclo'),
        h('a', { class: 'card meso atual', href: `#/periodizacao/${perio.id}/${m.id}`, style: { '--cor': f.cor } },
          h('div', { class: 'card-topo' }, h('strong', null, m.nome), chip(f.nome, { cor: f.cor })),
          h('div', { class: 'muted' }, `Semana ${sit.semana} de ${m.semanas}${sit.proxima ? ` · ${sit.proxima.nome} em ${plural(sit.proxima.dias, 'dia', 'dias')}` : ''}`),
          m.enfase ? h('p', { class: 'trecho' }, m.enfase) : null,
          cobs.length ? h('div', { class: 'cob-lista' }, cobs.slice(0, 6).map((c) => h('div', { class: 'cob' + (c.feitos ? '' : ' zero') },
            h('span', null, `${cat.fundamento(c.topico.fundamento).nome}${c.topico.tipos.length ? ': ' + c.topico.tipos.slice(0, 2).join(', ') : ''}`),
            h('b', null, c.feitos)))) : h('span', { class: 'dica' }, 'Sem tópicos de fundamentos ainda.'),
          cobs.length ? h('span', { class: 'dica' }, 'Número = treinos do mesociclo que trabalharam o fundamento.') : null)));
    } else if (perio) {
      raiz.append(h('section', null, h('h2', null, 'Periodização'), h('a', { class: 'card clicavel', href: `#/periodizacao/${perio.id}` }, h('strong', null, perio.nome), h('div', { class: 'muted' }, 'Hoje está fora dos mesociclos. Abra para ajustar as datas.'))));
    }

    /* Semana */
    if (e.treinos.length) {
      const r = calc.resumoSemana(e.treinos, store.ativos(store.perioDaData(hoje)), calc.segundaDe(hoje));
      raiz.append(h('section', null, h('div', { class: 'titulo-linha' }, h('h2', null, 'Esta semana'), h('a', { class: 'btn', href: '#/treinos' }, 'Ver semana')),
        h('div', { class: 'resumo' },
          h('div', null, h('b', null, `${r.feitas}/${r.sessoes}`), h('span', null, 'treinos')),
          h('div', null, h('b', null, num(r.psrMedio)), h('span', null, 'chegada (PSR)')),
          h('div', null, h('b', null, num(r.pseMedio)), h('span', null, 'saída (PSE)')),
          h('div', null, h('b', null, milhar(r.cargaMedia)), h('span', null, 'carga média')))));
    }

    /* Atenção */
    const atencao = store.ativos(store.perioDaData(hoje)).map((a) => ({ a, al: calc.alertasAtleta(e.treinos, a, hoje) })).filter((x) => x.al.length).sort((x, y) => y.al.filter((i) => i.nivel === 'alto').length - x.al.filter((i) => i.nivel === 'alto').length);
    if (atencao.length) raiz.append(h('section', null, h('h2', null, 'Atletas para olhar'),
      atencao.slice(0, 6).map(({ a, al }) => h('a', { class: 'card clicavel alerta-card ' + (al.some((i) => i.nivel === 'alto') ? 'alto' : 'medio'), href: `#/atletas/${a.id}` },
        h('strong', null, a.nome), h('ul', null, al.map((i) => h('li', null, i.texto)))))));
    return raiz;
  }

  /* ---------- Dados ---------- */

  function dados() {
    const raiz = h('div');
    const e = S();
    const arquivo = h('input', { type: 'file', accept: 'application/json,.json', hidden: true, onchange: async (ev) => {
      const f = ev.target.files[0];
      if (!f) return;
      try {
        const texto = await f.text();
        if (await confirmar('Importar substitui todos os dados atuais pelos do arquivo. Continuar?', { ok: 'Importar', perigo: true })) { store.importar(texto); aviso('Backup importado.'); AC.redesenhar(); }
      } catch (err) { aviso(err.message || 'Arquivo inválido.', true); }
      ev.target.value = '';
    } });
    raiz.append(
      h('h1', null, 'Dados'),
      h('p', { class: 'sub' }, `${plural(e.atletas.length, 'atleta', 'atletas')} · ${plural(e.periodizacoes.length, 'periodização', 'periodizações')} · ${plural(e.treinos.length, 'treino', 'treinos')} · ${plural(e.planosFisicos.length, 'treino físico', 'treinos físicos')}`),
      store.semArmazenamento ? h('div', { class: 'alerta alto' }, h('strong', null, 'Este navegador não está guardando os dados.'), h('p', null, 'Janela anônima ou armazenamento bloqueado. Exporte um backup antes de fechar.')) : null,
      h('section', null, h('h2', null, 'Backup'),
        h('p', { class: 'dica' }, 'Os dados ficam só neste navegador. Exporte um arquivo de tempos em tempos e use-o para levar tudo a outro aparelho.'),
        h('div', { class: 'acoes-card' },
          h('button', { class: 'btn primario', type: 'button', onclick: () => { store.exportar(); aviso('Backup baixado.'); } }, 'Exportar backup'),
          h('button', { class: 'btn', type: 'button', onclick: () => arquivo.click() }, 'Importar backup'), arquivo)),
      h('section', null, h('h2', null, 'Dados de exemplo'),
        h('p', { class: 'dica' }, 'Carrega uma temporada de exemplo com atletas, mesociclos, treinos e PSR/PSE para você explorar. Substitui o que existe.'),
        h('button', { class: 'btn', type: 'button', onclick: async () => {
          if (await confirmar('Substituir os dados atuais pelos de exemplo?', { ok: 'Substituir', perigo: true })) { AC.exemplo.carregar(); aviso('Dados de exemplo carregados.'); location.hash = '#/inicio'; }
        } }, 'Carregar exemplo')),
      h('section', null, h('h2', null, 'Apagar tudo'),
        h('p', { class: 'dica' }, 'Remove atletas, periodizações, treinos e treinos físicos. A biblioteca de exercícios volta ao padrão.'),
        h('button', { class: 'btn perigo', type: 'button', onclick: async () => {
          if (await confirmar('Apagar todos os dados deste navegador? Isso não pode ser desfeito. Exporte um backup antes se precisar.', { ok: 'Apagar tudo', perigo: true })) { store.apagarTudo(); aviso('Tudo apagado.'); location.hash = '#/inicio'; AC.redesenhar(); }
        } }, 'Apagar tudo')));
    return raiz;
  }

  AC.views = AC.views || {};
  AC.views.inicio = () => inicio();
  AC.views.dados = () => dados();
})((window.AC = window.AC || {}));
