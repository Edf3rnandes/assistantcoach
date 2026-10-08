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

console.log(`\n${n} testes passaram`);
