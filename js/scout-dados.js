/* Dados do Scout (tabelas previstas: `jogos`, `acoes_scout`, `estatisticas_scout`, `treinos_fundamento`).
   Modelo: um jogo é uma lista de ações em ordem. Cada ação diz quem fez (um atleta da nossa dupla ou o adversário),
   o fundamento, o resultado e, se a ação encerrou a jogada, quem ganhou o ponto.
   O placar, o sacador e os sets são sempre calculados a partir das ações, então desfazer é só tirar a última.
   Há três usos da mesma base:
   - Jogo: dupla da casa numa competição;
   - Treino-jogo: o mesmo registro num jogo de treino (formato mais curto);
   - Fundamento: contagem de acertos e tentativas de um exercício, atleta por atleta.
   Os jogos de exemplo são gerados jogada a jogada com números estáveis. O que o técnico registrar fica no navegador. */
(function () {
  const { hash, ms, HOJE } = window.Farol.util;
  const { ATLETAS, TURMAS } = window.Farol.elenco;
  const CAL = window.Farol.calendario;

  /* ---------- Vocabulário ---------- */

  // ponto: quem ganha o ponto com este resultado (null = a jogada continua). valor: nota ou peso para as médias.
  const FUND = {
    saque: {
      nome: 'Saque', curto: 'Saque',
      res: [
        { id: 'ace', nome: 'Ace', ponto: 'nos' },
        { id: 'jogo', nome: 'Em jogo', ponto: null },
        { id: 'erro', nome: 'Erro', ponto: 'adv' },
      ],
      tipos: [['flut', 'Flutuante'], ['viag', 'Viagem']],
      destino: true,
    },
    recepcao: {
      nome: 'Recepção', curto: 'Recep.',
      res: [
        { id: 'r3', nome: 'Perfeita', nota: 3, ponto: null },
        { id: 'r2', nome: 'Boa', nota: 2, ponto: null },
        { id: 'r1', nome: 'Ruim', nota: 1, ponto: null },
        { id: 'r0', nome: 'Erro ou ace', nota: 0, ponto: 'adv' },
      ],
    },
    ataque: {
      nome: 'Ataque', curto: 'Ataque',
      res: [
        { id: 'ponto', nome: 'Ponto', ponto: 'nos' },
        { id: 'jogo', nome: 'Defendido', ponto: null },
        { id: 'bloq', nome: 'Bloqueado', ponto: 'adv' },
        { id: 'erro', nome: 'Erro', ponto: 'adv' },
      ],
      tipos: [['diagonal', 'Diagonal'], ['paralela', 'Paralela'], ['largada', 'Largada'], ['usada', 'Usada']],
      destino: true,
    },
    bloqueio: {
      nome: 'Bloqueio', curto: 'Bloq.',
      res: [
        { id: 'ponto', nome: 'Ponto', ponto: 'nos' },
        { id: 'toque', nome: 'Toque', ponto: null },
        { id: 'erro', nome: 'Erro', ponto: 'adv' },
      ],
    },
    defesa: {
      nome: 'Defesa', curto: 'Defesa',
      res: [
        { id: 'boa', nome: 'Boa', ponto: null },
        { id: 'erro', nome: 'Erro', ponto: 'adv' },
      ],
    },
    adv: {
      nome: 'Adversário', curto: 'Adv.',
      res: [
        { id: 'erro', nome: 'Erro deles', ponto: 'nos', tipos: [['saque', 'Saque'], ['ataque', 'Ataque'], ['rede', 'Rede'], ['fora', 'Bola fora'], ['outro', 'Outro']] },
        { id: 'ponto', nome: 'Ponto deles', ponto: 'adv', tipos: [['ataque', 'Ataque'], ['saque', 'Saque'], ['bloqueio', 'Bloqueio'], ['outro', 'Outro']] },
      ],
    },
  };
  const ORDEM_FUND = ['saque', 'recepcao', 'ataque', 'bloqueio', 'defesa'];
  // Rótulo de um tipo, inclusive os antigos (jogos já gravados).
  const LEGADO = { forca: 'Força', shot: 'Shot' };
  const rotuloTipo = (fund, res, id) => {
    if (!id) return '';
    const f = FUND[fund], r = f && f.res.find((x) => x.id === res);
    const lista = (r && r.tipos) || (f && f.tipos) || [];
    const par = lista.find(([k]) => k === id);
    return par ? par[1] : LEGADO[id] || id;
  };

  const FORMATOS = {
    melhor3: { nome: 'Melhor de 3 sets (21, 21 e 15)', pts: [21, 21, 15], sets: 2, troca: [7, 7, 5], tempoTecnico: true },
    set21: { nome: '1 set de 21', pts: [21], sets: 1, troca: [7], tempoTecnico: false },
    set15: { nome: '1 set de 15', pts: [15], sets: 1, troca: [5], tempoTecnico: false },
    livre: { nome: 'Livre, encerro eu', pts: [null], sets: 1, troca: [0], tempoTecnico: false },
  };

  // Referências de partida para os alertas e metas. São do clube e devem ser ajustadas pela comissão.
  const REF = {
    sideout: { v: 60, nome: 'Side-out', un: '%', texto: 'pontos ganhos quando recebe o saque' },
    breakp: { v: 40, nome: 'Break point', un: '%', texto: 'pontos ganhos quando saca' },
    recNota: { v: 2.0, nome: 'Nota média de recepção', un: '', texto: 'escala de 0 a 3' },
    recErro: { v: 10, nome: 'Erro de recepção', un: '%', texto: 'máximo aceitável' },
    saqueErro: { v: 15, nome: 'Erro de saque', un: '%', texto: 'máximo aceitável' },
    ataqueEf: { v: 20, nome: 'Eficiência de ataque', un: '%', texto: '(pontos − erros − bloqueados) ÷ ataques' },
    defesa: { v: 55, nome: 'Defesas boas', un: '%', texto: 'sobre as defesas tentadas' },
  };

  /* ---------- Estado calculado ---------- */

  const inicioDe = (j, set) => {
    if (j.inicio[set]) return j.inicio[set];
    const base = j.inicio[0] || { sac: 'nos', idx: 0 };
    return { sac: set % 2 ? (base.sac === 'nos' ? 'adv' : 'nos') : base.sac, idx: 0 };
  };

  // Quem saca: ao recuperar o saque, a dupla troca o sacador (a não ser que ainda não tenha sacado no set).
  const saqueInicial = (j, set) => { const i = inicioDe(j, set); return { sac: i.sac, idx: i.idx, ja: i.sac === 'nos' }; };
  const apos = (sq, ponto) => {
    if (ponto === 'nos' && sq.sac === 'adv') { if (sq.ja) sq.idx = 1 - sq.idx; sq.ja = true; }
    sq.sac = ponto;
  };

  // Placar, sets, quem saca e o que falta, tudo a partir das ações.
  function estado(j) {
    const fmt = FORMATOS[j.formato];
    let set = 0, a = 0, b = 0;
    const sq = saqueInicial(j, 0);
    const sets = [];
    let ganhos = 0, perdidos = 0, jogadas = 0;
    j.eventos.forEach((ev) => {
      if (!ev.ponto) return;
      jogadas++;
      if (ev.ponto === 'nos') a++; else b++;
      apos(sq, ev.ponto);
      const alvo = fmt.pts[set];
      if (alvo && (a >= alvo || b >= alvo) && Math.abs(a - b) >= 2) {
        sets.push({ a, b, nos: a > b });
        if (a > b) ganhos++; else perdidos++;
        set++; a = 0; b = 0;
        Object.assign(sq, saqueInicial(j, set));
      }
    });
    const encerrado = j.status === 'finalizado' || ganhos >= fmt.sets || perdidos >= fmt.sets;
    const alvo = fmt.pts[Math.min(set, fmt.pts.length - 1)];
    const total = a + b;
    const troca = fmt.troca[Math.min(set, fmt.troca.length - 1)];
    const { sac, idx } = sq;
    return {
      sets, set, a, b, sac, idx, ganhos, perdidos, jogadas, encerrado, alvo,
      sacador: sac === 'nos' ? j.dupla[idx] : null,
      iniciado: total > 0,
      // Aviso de troca de lado (a cada 7 pontos nos dois primeiros sets, a cada 5 no terceiro) e tempo técnico.
      trocaAgora: !!(troca && total > 0 && total % troca === 0 && !encerrado),
      tempoTecnico: !!(fmt.tempoTecnico && set < 2 && total === 21),
      vencedor: encerrado ? (ganhos > perdidos ? 'nos' : perdidos > ganhos ? 'adv' : a >= b ? 'nos' : 'adv') : null,
    };
  }

  /* ---------- Estatísticas ---------- */

  const vazioAtleta = () => ({
    saque: { n: 0, ace: 0, erro: 0 },
    rec: { n: 0, soma: 0, p3: 0, erro: 0 },
    atq: { n: 0, ponto: 0, erro: 0, bloq: 0 },
    blo: { n: 0, ponto: 0, erro: 0 },
    def: { n: 0, boa: 0, erro: 0 },
    pontos: 0, erros: 0,
  });
  const grade = () => Array(9).fill(0);

  function estatisticas(jogos) {
    const R = {
      jogos: jogos.length, sets: 0, setsGanhos: 0, vitorias: 0,
      pontos: { nos: 0, adv: 0 },
      so: { n: 0, v: 0 }, bp: { n: 0, v: 0 },
      ganhos: { ace: 0, ataque: 0, bloqueio: 0, erroAdv: 0 },
      perdas: { erroSaque: 0, erroRec: 0, erroAtaque: 0, bloqueado: 0, erroDef: 0, erroBloq: 0, pontoAdv: 0 },
      atletas: {}, dest: { saque: grade(), ataque: grade(), ataquePonto: grade() },
      // Para os gráficos: de onde vem cada ponto, quais ataques convertem e onde erramos.
      origemNos: { ataque: 0, bloqueio: 0, ace: 0, erroAdv: 0, outro: 0 },
      origemAdv: { ataque: 0, saque: 0, bloqueio: 0, erroNos: 0, outro: 0 },
      tiposAtaque: {}, errosNossos: { saque: 0, recepcao: 0, ataque: 0, bloqueado: 0, defesa: 0, bloqueio: 0 },
    };
    const at = (id) => (R.atletas[id] = R.atletas[id] || vazioAtleta());
    jogos.forEach((j) => {
      const e = estado(j);
      R.sets += e.sets.length + (e.iniciado && !e.encerrado ? 1 : 0);
      R.setsGanhos += e.sets.filter((s) => s.nos).length;
      if (e.encerrado && e.vencedor === 'nos') R.vitorias++;
      j.dupla.forEach(at);
      j.eventos.forEach((ev) => {
        const p = ev.quem !== 'adv' ? at(ev.quem) : null;
        if (ev.fund === 'saque' && p) {
          p.saque.n++; if (ev.res === 'ace') p.saque.ace++; if (ev.res === 'erro') p.saque.erro++;
          if (ev.dest != null) R.dest.saque[ev.dest]++;
        } else if (ev.fund === 'recepcao' && p) {
          p.rec.n++; p.rec.soma += +ev.res.slice(1);
          if (ev.res === 'r3') p.rec.p3++; if (ev.res === 'r0') p.rec.erro++;
        } else if (ev.fund === 'ataque' && p) {
          p.atq.n++;
          if (ev.res === 'ponto') p.atq.ponto++; if (ev.res === 'erro') p.atq.erro++; if (ev.res === 'bloq') p.atq.bloq++;
          if (ev.dest != null) { R.dest.ataque[ev.dest]++; if (ev.res === 'ponto') R.dest.ataquePonto[ev.dest]++; }
        } else if (ev.fund === 'bloqueio' && p) {
          p.blo.n++; if (ev.res === 'ponto') p.blo.ponto++; if (ev.res === 'erro') p.blo.erro++;
        } else if (ev.fund === 'defesa' && p) {
          p.def.n++; if (ev.res === 'boa') p.def.boa++; else p.def.erro++;
        }
        if (!ev.ponto) return;
        // Jogada encerrada: de onde veio e para quem foi.
        R.pontos[ev.ponto]++;
        const bucket = ev.sac === 'adv' ? R.so : R.bp;
        bucket.n++; if (ev.ponto === 'nos') bucket.v++;
        if (ev.ponto === 'nos') {
          if (ev.fund === 'saque') R.origemNos.ace++;
          else if (ev.fund === 'ataque') { R.origemNos.ataque++; const t = ev.tipo || 'geral'; R.tiposAtaque[t] = (R.tiposAtaque[t] || 0) + 1; }
          else if (ev.fund === 'bloqueio') R.origemNos.bloqueio++;
          else if (ev.tipo === 'outro') R.origemNos.outro++;
          else R.origemNos.erroAdv++;
        } else if (ev.fund === 'adv') {
          const k = ['ataque', 'saque', 'bloqueio'].includes(ev.tipo) ? ev.tipo : 'outro';
          R.origemAdv[k]++;
        } else {
          R.origemAdv.erroNos++;
          const k = ev.fund === 'ataque' ? (ev.res === 'bloq' ? 'bloqueado' : 'ataque') : ev.fund;
          if (k in R.errosNossos) R.errosNossos[k]++;
        }
        if (ev.ponto === 'nos') {
          if (p) p.pontos++;
          if (ev.fund === 'saque') R.ganhos.ace++;
          else if (ev.fund === 'ataque') R.ganhos.ataque++;
          else if (ev.fund === 'bloqueio') R.ganhos.bloqueio++;
          else R.ganhos.erroAdv++;
        } else {
          if (p) p.erros++;
          if (ev.fund === 'saque') R.perdas.erroSaque++;
          else if (ev.fund === 'recepcao') R.perdas.erroRec++;
          else if (ev.fund === 'ataque') { if (ev.res === 'bloq') R.perdas.bloqueado++; else R.perdas.erroAtaque++; }
          else if (ev.fund === 'defesa') R.perdas.erroDef++;
          else if (ev.fund === 'bloqueio') R.perdas.erroBloq++;
          else R.perdas.pontoAdv++;
        }
      });
    });
    const pc = (a, b) => (b ? (100 * a) / b : null);
    R.aproveit = pc(R.pontos.nos, R.pontos.nos + R.pontos.adv);
    R.sideout = pc(R.so.v, R.so.n);
    R.breakp = pc(R.bp.v, R.bp.n);
    // Índices por atleta
    Object.values(R.atletas).forEach((p) => {
      p.saque.acePct = pc(p.saque.ace, p.saque.n); p.saque.erroPct = pc(p.saque.erro, p.saque.n);
      p.rec.nota = p.rec.n ? p.rec.soma / p.rec.n : null; p.rec.p3Pct = pc(p.rec.p3, p.rec.n); p.rec.erroPct = pc(p.rec.erro, p.rec.n);
      p.atq.killPct = pc(p.atq.ponto, p.atq.n); p.atq.ef = p.atq.n ? (100 * (p.atq.ponto - p.atq.erro - p.atq.bloq)) / p.atq.n : null;
      p.def.boaPct = pc(p.def.boa, p.def.n);
    });
    // Totais da dupla (soma dos atletas), para a visão geral
    const soma = vazioAtleta();
    Object.values(R.atletas).forEach((p) => ['saque', 'rec', 'atq', 'blo', 'def'].forEach((k) => Object.keys(soma[k]).forEach((c) => { soma[k][c] += p[k][c]; })));
    soma.saque.acePct = pc(soma.saque.ace, soma.saque.n); soma.saque.erroPct = pc(soma.saque.erro, soma.saque.n);
    soma.rec.nota = soma.rec.n ? soma.rec.soma / soma.rec.n : null; soma.rec.p3Pct = pc(soma.rec.p3, soma.rec.n); soma.rec.erroPct = pc(soma.rec.erro, soma.rec.n);
    soma.atq.killPct = pc(soma.atq.ponto, soma.atq.n); soma.atq.ef = soma.atq.n ? (100 * (soma.atq.ponto - soma.atq.erro - soma.atq.bloq)) / soma.atq.n : null;
    soma.def.boaPct = pc(soma.def.boa, soma.def.n);
    R.total = soma;
    return R;
  }

  // Metas de treino sugeridas a partir do que o scout mostrou, comparado às referências do clube.
  function sugestoes(S) {
    const T = S.total, lista = [];
    const add = (fund, titulo, motivo, meta, nome) => lista.push({ fund, titulo, motivo, meta, nome });
    if (T.rec.n >= 12 && T.rec.nota != null && T.rec.nota < REF.recNota.v) add('recepcao', 'Recepção', `Nota média ${T.rec.nota.toFixed(1).replace('.', ',')} (referência ${REF.recNota.v.toFixed(1).replace('.', ',')}) em ${T.rec.n} recepções`, 70, 'Recepção de saque viagem');
    else if (T.rec.n >= 12 && T.rec.erroPct != null && T.rec.erroPct > REF.recErro.v) add('recepcao', 'Recepção', `${Math.round(T.rec.erroPct)}% de erros (máximo ${REF.recErro.v}%)`, 75, 'Recepção sob pressão');
    if (T.saque.n >= 12 && T.saque.erroPct != null && T.saque.erroPct > REF.saqueErro.v) add('saque', 'Saque', `${Math.round(T.saque.erroPct)}% de erros (máximo ${REF.saqueErro.v}%)`, 80, 'Saque em zona alvo, 10 bolas');
    if (T.atq.n >= 12 && T.atq.ef != null && T.atq.ef < REF.ataqueEf.v) add('ataque', 'Ataque', `Eficiência de ${Math.round(T.atq.ef)}% (referência ${REF.ataqueEf.v}%)`, 60, 'Ataque após recepção, com bloqueio');
    if (T.def.n >= 10 && T.def.boaPct != null && T.def.boaPct < REF.defesa.v) add('defesa', 'Defesa', `${Math.round(T.def.boaPct)}% de defesas boas (referência ${REF.defesa.v}%)`, 60, 'Defesa de ataque em diagonal');
    if (S.so.n >= 20 && S.sideout != null && S.sideout < REF.sideout.v) add('recepcao', 'Side-out', `Side-out de ${Math.round(S.sideout)}% (referência ${REF.sideout.v}%): recepção e primeiro ataque`, 70, 'Side-out completo, recepção e ataque');
    if (S.bp.n >= 20 && S.breakp != null && S.breakp < REF.breakp.v) add('saque', 'Break point', `Break point de ${Math.round(S.breakp)}% (referência ${REF.breakp.v}%): saque e defesa`, 60, 'Saque, bloqueio e defesa em sequência');
    return lista;
  }

  /* ---------- Jogos de exemplo ---------- */

  let seqEv = 0;
  const rng = (semente) => { let i = 0; return () => hash(`${semente}:${i++}`); };
  const escolha = (r, pares) => { const t = pares.reduce((a, [, p]) => a + p, 0); let x = r() * t; for (const [v, p] of pares) { x -= p; if (x <= 0) return v; } return pares[pares.length - 1][0]; };

  // Habilidade de cada atleta, estável (0 a 1).
  const hab = (id, k) => hash(`${id}:${k}`);

  function perfil(id) {
    return {
      ace: 0.03 + 0.1 * hab(id, 'ace'), erroSaque: 0.07 + 0.13 * hab(id, 'es'),
      rec: 0.28 + 0.34 * hab(id, 'rec'), rec0: 0.03 + 0.1 * hab(id, 'r0'),
      kill: 0.36 + 0.26 * hab(id, 'kill'), erroAtq: 0.05 + 0.12 * hab(id, 'ea'),
      viagem: hab(id, 'viag'),
    };
  }

  // Gera as ações de um jogo. `alvos` são os placares de cada set, já com o vencedor definido.
  function simular(j, alvos, semente) {
    const r = rng(semente);
    const [A, B] = j.dupla;
    const P = { [A]: perfil(A), [B]: perfil(B) };
    const outro = (id) => (id === A ? B : A);
    const ev = [];
    let n = 0;
    const push = (set, sac, quem, fund, res, extra = {}) => {
      const def = FUND[fund].res.find((x) => x.id === res);
      ev.push({ n: ++n, set, sac, quem, fund, res, ponto: def.ponto, ...extra });
    };
    const dest = (f) => (FUND[f].destino ? { dest: escolha(r, [[0, 1], [1, 1.4], [2, 1.1], [3, 1.6], [4, 2.1], [5, 1.7], [6, 1.2], [7, 1.8], [8, 1.3]]) } : {});
    const tipoSaque = (id) => (r() < 0.25 + 0.5 * P[id].viagem ? 'viag' : 'flut');
    const tipoAtq = () => escolha(r, [['diagonal', 5], ['paralela', 3], ['largada', 1.5], ['usada', 1.5]]);
    const tipoAdv = (opcoes) => escolha(r, opcoes);

    // Ordem dos pontos: embaralhada, com o último sempre do vencedor do set.
    const jogada = (set, sac, idx, vence) => {
      const sacador = j.dupla[idx], parc = outro(sacador);
      if (sac === 'nos') {
        if (vence === 'nos') {
          const x = r();
          if (x < P[sacador].ace * 1.5) push(set, sac, sacador, 'saque', 'ace', { tipo: tipoSaque(sacador), ...dest('saque') });
          else {
            push(set, sac, sacador, 'saque', 'jogo', { tipo: tipoSaque(sacador), ...dest('saque') });
            const y = r();
            if (y < 0.22) push(set, sac, parc, 'bloqueio', 'ponto');
            else if (y < 0.55) push(set, sac, 'adv', 'adv', 'erro', { tipo: tipoAdv([['saque', 3], ['ataque', 4], ['rede', 2], ['fora', 3], ['outro', 0.5]]) });
            else { push(set, sac, escolha(r, [[sacador, 1], [parc, 1]]), 'defesa', 'boa'); push(set, sac, escolha(r, [[sacador, 1], [parc, 1]]), 'ataque', 'ponto', { tipo: tipoAtq(), ...dest('ataque') }); }
          }
        } else if (r() < P[sacador].erroSaque * 1.6) push(set, sac, sacador, 'saque', 'erro', { tipo: tipoSaque(sacador), ...dest('saque') });
        else {
          push(set, sac, sacador, 'saque', 'jogo', { tipo: tipoSaque(sacador), ...dest('saque') });
          const y = r();
          if (y < 0.5) push(set, sac, 'adv', 'adv', 'ponto', { tipo: tipoAdv([['ataque', 6], ['saque', 2], ['bloqueio', 2], ['outro', 0.6]]) });
          else if (y < 0.78) push(set, sac, escolha(r, [[sacador, 1], [parc, 1]]), 'defesa', 'erro');
          else if (y < 0.88) push(set, sac, parc, 'bloqueio', 'erro');
          else { push(set, sac, escolha(r, [[sacador, 1], [parc, 1]]), 'defesa', 'boa'); push(set, sac, escolha(r, [[sacador, 1], [parc, 1]]), 'ataque', r() < 0.5 ? 'erro' : 'bloq', { tipo: tipoAtq(), ...dest('ataque') }); }
        }
        return;
      }
      // Recebendo: o adversário saca.
      const rec = escolha(r, [[A, 0.4 + P[A].rec], [B, 0.4 + P[B].rec]]);
      const atac = outro(rec);
      if (vence === 'adv') {
        if (r() < 0.28) { push(set, sac, rec, 'recepcao', 'r0'); return; }
        push(set, sac, rec, 'recepcao', escolha(r, [['r3', P[rec].rec], ['r2', 0.45], ['r1', 0.3]]));
        const y = r();
        if (y < 0.3) push(set, sac, atac, 'ataque', 'bloq', { tipo: tipoAtq(), ...dest('ataque') });
        else if (y < 0.62) push(set, sac, atac, 'ataque', 'erro', { tipo: tipoAtq(), ...dest('ataque') });
        else { push(set, sac, atac, 'ataque', 'jogo', { tipo: tipoAtq(), ...dest('ataque') }); push(set, sac, 'adv', 'adv', 'ponto', { tipo: tipoAdv([['ataque', 6], ['saque', 2], ['bloqueio', 2], ['outro', 0.6]]) }); }
      } else {
        const nota = escolha(r, [['r3', 0.3 + P[rec].rec * 0.8], ['r2', 0.5], ['r1', 0.18]]);
        push(set, sac, rec, 'recepcao', nota);
        if (nota === 'r1' && r() < 0.35) { push(set, sac, atac, 'ataque', 'jogo', { tipo: 'largada', ...dest('ataque') }); push(set, sac, 'adv', 'adv', 'erro', { tipo: tipoAdv([['saque', 3], ['ataque', 4], ['rede', 2], ['fora', 3], ['outro', 0.5]]) }); return; }
        push(set, sac, atac, 'ataque', 'ponto', { tipo: tipoAtq(), ...dest('ataque') });
      }
    };

    alvos.forEach((alvo, set) => {
      const [pa, pb] = alvo;
      const vencNos = pa > pb;
      const seq = [...Array(pa).fill('nos'), ...Array(pb).fill('adv')];
      // embaralha tudo menos o último ponto, que é do vencedor
      const ultimo = vencNos ? 'nos' : 'adv';
      seq.splice(seq.lastIndexOf(ultimo), 1);
      for (let i = seq.length - 1; i > 0; i--) { const k = Math.floor(r() * (i + 1)); [seq[i], seq[k]] = [seq[k], seq[i]]; }
      seq.push(ultimo);
      const sq = saqueInicial(j, set);
      seq.forEach((vence) => {
        jogada(set, sq.sac, sq.idx, vence);
        apos(sq, vence);
      });
    });
    return ev;
  }

  const nomeCurto = (id) => ATLETAS[id].nome.split(' ')[0];
  const rotuloDupla = (dupla) => dupla.map(nomeCurto).join(' e ');

  let seqJogo = 0;
  function novoJogo(base) {
    const j = {
      id: `j${++seqJogo}`, tipo: 'jogo', titulo: '', data: HOJE, origem: null, adv: 'Dupla adversária',
      dupla: [], formato: 'melhor3', inicio: { 0: { sac: 'nos', idx: 0 } }, eventos: [], status: 'andamento', obs: '',
      ...base,
    };
    return j;
  }

  function semear() {
    const lista = [];
    const mk = (base, alvos, semente) => {
      const j = novoJogo({ status: 'finalizado', ...base });
      j.eventos = simular(j, alvos, semente);
      lista.push(j);
      return j;
    };
    const c0 = CAL.COMPETICOES.c0;
    const dp = (id) => CAL.plan('c0').duplas.find((d) => d.id === id);
    // Torneio de Abertura (12/09): resultados coerentes com o que foi lançado na competição.
    mk({ tipo: 'jogo', titulo: 'Quartas de final', data: c0.data, origem: { compId: 'c0', duplaId: 'd1' }, dupla: [dp('d1').a, dp('d1').b], adv: 'Silva e Moura', inicio: { 0: { sac: 'nos', idx: 0 } } }, [[21, 17], [21, 18]], 'c0d1q');
    mk({ tipo: 'jogo', titulo: 'Semifinal', data: c0.data + 864e5, origem: { compId: 'c0', duplaId: 'd1' }, dupla: [dp('d1').a, dp('d1').b], adv: 'Brito e Nunes', inicio: { 0: { sac: 'adv', idx: 1 }, 2: { sac: 'adv', idx: 0 } } }, [[21, 19], [18, 21], [11, 15]], 'c0d1s');
    mk({ tipo: 'jogo', titulo: 'Final', data: c0.data + 864e5, origem: { compId: 'c0', duplaId: 'd5' }, dupla: [dp('d5').a, dp('d5').b], adv: 'Castro e Peixoto', inicio: { 0: { sac: 'nos', idx: 0 } } }, [[19, 21], [21, 18], [13, 15]], 'c0d5f');
    mk({ tipo: 'jogo', titulo: 'Final', data: c0.data + 864e5, origem: { compId: 'c0', duplaId: 'd7' }, dupla: [dp('d7').a, dp('d7').b], adv: 'Rocha e Lins', inicio: { 0: { sac: 'adv', idx: 0 } } }, [[21, 15], [21, 17]], 'c0d7f');
    mk({ tipo: 'jogo', titulo: 'Fase de grupos', data: c0.data, origem: { compId: 'c0', duplaId: 'd3' }, dupla: [dp('d3').a, dp('d3').b], adv: 'Mota e Cruz', inicio: { 0: { sac: 'nos', idx: 1 } } }, [[16, 21], [18, 21]], 'c0d3g');
    // Treinos-jogo recentes da turma Sub-18
    mk({ tipo: 'treino', titulo: 'Treino-jogo', data: ms('2026-09-23'), origem: { turmaId: 'sub18' }, dupla: ['a1', 'a2'], adv: 'Mateus e João Vitor', formato: 'set21' }, [[21, 18]], 't1');
    mk({ tipo: 'treino', titulo: 'Treino-jogo', data: ms('2026-09-30'), origem: { turmaId: 'sub18' }, dupla: ['a1', 'a2'], adv: 'Rafael e Davi', formato: 'set21' }, [[21, 14]], 't2');
    mk({ tipo: 'treino', titulo: 'Treino-jogo', data: ms('2026-09-30'), origem: { turmaId: 'sub18' }, dupla: ['a3', 'a4'], adv: 'Enzo e Arthur', formato: 'set15' }, [[11, 15]], 't3');
    mk({ tipo: 'treino', titulo: 'Treino-jogo', data: ms('2026-09-25'), origem: { turmaId: 'adulto' }, dupla: ['b1', 'b2'], adv: 'Marcelo e Diego', formato: 'set21' }, [[21, 19]], 't4');
    // Um treino-jogo em andamento hoje, para continuar de onde parou
    const andamento = novoJogo({ tipo: 'treino', titulo: 'Treino-jogo', data: HOJE, origem: { turmaId: 'sub18' }, dupla: ['a5', 'a6'], adv: 'Caio e Bruno', formato: 'set21', status: 'andamento' });
    andamento.eventos = simular(andamento, [[9, 7]], 't5');
    andamento.iniciadoEm = Date.now() - 11 * 60e3;
    lista.push(andamento);
    return lista;
  }

  /* ---------- Treinos de fundamento ---------- */

  let seqTreino = 0;
  function semearFundamentos() {
    const turma = TURMAS.sub18;
    const mk = (data, fund, nome, meta, t0) => {
      const regs = {};
      turma.atletas.slice(0, 10).forEach((id) => {
        const base = 0.45 + 0.35 * hab(id, 'fd' + fund) + t0 * 0.05 * (0.5 + hab(id, 'prog'));
        const t = 12 + Math.floor(hash(id + nome + data) * 9);
        const a = Math.round(t * Math.max(0.2, Math.min(0.95, base + (hash(id + data + 'r') - 0.5) * 0.12)));
        regs[id] = { t, a };
      });
      return { id: `f${++seqTreino}`, data, turmaId: 'sub18', fund, nome, meta, regs };
    };
    return [
      mk(ms('2026-09-08'), 'saque', 'Saque na zona 1, 10 bolas', 70, 0),
      mk(ms('2026-09-22'), 'saque', 'Saque na zona 1, 10 bolas', 70, 1),
      mk(ms('2026-10-01'), 'saque', 'Saque na zona 1, 10 bolas', 70, 2),
      mk(ms('2026-09-15'), 'recepcao', 'Recepção de saque viagem', 65, 0),
      mk(ms('2026-09-29'), 'recepcao', 'Recepção de saque viagem', 65, 1),
    ];
  }

  /* ---------- Armazenamento ---------- */

  const CHAVE = 'ft.scout.v2';
  let jogos = semear();
  let treinos = semearFundamentos();
  try {
    const guardado = JSON.parse(localStorage.getItem(CHAVE) || 'null');
    if (guardado && Array.isArray(guardado.jogos) && Array.isArray(guardado.treinos)) {
      jogos = guardado.jogos; treinos = guardado.treinos;
      seqJogo = Math.max(seqJogo, ...jogos.map((x) => +x.id.slice(1) || 0));
      seqTreino = Math.max(seqTreino, ...treinos.map((x) => +x.id.slice(1) || 0));
    }
  } catch (e) { /* sem armazenamento: segue em memória */ }
  const salvar = () => { try { localStorage.setItem(CHAVE, JSON.stringify({ jogos, treinos })); } catch (e) { /* ignora */ } };

  const obter = (id) => jogos.find((x) => x.id === id) || null;

  const API = {
    FUND, ORDEM_FUND, FORMATOS, REF,
    estado, estatisticas, sugestoes, nomeCurto, rotuloDupla, rotuloTipo,
    jogos: () => jogos.slice().sort((a, b) => b.data - a.data || (b.status === 'andamento') - (a.status === 'andamento')),
    jogo: obter,
    treinos: () => treinos.slice().sort((a, b) => b.data - a.data),
    treino: (id) => treinos.find((x) => x.id === id) || null,

    criarJogo(cfg) {
      const j = novoJogo({
        tipo: cfg.tipo, titulo: cfg.titulo || (cfg.tipo === 'treino' ? 'Treino-jogo' : 'Jogo'), data: cfg.data || HOJE,
        origem: cfg.origem || null, adv: cfg.adv || 'Dupla adversária', dupla: cfg.dupla.slice(), formato: cfg.formato || 'melhor3',
        inicio: { 0: { sac: cfg.sacaPrimeiro || 'nos', idx: cfg.idx || 0 } },
      });
      jogos.push(j); salvar();
      return j;
    },
    registrar(jogoId, ev) {
      const j = obter(jogoId); if (!j) return null;
      const e = estado(j);
      if (e.encerrado) return null;
      const def = FUND[ev.fund].res.find((x) => x.id === ev.res);
      const novo = { n: j.eventos.length + 1, set: e.set, sac: e.sac, quem: ev.quem, fund: ev.fund, res: ev.res, ponto: def.ponto };
      if (ev.tipo) novo.tipo = ev.tipo;
      if (ev.dest != null) novo.dest = ev.dest;
      if (!j.iniciadoEm) j.iniciadoEm = Date.now();
      j.eventos.push(novo);
      if (estado(j).encerrado && FORMATOS[j.formato].pts[0]) j.status = 'finalizado';
      salvar();
      return novo;
    },
    desfazer(jogoId) {
      const j = obter(jogoId); if (!j || !j.eventos.length) return null;
      const ev = j.eventos.pop();
      if (j.status === 'finalizado') j.status = 'andamento';
      salvar();
      return ev;
    },
    // Acrescenta destino ou tipo à última ação (a coleta rápida pergunta depois, sem atrapalhar o ritmo).
    ajustarUltimo(jogoId, patch) { const j = obter(jogoId); const ev = j && j.eventos[j.eventos.length - 1]; if (!ev) return null; Object.assign(ev, patch); salvar(); return ev; },
    definirInicio(jogoId, set, sac, idx) { const j = obter(jogoId); j.inicio[set] = { sac, idx: idx || 0 }; salvar(); },
    encerrar(jogoId) { const j = obter(jogoId); if (j) { j.status = 'finalizado'; salvar(); } },
    reabrir(jogoId) { const j = obter(jogoId); if (j) { j.status = 'andamento'; salvar(); } },
    excluir(jogoId) { jogos = jogos.filter((x) => x.id !== jogoId); salvar(); },

    criarTreino(cfg) {
      const t = { id: `f${++seqTreino}`, data: cfg.data || HOJE, turmaId: cfg.turmaId, fund: cfg.fund, nome: cfg.nome, meta: cfg.meta || 70, regs: {} };
      treinos.push(t); salvar();
      return t;
    },
    // Um toque: acerto ou erro de um atleta. `desfazer` tira o último lançamento do atleta.
    contar(treinoId, atletaId, acerto) {
      const t = API.treino(treinoId); const r = (t.regs[atletaId] = t.regs[atletaId] || { t: 0, a: 0, hist: [] });
      r.hist = r.hist || [];
      r.t++; if (acerto) r.a++; r.hist.push(acerto ? 1 : 0); salvar();
    },
    desfazerContagem(treinoId, atletaId) {
      const t = API.treino(treinoId); const r = t.regs[atletaId];
      if (!r || !r.t) return;
      const ultimo = r.hist && r.hist.length ? r.hist.pop() : (r.a / r.t >= 0.5 ? 1 : 0);
      r.t--; if (ultimo) r.a--; salvar();
    },
    excluirTreino(id) { treinos = treinos.filter((x) => x.id !== id); salvar(); },
    // Jogos de uma competição (para a tela da competição).
    jogosDaCompeticao: (compId) => jogos.filter((x) => x.origem && x.origem.compId === compId),
  };

  window.Farol.scoutDados = API;
})();
