/* Treinos: semana, e o registro de cada treino (o que foi feito, fundamentos, treino físico, PSR de chegada e PSE de saída). */
(function (AC) {
  const { h, pintar, chip, campo, entrada, selecao, modal, confirmar, aviso, dm, dataCurta, dataLonga, num, milhar, plural } = AC.ui;
  const { calc, cat, store } = AC;
  const S = () => store.e;

  const nomeTipo = (id) => (cat.tipoTreino(id) || { nome: id }).nome;
  const tituloTreino = (t) => t.titulo || nomeTipo(t.tipo);
  const voltar = (href, texto) => h('a', { class: 'voltar', href }, '‹ ', texto);
  const LOCAIS = ['Areia', 'Quadra coberta', 'Academia', 'Quadra de piso', 'Outro'];

  /* Sessões previstas pela periodização para o dia (só quando não há treino de verdade nele). */
  function previstos(data) {
    if (S().treinos.some((t) => t.data === data)) return [];
    const perio = store.perioDaData(data);
    return perio ? calc.sessoesDaData(perio, data) : [];
  }

  function cartaoPrevisto(x, i) {
    const it = cat.INTENSIDADES[x.intensidade];
    const comp = x.tipo === 'competicao';
    return h('a', { class: 'card treino previsto', href: `#/treinos/novo?data=${x.data}&prev=${i}` },
      h('div', { class: 'card-topo' }, h('strong', null, comp ? `Competição: ${x.titulo}` : nomeTipo(x.tipo)), comp ? chip('Previsto', { pequeno: true }) : chip(`Intensidade ${it.nome.toLowerCase()}`, { pequeno: true, cor: it.cor })),
      h('div', { class: 'muted' }, comp ? 'Registrar como treino de competição' : `${x.duracao} min · PSE alvo ${x.pse}${x.motivo ? ' · ' + x.motivo : ''}`),
      x.fundamentos.length ? h('div', { class: 'chips' }, fundamentosChips(x)) : null,
      h('span', { class: 'toque' }, 'Toque para registrar'));
  }

  function fundamentosChips(t) {
    return (t.fundamentos || []).map((f) => chip(`${cat.fundamento(f.fundamento).nome}${f.tipos && f.tipos.length ? ': ' + f.tipos.join(', ') : ''}`, { pequeno: true }));
  }

  /* ---------- Semana ---------- */

  function cartaoTreino(t, atletas) {
    const ps = Object.values(t.presencas || {});
    const presentes = ps.filter((p) => p.presente).length;
    const psr = calc.mediaSessao(t, 'psr'), pse = calc.mediaSessao(t, 'pse');
    const cargas = atletas.map((a) => calc.cargaSessao(t, a.id)).filter((c) => c != null);
    return h('a', { class: 'card treino' + (t.feito ? '' : ' planejado'), href: `#/treinos/${t.id}` },
      h('div', { class: 'card-topo' },
        h('strong', null, tituloTreino(t)),
        chip(t.feito ? 'Realizado' : (t.data < calc.hojeISO() ? 'Sem registro' : 'Planejado'), { pequeno: true, cor: t.feito ? 'var(--ok)' : (t.data < calc.hojeISO() ? 'var(--bad)' : 'var(--muted)') })),
      h('div', { class: 'muted' }, `${nomeTipo(t.tipo)} · ${t.duracao || 0} min${t.local ? ' · ' + t.local : ''}${t.fisico ? ' · com treino físico' : ''}`),
      (t.fundamentos || []).length ? h('div', { class: 'chips' }, fundamentosChips(t)) : null,
      t.feito ? h('div', { class: 'numeros' },
        h('span', null, h('b', null, `${presentes}/${ps.length}`), ' presentes'),
        h('span', null, 'chegada ', h('b', null, num(AC.calc.arred(psr, 1)))),
        h('span', null, 'saída ', h('b', null, num(AC.calc.arred(pse, 1)))),
        h('span', null, 'carga ', h('b', null, cargas.length ? milhar(calc.media(cargas)) : '—'))) : null);
  }

  function semana(query) {
    const raiz = h('div');
    const hoje = calc.hojeISO();
    let seg = calc.segundaDe(query.semana || hoje);
    const desenhar = () => {
      const fim = calc.addDias(seg, 6);
      const perio = store.perioDaData(seg);
      const ativos = store.ativos(perio);
      const meso = perio && (calc.mesoDaData(perio, seg) || calc.mesoDaData(perio, fim));
      const r = calc.resumoSemana(S().treinos, ativos, seg);
      const nodes = [
        h('div', { class: 'titulo-linha' }, h('h1', null, 'Treinos'),
          h('a', { class: 'btn primario', href: `#/treinos/novo?data=${hoje >= seg && hoje <= fim ? hoje : seg}` }, '+ Treino')),
        h('div', { class: 'nav-semana' },
          h('button', { class: 'icone', type: 'button', 'aria-label': 'Semana anterior', onclick: () => { seg = calc.addDias(seg, -7); desenhar(); } }, '‹'),
          h('div', { class: 'nav-semana-centro' }, h('strong', null, `${dm(seg)} a ${dm(fim)}`),
            seg === calc.segundaDe(hoje) ? h('span', { class: 'muted' }, 'esta semana') : h('button', { class: 'link', type: 'button', onclick: () => { seg = calc.segundaDe(hoje); desenhar(); } }, 'ir para hoje')),
          h('button', { class: 'icone', type: 'button', 'aria-label': 'Próxima semana', onclick: () => { seg = calc.addDias(seg, 7); desenhar(); } }, '›')),
      ];
      if (meso) {
        const f = cat.fase(meso.fase);
        const sem = Math.floor(calc.diffDias(calc.segundaDe(meso.inicio), seg) / 7) + 1;
        nodes.push(h('a', { class: 'faixa-meso', href: `#/periodizacao/${perio.id}/${meso.id}`, style: { '--cor': f.cor } },
          h('div', null, h('strong', null, meso.nome), h('span', { class: 'muted' }, ` · semana ${Math.max(1, sem)} de ${meso.semanas}`)),
          meso.topicos.length ? h('div', { class: 'chips' }, meso.topicos.filter((t) => t.prioridade === 'alta').slice(0, 4).map((t) => chip(cat.fundamento(t.fundamento).nome, { pequeno: true }))) : null));
      }
      nodes.push(h('div', { class: 'resumo' },
        h('div', null, h('b', null, `${r.feitas}/${r.sessoes}`), h('span', null, 'treinos')),
        h('div', null, h('b', null, milhar(r.minutos)), h('span', null, 'minutos')),
        h('div', null, h('b', null, num(r.psrMedio)), h('span', null, 'chegada (PSR)')),
        h('div', null, h('b', null, num(r.pseMedio)), h('span', null, 'saída (PSE)')),
        h('div', null, h('b', null, milhar(r.cargaMedia)), h('span', null, 'carga média'))));
      for (let i = 0; i < 7; i++) {
        const dia = calc.addDias(seg, i);
        const ts = S().treinos.filter((t) => t.data === dia).sort((a, b) => (a.hora || '').localeCompare(b.hora || ''));
        nodes.push(h('section', { class: 'dia' + (dia === hoje ? ' hoje' : '') },
          h('div', { class: 'dia-topo' }, h('strong', null, dataCurta(dia)), dia === hoje ? chip('hoje', { pequeno: true, ativo: true }) : null,
            h('a', { class: 'mais', href: `#/treinos/novo?data=${dia}`, 'aria-label': `Novo treino em ${dm(dia)}` }, '+')),
          ts.length ? ts.map((t) => cartaoTreino(t, ativos)) : (() => { const pv = previstos(dia); return pv.length ? pv.map((x, k) => cartaoPrevisto(x, k)) : h('div', { class: 'dia-vazio' }, 'Sem treino'); })()));
      }
      pintar(raiz, nodes);
    };
    desenhar();
    return raiz;
  }

  /* ---------- Treino físico dentro do treino ---------- */

  function escolherPlano(aoEscolher) {
    modal('Inserir treino físico', (fechar) => {
      const planos = S().planosFisicos;
      if (!planos.length) {
        return h('div', null, h('p', null, 'Você ainda não montou nenhum treino físico.'),
          h('a', { class: 'btn primario', href: '#/fisico/plano/novo', onclick: () => fechar() }, 'Montar treino físico'));
      }
      return h('div', null,
        planos.map((p) => h('button', { class: 'linha', type: 'button', onclick: () => { aoEscolher(p); fechar(); } },
          h('span', { class: 'linha-txt' }, h('strong', null, p.nome), h('span', { class: 'muted' }, `${p.duracao || '?'} min · ${p.foco.join(', ') || 'sem foco'}`)))),
        h('a', { class: 'link', href: '#/fisico/plano/novo', onclick: () => fechar() }, '+ Montar um novo treino físico'));
    });
  }

  const copiaPlano = (p) => ({ planoId: p.id, nome: p.nome, foco: [...p.foco], duracao: p.duracao, pseAlvo: p.pseAlvo, notas: p.notas, blocos: JSON.parse(JSON.stringify(p.blocos)) });

  /* ---------- Registro do treino ---------- */

  function rascunhoNovo(query) {
    const hoje = calc.hojeISO();
    const data = query.data || hoje;
    const presencas = {};
    store.ativos(store.perioDaData(data)).forEach((a) => { presencas[a.id] = { presente: true, psr: null, pse: null, obs: '' }; });
    const novo = { id: store.uid(), data, feito: data <= hoje, tipo: 'tecnico', titulo: '', duracao: 90, pseAlvo: null, local: 'Areia', fundamentos: [], atividades: [], fisico: null, presencas, notas: '' };
    /* Vindo de uma sessão prevista: já entra com tipo, duração, PSE alvo e fundamentos. */
    if (query.prev !== undefined) {
      const perio = store.perioDaData(data);
      const x = perio && calc.sessoesDaData(perio, data)[Number(query.prev)];
      if (x) Object.assign(novo, { tipo: x.tipo, titulo: x.tipo === 'competicao' ? x.titulo : '', duracao: x.duracao || 120, pseAlvo: x.pse, fundamentos: JSON.parse(JSON.stringify(x.fundamentos)) });
    }
    return novo;
  }

  function treino(id, query) {
    const existente = id === 'novo' ? null : store.treino(id);
    if (id !== 'novo' && !existente) return h('div', { class: 'vazio' }, h('p', null, 'Treino não encontrado.'), h('a', { class: 'btn', href: '#/treinos' }, 'Voltar'));
    const d = existente ? JSON.parse(JSON.stringify(existente)) : rascunhoNovo(query);
    const novo = !existente;
    if (!novo) {
      store.ativos(store.perioDaData(d.data)).forEach((a) => { if (!d.presencas[a.id]) d.presencas[a.id] = { presente: !d.feito, psr: null, pse: null, obs: '' }; });
    }
    const raiz = h('div', { class: 'pagina-treino' });
    const hoje = calc.hojeISO();

    const destino = () => `#/treinos?semana=${calc.segundaDe(d.data)}`;
    const topo = h('div');
    const blocoDados = h('section'), blocoEnfase = h('section'), blocoFund = h('section'), blocoAtiv = h('section'), blocoFis = h('section'), blocoPres = h('section'), blocoNotas = h('section');

    /* Dados básicos */
    const desenharTopo = () => {
      topo.replaceChildren(
        voltar(destino(), 'Semana'),
        h('h1', null, novo ? 'Novo treino' : tituloTreino(d)),
        h('div', { class: 'campo' }, h('span', { class: 'campo-rotulo' }, 'Situação'),
          AC.ui.segmentado([{ valor: false, rotulo: 'Planejado' }, { valor: true, rotulo: 'Realizado' }], d.feito, (v) => { d.feito = v; desenharPresencas(); desenharTopo(); })));
    };

    const desenharDados = () => {
      const data = entrada('date', d.data, { required: true });
      const tipo = selecao(cat.TIPOS_TREINO.map((t) => ({ valor: t.id, rotulo: t.nome })), d.tipo);
      const titulo = entrada('text', d.titulo, { maxLength: 80, placeholder: 'Ex.: Saque viagem e recepção' });
      const dur = entrada('number', d.duracao, { min: 0, max: 360, step: 5 });
      const alvo = entrada('number', d.pseAlvo, { min: 0, max: 10, placeholder: '0 a 10' });
      const local = selecao(LOCAIS.map((l) => ({ valor: l, rotulo: l })), LOCAIS.includes(d.local) ? d.local : 'Outro');
      data.addEventListener('change', () => { if (data.value) { d.data = data.value; desenharEnfase(); } });
      tipo.addEventListener('change', () => { d.tipo = tipo.value; });
      titulo.addEventListener('input', () => { d.titulo = titulo.value; });
      dur.addEventListener('input', () => { d.duracao = Number(dur.value) || 0; atualizaResumo(); });
      alvo.addEventListener('input', () => { d.pseAlvo = alvo.value === '' ? null : Number(alvo.value); });
      local.addEventListener('change', () => { d.local = local.value; });
      pintar(blocoDados, 
        h('div', { class: 'duas' }, campo('Data', data), campo('Tipo', tipo)),
        campo('Título', titulo),
        h('div', { class: 'tres' }, campo('Duração (min)', dur), campo('PSE planejada', alvo), campo('Local', local)));
    };

    /* Ênfase do mesociclo daquela data, com atalho para marcar o que o treino cobriu */
    const desenharEnfase = () => {
      const perio = store.perioDaData(d.data);
      const meso = perio && calc.mesoDaData(perio, d.data);
      if (!meso) { pintar(blocoEnfase, h('p', { class: 'dica' }, perio ? 'Esta data está fora dos mesociclos da periodização.' : 'Sem periodização para esta data.')); return; }
      const f = cat.fase(meso.fase);
      const ordem = { alta: 0, media: 1, baixa: 2 };
      const topicos = [...meso.topicos].sort((a, b) => ordem[a.prioridade] - ordem[b.prioridade]);
      pintar(blocoEnfase, h('div', { class: 'enfase-banner', style: { '--cor': f.cor } },
        h('div', { class: 'card-topo' }, h('strong', null, 'Ênfase do mesociclo'), chip(f.nome, { cor: f.cor, pequeno: true })),
        h('a', { class: 'muted', href: `#/periodizacao/${perio.id}/${meso.id}` }, meso.nome),
        meso.enfase ? h('p', { class: 'trecho' }, meso.enfase) : null,
        topicos.length ? h('div', null, h('span', { class: 'dica' }, 'Toque para incluir neste treino:'),
          h('div', { class: 'chips' }, topicos.map((tp) => {
            const feito = (d.fundamentos || []).some((x) => x.fundamento === tp.fundamento && tp.tipos.every((t) => (x.tipos || []).includes(t)));
            return chip(`${feito ? '✓ ' : '+ '}${cat.fundamento(tp.fundamento).nome}${tp.tipos.length ? ': ' + tp.tipos.slice(0, 2).join(', ') : ''}`, {
              ativo: feito, pequeno: true,
              onclick: () => {
                const ex = d.fundamentos.find((x) => x.fundamento === tp.fundamento);
                if (ex) tp.tipos.forEach((t) => { if (!(ex.tipos || []).includes(t)) ex.tipos.push(t); });
                else d.fundamentos.push({ fundamento: tp.fundamento, tipos: [...tp.tipos] });
                desenharFund(); desenharEnfase();
              },
            });
          }))) : null));
    };

    /* Fundamentos trabalhados */
    const desenharFund = () => {
      pintar(blocoFund, 
        h('div', { class: 'titulo-linha' }, h('h2', null, 'Fundamentos trabalhados'),
          h('button', { class: 'btn', type: 'button', onclick: () => escolherFundamento() }, '+ Fundamento')),
        d.fundamentos.length ? d.fundamentos.map((f, i) => {
          const def = cat.fundamento(f.fundamento);
          return h('div', { class: 'item-edit' },
            h('div', { class: 'topico-topo' }, h('strong', null, def.nome), h('span', { class: 'esp' }),
              h('button', { class: 'icone', type: 'button', 'aria-label': `Remover ${def.nome}`, onclick: () => { d.fundamentos.splice(i, 1); desenharFund(); desenharEnfase(); } }, '✕')),
            AC.ui.chipsMulti(def.tipos, f.tipos, (v) => { f.tipos = v; desenharEnfase(); }).el);
        }) : h('p', { class: 'dica' }, 'Marque o que o treino trabalhou. Sem tipo marcado, vale o fundamento inteiro.'));
    };

    const escolherFundamento = () => {
      modal('Adicionar fundamento', (fechar) => h('div', null, cat.FUNDAMENTOS.map((f) => h('button', { class: 'linha', type: 'button', onclick: () => {
        if (!d.fundamentos.some((x) => x.fundamento === f.id)) d.fundamentos.push({ fundamento: f.id, tipos: [] });
        fechar(); desenharFund(); desenharEnfase();
      } }, h('span', { class: 'linha-txt' }, h('strong', null, f.nome), h('span', { class: 'muted' }, f.tipos.slice(0, 3).join(', ') + '…'))))));
    };

    /* O que foi feito */
    const desenharAtiv = () => {
      pintar(blocoAtiv, 
        h('div', { class: 'titulo-linha' }, h('h2', null, 'O que foi feito'), h('button', { class: 'btn', type: 'button', onclick: () => { d.atividades.push({ id: store.uid(), descricao: '', min: null }); desenharAtiv(); } }, '+ Atividade')),
        d.atividades.length ? d.atividades.map((a, i) => {
          const desc = h('input', { type: 'text', value: a.descricao, placeholder: 'Ex.: Saque viagem na zona 1, 30 bolas por atleta', 'aria-label': 'Descrição da atividade', oninput: () => { a.descricao = desc.value; } });
          const min = h('input', { type: 'number', value: a.min == null ? '' : a.min, min: 0, max: 240, placeholder: 'min', 'aria-label': 'Minutos', oninput: () => { a.min = min.value === '' ? null : Number(min.value); total2.textContent = totalTexto(); } });
          return h('div', { class: 'ativ' }, desc, min, h('button', { class: 'icone', type: 'button', 'aria-label': 'Remover atividade', onclick: () => { d.atividades.splice(i, 1); desenharAtiv(); } }, '✕'));
        }) : h('p', { class: 'dica' }, 'Liste as atividades na ordem em que aconteceram.'),
        d.atividades.length ? total2 : null);
      total2.textContent = totalTexto();
    };
    const total2 = h('p', { class: 'dica' });
    const totalTexto = () => {
      const total = d.atividades.reduce((s, a) => s + (Number(a.min) || 0), 0);
      return total ? `Atividades somam ${total} min${d.duracao ? ` de ${d.duracao} min do treino` : ''}.` : '';
    };

    /* Treino físico */
    const desenharFis = () => {
      const partes = [h('div', { class: 'titulo-linha' }, h('h2', null, 'Treino físico'),
        d.fisico ? h('button', { class: 'btn', type: 'button', onclick: () => escolherPlano(inserir) }, 'Trocar') : h('button', { class: 'btn', type: 'button', onclick: () => escolherPlano(inserir) }, '+ Inserir treino físico'))];
      if (d.fisico) {
        partes.push(h('div', { class: 'card' }, h('div', { class: 'card-topo' }, h('strong', null, d.fisico.nome),
          h('button', { class: 'link', type: 'button', onclick: () => { d.fisico = null; desenharFis(); } }, 'Remover')),
          h('div', { class: 'chips' }, d.fisico.foco.map((x) => chip(x, { pequeno: true }))),
          AC.fisicoResumo(d.fisico)));
      } else partes.push(h('p', { class: 'dica' }, 'Opcional. Escolha um treino físico montado na aba Físico para registrar junto deste treino.'));
      pintar(blocoFis, partes);
    };
    const inserir = (p) => {
      d.fisico = copiaPlano(p);
      if (d.tipo === 'fisico' && !d.titulo) d.titulo = p.nome;
      if (d.pseAlvo == null && p.pseAlvo != null && d.tipo === 'fisico') d.pseAlvo = p.pseAlvo;
      desenharFis(); desenharDados();
    };

    /* Chegada (PSR) e saída (PSE) */
    const resumo = h('div', { class: 'resumo' });
    const linhasPres = [];
    const atualizaResumo = () => {
      const ps = linhasPres.map((l) => d.presencas[l.id]).filter((p) => p.presente);
      const media = (c) => { const v = ps.filter((p) => p[c] != null).map((p) => p[c]); return v.length ? calc.arred(calc.media(v), 1) : null; };
      const cargas = ps.filter((p) => p.pse != null).map((p) => p.pse * (d.duracao || 0));
      resumo.replaceChildren(
        h('div', null, h('b', null, `${ps.length}/${linhasPres.length}`), h('span', null, 'presentes')),
        h('div', null, h('b', null, num(media('psr'))), h('span', null, 'chegada (PSR)')),
        h('div', null, h('b', null, num(media('pse'))), h('span', null, 'saída (PSE)')),
        h('div', null, h('b', null, cargas.length ? milhar(calc.media(cargas)) : '—'), h('span', null, 'carga média')));
    };

    const desenharPresencas = () => {
      linhasPres.length = 0;
      if (!d.feito) {
        pintar(blocoPres, h('h2', null, 'Chegada e saída'), h('div', { class: 'vazio pequeno' }, h('p', null, 'Marque o treino como "Realizado" para registrar como cada atleta chegou (PSR) e saiu (PSE).'),
          h('button', { class: 'btn', type: 'button', onclick: () => { d.feito = true; desenharTopo(); desenharPresencas(); } }, 'Marcar como realizado')));
        return;
      }
      const atletas = S().atletas.filter((a) => d.presencas[a.id]);
      if (!atletas.length) {
        pintar(blocoPres, h('h2', null, 'Chegada e saída'), h('div', { class: 'vazio pequeno' }, h('p', null, 'Cadastre os atletas para registrar PSR e PSE.'), h('a', { class: 'btn', href: '#/atletas' }, 'Cadastrar atletas')));
        return;
      }
      const cartoes = atletas.map((a) => {
        const p = d.presencas[a.id] || (d.presencas[a.id] = { presente: true, psr: null, pse: null, obs: '' });
        const psr = AC.ui.escala('psr', p.psr, (v) => { p.psr = v; atualizaResumo(); });
        const pse = AC.ui.escala('pse', p.pse, (v) => { p.pse = v; atualizaResumo(); });
        const corpo = h('div', { class: 'pres-corpo' },
          h('div', { class: 'pres-esc' }, h('span', { class: 'campo-rotulo' }, 'Chegada · como chegou (PSR)'), psr.el),
          h('div', { class: 'pres-esc' }, h('span', { class: 'campo-rotulo' }, 'Saída · esforço do treino (PSE)'), pse.el),
          h('input', { type: 'text', class: 'obs', value: p.obs || '', placeholder: 'Observação (dor, ajuste, destaque)', 'aria-label': `Observação de ${a.nome}`, oninput: (e) => { p.obs = e.target.value; } }));
        const cartao = h('div', { class: 'pres' + (p.presente ? '' : ' ausente') });
        const sw = h('button', { class: 'troca' + (p.presente ? ' on' : ''), type: 'button', role: 'switch', 'aria-checked': String(p.presente), 'aria-label': `${a.nome} presente`, onclick: () => {
          p.presente = !p.presente;
          sw.classList.toggle('on', p.presente); sw.setAttribute('aria-checked', String(p.presente));
          cartao.classList.toggle('ausente', !p.presente);
          estado.textContent = p.presente ? 'presente' : 'faltou';
          atualizaResumo();
        } }, h('span'));
        const estado = h('span', { class: 'muted' }, p.presente ? 'presente' : 'faltou');
        cartao.append(h('div', { class: 'pres-topo' }, h('strong', null, a.nome), h('span', { class: 'esp' }), estado, sw), corpo);
        linhasPres.push({ id: a.id, psr, pse });
        return cartao;
      });

      /* Preencher todos de uma vez */
      const todosPsr = AC.ui.escala('psr', null, (v) => { linhasPres.forEach((l) => { if (d.presencas[l.id].presente) { d.presencas[l.id].psr = v; l.psr.definir(v); } }); atualizaResumo(); });
      const todosPse = AC.ui.escala('pse', null, (v) => { linhasPres.forEach((l) => { if (d.presencas[l.id].presente) { d.presencas[l.id].pse = v; l.pse.definir(v); } }); atualizaResumo(); });
      pintar(blocoPres, 
        h('h2', null, 'Chegada e saída'),
        h('p', { class: 'dica' }, 'PSR: quão recuperado o atleta chegou (0 nada, 10 plenamente). PSE: o esforço que sentiu no treino (0 repouso, 10 máximo). A carga é PSE × minutos.'),
        h('details', { class: 'todos' }, h('summary', null, 'Preencher todos os presentes de uma vez'),
          h('div', { class: 'pres-esc' }, h('span', { class: 'campo-rotulo' }, 'Todos · chegada (PSR)'), todosPsr.el),
          h('div', { class: 'pres-esc' }, h('span', { class: 'campo-rotulo' }, 'Todos · saída (PSE)'), todosPse.el)),
        resumo, ...cartoes);
      atualizaResumo();
    };

    const notas = h('textarea', { rows: 3, placeholder: 'Pontos de atenção, o que ajustar no próximo treino…', oninput: () => { d.notas = notas.value; } }, d.notas);
    blocoNotas.append(h('h2', null, 'Observações do treino'), notas);

    const salvar = () => {
      if (!d.data) return aviso('Informe a data do treino.', true);
      d.titulo = (d.titulo || '').trim();
      if (novo) S().treinos.push(d);
      else S().treinos[S().treinos.indexOf(existente)] = d;
      store.salvar();
      aviso(d.feito ? 'Treino registrado.' : 'Treino planejado salvo.');
      location.hash = destino();
    };
    const acoes = h('div', { class: 'barra-salvar' },
      !novo ? h('button', { class: 'btn perigo', type: 'button', onclick: async () => {
        if (await confirmar('Excluir este treino e os registros de PSR e PSE dele?', { ok: 'Excluir', perigo: true })) {
          S().treinos = S().treinos.filter((t) => t !== existente); store.salvar(); location.hash = destino();
        }
      } }, 'Excluir') : null,
      h('span', { class: 'esp' }),
      h('button', { class: 'btn primario', type: 'button', onclick: salvar }, 'Salvar treino'));

    desenharTopo(); desenharDados(); desenharEnfase(); desenharFund(); desenharAtiv(); desenharFis(); desenharPresencas();
    raiz.append(topo, blocoDados, blocoEnfase, blocoFund, blocoAtiv, blocoFis, blocoPres, blocoNotas, acoes);
    return raiz;
  }

  AC.views = AC.views || {};
  AC.views.treinos = ({ partes, query }) => (partes[1] ? treino(partes[1], query) : semana(query));
})((window.AC = window.AC || {}));
