/* Ficha pública do atleta: aberta pelo link do técnico, só mostra o formulário (nada do resto do sistema).
   Ao enviar, gera um código para o atleta devolver ao técnico. */
(function (AC) {
  const { h, campo, entrada, aviso } = AC.ui;
  const { calc } = AC;

  const SEXOS = [{ valor: 'F', rotulo: 'Feminino' }, { valor: 'M', rotulo: 'Masculino' }];
  const ACOES = [{ valor: 'bloqueio', rotulo: 'Bloqueio' }, { valor: 'defesa', rotulo: 'Defesa' }, { valor: 'ambos', rotulo: 'Ambos' }];
  const LADOS = [{ valor: 'direito', rotulo: 'Direito' }, { valor: 'esquerdo', rotulo: 'Esquerdo' }, { valor: 'ambos', rotulo: 'Tanto faz' }];

  function escolha(opcoes, atual, aoMudar) {
    const el = h('div', { class: 'seg grande' });
    const pinta = () => el.replaceChildren(...opcoes.map((o) => h('button', { type: 'button', class: o.valor === atual ? 'on' : '', 'aria-pressed': String(o.valor === atual), onclick: () => { atual = atual === o.valor ? '' : o.valor; aoMudar(atual); pinta(); } }, o.rotulo)));
    pinta();
    return el;
  }

  function ficha({ query }) {
    const hoje = calc.hojeISO();
    const base = AC.ficha.lerLink(query.d, hoje);
    const d = { ...base };
    const raiz = h('div', { class: 'ficha-publica' });

    const nome = entrada('text', d.nome, { required: true, maxLength: 80, autocomplete: 'name' });
    const nasc = entrada('date', d.nascimento, { required: true, max: hoje });
    const contato = entrada('text', d.contato, { required: true, maxLength: 25, inputMode: 'tel', placeholder: '(83) 99999-9999', autocomplete: 'tel' });
    const resp = entrada('text', d.responsavel, { maxLength: 120, placeholder: 'Nome e telefone do responsável' });
    const respCampo = campo('Responsável (menor de 18 anos)', resp);
    respCampo.hidden = true;
    const obs = h('textarea', { rows: 3, maxLength: 300, placeholder: 'Lesões, dores, restrições ou algo que o técnico deva saber' }, d.obs);
    const aut = h('input', { type: 'checkbox', required: true });
    const erro = h('p', { class: 'erro-campo', role: 'alert' });
    const verResp = () => { respCampo.hidden = !(nasc.value && calc.idade(nasc.value, hoje) < 18); };
    nasc.addEventListener('input', verResp);
    verResp();

    const form = h('form', { onsubmit: (e) => {
      e.preventDefault();
      erro.textContent = '';
      if (!d.sexo) { erro.textContent = 'Escolha o sexo.'; return; }
      if (!d.acao) { erro.textContent = 'Escolha a ação em quadra (bloqueio, defesa ou ambos).'; return; }
      if (!nasc.value || nasc.value > hoje) { erro.textContent = 'Informe uma data de nascimento válida.'; return; }
      if (!respCampo.hidden && !resp.value.trim()) { erro.textContent = 'Informe o responsável.'; return; }
      const dados = { id: base.id, nome: nome.value, sexo: d.sexo, acao: d.acao, lado: d.lado, nascimento: nasc.value, contato: contato.value, responsavel: resp.value, obs: obs.value, consentimento: hoje };
      mostrarCodigo(AC.ficha.criarResposta(dados, hoje), dados);
    } },
    campo('Nome completo', nome),
    h('div', { class: 'campo' }, h('span', { class: 'campo-rotulo' }, 'Sexo'), escolha(SEXOS, d.sexo, (v) => { d.sexo = v; })),
    h('div', { class: 'campo' }, h('span', { class: 'campo-rotulo' }, 'Ação em quadra'), escolha(ACOES, d.acao, (v) => { d.acao = v; }),
      h('span', { class: 'dica' }, 'Bloqueio, defesa ou ambos. Ex.: no seu jogo de dupla, você faz o bloqueio, a defesa ou os dois?')),
    h('div', { class: 'campo' }, h('span', { class: 'campo-rotulo' }, 'Lado preferido'), escolha(LADOS, d.lado, (v) => { d.lado = v; })),
    campo('Data de nascimento', nasc),
    campo('WhatsApp', contato),
    respCampo,
    campo('Saúde e observações', obs),
    h('label', { class: 'check autoriza' }, aut, h('span', null, 'Autorizo o meu técnico a usar estes dados para organizar treinos e acompanhar minha carga. Se eu for menor de 18 anos, meu responsável autoriza.')),
    erro,
    h('button', { class: 'btn primario largo', type: 'submit' }, 'Concluir cadastro'));

    const mostrarCodigo = (codigo, dados) => {
      const texto = `Meu cadastro de atleta (${dados.nome.split(' ')[0]}):\n${codigo}`;
      const caixa = h('textarea', { rows: 5, readOnly: true, 'aria-label': 'Código do cadastro', onfocus: (e) => e.target.select() }, texto);
      raiz.replaceChildren(
        h('h1', null, 'Cadastro pronto'),
        h('p', null, 'Falta só um passo: envie o texto abaixo para o seu técnico. É ele quem coloca seus dados no sistema.'),
        caixa,
        h('div', { class: 'acoes-card' },
          h('button', { class: 'btn primario', type: 'button', onclick: async () => { try { await navigator.clipboard.writeText(texto); aviso('Texto copiado. Cole na conversa com o técnico.'); } catch (e) { caixa.focus(); aviso('Selecione o texto e copie.', true); } } }, 'Copiar texto'),
          h('a', { class: 'btn', href: `https://wa.me/?text=${encodeURIComponent(texto)}`, target: '_blank', rel: 'noopener' }, 'Enviar pelo WhatsApp'),
          h('button', { class: 'btn', type: 'button', onclick: () => { raiz.replaceChildren(topo(), form); } }, 'Corrigir dados')),
        h('p', { class: 'dica' }, 'Seus dados não foram enviados para nenhum servidor. Eles só chegam ao técnico quando você manda esse texto.'));
    };

    const topo = () => h('div', null,
      h('h1', null, base.nome ? `Olá, ${base.nome.split(' ')[0]}!` : 'Cadastro de atleta'),
      h('p', { class: 'sub' }, 'Complete sua ficha para o técnico organizar os treinos de vôlei de praia. Leva um minuto.'));
    raiz.append(topo(), form);
    return raiz;
  }

  AC.views = AC.views || {};
  AC.views.ficha = ficha;
})((window.AC = window.AC || {}));
