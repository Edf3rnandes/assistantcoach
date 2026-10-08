/* Atletas: cadastro (um a um ou por lista), link para o atleta completar a ficha, respostas, e o histórico de cada um. */
(function (AC) {
  const { h, chip, campo, entrada, selecao, modal, confirmar, aviso, dm, dataCurta, num, milhar, plural } = AC.ui;
  const { calc, cat, store } = AC;
  const S = () => store.e;
  const FAIXA_ACWR = { abaixo: ['Abaixo do ideal', 'var(--muted)'], ideal: ['Na faixa ideal', 'var(--ok)'], atencao: ['Atenção', 'var(--warn)'], alto: ['Risco alto', 'var(--bad)'] };
  const ACOES = [{ valor: 'bloqueio', rotulo: 'Bloqueio' }, { valor: 'defesa', rotulo: 'Defesa' }, { valor: 'ambos', rotulo: 'Ambos' }];
  const SEXOS = [{ valor: 'F', rotulo: 'Feminino' }, { valor: 'M', rotulo: 'Masculino' }];
  const LADOS = [{ valor: 'direito', rotulo: 'Direito' }, { valor: 'esquerdo', rotulo: 'Esquerdo' }, { valor: 'ambos', rotulo: 'Tanto faz' }];
  const voltar = (href, texto) => h('a', { class: 'voltar', href }, '‹ ', texto);

  const hoje = () => calc.hojeISO();
  const idade = (a) => calc.idade(a.nascimento, hoje());
  const pendentes = () => S().atletas.filter((a) => a.ativo !== false && calc.faltaNoCadastro(a).length);

  /* Função (com o gênero pelo sexo) e naipe, calculados a partir da ação e do sexo. */
  const resumoAtleta = (a) => {
    const par = a.parceiroId && store.atleta(a.parceiroId);
    const nai = par ? calc.naipeDupla(a, par) : null;
    return [calc.rotuloFuncao(a), calc.naipe(a), calc.categoriaDe(a.nascimento, new Date().getFullYear()), par ? `dupla: ${par.nome}${nai ? ` (${nai.toLowerCase()})` : ''}` : null, idade(a) != null ? `${idade(a)} anos` : null].filter(Boolean);
  };

  /* ---------- Link e mensagem para o atleta ---------- */

  const baseDoApp = () => location.href.split('#')[0].split('?')[0];
  const linkDe = (a) => AC.ficha.criarLink(baseDoApp(), a);
  const mensagem = (a) => `Olá, ${a.nome.split(' ')[0]}! Complete seu cadastro de atleta por este link: ${linkDe(a)}`;
  function whatsapp(a) {
    const d = (a.contato || '').replace(/\D/g, '');
    const num_ = d.length >= 10 && d.length <= 11 ? '55' + d : d;
    return `https://wa.me/${num_}?text=${encodeURIComponent(mensagem(a))}`;
  }

  async function copiar(texto, ok) {
    try { await navigator.clipboard.writeText(texto); aviso(ok || 'Copiado.'); }
    catch (e) { aviso('Não deu para copiar. Selecione o texto e copie.', true); }
  }

  function aviso_local() {
    return location.protocol === 'file:'
      ? h('p', { class: 'dica' }, 'Este link aponta para um arquivo do seu aparelho. Para o atleta abrir, o sistema precisa estar publicado em um endereço da internet.')
      : null;
  }

  function modalLinks(atletas, titulo = 'Enviar links de cadastro') {
    modal(titulo, (fechar) => {
      if (!atletas.length) return h('p', null, 'Nenhum atleta com cadastro pendente.');
      return h('div', null,
        h('p', { class: 'muted' }, 'Cada atleta abre o link, completa a ficha e devolve um código para você colar em "Importar respostas".'),
        aviso_local(),
        atletas.map((a) => h('div', { class: 'link-atleta' },
          h('div', { class: 'linha-txt' }, h('strong', null, a.nome), h('span', { class: 'muted' }, `falta: ${calc.faltaNoCadastro(a).join(', ') || 'nada'}`)),
          h('div', { class: 'acoes-card' },
            h('button', { class: 'btn', type: 'button', onclick: () => copiar(linkDe(a), `Link de ${a.nome.split(' ')[0]} copiado.`) }, 'Copiar link'),
            h('a', { class: 'btn', href: whatsapp(a), target: '_blank', rel: 'noopener' }, 'WhatsApp')))),
        h('div', { class: 'acoes-card' },
          h('button', { class: 'btn', type: 'button', onclick: () => copiar(AC.ficha.criarLink(baseDoApp(), null), 'Link geral copiado.') }, 'Copiar link geral (qualquer atleta)')));
    }, { largo: true });
  }

  /* ---------- Importar respostas ---------- */

  function modalRespostas() {
    modal('Importar respostas', (fechar) => {
      const caixa = h('textarea', { rows: 5, placeholder: 'Cole aqui as mensagens com os códigos que os atletas enviaram (começam com AC1:)', 'aria-label': 'Códigos recebidos' });
      const previa = h('div');
      let itens = [];
      const desenhar = () => {
        itens = AC.ficha.lerRespostas(caixa.value, hoje()).map((r) => ({ r, ok: true, alvo: r.id ? store.atleta(r.id) : null }));
        itens.forEach((x) => { if (!x.alvo) x.alvo = S().atletas.find((a) => calc.semAcento(a.nome) === calc.semAcento(x.r.nome)) || null; });
        previa.replaceChildren();
        if (!caixa.value.trim()) return;
        if (!itens.length) { previa.append(h('p', { class: 'dica' }, 'Nenhum código válido encontrado.')); return; }
        itens.forEach((x) => {
          const cb = h('input', { type: 'checkbox', checked: true, onchange: () => { x.ok = cb.checked; } });
          previa.append(h('label', { class: 'item-resp' }, cb,
            h('span', { class: 'linha-txt' }, h('strong', null, x.r.nome), h('span', { class: 'muted' }, x.alvo ? `atualiza o cadastro de ${x.alvo.nome}` : 'novo atleta'),
              h('span', { class: 'dica' }, [calc.rotuloFuncao(x.r), calc.naipe(x.r), x.r.nascimento ? `nasc. ${x.r.nascimento.split('-').reverse().join('/')}` : null, x.r.contato, x.r.consentimento ? 'autorizou o uso dos dados' : 'sem autorização'].filter(Boolean).join(' · ')))));
        });
      };
      caixa.addEventListener('input', desenhar);
      return h('div', null, caixa, previa, h('div', { class: 'acoes' },
        h('button', { class: 'btn', type: 'button', onclick: () => fechar() }, 'Cancelar'),
        h('button', { class: 'btn primario', type: 'button', onclick: () => {
          const aplicar = itens.filter((x) => x.ok);
          if (!aplicar.length) return aviso('Nada para importar.', true);
          aplicar.forEach((x) => {
            if (x.alvo) AC.ficha.aplicarResposta(x.alvo, x.r);
            else S().atletas.push(AC.ficha.aplicarResposta({ id: store.uid(), nome: '', sexo: '', acao: '', lado: '', nascimento: '', contato: '', responsavel: '', consentimento: '', obs: '', parceiroId: null, ativo: true }, x.r));
          });
          store.salvar(); fechar(); AC.redesenhar();
          aviso(`${plural(aplicar.length, 'cadastro atualizado', 'cadastros atualizados')}.`);
        } }, 'Aplicar')));
    }, { largo: true });
  }

  /* ---------- Cadastro: um atleta ---------- */

  function formAtleta(a) {
    const novo = !a;
    modal(novo ? 'Novo atleta' : 'Editar atleta', (fechar) => {
      let sexo = a ? a.sexo : '', acao = a ? a.acao : '', lado = a ? a.lado : '';
      const previa = h('p', { class: 'dica' });
      const atualiza = () => { previa.textContent = [calc.rotuloFuncao({ sexo, acao }), calc.naipe({ sexo })].filter(Boolean).join(' · ') || 'Escolha sexo e ação: a função e o naipe saem daí.'; };
      const grupo = (opcoes, atual, aoMudar) => {
        const el = h('div', { class: 'seg' });
        const pinta = () => el.replaceChildren(...opcoes.map((o) => h('button', { type: 'button', class: o.valor === atual ? 'on' : '', 'aria-pressed': String(o.valor === atual), onclick: () => { atual = atual === o.valor ? '' : o.valor; aoMudar(atual); pinta(); atualiza(); } }, o.rotulo)));
        pinta();
        return el;
      };
      const nome = entrada('text', a ? a.nome : '', { required: true, maxLength: 80 });
      const nasc = entrada('date', a ? a.nascimento : '');
      const contato = entrada('text', a ? a.contato : '', { maxLength: 25, placeholder: '(83) 99999-9999', inputMode: 'tel' });
      const outros = S().atletas.filter((x) => !a || x.id !== a.id);
      const parceiro = selecao([{ valor: '', rotulo: 'Sem dupla definida' }, ...outros.map((x) => ({ valor: x.id, rotulo: x.nome }))], a ? a.parceiroId || '' : '');
      const obs = h('textarea', { rows: 2, placeholder: 'Lesões, restrições, observações' }, a ? a.obs : '');
      const ativo = h('input', { type: 'checkbox', checked: a ? a.ativo !== false : true });
      atualiza();
      return h('form', { onsubmit: (e) => {
        e.preventDefault();
        const dados = { nome: nome.value.trim(), sexo, acao, lado, nascimento: nasc.value, contato: contato.value.trim(), parceiroId: parceiro.value || null, obs: obs.value.trim(), ativo: ativo.checked };
        let alvo = a;
        if (novo) { alvo = { id: store.uid(), responsavel: '', consentimento: '', ...dados }; S().atletas.push(alvo); } else Object.assign(a, dados);
        if (dados.parceiroId) { const p = store.atleta(dados.parceiroId); if (p) p.parceiroId = alvo.id; }
        store.salvar(); fechar(); AC.redesenhar();
      } },
      campo('Nome', nome),
      h('div', { class: 'campo' }, h('span', { class: 'campo-rotulo' }, 'Sexo'), grupo(SEXOS, sexo, (v) => { sexo = v; })),
      h('div', { class: 'campo' }, h('span', { class: 'campo-rotulo' }, 'Ação em quadra'), grupo(ACOES, acao, (v) => { acao = v; }), previa),
      h('div', { class: 'campo' }, h('span', { class: 'campo-rotulo' }, 'Lado preferido'), grupo(LADOS, lado, (v) => { lado = v; })),
      h('div', { class: 'duas' }, campo('Nascimento', nasc), campo('Contato (WhatsApp)', contato)),
      campo('Dupla', parceiro), campo('Observações', obs),
      h('label', { class: 'check' }, ativo, ' Ativo nos treinos'),
      h('div', { class: 'acoes' },
        !novo ? h('button', { class: 'btn perigo', type: 'button', onclick: async () => {
          if (await confirmar(`Excluir ${a.nome}? Os registros de PSR e PSE dele nos treinos também serão apagados. Para só tirar dos treinos novos, desmarque "Ativo".`, { ok: 'Excluir', perigo: true })) {
            S().atletas = S().atletas.filter((x) => x !== a);
            S().atletas.forEach((x) => { if (x.parceiroId === a.id) x.parceiroId = null; });
            S().treinos.forEach((t) => { delete t.presencas[a.id]; });
            store.salvar(); fechar(); location.hash = '#/atletas';
          }
        } }, 'Excluir') : null,
        h('button', { class: 'btn', type: 'button', onclick: () => fechar() }, 'Cancelar'), h('button', { class: 'btn primario', type: 'submit' }, 'Salvar')));
    });
  }

  /* ---------- Cadastro: por lista ---------- */

  function formLista() {
    modal('Adicionar atletas por lista', (fechar) => {
      const caixa = h('textarea', { rows: 7, 'aria-label': 'Lista de atletas', placeholder: 'Um atleta por linha:\nBeatriz Begondim, feminino, bloqueio\nJoão Pedro, masculino, defesa\nCamila Souza, feminino\nLucas Almeida' });
      const sexoPadrao = selecao([{ valor: '', rotulo: 'Não definir' }, { valor: 'F', rotulo: 'Feminino' }, { valor: 'M', rotulo: 'Masculino' }], '');
      const previa = h('div');
      const botao = h('button', { class: 'btn primario', type: 'submit', disabled: true }, 'Cadastrar');
      let lidos = [];
      const desenhar = () => {
        lidos = calc.lerListaAtletas(caixa.value, S().atletas, { sexo: sexoPadrao.value });
        previa.replaceChildren();
        const novos = lidos.filter((r) => r.status === 'novo');
        botao.disabled = !novos.length;
        botao.textContent = novos.length ? `Cadastrar ${plural(novos.length, 'atleta', 'atletas')}` : 'Cadastrar';
        lidos.forEach((r) => {
          previa.append(h('div', { class: 'item-lista' + (r.status !== 'novo' ? ' ignorado' : '') },
            h('strong', null, r.nome),
            h('span', { class: 'chips' },
              r.status === 'existente' ? chip('já cadastrado, ignorado', { pequeno: true }) : r.status === 'repetido' ? chip('repetido na lista, ignorado', { pequeno: true }) : [
                calc.rotuloFuncao(r) ? chip(calc.rotuloFuncao(r), { pequeno: true, ativo: true }) : chip(r.sexo ? 'ação: completar depois' : 'sexo e ação: completar depois', { pequeno: true }),
                calc.naipe(r) ? chip(calc.naipe(r), { pequeno: true }) : null,
                r.nascimento ? chip(r.nascimento.split('-').reverse().join('/'), { pequeno: true }) : null,
                r.contato ? chip(r.contato, { pequeno: true }) : null,
                r.avisos.map((av) => chip(av, { pequeno: true, cor: 'var(--warn)' })),
              ])));
        });
      };
      caixa.addEventListener('input', desenhar);
      sexoPadrao.addEventListener('change', desenhar);
      return h('form', { onsubmit: (e) => {
        e.preventDefault();
        const novos = lidos.filter((r) => r.status === 'novo');
        const criados = novos.map((r) => ({ id: store.uid(), nome: r.nome, sexo: r.sexo, acao: r.acao, lado: '', nascimento: r.nascimento, contato: r.contato, responsavel: '', consentimento: '', obs: '', parceiroId: null, ativo: true }));
        S().atletas.push(...criados);
        store.salvar(); fechar(); AC.redesenhar();
        aviso(`${plural(criados.length, 'atleta cadastrado', 'atletas cadastrados')}.`);
        const faltam = criados.filter((a) => calc.faltaNoCadastro(a).length);
        if (faltam.length) modalLinks(faltam, 'Pedir para completarem o cadastro');
      } },
      h('p', { class: 'muted' }, 'Escreva ou cole um atleta por linha. Depois do nome, em qualquer ordem: sexo (feminino ou masculino), ação (bloqueio, defesa ou ambos), nascimento (dd/mm/aaaa) e telefone. O que faltar o atleta completa pelo link.'),
      caixa,
      campo('Quando a lista não disser o sexo', sexoPadrao),
      previa,
      h('div', { class: 'acoes' }, h('button', { class: 'btn', type: 'button', onclick: () => fechar() }, 'Cancelar'), botao));
    }, { largo: true });
  }

  /* ---------- Lista e ficha ---------- */

  function lista() {
    const raiz = h('div');
    const seg = calc.segundaDe(hoje());
    raiz.append(
      h('div', { class: 'titulo-linha' }, h('h1', null, 'Atletas'), h('button', { class: 'btn primario', type: 'button', onclick: () => formAtleta() }, '+ Atleta')),
      h('div', { class: 'acoes-card' },
        h('button', { class: 'btn', type: 'button', onclick: () => formLista() }, 'Adicionar por lista'),
        h('button', { class: 'btn', type: 'button', onclick: () => modalRespostas() }, 'Importar respostas'),
        h('button', { class: 'btn', type: 'button', onclick: () => modalLinks(pendentes(), 'Links de cadastro') }, 'Links para os atletas')));
    if (!S().atletas.length) {
      raiz.append(h('div', { class: 'vazio' }, h('h2', null, 'Nenhum atleta cadastrado'),
        h('p', null, 'Cole a lista do elenco (nome, sexo e ação) e envie o link para cada atleta completar a ficha. Eles também podem ser cadastrados um a um.'),
        h('button', { class: 'btn primario', type: 'button', onclick: () => formLista() }, 'Adicionar por lista')));
      return raiz;
    }
    const pend = pendentes();
    if (pend.length) raiz.append(h('div', { class: 'alerta medio' }, h('strong', null, `${plural(pend.length, 'atleta com cadastro incompleto', 'atletas com cadastro incompleto')}`),
      h('p', null, 'Envie o link para completarem a ficha.'), h('button', { class: 'btn', type: 'button', onclick: () => modalLinks(pend) }, 'Enviar links')));
    const ordenados = [...S().atletas].sort((a, b) => (b.ativo !== false) - (a.ativo !== false) || a.nome.localeCompare(b.nome, 'pt-BR'));
    ordenados.forEach((a) => {
      const al = calc.alertasAtleta(S().treinos, a, hoje());
      const ac = calc.acwr(S().treinos, a.id, seg);
      const carga = calc.cargaSemanal(S().treinos, a.id, seg);
      const falta = calc.faltaNoCadastro(a);
      raiz.append(h('a', { class: 'card clicavel' + (a.ativo === false ? ' inativo' : ''), href: `#/atletas/${a.id}` },
        h('div', { class: 'card-topo' }, h('strong', null, a.nome),
          a.ativo === false ? chip('inativo', { pequeno: true }) : al.some((x) => x.nivel === 'alto') ? chip('atenção', { pequeno: true, cor: 'var(--bad)' }) : al.some((x) => x.nivel === 'medio') ? chip('olhar', { pequeno: true, cor: 'var(--warn)' }) : null),
        h('div', { class: 'muted' }, resumoAtleta(a).join(' · ') || 'Sexo e ação ainda não informados'),
        falta.length && a.ativo !== false ? h('div', { class: 'chips' }, chip('cadastro incompleto', { pequeno: true, cor: 'var(--warn)' })) : null,
        h('div', { class: 'numeros' },
          h('span', null, 'carga da semana ', h('b', null, carga ? milhar(carga) : '—')),
          ac.valor != null ? h('span', null, 'ACWR ', h('b', null, num(ac.valor))) : null)));
    });
    return raiz;
  }

  function ficha(id) {
    const a = store.atleta(id);
    if (!a) return h('div', { class: 'vazio' }, h('p', null, 'Atleta não encontrado.'), h('a', { class: 'btn', href: '#/atletas' }, 'Voltar'));
    const seg = calc.segundaDe(hoje());
    const raiz = h('div');
    raiz.append(voltar('#/atletas', 'Atletas'),
      h('div', { class: 'titulo-linha' }, h('h1', null, a.nome), h('button', { class: 'btn', type: 'button', onclick: () => formAtleta(a) }, 'Editar')),
      h('p', { class: 'sub' }, resumoAtleta(a).join(' · ')));
    if (a.obs) raiz.append(h('p', { class: 'objetivo' }, a.obs));

    const falta = calc.faltaNoCadastro(a);
    const dados = [a.lado ? `lado ${a.lado === 'ambos' ? 'tanto faz' : a.lado}` : null, a.contato || null, a.responsavel ? `responsável: ${a.responsavel}` : null].filter(Boolean);
    raiz.append(h('section', null, h('h2', null, 'Cadastro'),
      dados.length ? h('p', { class: 'muted' }, dados.join(' · ')) : null,
      falta.length ? h('div', { class: 'alerta medio' }, h('strong', null, 'Falta completar'), h('p', null, falta.join(', ') + '.'),
        h('div', { class: 'acoes-card' },
          h('button', { class: 'btn', type: 'button', onclick: () => copiar(linkDe(a), 'Link copiado.') }, 'Copiar link'),
          h('a', { class: 'btn', href: whatsapp(a), target: '_blank', rel: 'noopener' }, 'WhatsApp')), aviso_local())
        : h('p', { class: 'dica' }, `Cadastro completo${a.consentimento ? `, com autorização de uso dos dados em ${a.consentimento.split('-').reverse().join('/')}` : ''}.`)));

    const al = calc.alertasAtleta(S().treinos, a, hoje());
    if (al.length) raiz.append(h('div', { class: 'alerta ' + (al.some((x) => x.nivel === 'alto') ? 'alto' : 'medio') }, h('strong', null, 'Atenção nos últimos 7 dias'), h('ul', null, al.map((x) => h('li', null, x.texto)))));

    const ac = calc.acwr(S().treinos, a.id, seg);
    const carga = calc.cargaSemanal(S().treinos, a.id, seg);
    const cargas = [0, 1, 2, 3].map((i) => calc.cargaSemanal(S().treinos, a.id, calc.addDias(seg, -7 * i)));
    raiz.append(h('section', null, h('h2', null, 'Carga'),
      h('div', { class: 'resumo' },
        h('div', null, h('b', null, carga ? milhar(carga) : '—'), h('span', null, 'esta semana')),
        h('div', null, h('b', null, cargas[1] ? milhar(cargas[1]) : '—'), h('span', null, 'semana passada')),
        h('div', null, h('b', null, ac.valor != null ? num(ac.valor) : '—'), h('span', null, 'ACWR'))),
      ac.valor != null ? h('p', { class: 'dica' }, h('strong', { style: { color: FAIXA_ACWR[ac.faixa][1] } }, FAIXA_ACWR[ac.faixa][0]), `: carga da semana dividida pela média de ${plural(ac.base, 'semana anterior', 'semanas anteriores')}.`)
        : h('p', { class: 'dica' }, 'O ACWR aparece com pelo menos 3 semanas anteriores de treino registradas.')));

    const hist = S().treinos.filter((t) => t.feito && t.presencas && t.presencas[a.id]).sort((x, y) => x.data.localeCompare(y.data));
    const ultimos = hist.slice(-12);
    if (ultimos.length) {
      raiz.append(h('section', null, h('h2', null, 'Chegada e saída'),
        h('div', { class: 'legenda' }, h('span', { class: 'leg psr' }, 'Chegada (PSR)'), h('span', { class: 'leg pse' }, 'Saída (PSE)')),
        h('div', { class: 'rolagem-x' }, AC.ui.graficoLinhas(ultimos.map((t) => { const p = t.presencas[a.id]; return { rotulo: dm(t.data), psr: p.presente ? p.psr : null, pse: p.presente ? p.pse : null }; })))));
      const tab = h('div', { class: 'tabela' }, h('div', { class: 'linha cab' }, h('span', null, 'Treino'), h('span', null, 'PSR'), h('span', null, 'PSE'), h('span', null, 'Carga')));
      [...hist].reverse().slice(0, 20).forEach((t) => {
        const p = t.presencas[a.id];
        tab.append(h('a', { class: 'linha', href: `#/treinos/${t.id}` },
          h('span', { class: 'linha-txt' }, h('strong', null, t.titulo || (cat.tipoTreino(t.tipo) || {}).nome), h('span', { class: 'muted' }, dataCurta(t.data))),
          p.presente ? h('span', { class: 'val ' + (p.psr != null ? AC.ui.faixaEscala('psr', p.psr) : '') }, p.psr == null ? '—' : p.psr) : h('span', { class: 'muted' }, 'faltou'),
          p.presente ? h('span', { class: 'val ' + (p.pse != null ? AC.ui.faixaEscala('pse', p.pse) : '') }, p.pse == null ? '—' : p.pse) : h('span'),
          h('span', null, calc.cargaSessao(t, a.id) != null ? milhar(calc.cargaSessao(t, a.id)) : '—')));
      });
      raiz.append(h('section', null, h('h2', null, 'Últimos treinos'), tab));
    } else raiz.append(h('p', { class: 'dica' }, 'Ainda não há treinos realizados com este atleta.'));
    return raiz;
  }

  AC.views = AC.views || {};
  AC.views.atletas = ({ partes }) => (partes[1] ? ficha(partes[1]) : lista());
  AC.formAtleta = formAtleta;
})((window.AC = window.AC || {}));
