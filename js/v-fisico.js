/* Treino físico: monta treinos (blocos de exercícios com séries, repetições, carga e descanso), guarda a biblioteca de
   exercícios e insere um treino montado em qualquer dia, quando o técnico quiser. */
(function (AC) {
  const { h, chip, campo, entrada, selecao, modal, confirmar, aviso, dm, dataCompleta, plural } = AC.ui;
  const { calc, cat, store } = AC;
  const S = () => store.e;
  const voltar = (href, texto) => h('a', { class: 'voltar', href }, '‹ ', texto);
  const clone = (x) => JSON.parse(JSON.stringify(x));

  function descItem(it) {
    const partes = [];
    if (it.series || it.reps) partes.push([it.series ? `${it.series}×` : '', it.reps || ''].join(''));
    if (it.carga) partes.push(it.carga);
    if (it.descanso) partes.push(`pausa ${it.descanso}s`);
    return partes.join(' · ');
  }

  /* Texto do treino montado, usado também dentro do registro do treino. */
  AC.fisicoResumo = (plano) => h('div', { class: 'fis-resumo' }, plano.blocos.map((b) => h('div', { class: 'fis-bloco' },
    h('div', { class: 'fis-bloco-nome' }, b.nome),
    b.itens.length ? h('ul', null, b.itens.map((it) => h('li', null, h('strong', null, it.nome), descItem(it) ? h('span', { class: 'muted' }, ` — ${descItem(it)}`) : null, it.obs ? h('span', { class: 'dica' }, ` (${it.obs})`) : null)))
      : h('p', { class: 'dica' }, 'Bloco vazio'))));

  /* Estimativa grosseira: trabalho de cada série (por tempo informado ou 3 s por repetição) mais a pausa. */
  function estimativa(blocos) {
    let seg = 0;
    blocos.forEach((b) => b.itens.forEach((it) => {
      const reps = String(it.reps || '');
      let trabalho = 30;
      const min = reps.match(/(\d+(?:[.,]\d+)?)\s*min/i), s = reps.match(/(\d+)\s*s\b/i), n = reps.match(/(\d+)/);
      if (min) trabalho = parseFloat(min[1].replace(',', '.')) * 60; else if (s) trabalho = Number(s[1]); else if (n) trabalho = Number(n[1]) * 3;
      seg += (Number(it.series) || 1) * (trabalho + (Number(it.descanso) || 0));
    }));
    return Math.round(seg / 60);
  }

  /* ---------- Treinos montados ---------- */

  function inserirEmTreino(plano) {
    modal('Inserir em um treino', (fechar) => {
      const hoje = calc.hojeISO();
      const data = entrada('date', hoje, { required: true });
      const destino = selecao([{ valor: 'novo', rotulo: 'Criar um treino físico novo' }], 'novo');
      const preencher = () => {
        const ts = S().treinos.filter((t) => t.data === data.value);
        destino.replaceChildren(h('option', { value: 'novo' }, 'Criar um treino físico novo'),
          ...ts.map((t) => h('option', { value: t.id }, `Juntar a: ${t.titulo || (cat.tipoTreino(t.tipo) || {}).nome} (${t.duracao || 0} min)`)));
        destino.value = 'novo';
      };
      preencher();
      data.addEventListener('change', preencher);
      return h('form', { onsubmit: (e) => {
        e.preventDefault();
        let t;
        if (destino.value === 'novo') {
          const presencas = {};
          store.ativos().forEach((a) => { presencas[a.id] = { presente: true, psr: null, pse: null, obs: '' }; });
          t = { id: store.uid(), data: data.value, feito: data.value < hoje, tipo: 'fisico', titulo: plano.nome, duracao: plano.duracao || 60, pseAlvo: plano.pseAlvo, local: 'Areia', fundamentos: [], atividades: [], fisico: null, presencas, notas: '' };
          S().treinos.push(t);
        } else t = store.treino(destino.value);
        t.fisico = { planoId: plano.id, nome: plano.nome, foco: [...plano.foco], duracao: plano.duracao, pseAlvo: plano.pseAlvo, notas: plano.notas, blocos: clone(plano.blocos) };
        store.salvar(); fechar();
        aviso('Treino físico inserido.');
        location.hash = `#/treinos/${t.id}`;
      } },
      h('p', { class: 'muted' }, `"${plano.nome}" é copiado para o treino; mudar o modelo depois não altera o que já foi inserido.`),
      campo('Dia', data), campo('Onde inserir', destino),
      h('div', { class: 'acoes' }, h('button', { class: 'btn', type: 'button', onclick: () => fechar() }, 'Cancelar'), h('button', { class: 'btn primario', type: 'submit' }, 'Inserir')));
    });
  }

  function cartaoPlano(p) {
    const qtd = p.blocos.reduce((s, b) => s + b.itens.length, 0);
    return h('div', { class: 'card' },
      h('div', { class: 'card-topo' }, h('a', { href: `#/fisico/plano/${p.id}` }, h('strong', null, p.nome))),
      h('div', { class: 'muted' }, `${plural(qtd, 'exercício', 'exercícios')}${p.duracao ? ` · ${p.duracao} min` : ''}${p.pseAlvo != null ? ` · PSE alvo ${p.pseAlvo}` : ''}`),
      p.foco.length ? h('div', { class: 'chips' }, p.foco.map((f) => chip(f, { pequeno: true }))) : null,
      h('div', { class: 'acoes-card' },
        h('button', { class: 'btn primario', type: 'button', onclick: () => inserirEmTreino(p) }, 'Inserir em treino'),
        h('a', { class: 'btn', href: `#/fisico/plano/${p.id}` }, 'Editar'),
        h('button', { class: 'btn', type: 'button', onclick: () => {
          const c = clone(p); c.id = store.uid(); c.nome = `${p.nome} (cópia)`;
          c.blocos.forEach((b) => { b.id = store.uid(); b.itens.forEach((i) => { i.id = store.uid(); }); });
          S().planosFisicos.push(c); store.salvar(); AC.redesenhar();
        } }, 'Duplicar'),
        h('button', { class: 'btn perigo', type: 'button', onclick: async () => {
          if (await confirmar(`Excluir o treino "${p.nome}"? Treinos que já o receberam não mudam.`, { ok: 'Excluir', perigo: true })) { S().planosFisicos = S().planosFisicos.filter((x) => x !== p); store.salvar(); AC.redesenhar(); }
        } }, 'Excluir')));
  }

  /* ---------- Biblioteca de exercícios ---------- */

  function formExercicio(ex, aoSalvar) {
    const novo = !ex;
    modal(novo ? 'Novo exercício' : 'Editar exercício', (fechar) => {
      const nome = entrada('text', ex ? ex.nome : '', { required: true, maxLength: 80 });
      const categoria = selecao(cat.CATEGORIAS_EX.map((c) => ({ valor: c, rotulo: c })), ex ? ex.categoria : 'Força');
      const regiao = entrada('text', ex ? ex.regiao : '', { maxLength: 60, placeholder: 'Ex.: ombro, pernas, corpo todo' });
      const equip = entrada('text', ex ? ex.equip : 'Peso do corpo', { maxLength: 60 });
      const dica = h('textarea', { rows: 2, placeholder: 'Como executar bem, o que cuidar' }, ex ? ex.dica : '');
      return h('form', { onsubmit: (e) => {
        e.preventDefault();
        const dados = { nome: nome.value.trim(), categoria: categoria.value, regiao: regiao.value.trim(), equip: equip.value.trim(), dica: dica.value.trim() };
        let salvo = ex;
        if (novo) { salvo = { id: store.uid(), ...dados }; S().exercicios.push(salvo); } else Object.assign(ex, dados);
        store.salvar(); fechar();
        if (aoSalvar) aoSalvar(salvo); else AC.redesenhar();
      } },
      campo('Nome', nome), campo('Categoria', categoria),
      h('div', { class: 'duas' }, campo('Região', regiao), campo('Material', equip)),
      campo('Dica de execução', dica),
      h('div', { class: 'acoes' },
        !novo ? h('button', { class: 'btn perigo', type: 'button', onclick: async () => {
          if (await confirmar(`Excluir "${ex.nome}" da biblioteca? Treinos montados continuam com o nome dele.`, { ok: 'Excluir', perigo: true })) { S().exercicios = S().exercicios.filter((x) => x !== ex); store.salvar(); fechar(); AC.redesenhar(); }
        } }, 'Excluir') : null,
        h('button', { class: 'btn', type: 'button', onclick: () => fechar() }, 'Cancelar'), h('button', { class: 'btn primario', type: 'submit' }, 'Salvar')));
    });
  }

  /* Lista pesquisável; escolher: se vier, tocar no exercício chama a função em vez de editar. */
  function listaExercicios(escolher) {
    const raiz = h('div');
    let busca = '', categoria = null;
    const lista = h('div');
    const desenhar = () => {
      const q = busca.trim().toLowerCase();
      const itens = S().exercicios.filter((e) => (!categoria || e.categoria === categoria) && (!q || `${e.nome} ${e.regiao} ${e.equip}`.toLowerCase().includes(q)))
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
      lista.replaceChildren(...(itens.length ? itens.map((e) => h('button', { class: 'linha ex', type: 'button', onclick: () => (escolher ? escolher(e) : formExercicio(e)) },
        h('span', { class: 'linha-txt' }, h('strong', null, e.nome), h('span', { class: 'muted' }, [e.categoria, e.regiao, e.equip].filter(Boolean).join(' · ')), e.dica ? h('span', { class: 'dica' }, e.dica) : null)))
        : [h('p', { class: 'dica' }, 'Nenhum exercício encontrado.')]));
    };
    const caixaCats = h('div', { class: 'chips rolagem' });
    const desenharCats = () => caixaCats.replaceChildren(chip('Todos', { ativo: !categoria, onclick: () => { categoria = null; desenharCats(); desenhar(); } }),
      ...cat.CATEGORIAS_EX.map((c) => chip(c, { ativo: categoria === c, onclick: () => { categoria = categoria === c ? null : c; desenharCats(); desenhar(); } })));
    desenharCats();
    raiz.append(h('input', { type: 'search', class: 'busca', placeholder: 'Buscar exercício, região ou material', 'aria-label': 'Buscar exercício', oninput: (e) => { busca = e.target.value; desenhar(); } }), caixaCats, lista);
    desenhar();
    return raiz;
  }

  /* ---------- Página principal ---------- */

  function principal(query) {
    const raiz = h('div');
    let aba = query.aba === 'exercicios' ? 'exercicios' : 'treinos';
    const corpo = h('div');
    const desenhar = () => {
      const planos = S().planosFisicos;
      raiz.replaceChildren(
        h('div', { class: 'titulo-linha' }, h('h1', null, 'Treino físico'),
          aba === 'treinos' ? h('a', { class: 'btn primario', href: '#/fisico/plano/novo' }, '+ Montar treino') : h('button', { class: 'btn primario', type: 'button', onclick: () => formExercicio() }, '+ Exercício')),
        h('p', { class: 'sub' }, 'Monte treinos físicos e insira em qualquer dia, quando quiser.'),
        AC.ui.segmentado([{ valor: 'treinos', rotulo: 'Treinos montados' }, { valor: 'exercicios', rotulo: 'Exercícios' }], aba, (v) => { aba = v; desenhar(); }),
        corpo);
      if (aba === 'treinos') {
        corpo.replaceChildren(...(planos.length ? planos.map(cartaoPlano) : [h('div', { class: 'vazio' }, h('h2', null, 'Nenhum treino montado'),
          h('p', null, 'Escolha exercícios da biblioteca, defina séries, repetições, carga e pausa, e salve para reaproveitar.'),
          h('a', { class: 'btn primario', href: '#/fisico/plano/novo' }, 'Montar o primeiro treino'))]));
      } else corpo.replaceChildren(listaExercicios());
    };
    desenhar();
    return raiz;
  }

  /* ---------- Montagem de um treino físico ---------- */

  function montagem(id) {
    const existente = id === 'novo' ? null : store.plano(id);
    if (id !== 'novo' && !existente) return h('div', { class: 'vazio' }, h('p', null, 'Treino físico não encontrado.'), h('a', { class: 'btn', href: '#/fisico' }, 'Voltar'));
    const novo = !existente;
    const d = existente ? clone(existente) : {
      id: store.uid(), nome: '', foco: [], duracao: 60, pseAlvo: 6, notas: '',
      blocos: [{ id: store.uid(), nome: 'Aquecimento', itens: [] }, { id: store.uid(), nome: 'Principal', itens: [] }, { id: store.uid(), nome: 'Volta à calma', itens: [] }],
    };
    const raiz = h('div', { class: 'pagina-fisico' });
    const dica = h('p', { class: 'dica' });
    const atualizaEst = () => { const e = estimativa(d.blocos); dica.textContent = e ? `Estimativa grosseira pelos itens: cerca de ${e} min.` : ''; };

    const nome = entrada('text', d.nome, { required: true, maxLength: 80, placeholder: 'Ex.: Potência na areia', oninput: () => { d.nome = nome.value; } });
    const dur = entrada('number', d.duracao, { min: 0, max: 240, step: 5, oninput: () => { d.duracao = dur.value === '' ? null : Number(dur.value); } });
    const alvo = entrada('number', d.pseAlvo, { min: 0, max: 10, oninput: () => { d.pseAlvo = alvo.value === '' ? null : Number(alvo.value); } });
    const foco = AC.ui.chipsMulti(cat.FOCOS_FISICOS, d.foco, (v) => { d.foco = v; });
    const notas = h('textarea', { rows: 2, placeholder: 'Orientações gerais do treino', oninput: () => { d.notas = notas.value; } }, d.notas);

    const blocosEl = h('div');
    const mover = (arr, i, delta) => { const j = i + delta; if (j < 0 || j >= arr.length) return; [arr[i], arr[j]] = [arr[j], arr[i]]; desenharBlocos(); };

    const adicionarItem = (bloco, ex) => {
      bloco.itens.push({ id: store.uid(), exId: ex.id || null, nome: ex.nome, series: 3, reps: '10', carga: ex.equip && !/peso do corpo/i.test(ex.equip) ? '' : 'Peso do corpo', descanso: 45, obs: '' });
      desenharBlocos();
    };

    const escolherExercicio = (bloco) => {
      modal('Adicionar exercício', (fechar) => {
        const livre = entrada('text', '', { placeholder: 'Ou digite um exercício que não está na biblioteca', maxLength: 80, 'aria-label': 'Exercício livre' });
        return h('div', null,
          h('form', { class: 'livre', onsubmit: (e) => { e.preventDefault(); if (livre.value.trim()) { adicionarItem(bloco, { nome: livre.value.trim() }); fechar(); } } },
            livre, h('button', { class: 'btn', type: 'submit' }, 'Adicionar')),
          listaExercicios((ex) => { adicionarItem(bloco, ex); fechar(); }));
      }, { largo: true });
    };

    const itemEl = (bloco, it, i) => {
      const campoItem = (rotulo, el) => h('label', { class: 'mini' }, h('span', null, rotulo), el);
      return h('div', { class: 'item-fis' },
        h('div', { class: 'topico-topo' }, h('strong', null, it.nome), h('span', { class: 'esp' }),
          h('button', { class: 'icone', type: 'button', 'aria-label': 'Subir', onclick: () => mover(bloco.itens, i, -1) }, '↑'),
          h('button', { class: 'icone', type: 'button', 'aria-label': 'Descer', onclick: () => mover(bloco.itens, i, 1) }, '↓'),
          h('button', { class: 'icone', type: 'button', 'aria-label': `Remover ${it.nome}`, onclick: () => { bloco.itens.splice(i, 1); desenharBlocos(); } }, '✕')),
        h('div', { class: 'grade-item' },
          campoItem('Séries', h('input', { type: 'number', min: 1, max: 20, value: it.series, oninput: (e) => { it.series = e.target.value === '' ? null : Number(e.target.value); atualizaEst(); } })),
          campoItem('Repetições ou tempo', h('input', { type: 'text', value: it.reps, maxLength: 30, placeholder: '10 ou 30 s', oninput: (e) => { it.reps = e.target.value; atualizaEst(); } })),
          campoItem('Carga / intensidade', h('input', { type: 'text', value: it.carga, maxLength: 40, placeholder: 'Peso do corpo, 8 kg, PSE 7', oninput: (e) => { it.carga = e.target.value; } })),
          campoItem('Pausa (s)', h('input', { type: 'number', min: 0, max: 600, step: 5, value: it.descanso, oninput: (e) => { it.descanso = e.target.value === '' ? null : Number(e.target.value); atualizaEst(); } }))),
        h('input', { type: 'text', class: 'obs', value: it.obs, maxLength: 120, placeholder: 'Observação (execução, variação)', 'aria-label': 'Observação do exercício', oninput: (e) => { it.obs = e.target.value; } }));
    };

    const desenharBlocos = () => {
      blocosEl.replaceChildren(...d.blocos.map((b, bi) => {
        const nomeBloco = selecao([...new Set([...cat.BLOCOS_FISICOS, b.nome])].map((n) => ({ valor: n, rotulo: n })), b.nome, { 'aria-label': 'Nome do bloco', onchange: (e) => { b.nome = e.target.value; } });
        return h('section', { class: 'bloco-fis' },
          h('div', { class: 'topico-topo' }, nomeBloco, h('span', { class: 'esp' }),
            h('button', { class: 'icone', type: 'button', 'aria-label': 'Subir bloco', onclick: () => mover(d.blocos, bi, -1) }, '↑'),
            h('button', { class: 'icone', type: 'button', 'aria-label': 'Descer bloco', onclick: () => mover(d.blocos, bi, 1) }, '↓'),
            h('button', { class: 'icone', type: 'button', 'aria-label': 'Remover bloco', onclick: async () => {
              if (!b.itens.length || await confirmar(`Remover o bloco "${b.nome}" e seus ${b.itens.length} exercícios?`, { ok: 'Remover', perigo: true })) { d.blocos.splice(bi, 1); desenharBlocos(); }
            } }, '🗑')),
          b.itens.map((it, i) => itemEl(b, it, i)),
          h('button', { class: 'btn', type: 'button', onclick: () => escolherExercicio(b) }, '+ Exercício'));
      }), h('button', { class: 'btn', type: 'button', onclick: () => { d.blocos.push({ id: store.uid(), nome: 'Complementar', itens: [] }); desenharBlocos(); } }, '+ Bloco'));
      atualizaEst();
    };

    const salvar = () => {
      d.nome = d.nome.trim();
      if (!d.nome) return aviso('Dê um nome ao treino físico.', true);
      if (novo) S().planosFisicos.push(d); else S().planosFisicos[S().planosFisicos.indexOf(existente)] = d;
      store.salvar(); aviso('Treino físico salvo.');
      location.hash = '#/fisico';
    };

    desenharBlocos();
    raiz.append(
      voltar('#/fisico', 'Treino físico'),
      h('h1', null, novo ? 'Montar treino físico' : 'Editar treino físico'),
      campo('Nome', nome),
      h('div', { class: 'duas' }, campo('Duração (min)', dur), campo('PSE planejada', alvo)),
      dica,
      h('div', { class: 'campo' }, h('span', { class: 'campo-rotulo' }, 'Foco'), foco.el),
      campo('Orientações', notas),
      h('h2', null, 'Blocos e exercícios'),
      blocosEl,
      h('div', { class: 'barra-salvar' },
        !novo ? h('button', { class: 'btn', type: 'button', onclick: () => { salvar(); } }, 'Salvar') : null,
        h('span', { class: 'esp' }),
        novo ? h('button', { class: 'btn primario', type: 'button', onclick: salvar }, 'Salvar treino')
          : h('button', { class: 'btn primario', type: 'button', onclick: () => { d.nome = d.nome.trim(); if (!d.nome) return aviso('Dê um nome ao treino físico.', true); S().planosFisicos[S().planosFisicos.indexOf(existente)] = d; store.salvar(); inserirEmTreino(d); } }, 'Salvar e inserir em treino')));
    return raiz;
  }

  AC.views = AC.views || {};
  AC.views.fisico = ({ partes, query }) => (partes[1] === 'plano' && partes[2] ? montagem(partes[2]) : principal(query));
})((window.AC = window.AC || {}));
