/* Atletas: cadastro e histórico de cada um (chegada, saída, carga e ACWR). */
(function (AC) {
  const { h, chip, campo, entrada, selecao, modal, confirmar, aviso, dm, dataCurta, dataCompleta, num, milhar, plural } = AC.ui;
  const { calc, cat, store } = AC;
  const S = () => store.e;
  const FUNCOES = ['Bloqueador', 'Bloqueadora', 'Defensor', 'Defensora', 'Sem função definida'];
  const FAIXA_ACWR = { abaixo: ['Abaixo do ideal', 'var(--muted)'], ideal: ['Na faixa ideal', 'var(--ok)'], atencao: ['Atenção', 'var(--warn)'], alto: ['Risco alto', 'var(--bad)'] };
  const voltar = (href, texto) => h('a', { class: 'voltar', href }, '‹ ', texto);

  const idade = (nasc) => {
    if (!nasc) return null;
    const hoje = calc.hojeISO();
    let i = Number(hoje.slice(0, 4)) - Number(nasc.slice(0, 4));
    if (hoje.slice(5) < nasc.slice(5)) i--;
    return i;
  };

  function formAtleta(a) {
    const novo = !a;
    modal(novo ? 'Novo atleta' : 'Editar atleta', (fechar) => {
      const nome = entrada('text', a ? a.nome : '', { required: true, maxLength: 80 });
      const funcao = selecao(FUNCOES.map((f) => ({ valor: f, rotulo: f })), a && a.funcao ? a.funcao : 'Sem função definida');
      const nasc = entrada('date', a ? a.nascimento : '');
      const outros = S().atletas.filter((x) => !a || x.id !== a.id);
      const parceiro = selecao([{ valor: '', rotulo: 'Sem dupla definida' }, ...outros.map((x) => ({ valor: x.id, rotulo: x.nome }))], a ? a.parceiroId || '' : '');
      const obs = h('textarea', { rows: 2, placeholder: 'Lesões, restrições, observações' }, a ? a.obs : '');
      const ativo = h('input', { type: 'checkbox', checked: a ? a.ativo !== false : true });
      return h('form', { onsubmit: (e) => {
        e.preventDefault();
        const dados = { nome: nome.value.trim(), funcao: funcao.value, nascimento: nasc.value, parceiroId: parceiro.value || null, obs: obs.value.trim(), ativo: ativo.checked };
        let alvo = a;
        if (novo) { alvo = { id: store.uid(), ...dados }; S().atletas.push(alvo); } else Object.assign(a, dados);
        if (dados.parceiroId) { const p = store.atleta(dados.parceiroId); if (p) p.parceiroId = alvo.id; }
        store.salvar(); fechar(); AC.redesenhar();
      } },
      campo('Nome', nome), h('div', { class: 'duas' }, campo('Função', funcao), campo('Nascimento', nasc)),
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

  function lista() {
    const raiz = h('div');
    const hoje = calc.hojeISO(), seg = calc.segundaDe(hoje);
    raiz.append(h('div', { class: 'titulo-linha' }, h('h1', null, 'Atletas'), h('button', { class: 'btn primario', type: 'button', onclick: () => formAtleta() }, '+ Atleta')));
    if (!S().atletas.length) {
      raiz.append(h('div', { class: 'vazio' }, h('h2', null, 'Nenhum atleta cadastrado'), h('p', null, 'Cadastre o elenco para registrar a chegada (PSR) e a saída (PSE) de cada treino.'),
        h('button', { class: 'btn primario', type: 'button', onclick: () => formAtleta() }, 'Cadastrar atleta')));
      return raiz;
    }
    const ordenados = [...S().atletas].sort((a, b) => (b.ativo !== false) - (a.ativo !== false) || a.nome.localeCompare(b.nome, 'pt-BR'));
    ordenados.forEach((a) => {
      const al = calc.alertasAtleta(S().treinos, a, hoje);
      const ac = calc.acwr(S().treinos, a.id, seg);
      const carga = calc.cargaSemanal(S().treinos, a.id, seg);
      const par = a.parceiroId && store.atleta(a.parceiroId);
      raiz.append(h('a', { class: 'card clicavel' + (a.ativo === false ? ' inativo' : ''), href: `#/atletas/${a.id}` },
        h('div', { class: 'card-topo' }, h('strong', null, a.nome), a.ativo === false ? chip('inativo', { pequeno: true }) : al.some((x) => x.nivel === 'alto') ? chip('atenção', { pequeno: true, cor: 'var(--bad)' }) : al.some((x) => x.nivel === 'medio') ? chip('olhar', { pequeno: true, cor: 'var(--warn)' }) : null),
        h('div', { class: 'muted' }, [a.funcao && a.funcao !== 'Sem função definida' ? a.funcao : null, par ? `dupla: ${par.nome}` : null, idade(a.nascimento) != null ? `${idade(a.nascimento)} anos` : null].filter(Boolean).join(' · ') || 'Sem detalhes'),
        h('div', { class: 'numeros' },
          h('span', null, 'carga da semana ', h('b', null, carga ? milhar(carga) : '—')),
          ac.valor != null ? h('span', null, 'ACWR ', h('b', null, num(ac.valor))) : null)));
    });
    return raiz;
  }

  function ficha(id) {
    const a = store.atleta(id);
    if (!a) return h('div', { class: 'vazio' }, h('p', null, 'Atleta não encontrado.'), h('a', { class: 'btn', href: '#/atletas' }, 'Voltar'));
    const hoje = calc.hojeISO(), seg = calc.segundaDe(hoje);
    const raiz = h('div');
    const par = a.parceiroId && store.atleta(a.parceiroId);
    raiz.append(voltar('#/atletas', 'Atletas'),
      h('div', { class: 'titulo-linha' }, h('h1', null, a.nome), h('button', { class: 'btn', type: 'button', onclick: () => formAtleta(a) }, 'Editar')),
      h('p', { class: 'sub' }, [a.funcao && a.funcao !== 'Sem função definida' ? a.funcao : null, par ? `dupla: ${par.nome}` : null, idade(a.nascimento) != null ? `${idade(a.nascimento)} anos` : null].filter(Boolean).join(' · ')));
    if (a.obs) raiz.append(h('p', { class: 'objetivo' }, a.obs));

    const al = calc.alertasAtleta(S().treinos, a, hoje);
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

    /* Histórico das últimas sessões em que participou */
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
