/* Rodar: node tests/calc.test.js */
const assert = require('assert');
const C = require('../js/calc.js');

let n = 0;
const t = (nome, fn) => { fn(); n++; console.log('ok -', nome); };

t('datas: segunda da semana e diferença', () => {
  assert.strictEqual(C.segundaDe('2026-10-08'), '2026-10-05'); // quinta
  assert.strictEqual(C.segundaDe('2026-10-11'), '2026-10-05'); // domingo
  assert.strictEqual(C.segundaDe('2026-10-05'), '2026-10-05');
  assert.strictEqual(C.diffDias('2026-10-01', '2026-10-08'), 7);
  assert.strictEqual(C.addDias('2026-12-30', 3), '2027-01-02');
});

t('mesociclo: fim e busca por data', () => {
  const m = { inicio: '2026-10-05', semanas: 4 };
  assert.strictEqual(C.fimMeso(m), '2026-11-01');
  const p = { mesociclos: [m] };
  assert.strictEqual(C.mesoDaData(p, '2026-11-01'), m);
  assert.strictEqual(C.mesoDaData(p, '2026-11-02'), null);
});

t('fatores de carga', () => {
  assert.deepStrictEqual(C.fatoresCarga('3:1', 4), [0.8, 0.9, 1, 0.6]);
  assert.deepStrictEqual(C.fatoresCarga('2:1', 3), [0.85, 1, 0.65]);
  assert.deepStrictEqual(C.fatoresCarga('plana', 3), [1, 1, 1]);
  const pol = C.fatoresCarga('polimento', 3);
  assert.ok(pol[0] > pol[1] && pol[1] > pol[2]);
  const prog = C.fatoresCarga('progressiva', 4);
  assert.ok(prog[0] === 0.7 && prog[3] === 1);
});

const treino = (data, pse, psr, dur = 90, id = 'a1', extra = {}) => ({
  id: data + id, data, feito: true, duracao: dur, fundamentos: [], ...extra,
  presencas: { [id]: { presente: true, pse, psr } },
});

t('carga da sessão = PSE × minutos; ausente e sem PSE não contam', () => {
  assert.strictEqual(C.cargaSessao(treino('2026-10-05', 6, 7), 'a1'), 540);
  const falta = treino('2026-10-05', 6, 7);
  falta.presencas.a1.presente = false;
  assert.strictEqual(C.cargaSessao(falta, 'a1'), null);
  assert.strictEqual(C.cargaSessao(treino('2026-10-05', null, 7), 'a1'), null);
  const plan = treino('2026-10-05', 6, 7);
  plan.feito = false;
  assert.strictEqual(C.cargaSessao(plan, 'a1'), null);
});

t('carga semanal soma só a semana', () => {
  const ts = [treino('2026-10-05', 5, 7), treino('2026-10-07', 6, 7), treino('2026-10-12', 9, 7)];
  assert.strictEqual(C.cargaSemanal(ts, 'a1', '2026-10-05'), 5 * 90 + 6 * 90);
});

t('ACWR: sem base suficiente fica nulo; com base calcula a faixa', () => {
  const sem = (seg, pse) => treino(seg, pse, 7);
  const base = [sem('2026-09-07', 5), sem('2026-09-14', 5), sem('2026-09-21', 5), sem('2026-09-28', 5)];
  assert.strictEqual(C.acwr([...base.slice(0, 2), sem('2026-10-05', 5)], 'a1', '2026-10-05').valor, null);
  const ideal = C.acwr([...base, sem('2026-10-05', 5)], 'a1', '2026-10-05');
  assert.deepStrictEqual([ideal.valor, ideal.faixa], [1, 'ideal']);
  const alto = C.acwr([...base, sem('2026-10-05', 9)], 'a1', '2026-10-05');
  assert.strictEqual(alto.faixa, 'alto');
});

t('cobertura dos tópicos do mesociclo', () => {
  const meso = {
    inicio: '2026-10-05', semanas: 2,
    topicos: [
      { id: 'x', fundamento: 'saque', tipos: ['Viagem'] },
      { id: 'y', fundamento: 'ataque', tipos: [] },
      { id: 'z', fundamento: 'defesa', tipos: ['Manchete'] },
    ],
  };
  const ts = [
    treino('2026-10-06', 5, 7, 90, 'a1', { fundamentos: [{ fundamento: 'saque', tipos: ['Viagem', 'Flutuante'] }] }),
    treino('2026-10-07', 5, 7, 90, 'a1', { fundamentos: [{ fundamento: 'saque', tipos: ['Flutuante'] }, { fundamento: 'ataque', tipos: ['Diagonal'] }] }),
    treino('2026-10-09', 5, 7, 90, 'a1', { feito: false, fundamentos: [{ fundamento: 'ataque', tipos: [] }] }),
    treino('2026-11-20', 5, 7, 90, 'a1', { fundamentos: [{ fundamento: 'defesa', tipos: [] }] }), // fora do meso
  ];
  const [x, y, z] = C.coberturaMeso(meso, ts);
  assert.deepStrictEqual([x.feitos, x.previstos, x.ultima], [1, 0, '2026-10-06']);
  assert.deepStrictEqual([y.feitos, y.previstos], [1, 1]);
  assert.deepStrictEqual([z.feitos, z.previstos, z.ultima], [0, 0, null]);
});

t('validação dos mesociclos', () => {
  const p = {
    inicio: '2026-10-05', fim: '2026-12-27',
    mesociclos: [
      { nome: 'A', inicio: '2026-10-05', semanas: 4 },
      { nome: 'B', inicio: '2026-11-02', semanas: 4 },
      { nome: 'C', inicio: '2026-11-23', semanas: 4 }, // sobrepõe B (termina 11-29)
      { nome: 'D', inicio: '2026-12-21', semanas: 3 }, // passa do fim
    ],
  };
  const av = C.validarMesos(p);
  assert.ok(av.some((x) => /"B" e "C" se sobrepõem/.test(x)));
  assert.ok(av.some((x) => /"D" termina depois/.test(x)));
  assert.strictEqual(C.validarMesos({ inicio: '2026-10-05', mesociclos: [{ nome: 'A', inicio: '2026-10-05', semanas: 2 }, { nome: 'B', inicio: '2026-10-26', semanas: 2 }] }).length, 1);
});

t('estrutura sugerida soma o total de semanas', () => {
  const e = C.sugerirEstrutura('2026-10-05', '2026-12-27'); // 12 semanas
  assert.strictEqual(C.soma(e.map((x) => x.semanas)), 12);
  assert.strictEqual(e.length, 4);
});

t('situação: fase, semana e próxima competição', () => {
  const p = {
    mesociclos: [{ id: 'm1', nome: 'Base', inicio: '2026-10-05', semanas: 4 }],
    competicoes: [{ nome: 'Etapa', data: '2026-10-31', prioridade: 'A' }, { nome: 'Velha', data: '2026-09-01', prioridade: 'C' }],
  };
  const s = C.situacao(p, '2026-10-14');
  assert.strictEqual(s.semana, 2);
  assert.strictEqual(s.proxima.nome, 'Etapa');
  assert.strictEqual(s.proxima.dias, 17);
});

t('alertas: PSR baixo e esforço máximo nos últimos 7 dias', () => {
  const a = { id: 'a1', nome: 'Ana' };
  const ts = [treino('2026-10-06', 9, 3), treino('2026-10-07', 6, 4)];
  const al = C.alertasAtleta(ts, a, '2026-10-08');
  assert.ok(al.some((x) => /mal recuperado em 2 treinos/.test(x.texto) && x.nivel === 'alto'));
  assert.ok(al.some((x) => /Esforço máximo em 1 treino/.test(x.texto)));
  assert.strictEqual(C.alertasAtleta([treino('2026-09-01', 9, 3)], a, '2026-10-08').length, 0);
});

t('planejado × real por semana', () => {
  const meso = { inicio: '2026-10-05', semanas: 2, perfil: '3:1', cargaRef: 1000 };
  const ts = [treino('2026-10-06', 5, 7)];
  const r = C.planejadoReal(meso, ts, [{ id: 'a1' }], '2026-10-08');
  assert.strictEqual(r[0].planejado, 800);
  assert.strictEqual(r[0].real, 450);
  assert.strictEqual(r[0].atual, true);
  assert.strictEqual(r[1].real, null);
});

/* ---------- Competições mandam na carga ---------- */

const perioComp = (comps, extra = {}) => ({ inicio: '2026-10-05', fim: '2027-02-28', mesociclos: [], competicoes: comps.map((c, i) => ({ id: 'c' + i, ...c })), ...extra });

t('plano ideal: contagem regressiva até a competição A', () => {
  // A no sábado da semana 10 (índice 10): semanas 10 competição, 9 polimento, 8-7 pré, 6..3 desenvolvimento, 2..0 base
  const p = perioComp([{ nome: 'Estadual', data: C.addDias('2026-10-05', 7 * 10 + 5), prioridade: 'A' }]);
  const fases = C.planoIdeal(p).semanas.map((w) => w.fase);
  assert.strictEqual(fases[10], 'competitivo');
  assert.strictEqual(fases[9], 'polimento');
  assert.deepStrictEqual(fases.slice(7, 9), ['precompetitivo', 'precompetitivo']);
  assert.deepStrictEqual(fases.slice(3, 7), Array(4).fill('desenvolvimento'));
  assert.deepStrictEqual(fases.slice(0, 3), Array(3).fill('base'));
  assert.strictEqual(fases[11], 'recuperacao');
});

t('volume cai na semana do A e depois dele; intensidade (PSE alvo) se mantém no polimento', () => {
  const p = perioComp([{ nome: 'Estadual', data: C.addDias('2026-10-05', 7 * 10 + 5), prioridade: 'A' }]);
  const w = C.planoIdeal(p).semanas;
  assert.strictEqual(w[10].fator, 0.6);   // semana da competição: plana 1,0 × 0,6
  assert.strictEqual(w[9].fator, 0.6);    // polimento
  assert.strictEqual(w[11].fator, 0.5);   // recuperação depois do A
  assert.strictEqual(w[9].pse, C.FASE_PLANO.precompetitivo.pse); // intensidade igual à do pré
  assert.ok(w[10].eventos.length === 1 && /Estadual/.test(w[10].eventos[0].nome));
  assert.ok(/competição A/.test(w[10].intencao));
});

t('várias competições: cada A reinicia a contagem e a B só reduz a própria semana', () => {
  const p = perioComp([
    { nome: 'A1', data: C.addDias('2026-10-05', 7 * 5 + 5), prioridade: 'A' },
    { nome: 'B1', data: C.addDias('2026-10-05', 7 * 8 + 5), prioridade: 'B' },
    { nome: 'A2', data: C.addDias('2026-10-05', 7 * 13 + 5), prioridade: 'A' },
  ]);
  const w = C.planoIdeal(p).semanas;
  assert.strictEqual(w[5].fase, 'competitivo');
  assert.strictEqual(w[6].fase, 'recuperacao');
  assert.strictEqual(w[12].fase, 'polimento');
  assert.strictEqual(w[13].fase, 'competitivo');
  // B na semana 8 fica dentro do desenvolvimento rumo ao A2 e reduz só aquela semana (×0,85) e a seguinte (×0,9)
  assert.strictEqual(w[8].fase, 'desenvolvimento');
  assert.strictEqual(w[8].mod, 0.85);
  assert.strictEqual(w[9].mod, 0.9);
  assert.strictEqual(w[10].mod, 1);
});

t('sem A a B vira o alvo; sem nenhuma, mantém desenvolvimento; cancelada não conta', () => {
  const soB = perioComp([{ nome: 'B1', data: C.addDias('2026-10-05', 7 * 4 + 5), prioridade: 'B' }]);
  assert.strictEqual(C.planoIdeal(soB).semanas[3].fase, 'polimento');
  const nenhuma = perioComp([]);
  assert.ok(C.planoIdeal(nenhuma).semAlvo);
  const cancelada = perioComp([{ nome: 'X', data: C.addDias('2026-10-05', 7 * 4 + 5), prioridade: 'A', situacao: 'cancelada' }]);
  assert.ok(C.planoIdeal(cancelada).semAlvo);
});

t('data da competição mudou: desalinhamento aponta só semanas futuras', () => {
  const hoje = '2026-10-08'; // semana 0; corte = semana 1
  const comp = (sem) => ({ nome: 'Alvo', data: C.addDias('2026-10-05', 7 * sem + 5), prioridade: 'A' });
  const p = perioComp([comp(10)]);
  const prop = C.propostaMesos(p, hoje);
  // monta mesos reais a partir da proposta e confirma que ficam alinhados
  p.mesociclos = prop.novos.map((n, i) => ({ id: 'm' + i, nome: n.fase, fase: n.fase, inicio: n.inicio, semanas: n.semanas, perfil: C.FASE_PLANO[n.fase].perfil }));
  assert.deepStrictEqual(C.desalinhamento(p, hoje), []);
  // a competição andou 3 semanas para frente
  p.competicoes[0].data = C.addDias('2026-10-05', 7 * 13 + 5);
  const d = C.desalinhamento(p, hoje);
  assert.ok(d.length > 0 && d.every((x) => x.seg >= '2026-10-12'));
});

t('proposta de mesociclos: mantém o que passou, encurta o atual e limita a 6 semanas', () => {
  const hoje = '2026-10-21'; // semana 2
  const p = perioComp([{ nome: 'Alvo', data: C.addDias('2026-10-05', 7 * 20 + 5), prioridade: 'A' }], {
    mesociclos: [
      { id: 'm0', nome: 'Antigo', fase: 'base', inicio: '2026-10-05', semanas: 5, perfil: '3:1' },
      { id: 'm1', nome: 'Futuro', fase: 'desenvolvimento', inicio: '2026-11-09', semanas: 4, perfil: '3:1' },
    ],
  });
  const prop = C.propostaMesos(p, hoje);
  assert.strictEqual(prop.corte, '2026-10-26');
  assert.strictEqual(prop.mantidos.length, 1);
  assert.deepStrictEqual([prop.mantidos[0].semanas, prop.mantidos[0].encurtado], [3, true]);
  assert.strictEqual(prop.descartados.length, 1);
  assert.ok(prop.novos.every((n) => n.semanas <= 6 && n.semanas >= 1));
  assert.strictEqual(C.soma(prop.novos.map((n) => n.semanas)), 20 - 3 + 1); // semanas 3 a 20 (o período termina na semana da competição)
  assert.strictEqual(prop.novos[0].inicio, '2026-10-26');
  assert.deepStrictEqual(C.partirFase(8), [4, 4]);
  assert.deepStrictEqual(C.partirFase(13), [5, 4, 4]);
});

t('avisos: dois A muito próximos e competição fora do período', () => {
  const p = perioComp([
    { nome: 'A1', data: '2026-11-07', prioridade: 'A' },
    { nome: 'A2', data: '2026-12-05', prioridade: 'A' },
    { nome: 'Fora', data: '2028-01-01', prioridade: 'C' },
  ]);
  const av = C.validarMesos(p);
  assert.ok(av.some((x) => /A1.*A2.*4 semanas/.test(x)));
  assert.ok(av.some((x) => /Fora/.test(x)));
});

t('calendário de carga usa os mesociclos reais e aplica o modificador da competição', () => {
  const p = perioComp([{ nome: 'B1', data: '2026-10-10', prioridade: 'B' }], {
    mesociclos: [{ id: 'm', nome: 'Desenv.', fase: 'desenvolvimento', inicio: '2026-10-05', semanas: 4, perfil: '3:1' }],
  });
  const cal = C.calendarioCarga(p);
  assert.strictEqual(cal[0].fatorPerfil, 0.8);
  assert.strictEqual(cal[0].fator, 0.68);   // 0,8 × 0,85 (semana da B)
  assert.strictEqual(cal[1].fator, 0.81);   // 0,9 × 0,9 (depois da B)
  assert.strictEqual(cal[2].fator, 1);
  assert.strictEqual(cal[0].pse, 6);
  const plan = C.planejadoReal(p.mesociclos[0], [], [], '2026-10-08', C.modsCompeticao(p));
  p.mesociclos[0].cargaRef = 1000;
  assert.strictEqual(C.planejadoReal(p.mesociclos[0], [], [], '2026-10-08', C.modsCompeticao(p))[0].planejado, 680);
  assert.ok(plan.length === 4);
});

t('começo do período: bloco de uma semana é absorvido e semana sem mesociclo não gera aviso', () => {
  const p = perioComp([{ nome: 'Alvo', data: C.addDias('2026-10-05', 7 * 8 + 5), prioridade: 'A' }]);
  const fases = C.planoIdeal(p).semanas.map((w) => w.fase);
  assert.deepStrictEqual(fases.slice(0, 3), ['desenvolvimento', 'desenvolvimento', 'desenvolvimento']);
  assert.strictEqual(fases[8], 'competitivo');
  const prop = C.propostaMesos(p, '2026-10-04');
  assert.ok(prop.novos[0].semanas >= 2, 'primeiro mesociclo com 2 semanas ou mais');
  // técnico excluiu os mesociclos finais de propósito: não aparece aviso
  p.mesociclos = prop.novos.slice(0, 2).map((n, i) => ({ id: 'm' + i, nome: n.fase, fase: n.fase, inicio: n.inicio, semanas: n.semanas, perfil: C.FASE_PLANO[n.fase].perfil }));
  assert.deepStrictEqual(C.desalinhamento(p, '2026-10-04'), []);
});

/* ---------- Atletas ---------- */

t('função com o gênero pelo sexo e naipe da dupla', () => {
  assert.strictEqual(C.rotuloFuncao({ acao: 'bloqueio', sexo: 'F' }), 'Bloqueadora');
  assert.strictEqual(C.rotuloFuncao({ acao: 'bloqueio', sexo: 'M' }), 'Bloqueador');
  assert.strictEqual(C.rotuloFuncao({ acao: 'defesa', sexo: 'F' }), 'Defensora');
  assert.strictEqual(C.rotuloFuncao({ acao: 'bloqueio', sexo: '' }), 'Bloqueio');
  assert.strictEqual(C.rotuloFuncao({ acao: 'ambos', sexo: 'F' }), 'Bloqueio e defesa');
  assert.strictEqual(C.rotuloFuncao({ acao: '', sexo: 'F' }), null);
  assert.strictEqual(C.naipe({ sexo: 'F' }), 'Feminino');
  assert.strictEqual(C.naipeDupla({ sexo: 'F' }, { sexo: 'M' }), 'Mista');
  assert.strictEqual(C.naipeDupla({ sexo: 'M' }, { sexo: 'M' }), 'Masculina');
  assert.strictEqual(C.naipeDupla({ sexo: 'M' }, {}), null);
});

t('lista colada: nome, sexo, ação, nascimento e telefone em qualquer ordem', () => {
  const r = C.lerListaAtletas(`Beatriz Begondim, feminino, bloqueio
2. João Pedro; M; defesa; 12/03/2008; (83) 99999-1234
Camila Souza feminino ambos
Lucas
Marina, masculino e feminino
Ana, xyz`);
  assert.deepStrictEqual([r[0].nome, r[0].sexo, r[0].acao], ['Beatriz Begondim', 'F', 'bloqueio']);
  assert.deepStrictEqual([r[1].nome, r[1].sexo, r[1].acao, r[1].nascimento, r[1].contato], ['João Pedro', 'M', 'defesa', '2008-03-12', '(83) 99999-1234']);
  assert.deepStrictEqual([r[2].nome, r[2].sexo, r[2].acao], ['Camila Souza', 'F', 'ambos']);
  assert.deepStrictEqual([r[3].nome, r[3].sexo, r[3].acao], ['Lucas', '', '']);
  assert.ok(r[4].sexo === '' && r[4].avisos.some((a) => /ambíguo/.test(a)));
  assert.ok(r[5].avisos.some((a) => /xyz/.test(a)));
});

t('lista colada: sexo padrão, duplicados e linhas vazias', () => {
  const r = C.lerListaAtletas('Bia\n\n  \nbia\nCarol', [{ nome: 'CAROL' }], { sexo: 'F' });
  assert.deepStrictEqual(r.map((x) => [x.nome, x.sexo, x.status]), [['Bia', 'F', 'novo'], ['bia', 'F', 'repetido'], ['Carol', 'F', 'existente']]);
});

t('cadastro: o que falta e idade', () => {
  assert.deepStrictEqual(C.faltaNoCadastro({ sexo: 'F', acao: 'defesa', nascimento: '2000-01-01', contato: '8399', consentimento: '2026-10-08' }), []);
  assert.deepStrictEqual(C.faltaNoCadastro({ sexo: 'F' }), ['ação em quadra', 'nascimento', 'contato', 'autorização de uso dos dados']);
  assert.strictEqual(C.idade('2008-10-09', '2026-10-08'), 17);
  assert.strictEqual(C.idade('2008-10-08', '2026-10-08'), 18);
  assert.strictEqual(C.idade('', '2026-10-08'), null);
});

/* ---------- Cadastro pelo atleta ---------- */

const F = require('../js/ficha-dados.js');

t('link individual e geral: ida e volta com acentos', () => {
  const link = F.criarLink('https://x.com/app/index.html', { id: 'abc', nome: 'João Conceição', sexo: 'M', acao: 'defesa', contato: 'nao vai' });
  assert.ok(link.startsWith('https://x.com/app/index.html#/ficha?d='));
  const d = link.split('d=')[1];
  assert.ok(!/[+/=]/.test(d), 'seguro para URL');
  const r = F.lerLink(d, '2026-10-08');
  assert.deepStrictEqual([r.id, r.nome, r.sexo, r.acao, r.contato], ['abc', 'João Conceição', 'M', 'defesa', '']);
  const geral = F.lerLink(F.criarLink('https://x.com/', null).split('d=')[1], '2026-10-08');
  assert.deepStrictEqual([geral.id, geral.nome], [null, '']);
  assert.strictEqual(F.lerLink('lixo!!', '2026-10-08').nome, '');
});

t('resposta do atleta: vários códigos no mesmo texto, sem repetir, e só os campos permitidos', () => {
  const hoje = '2026-10-08';
  const c1 = F.criarResposta({ id: 'a1', nome: 'Bia', sexo: 'F', acao: 'bloqueio', lado: 'esquerdo', nascimento: '2009-05-17', contato: '(83) 99999-0000', consentimento: hoje, extra: 'ignorado' }, hoje);
  const c2 = F.criarResposta({ nome: 'Carol', sexo: 'X', acao: 'goleira', nascimento: '2999-01-01', contato: 'abc 123' }, hoje);
  const msg = `Oi prof! segue meu código:\n${c1}\n\ne o da Carol ${c2} ${c1}`;
  const rs = F.lerRespostas(msg, hoje);
  assert.strictEqual(rs.length, 2);
  assert.deepStrictEqual([rs[0].id, rs[0].nome, rs[0].sexo, rs[0].acao, rs[0].lado, rs[0].nascimento, rs[0].consentimento], ['a1', 'Bia', 'F', 'bloqueio', 'esquerdo', '2009-05-17', hoje]);
  assert.strictEqual('extra' in rs[0], false);
  assert.deepStrictEqual([rs[1].sexo, rs[1].acao, rs[1].nascimento, rs[1].contato], ['', '', '', '123']);
  assert.strictEqual(F.lerRespostas('AC1:bobagem AC1:eyJ2IjoyfQ', hoje).length, 0);
});

t('aplicar resposta não apaga o que o atleta deixou em branco', () => {
  const a = { id: 'a1', nome: 'Bia', sexo: 'F', acao: 'bloqueio', contato: '8399', nascimento: '' };
  F.aplicarResposta(a, { nome: 'Beatriz', sexo: '', acao: 'ambos', contato: '', nascimento: '2009-05-17' });
  assert.deepStrictEqual([a.nome, a.sexo, a.acao, a.contato, a.nascimento], ['Beatriz', 'F', 'ambos', '8399', '2009-05-17']);
});

/* ---------- Equipe, dias de treino e sessões previstas ---------- */

const eq = (dias, comps = [], extra = {}) => ({
  id: 'p', inicio: '2026-10-05', fim: '2027-01-31', diasTreino: dias, duracaoPadrao: 90, categorias: [],
  mesociclos: [{ id: 'm', nome: 'Desenv.', fase: 'desenvolvimento', inicio: '2026-10-05', semanas: 6, perfil: '3:1', topicos: [
    { id: 't1', fundamento: 'ataque', tipos: ['Diagonal'], prioridade: 'alta' }, { id: 't2', fundamento: 'saque', tipos: ['Viagem'], prioridade: 'alta' }, { id: 't3', fundamento: 'bloqueio', tipos: [], prioridade: 'media' },
  ] }],
  competicoes: comps.map((c, i) => ({ id: 'c' + i, ...c })), ...extra,
});
const sem = (p, i) => C.sessoesDaSemana(p, C.calendarioCarga(p)[i]);

t('categoria pelo ano de nascimento e atletas da equipe', () => {
  assert.strictEqual(C.categoriaDe('2013-05-01', 2026), 'Sub-13');
  assert.strictEqual(C.categoriaDe('2011-05-01', 2026), 'Sub-15');
  assert.strictEqual(C.categoriaDe('2009-12-31', 2026), 'Sub-17');
  assert.strictEqual(C.categoriaDe('2008-01-01', 2026), 'Sub-19');
  assert.strictEqual(C.categoriaDe('2005-01-01', 2026), 'Sub-21');
  assert.strictEqual(C.categoriaDe('1999-01-01', 2026), 'Adulto');
  assert.strictEqual(C.categoriaDe('', 2026), null);
  const atl = [{ id: 'a', nascimento: '2009-01-01' }, { id: 'b', nascimento: '2000-01-01' }, { id: 'c', nascimento: '' }];
  assert.deepStrictEqual(C.daEquipe({ categorias: ['Sub-17'] }, atl, 2026).map((x) => x.id), ['a', 'c']);
  assert.strictEqual(C.daEquipe({ categorias: [] }, atl, 2026).length, 3);
});

t('dias de treino: segunda, terça e quinta ou segunda, quarta e sexta, e a intensidade de cada um', () => {
  const a = sem(eq([1, 2, 4]), 0);
  assert.deepStrictEqual(a.map((s) => s.data), ['2026-10-05', '2026-10-06', '2026-10-08']);
  assert.deepStrictEqual(a.map((s) => s.intensidade), ['alta', 'media', 'leve']);
  const b = sem(eq([5, 1, 3]), 0);   // fora de ordem: a semana começa na segunda
  assert.deepStrictEqual(b.map((s) => s.data), ['2026-10-05', '2026-10-07', '2026-10-09']);
  assert.deepStrictEqual(sem(eq([1, 3]), 0).map((s) => s.intensidade), ['alta', 'media']);
  assert.deepStrictEqual(sem(eq([1, 2, 4, 5]), 0).map((s) => s.intensidade), ['alta', 'media', 'alta', 'leve']);
  assert.deepStrictEqual(sem(eq([1, 2, 3, 4, 5]), 0).map((s) => s.intensidade), ['alta', 'media', 'alta', 'media', 'leve']);
  assert.deepStrictEqual(sem(eq([]), 0), []);
  assert.deepStrictEqual(C.papeisDe(7).length, 7);
});

t('sessões: PSE alvo pela intensidade, duração pelo volume e fundamentos da ênfase', () => {
  const p = eq([1, 3, 5]);
  const s0 = sem(p, 0);   // semana 1 do 3:1, fator 0,8
  assert.deepStrictEqual(s0.map((s) => s.pse), [7, 6, 4]);          // fase 6; alta +1; leve −2
  assert.deepStrictEqual(s0.map((s) => s.duracao), [70, 70, 60]);   // 90 × 0,8 = 72; leve ×0,85
  assert.ok(s0[0].fundamentos.length >= 1 && s0[0].fundamentos[0].fundamento === 'ataque');
  const s2 = sem(p, 2);   // fator 1
  assert.strictEqual(s2[0].duracao, 90);
  const s3 = sem(p, 3);   // descarga 0,6: volume cai, mesma frequência
  assert.strictEqual(s3.length, 3);
  assert.ok(s3.every((s, i) => s.duracao < s2[i].duracao));
  assert.strictEqual(s3[0].pse, 7);
  const tipos4 = sem(eq([1, 2, 4, 5]), 0).map((s) => s.tipo);
  assert.strictEqual(tipos4[1], 'fisico');   // com 4 dias ou mais, um deles é físico no desenvolvimento
});

t('competição: véspera e dia seguinte ficam leves; o dia dela vira competição', () => {
  const p = eq([1, 3, 5], [{ nome: 'Etapa', data: '2026-10-10', prioridade: 'A' }]);   // sábado da semana 0
  const s = sem(p, 0);
  assert.strictEqual(s[2].papel, 'leve');            // sexta, véspera
  assert.ok(/Véspera/.test(s[2].motivo));
  const p2 = eq([1, 3, 5], [{ nome: 'Etapa', data: '2026-10-12', prioridade: 'B' }]);   // segunda da semana 1
  const s1 = sem(p2, 1);
  assert.strictEqual(s1[0].tipo, 'competicao');
  assert.strictEqual(s1[0].titulo, 'Etapa');
  const p3 = eq([1, 3, 5], [{ nome: 'Treino-torneio', data: '2026-10-09', prioridade: 'C' }]);
  assert.strictEqual(sem(p3, 0)[2].tipo, 'competicao');   // C ocupa o dia mas não faz as vizinhas ficarem leves
  assert.notStrictEqual(sem(p3, 0)[1].papel, 'leve');
});

t('recuperação tem só treinos leves e a carga planejada vem das sessões', () => {
  const p = eq([1, 3, 5], [{ nome: 'Alvo', data: '2026-10-10', prioridade: 'A' }], { mesociclos: [
    { id: 'm1', nome: 'Comp', fase: 'competitivo', inicio: '2026-10-05', semanas: 1, perfil: 'plana', topicos: [] },
    { id: 'm2', nome: 'Rec', fase: 'recuperacao', inicio: '2026-10-12', semanas: 1, perfil: 'plana', topicos: [] },
  ] });
  const rec = sem(p, 1);
  assert.ok(rec.every((s) => s.intensidade === 'leve' && s.tipo === 'recuperacao'));
  const plano = C.planoDeSessoes(p);
  assert.strictEqual(plano['2026-10-12'].carga, C.cargaDasSessoes(rec));
  assert.ok(plano['2026-10-12'].carga > 0);
  assert.strictEqual(C.sessoesDaData(p, '2026-10-12').length, 1);
  const meso = p.mesociclos[0];
  const r = C.planejadoReal(meso, [], [], '2026-10-08', {}, { '2026-10-05': 1234 });
  assert.strictEqual(r[0].planejado, 1234);
});

t('estrutura inicial: pelas competições ou, sem alvo, nas proporções', () => {
  const comAlvo = { inicio: '2026-10-05', fim: '2027-01-24', competicoes: [{ nome: 'Alvo', data: '2027-01-23', prioridade: 'A' }], mesociclos: [] };
  const e1 = C.estruturaInicial(comAlvo);
  assert.strictEqual(e1[0].inicio, '2026-10-05');
  assert.ok(e1.some((x) => x.fase === 'polimento') && e1.at(-1).fase === 'competitivo');
  const semAlvo = { inicio: '2026-10-05', fim: '2027-01-24', competicoes: [{ nome: 'C1', data: '2026-11-01', prioridade: 'C' }], mesociclos: [] };
  const e2 = C.estruturaInicial(semAlvo);
  assert.deepStrictEqual(e2.map((x) => x.fase), ['base', 'desenvolvimento', 'precompetitivo', 'competitivo']);
  assert.strictEqual(e2[1].inicio, C.addDias('2026-10-05', 7 * e2[0].semanas));
});

console.log(`\n${n} testes passaram`);
