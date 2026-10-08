/* Periodização: lista, temporada (linha do tempo, mesociclos, competições) e a página do mesociclo com a ênfase por fundamento. */
(function (AC) {
  const { h, chip, campo, entrada, selecao, modal, confirmar, aviso, dm, dataCompleta, plural, num, milhar } = AC.ui;
  const { calc, cat, store } = AC;
  const S = () => store.e;

  const PRIORIDADES = [{ valor: 'alta', rotulo: 'Alta' }, { valor: 'media', rotulo: 'Média' }, { valor: 'baixa', rotulo: 'Baixa' }];
  const PRIO_ROTULO = { alta: 'Alta', media: 'Média', baixa: 'Baixa' };
  const COR_COMP = { A: 'var(--bad)', B: 'var(--warn)', C: 'var(--muted)' };
  const AJUDA_PRIO = {
    A: 'Competição alvo: a temporada se organiza para chegar nela no melhor momento (polimento antes, recuperação depois).',
    B: 'Importante: reduz o volume só da semana dela (mini-polimento), sem mexer no resto da temporada.',
    C: 'Treino: serve para ganhar ritmo de jogo, sem reduzir a carga.',
  };

  const fase = (id) => cat.fase(id) || cat.FASES[0];
  const faseChip = (id) => chip(fase(id).nome, { cor: fase(id).cor });
  const periodoMeso = (m) => `${dm(m.inicio)} a ${dm(calc.fimMeso(m))}`;
  const voltar = (href, texto) => h('a', { class: 'voltar', href }, '‹ ', texto);

  /* ---------- Lista ---------- */

  function lista() {
    const raiz = h('div');
    const hoje = calc.hojeISO();
    raiz.append(
      h('div', { class: 'titulo-linha' },
        h('h1', null, 'Periodização'),
        h('button', { class: 'btn primario', type: 'button', onclick: () => formPerio() }, '+ Nova')),
      h('p', { class: 'sub' }, 'Monte a temporada em mesociclos e defina a ênfase de fundamentos de cada um.'),
    );
    if (!S().periodizacoes.length) {
      raiz.append(h('div', { class: 'vazio' },
        h('h2', null, 'Nenhuma periodização ainda'),
        h('p', null, 'Crie a temporada, divida em mesociclos e escolha os fundamentos que cada fase vai enfatizar.'),
        h('button', { class: 'btn primario', type: 'button', onclick: () => formPerio() }, 'Criar periodização')));
      return raiz;
    }
    for (const p of [...S().periodizacoes].sort((a, b) => b.inicio.localeCompare(a.inicio))) {
      const sit = calc.situacao(p, hoje);
      raiz.append(h('a', { class: 'card clicavel', href: `#/periodizacao/${p.id}` },
        h('div', { class: 'card-topo' }, h('strong', null, p.nome), sit.meso ? faseChip(sit.meso.fase) : null),
        h('div', { class: 'muted' }, `${dataCompleta(p.inicio)} a ${p.fim ? dataCompleta(p.fim) : '…'} · ${plural(p.mesociclos.length, 'mesociclo', 'mesociclos')}`),
        p.objetivo ? h('p', { class: 'trecho' }, p.objetivo) : null,
        sit.meso ? h('div', { class: 'muted' }, `Agora: ${sit.meso.nome}, semana ${sit.semana} de ${sit.meso.semanas}`) : null));
    }
    return raiz;
  }

  /* ---------- Formulários ---------- */

  function formPerio(p) {
    const novo = !p;
    const hoje = calc.hojeISO();
    modal(novo ? 'Nova periodização' : 'Editar periodização', (fechar) => {
      const nome = entrada('text', p ? p.nome : `Temporada ${hoje.slice(0, 4)}`, { required: true, maxLength: 80 });
      const obj = h('textarea', { rows: 3, placeholder: 'Ex.: chegar ao circuito estadual com saque agressivo e side-out acima de 65%' }, p ? p.objetivo : '');
      const ini = entrada('date', p ? p.inicio : calc.segundaDe(hoje), { required: true });
      const fim = entrada('date', p ? p.fim : calc.addDias(calc.segundaDe(hoje), 7 * 16 - 1), { required: true });
      return h('form', { onsubmit: (e) => {
        e.preventDefault();
        if (fim.value < ini.value) return aviso('O fim precisa ser depois do início.', true);
        if (novo) {
          const np = { id: store.uid(), nome: nome.value.trim(), objetivo: obj.value.trim(), inicio: ini.value, fim: fim.value, mesociclos: [], competicoes: [] };
          S().periodizacoes.push(np);
          store.salvar(); fechar();
          location.hash = `#/periodizacao/${np.id}`;
        } else {
          Object.assign(p, { nome: nome.value.trim(), objetivo: obj.value.trim(), inicio: ini.value, fim: fim.value });
          store.salvar(); fechar(); AC.redesenhar();
        }
      } },
      campo('Nome', nome), campo('Objetivo da temporada', obj),
      h('div', { class: 'duas' }, campo('Início', ini), campo('Fim', fim)),
      h('div', { class: 'acoes' }, h('button', { class: 'btn', type: 'button', onclick: () => fechar() }, 'Cancelar'), h('button', { class: 'btn primario', type: 'submit' }, 'Salvar')));
    });
  }

  function formMeso(perio, m) {
    const novo = !m;
    const ordenados = [...perio.mesociclos].sort((a, b) => a.inicio.localeCompare(b.inicio));
    const ultimo = ordenados[ordenados.length - 1];
    const inicioPadrao = ultimo ? calc.addDias(calc.fimMeso(ultimo), 1) : calc.segundaDe(perio.inicio);
    modal(novo ? 'Novo mesociclo' : 'Editar mesociclo', (fechar) => {
      const nome = entrada('text', m ? m.nome : '', { required: true, maxLength: 80, placeholder: 'Ex.: Desenvolvimento de ataque e saque' });
      const faseSel = selecao(cat.FASES.map((f) => ({ valor: f.id, rotulo: `${f.nome}: ${f.desc}` })), m ? m.fase : 'base');
      const ini = entrada('date', m ? m.inicio : inicioPadrao, { required: true });
      const sem = entrada('number', m ? m.semanas : 4, { min: 1, max: 12, required: true });
      const perfil = selecao(Object.entries(calc.PERFIS).map(([v, r]) => ({ valor: v, rotulo: `${v === '3:1' || v === '2:1' ? v + ': ' : ''}${r}` })), m ? m.perfil : cat.fase('base').perfil);
      const ref = entrada('number', m ? m.cargaRef : '', { min: 0, step: 50, placeholder: 'Opcional' });
      const enf = h('textarea', { rows: 3, placeholder: 'Em uma ou duas frases: o que este mesociclo precisa entregar?' }, m ? m.enfase : '');
      let fis = AC.ui.chipsMulti(cat.FOCOS_FISICOS, m ? m.fisico : cat.FOCO_FISICO_FASE.base);
      const fisCaixa = h('div', null, fis.el);
      if (novo) {
        faseSel.addEventListener('change', () => {
          perfil.value = fase(faseSel.value).perfil;
          fis = AC.ui.chipsMulti(cat.FOCOS_FISICOS, cat.FOCO_FISICO_FASE[faseSel.value] || []);
          fisCaixa.replaceChildren(fis.el);
        });
      }
      return h('form', { onsubmit: (e) => {
        e.preventDefault();
        const dados = {
          nome: nome.value.trim(), fase: faseSel.value, inicio: calc.segundaDe(ini.value), semanas: Math.max(1, Math.min(12, Number(sem.value) || 1)),
          perfil: perfil.value, cargaRef: ref.value === '' ? null : Number(ref.value), enfase: enf.value.trim(), fisico: fis.valor(),
        };
        if (novo) {
          const nm = { id: store.uid(), topicos: [], notas: '', ...dados };
          perio.mesociclos.push(nm);
        } else Object.assign(m, dados);
        store.salvar(); fechar(); AC.redesenhar();
      } },
      campo('Nome', nome),
      campo('Fase', faseSel),
      h('div', { class: 'duas' }, campo('Início (segunda-feira)', ini, 'Ajustado para a segunda da semana.'), campo('Semanas', sem)),
      campo('Perfil de carga', perfil),
      campo('Carga semanal de referência', ref, 'Média por atleta: PSE × minutos somados na semana. Deixe vazio para não planejar a carga.'),
      campo('Ênfase do mesociclo', enf),
      h('div', { class: 'campo' }, h('span', { class: 'campo-rotulo' }, 'Foco do treino físico'), fisCaixa),
      h('div', { class: 'acoes' }, h('button', { class: 'btn', type: 'button', onclick: () => fechar() }, 'Cancelar'), h('button', { class: 'btn primario', type: 'submit' }, 'Salvar')));
    }, { largo: true });
  }

  function formTopico(meso, tp) {
    const novo = !tp;
    modal(novo ? 'Novo tópico de fundamento' : 'Editar tópico', (fechar) => {
      const fund = selecao(cat.FUNDAMENTOS.map((f) => ({ valor: f.id, rotulo: f.nome })), tp ? tp.fundamento : 'saque');
      const caixa = h('div');
      let tipos = AC.ui.chipsMulti([], []);
      const trocarTipos = (inicial) => {
        tipos = AC.ui.chipsMulti(cat.fundamento(fund.value).tipos, inicial);
        caixa.replaceChildren(tipos.el);
      };
      trocarTipos(tp ? tp.tipos : []);
      fund.addEventListener('change', () => trocarTipos([]));
      const foco = entrada('text', tp ? tp.foco : '', { maxLength: 140, placeholder: 'O que, em especial, trabalhar nesse fundamento?' });
      let prio = tp ? tp.prioridade : 'media';
      const seg = AC.ui.segmentado(PRIORIDADES, prio, (v) => { prio = v; });
      return h('form', { onsubmit: (e) => {
        e.preventDefault();
        const dados = { fundamento: fund.value, tipos: tipos.valor(), foco: foco.value.trim(), prioridade: prio };
        if (novo) meso.topicos.push({ id: store.uid(), ...dados }); else Object.assign(tp, dados);
        store.salvar(); fechar(); AC.redesenhar();
      } },
      campo('Fundamento', fund),
      h('div', { class: 'campo' }, h('span', { class: 'campo-rotulo' }, 'Tipos a trabalhar'), caixa, h('span', { class: 'dica' }, 'Sem escolha, vale o fundamento inteiro.')),
      campo('Foco', foco),
      h('div', { class: 'campo' }, h('span', { class: 'campo-rotulo' }, 'Prioridade no mesociclo'), seg),
      h('div', { class: 'acoes' }, h('button', { class: 'btn', type: 'button', onclick: () => fechar() }, 'Cancelar'), h('button', { class: 'btn primario', type: 'submit' }, 'Salvar')));
    });
  }

  function formCompeticao(perio, c) {
    const novo = !c;
    modal(novo ? 'Nova competição' : 'Editar competição', (fechar) => {
      const nome = entrada('text', c ? c.nome : '', { required: true, maxLength: 80 });
      const data = entrada('date', c ? c.data : calc.hojeISO(), { required: true });
      let prio = c ? c.prioridade : 'B';
      const seg = AC.ui.segmentado([{ valor: 'A', rotulo: 'A · alvo' }, { valor: 'B', rotulo: 'B · importante' }, { valor: 'C', rotulo: 'C · treino' }], prio, (v) => { prio = v; ajuda.textContent = AJUDA_PRIO[v]; });
      const ajuda = h('span', { class: 'dica' }, AJUDA_PRIO[prio]);
      const situacao = selecao([{ valor: 'confirmada', rotulo: 'Data confirmada' }, { valor: 'provisoria', rotulo: 'Data a confirmar' }, { valor: 'cancelada', rotulo: 'Cancelada' }], c && c.situacao ? c.situacao : 'confirmada');
      return h('form', { onsubmit: (e) => {
        e.preventDefault();
        const dados = { nome: nome.value.trim(), data: data.value, prioridade: prio, situacao: situacao.value };
        if (novo) perio.competicoes.push({ id: store.uid(), ...dados }); else Object.assign(c, dados);
        store.salvar(); fechar(); AC.redesenhar();
      } },
      campo('Nome', nome), campo('Data', data),
      h('div', { class: 'campo' }, h('span', { class: 'campo-rotulo' }, 'Prioridade'), seg, ajuda),
      campo('Situação da data', situacao, 'Mudou a data ou caiu a competição? Edite aqui: o sistema avisa se os mesociclos precisam ser reorganizados.'),
      h('div', { class: 'acoes' },
        !novo ? h('button', { class: 'btn perigo', type: 'button', onclick: async () => {
          if (await confirmar(`Excluir "${c.nome}"?`, { ok: 'Excluir', perigo: true })) { perio.competicoes = perio.competicoes.filter((x) => x !== c); store.salvar(); fechar(); AC.redesenhar(); }
        } }, 'Excluir') : null,
        h('button', { class: 'btn', type: 'button', onclick: () => fechar() }, 'Cancelar'), h('button', { class: 'btn primario', type: 'submit' }, 'Salvar')));
    });
  }

  /* Cria os mesociclos de uma estrutura padrão, já com tópicos sugeridos para cada fase. */
  function mesoPadrao(faseId, inicio, semanas) {
    const f = fase(faseId);
    return {
      id: store.uid(), nome: f.nome, fase: faseId, inicio, semanas, perfil: f.perfil, cargaRef: null, enfase: f.desc,
      topicos: (cat.SUGESTOES_FASE[faseId] || []).map((t) => ({ id: store.uid(), ...t })),
      fisico: cat.FOCO_FISICO_FASE[faseId] || [], notas: '',
    };
  }

  const temAlvo = (perio) => (perio.competicoes || []).some((c) => (c.prioridade === 'A' || c.prioridade === 'B') && c.situacao !== 'cancelada');

  /* Aplica a proposta: o que passou fica, o resto é recriado a partir das competições, aproveitando ênfase e tópicos da mesma fase. */
  function aplicarProposta(perio, prop) {
    const modelos = {};
    [...perio.mesociclos].sort((a, b) => a.inicio.localeCompare(b.inicio)).forEach((m) => { modelos[m.fase] = m; });
    const cargaPadrao = [...perio.mesociclos].reverse().find((m) => m.cargaRef);
    const novos = prop.novos.map((n) => {
      const base = mesoPadrao(n.fase, n.inicio, n.semanas);
      const mod = modelos[n.fase];
      const alvo = ['precompetitivo', 'polimento', 'competitivo'].includes(n.fase) && n.alvo ? ` · ${n.alvo}` : '';
      return {
        ...base,
        nome: `${fase(n.fase).nome}${alvo}${n.partes > 1 ? ` (${n.parte}/${n.partes})` : ''}`,
        enfase: mod ? mod.enfase : base.enfase,
        topicos: mod ? mod.topicos.map((t) => ({ ...t, id: store.uid(), tipos: [...t.tipos] })) : base.topicos,
        fisico: mod ? [...mod.fisico] : base.fisico,
        cargaRef: mod && mod.cargaRef ? mod.cargaRef : cargaPadrao ? cargaPadrao.cargaRef : null,
      };
    });
    perio.mesociclos = [...prop.mantidos.map((x) => { x.meso.semanas = x.semanas; return x.meso; }), ...novos];
    store.salvar(); AC.redesenhar();
    aviso('Mesociclos reorganizados pelas competições.');
  }

  function modalProposta(perio) {
    const hoje = calc.hojeISO();
    const prop = calc.propostaMesos(perio, hoje);
    modal('Reorganizar pelas competições', (fechar) => h('div', null,
      h('p', { class: 'muted' }, `O que já passou e a semana atual não mudam. A partir de ${dataCompleta(prop.corte)} os mesociclos são refeitos para que cada competição alvo (A) tenha polimento antes e recuperação depois.`),
      prop.mantidos.length ? h('div', null, h('h3', null, 'Continua como está'),
        prop.mantidos.map((x) => h('div', { class: 'prop-linha' }, faseChip(x.meso.fase), h('span', { class: 'linha-txt' }, h('strong', null, x.meso.nome),
          h('span', { class: 'muted' }, `${dm(x.meso.inicio)} a ${dm(calc.addDias(calc.segundaDe(x.meso.inicio), x.semanas * 7 - 1))}${x.encurtado ? ` · encurtado de ${x.meso.semanas} para ${x.semanas} semanas` : ''}`))))) : null,
      h('h3', null, 'Passa a ser'),
      prop.novos.map((n) => h('div', { class: 'prop-linha' }, faseChip(n.fase), h('span', { class: 'linha-txt' }, h('strong', null, `${fase(n.fase).nome}${n.partes > 1 ? ` (${n.parte}/${n.partes})` : ''}`),
        h('span', { class: 'muted' }, `${dm(n.inicio)} a ${dm(calc.addDias(n.inicio, n.semanas * 7 - 1))} · ${plural(n.semanas, 'semana', 'semanas')}${n.alvo ? ` · rumo a ${n.alvo}` : ''}`)))),
      prop.descartados.length ? h('p', { class: 'dica' }, `${plural(prop.descartados.length, 'mesociclo futuro atual é substituído', 'mesociclos futuros atuais são substituídos')}. A ênfase e os tópicos de fundamentos são copiados do mesociclo da mesma fase.`) : null,
      h('div', { class: 'acoes' }, h('button', { class: 'btn', type: 'button', onclick: () => fechar() }, 'Manter como está'),
        h('button', { class: 'btn primario', type: 'button', onclick: () => { fechar(); aplicarProposta(perio, prop); } }, 'Aplicar'))), { largo: true });
  }

  function sugerirEstrutura(perio) {
    if (temAlvo(perio)) return modalProposta(perio);
    const est = calc.sugerirEstrutura(perio.inicio, perio.fim || calc.addDias(perio.inicio, 7 * 16 - 1));
    let ini = calc.segundaDe(perio.inicio);
    for (const e of est) { perio.mesociclos.push(mesoPadrao(e.fase, ini, e.semanas)); ini = calc.addDias(ini, e.semanas * 7); }
    store.salvar(); AC.redesenhar();
    aviso('Estrutura criada. Ajuste nomes, datas e tópicos de cada mesociclo.');
  }

  /* ---------- Temporada ---------- */

  function linhaDoTempo(perio, hoje) {
    const ms = [...perio.mesociclos].sort((a, b) => a.inicio.localeCompare(b.inicio));
    if (!ms.length) return null;
    const ini = calc.segundaDe(perio.inicio < ms[0].inicio ? perio.inicio : ms[0].inicio);
    const ultimoFim = calc.fimMeso(ms[ms.length - 1]);
    const fimTotal = perio.fim && perio.fim > ultimoFim ? perio.fim : ultimoFim;
    const total = calc.diffDias(ini, fimTotal) + 1;
    const pct = (d) => Math.max(0, Math.min(100, (calc.diffDias(ini, d) / total) * 100));
    const faixa = h('div', { class: 'tl-faixa' });
    ms.forEach((m) => {
      const fimM = calc.fimMeso(m);
      const esq = pct(m.inicio), larg = pct(calc.addDias(fimM, 1)) - esq;
      const el = h('a', { class: 'tl-meso' + (hoje >= m.inicio && hoje <= fimM ? ' atual' : ''), href: `#/periodizacao/${perio.id}/${m.id}`, title: `${m.nome} · ${periodoMeso(m)}` },
        h('span', null, larg > 11 ? m.nome : fase(m.fase).nome));
      el.style.cssText = `left:${esq}%;width:${larg}%;--cor:${fase(m.fase).cor}`;
      faixa.append(el);
    });
    const marcas = h('div', { class: 'tl-marcas' });
    perio.competicoes.filter((c) => c.data >= ini && c.data <= fimTotal && c.situacao !== 'cancelada').forEach((c) => {
      const el = h('button', { class: 'tl-comp' + (c.situacao === 'provisoria' ? ' prov' : ''), type: 'button', title: `${c.nome} · ${dm(c.data)} (${c.prioridade})`, onclick: () => formCompeticao(perio, c) }, c.prioridade);
      el.style.cssText = `left:${pct(c.data)}%;background:${COR_COMP[c.prioridade]}`;
      marcas.append(el);
    });
    const caixa = h('div', { class: 'tl' }, marcas, faixa);
    if (hoje >= ini && hoje <= fimTotal) {
      const hj = h('div', { class: 'tl-hoje', title: 'Hoje' });
      hj.style.left = pct(hoje) + '%';
      caixa.append(hj);
    }
    return caixa;
  }

  function cargaTemporada(perio, hoje) {
    const ativos = store.ativos();
    const itens = [];
    const mods = calc.modsCompeticao(perio);
    [...perio.mesociclos].sort((a, b) => a.inicio.localeCompare(b.inicio)).forEach((m) => {
      calc.planejadoReal(m, S().treinos, ativos, hoje, mods).forEach((s) => itens.push({ rotulo: dm(s.seg), real: s.real, planejado: s.planejado, atual: s.atual }));
    });
    if (!itens.some((i) => i.planejado != null || i.real != null)) return null;
    return h('div', { class: 'rolagem-x' }, AC.ui.graficoCarga(itens));
  }

  /* Semana a semana: fase, volume (fator de carga), intensidade (PSE alvo), competição e a intenção. */
  function calendarioSemanas(perio, hoje) {
    const cal = calc.calendarioCarga(perio);
    const segHoje = calc.segundaDe(hoje);
    const caixa = h('div', { class: 'calendario' });
    cal.forEach((w) => {
      const f = w.fase ? fase(w.fase) : null;
      const barra = h('span', { class: 'vol-barra', title: w.fator == null ? '' : `Volume ${num(w.fator)}× da carga de referência` });
      if (w.fator != null) { const i = h('i'); i.style.width = Math.min(100, Math.round(w.fator * 100)) + '%'; i.style.background = f.cor; barra.append(i); }
      caixa.append(h('div', { class: 'cal-linha' + (w.seg === segHoje ? ' atual' : '') + (w.seg < segHoje ? ' passou' : '') },
        h('div', { class: 'cal-esq' }, h('strong', null, dm(w.seg)), h('span', { class: 'muted' }, `S${w.i + 1}`)),
        h('div', { class: 'cal-meio' },
          h('div', { class: 'cal-topo' }, f ? faseChip(w.fase) : chip('sem mesociclo', { pequeno: true }),
            w.eventos.map((c) => chip(`${c.prioridade} · ${c.nome}${c.situacao === 'provisoria' ? ' (a confirmar)' : ''}`, { pequeno: true, cor: COR_COMP[c.prioridade] }))),
          h('div', { class: 'cal-nums' }, barra, h('span', null, w.fator == null ? '' : `volume ×${num(w.fator)}`), h('span', null, w.pse == null ? '' : `intensidade PSE ${w.pse}`)),
          w.intencao ? h('div', { class: 'dica' }, w.intencao) : null)));
    });
    return caixa;
  }

  function temporada(id) {
    const perio = store.perio(id);
    if (!perio) return h('div', { class: 'vazio' }, h('p', null, 'Periodização não encontrada.'), h('a', { class: 'btn', href: '#/periodizacao' }, 'Voltar'));
    const hoje = calc.hojeISO();
    const sit = calc.situacao(perio, hoje);
    const raiz = h('div');
    raiz.append(
      voltar('#/periodizacao', 'Periodizações'),
      h('div', { class: 'titulo-linha' }, h('h1', null, perio.nome), h('button', { class: 'btn', type: 'button', onclick: () => formPerio(perio) }, 'Editar')),
      h('p', { class: 'sub' }, `${dataCompleta(perio.inicio)} a ${dataCompleta(perio.fim)}`),
      perio.objetivo ? h('p', { class: 'objetivo' }, perio.objetivo) : null,
    );

    const resumo = h('div', { class: 'faixa-info' });
    if (sit.meso) resumo.append(h('div', null, h('span', { class: 'rot' }, 'Agora'), h('strong', null, sit.meso.nome), h('span', { class: 'muted' }, `semana ${sit.semana} de ${sit.meso.semanas}`)));
    if (sit.proxima) resumo.append(h('div', null, h('span', { class: 'rot' }, 'Próxima competição'), h('strong', null, sit.proxima.nome), h('span', { class: 'muted' }, sit.proxima.dias === 0 ? 'hoje' : `em ${plural(sit.proxima.dias, 'dia', 'dias')} · ${dm(sit.proxima.data)}`)));
    if (resumo.children.length) raiz.append(resumo);

    const tl = linhaDoTempo(perio, hoje);
    if (tl) raiz.append(h('section', null, h('h2', null, 'Temporada'), tl));
    const avisos = calc.validarMesos(perio);
    if (avisos.length) raiz.append(h('div', { class: 'alerta medio' }, h('strong', null, 'Confira a estrutura'), h('ul', null, avisos.map((a) => h('li', null, a)))));

    const desal = perio.mesociclos.length && temAlvo(perio) ? calc.desalinhamento(perio, hoje) : [];
    if (desal.length) raiz.append(h('div', { class: 'alerta medio' }, h('strong', null, 'Os mesociclos não acompanham as competições'),
      h('p', null, `Em ${plural(desal.length, 'semana', 'semanas')} a fase planejada difere do que as competições pedem (por exemplo, polimento antes de um alvo). Isso acontece quando uma data muda.`),
      h('button', { class: 'btn primario', type: 'button', onclick: () => modalProposta(perio) }, 'Ver proposta')));

    const mesosSec = h('section', null, h('div', { class: 'titulo-linha' }, h('h2', null, 'Mesociclos'),
      h('div', { class: 'acoes-card sem-margem' },
        perio.mesociclos.length && temAlvo(perio) ? h('button', { class: 'btn', type: 'button', onclick: () => modalProposta(perio) }, 'Reorganizar') : null,
        h('button', { class: 'btn', type: 'button', onclick: () => formMeso(perio) }, '+ Mesociclo'))));
    const ordenados = [...perio.mesociclos].sort((a, b) => a.inicio.localeCompare(b.inicio));
    if (!ordenados.length) {
      mesosSec.append(h('div', { class: 'vazio' },
        h('p', null, 'Divida a temporada em mesociclos de 2 a 6 semanas, cada um com uma ênfase.'),
        h('button', { class: 'btn primario', type: 'button', onclick: () => sugerirEstrutura(perio) }, temAlvo(perio) ? 'Montar a partir das competições' : 'Sugerir estrutura da temporada'),
        h('p', { class: 'dica' }, temAlvo(perio) ? 'Distribui base, desenvolvimento, pré-competitivo, polimento e recuperação em torno das competições A, com tópicos de fundamentos sugeridos. Tudo editável.' : 'Cria base, desenvolvimento, pré-competitivo e competitivo com tópicos de fundamentos sugeridos. Cadastre uma competição A para a estrutura seguir as datas.')));
    }
    ordenados.forEach((m) => {
      const atual = hoje >= m.inicio && hoje <= calc.fimMeso(m);
      const ordem = { alta: 0, media: 1, baixa: 2 };
      const top = [...m.topicos].sort((a, b) => ordem[a.prioridade] - ordem[b.prioridade]);
      mesosSec.append(h('a', { class: 'card meso' + (atual ? ' atual' : ''), href: `#/periodizacao/${perio.id}/${m.id}`, style: { '--cor': fase(m.fase).cor } },
        h('div', { class: 'card-topo' }, h('strong', null, m.nome), faseChip(m.fase)),
        h('div', { class: 'muted' }, `${periodoMeso(m)} · ${plural(m.semanas, 'semana', 'semanas')}${atual ? ' · agora' : ''}`),
        m.enfase ? h('p', { class: 'trecho' }, m.enfase) : null,
        top.length ? h('div', { class: 'chips' }, top.slice(0, 6).map((t) => chip(`${cat.fundamento(t.fundamento).nome}${t.tipos.length ? ': ' + t.tipos.slice(0, 2).join(', ') : ''}`, { pequeno: true, ativo: t.prioridade === 'alta' }))) : h('span', { class: 'dica' }, 'Sem tópicos de fundamentos ainda'),
      ));
    });
    raiz.append(mesosSec);

    if (perio.mesociclos.length) raiz.append(h('section', null, h('div', { class: 'titulo-linha' }, h('h2', null, 'Semana a semana'), h('a', { class: 'link', href: '#/guia' }, 'Como funciona')),
      h('p', { class: 'dica' }, 'Volume: quanto da carga de referência a semana pede. Intensidade: PSE alvo dos treinos. A competição reduz o volume e a intensidade se mantém.'),
      calendarioSemanas(perio, hoje)));

    const carga = cargaTemporada(perio, hoje);
    if (carga) raiz.append(h('section', null, h('h2', null, 'Carga por semana'), h('p', { class: 'dica' }, 'Barras: média do grupo (PSE × minutos). Traço: planejado pela carga de referência do mesociclo, já com a redução das competições.'), carga));

    const comp = h('section', null, h('div', { class: 'titulo-linha' }, h('h2', null, 'Competições'),
      h('button', { class: 'btn', type: 'button', onclick: () => formCompeticao(perio) }, '+ Competição')));
    const cs = [...perio.competicoes].sort((a, b) => a.data.localeCompare(b.data));
    if (!cs.length) comp.append(h('p', { class: 'dica' }, 'Cadastre as competições para ver o caminho até elas na linha do tempo.'));
    cs.forEach((c) => comp.append(h('button', { class: 'linha', type: 'button', onclick: () => formCompeticao(perio, c) },
      h('span', { class: 'bolinha', style: { background: COR_COMP[c.prioridade] } }, c.prioridade),
      h('span', { class: 'linha-txt' }, h('strong', { style: c.situacao === 'cancelada' ? { textDecoration: 'line-through' } : null }, c.nome),
        h('span', { class: 'muted' }, `${dataCompleta(c.data)}${c.situacao === 'provisoria' ? ' · data a confirmar' : c.situacao === 'cancelada' ? ' · cancelada' : ''}`)),
      h('span', { class: 'muted' }, c.situacao === 'cancelada' ? '' : c.data < hoje ? 'passou' : c.data === hoje ? 'hoje' : `em ${calc.diffDias(hoje, c.data)} d`))));
    raiz.append(comp);

    raiz.append(h('div', { class: 'rodape-acoes' }, h('button', { class: 'btn perigo', type: 'button', onclick: async () => {
      if (await confirmar(`Excluir "${perio.nome}" com seus mesociclos e competições? Os treinos registrados continuam salvos.`, { ok: 'Excluir', perigo: true })) {
        S().periodizacoes = S().periodizacoes.filter((p) => p !== perio); store.salvar(); location.hash = '#/periodizacao';
      }
    } }, 'Excluir periodização')));
    return raiz;
  }

  /* ---------- Mesociclo ---------- */

  function topicoCard(meso, cob) {
    const tp = cob.topico;
    const f = cat.fundamento(tp.fundamento);
    return h('div', { class: 'topico prio-' + tp.prioridade },
      h('div', { class: 'topico-topo' },
        h('strong', null, f.nome), chip(PRIO_ROTULO[tp.prioridade], { pequeno: true, ativo: tp.prioridade === 'alta' }),
        h('span', { class: 'esp' }),
        h('button', { class: 'icone', type: 'button', 'aria-label': 'Editar tópico', onclick: () => formTopico(meso, tp) }, '✎'),
        h('button', { class: 'icone', type: 'button', 'aria-label': 'Remover tópico', onclick: async () => {
          if (await confirmar(`Remover "${f.nome}" da ênfase deste mesociclo?`, { ok: 'Remover', perigo: true })) { meso.topicos = meso.topicos.filter((x) => x !== tp); store.salvar(); AC.redesenhar(); }
        } }, '🗑')),
      tp.tipos.length ? h('div', { class: 'chips' }, tp.tipos.map((t) => chip(t, { pequeno: true }))) : h('span', { class: 'dica' }, 'Fundamento inteiro'),
      tp.foco ? h('p', { class: 'foco' }, tp.foco) : null,
      h('div', { class: 'cobertura' },
        h('span', { class: cob.feitos ? 'ok' : 'nada' }, cob.feitos ? `${plural(cob.feitos, 'treino', 'treinos')}` : 'Ainda não trabalhado'),
        cob.previstos ? h('span', { class: 'muted' }, `· ${cob.previstos} previsto${cob.previstos > 1 ? 's' : ''}`) : null,
        cob.ultima ? h('span', { class: 'muted' }, `· último em ${dm(cob.ultima)}`) : null));
  }

  function mesociclo(pid, mid) {
    const perio = store.perio(pid);
    const meso = perio && perio.mesociclos.find((m) => m.id === mid);
    if (!meso) return h('div', { class: 'vazio' }, h('p', null, 'Mesociclo não encontrado.'), h('a', { class: 'btn', href: '#/periodizacao' }, 'Voltar'));
    const hoje = calc.hojeISO();
    const f = fase(meso.fase);
    const raiz = h('div', { class: 'pagina-meso', style: { '--cor': f.cor } });
    raiz.append(
      voltar(`#/periodizacao/${perio.id}`, perio.nome),
      h('div', { class: 'titulo-linha' }, h('h1', null, meso.nome), h('button', { class: 'btn', type: 'button', onclick: () => formMeso(perio, meso) }, 'Editar')),
      h('div', { class: 'chips' }, faseChip(meso.fase), chip(`${periodoMeso(meso)} · ${plural(meso.semanas, 'semana', 'semanas')}`, { pequeno: true })),
    );
    raiz.append(h('section', { class: 'enfase' }, h('h2', null, 'Ênfase'),
      meso.enfase ? h('p', { class: 'objetivo' }, meso.enfase) : h('p', { class: 'dica' }, 'Sem texto de ênfase. Use "Editar" para descrever o que este mesociclo precisa entregar.')));

    const cobs = calc.coberturaMeso(meso, S().treinos);
    const ordem = { alta: 0, media: 1, baixa: 2 };
    cobs.sort((a, b) => ordem[a.topico.prioridade] - ordem[b.topico.prioridade]);
    const topSec = h('section', null, h('div', { class: 'titulo-linha' }, h('h2', null, 'Fundamentos da ênfase'),
      h('button', { class: 'btn primario', type: 'button', onclick: () => formTopico(meso) }, '+ Tópico')));
    if (!cobs.length) {
      topSec.append(h('div', { class: 'vazio' }, h('p', null, 'Escolha os fundamentos e os tipos que este mesociclo vai trabalhar.'),
        (cat.SUGESTOES_FASE[meso.fase] || []).length ? h('button', { class: 'btn', type: 'button', onclick: () => {
          cat.SUGESTOES_FASE[meso.fase].forEach((t) => meso.topicos.push({ id: store.uid(), ...t, tipos: [...t.tipos] }));
          store.salvar(); AC.redesenhar();
        } }, `Usar sugestões da fase ${f.nome}`) : null));
    } else {
      topSec.append(h('p', { class: 'dica' }, 'A contagem mostra em quantos treinos do mesociclo o fundamento apareceu.'), ...cobs.map((c) => topicoCard(meso, c)));
    }
    raiz.append(topSec);

    raiz.append(h('section', null, h('div', { class: 'titulo-linha' }, h('h2', null, 'Treino físico do mesociclo'), h('a', { class: 'btn', href: '#/fisico' }, 'Abrir físico')),
      meso.fisico && meso.fisico.length ? h('div', { class: 'chips' }, meso.fisico.map((x) => chip(x))) : h('p', { class: 'dica' }, 'Sem foco físico definido. Use "Editar".')));

    const semanas = calc.planejadoReal(meso, S().treinos, store.ativos(), hoje, calc.modsCompeticao(perio));
    const tem = semanas.some((s) => s.planejado != null || s.real != null);
    const tab = h('div', { class: 'tabela-semanas' });
    semanas.forEach((s, i) => {
      const ts = S().treinos.filter((t) => t.data >= s.seg && t.data <= calc.addDias(s.seg, 6));
      const feitos = ts.filter((t) => t.feito).length;
      tab.append(h('a', { class: 'linha' + (s.atual ? ' atual' : ''), href: `#/treinos?semana=${s.seg}` },
        h('span', { class: 'linha-txt' }, h('strong', null, `Semana ${i + 1}`), h('span', { class: 'muted' }, `${dm(s.seg)} a ${dm(calc.addDias(s.seg, 6))}`)),
        h('span', { class: 'muted' }, `×${num(s.fator)}`),
        h('span', null, s.planejado != null ? `plan. ${milhar(s.planejado)}` : ''),
        h('span', null, s.real != null ? `real ${milhar(s.real)}` : ''),
        h('span', { class: 'muted' }, `${feitos}/${ts.length} treinos`)));
    });
    raiz.append(h('section', null, h('h2', null, 'Carga e semanas'),
      h('p', { class: 'dica' }, `${calc.PERFIS[meso.perfil] || ''}. ${meso.cargaRef ? `Referência: ${milhar(meso.cargaRef)} por atleta na semana cheia.` : 'Defina uma carga de referência em "Editar" para ver o planejado.'}`),
      tem ? h('div', { class: 'rolagem-x' }, AC.ui.graficoCarga(semanas.map((s, i) => ({ rotulo: `S${i + 1}`, real: s.real, planejado: s.planejado, atual: s.atual })))) : null,
      tab));

    raiz.append(h('div', { class: 'rodape-acoes' }, h('button', { class: 'btn perigo', type: 'button', onclick: async () => {
      if (await confirmar(`Excluir o mesociclo "${meso.nome}"? Os treinos registrados continuam salvos.`, { ok: 'Excluir', perigo: true })) {
        perio.mesociclos = perio.mesociclos.filter((m) => m !== meso); store.salvar(); location.hash = `#/periodizacao/${perio.id}`;
      }
    } }, 'Excluir mesociclo')));
    return raiz;
  }

  AC.views = AC.views || {};
  AC.views.periodizacao = ({ partes }) => (partes[1] && partes[2] ? mesociclo(partes[1], partes[2]) : partes[1] ? temporada(partes[1]) : lista());
  AC.periodizacaoForms = { formPerio };
})((window.AC = window.AC || {}));
