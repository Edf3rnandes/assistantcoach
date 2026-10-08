global.window = { Farol: {} };
require('../js/motor.js');
const M = window.Farol.motor;
const ms = (iso) => { const [y,m,d] = iso.split('-').map(Number); return Date.UTC(y, m-1, d); };
const fmt = (t) => new Date(t).toISOString().slice(5,10).split('-').reverse().join('/');
let falhas = 0;
const ok = (c, msg) => { if (!c) { falhas++; console.log('FALHOU:', msg); } else console.log('ok  ', msg); };

// Exemplo do documento: hoje 04/10/2026
const ev = (id, nome, ini, fim, p, st='confirmed', nivel='Estadual') => ({ id, nome, inicio: ms(ini), fim: ms(fim||ini), prioridade: p, status: st, nivel });
const eventos = [ev('c','C 25/10','2026-10-25',null,'C'), ev('b','B 15/11','2026-11-15',null,'B'), ev('a','A 12/12','2026-12-12',null,'A')];
let r = M.gerar({ hoje: ms('2026-10-04'), inicio: ms('2026-10-05'), eventos, baseline: 1000 });
console.log(r.semanas.map((s,i)=>`${i+1} ${fmt(s.inicio)} ${s.bloco} ${s.tipoSemana} ${Math.round(s.fator*100)}% ${s.eventos.map(e=>e.prioridade).join('')}`).join('\n'));
ok(r.semanas.length === 11, 'dez semanas + 1 de transição = 11 ('+r.semanas.length+')');
const blocos = r.semanas.slice(0,10).map(s=>s.bloco[0]).join('');
ok(blocos === 'aaaattttrr', 'distribuição 4/4/2: '+blocos);
ok(r.semanas.slice(0,10).map(s=>Math.round(s.fator*100)).join(',') === '100,110,120,70,100,105,110,70,85,55', 'fatores do exemplo');
ok(r.semanas[2].eventos.some(e=>e.prioridade==='C'), 'C na semana 3, sem ajuste');
ok(r.semanas[5].tipoSemana === 'mini_taper' && r.semanas[5].miniPolimento.dias.length === 3, 'B na semana 6 vira mini_taper com 3 dias');
ok(r.semanas[9].tipoSemana === 'taper', 'semana do A é taper');
ok(r.semanas[10].bloco === 'transicao', 'transição depois do A');

// Novo B em 29/11 (semana de descarga): encaixa sem ajuste
r = M.gerar({ hoje: ms('2026-10-04'), inicio: ms('2026-10-05'), eventos: [...eventos, ev('b2','B 29/11','2026-11-29',null,'B')], baseline: 1000 });
ok(r.semanas[7].tipoSemana === 'deload' && r.semanas[7].eventos.length === 1 && !r.semanas[7].miniPolimento, 'B em descarga só marca ('+r.semanas[7].tipoSemana+')');
ok(r.conflitos.some(c=>c.tipo==='b_perto_do_a') === false, '29/11 está a 13 dias do A: continua B');

// A adiado para 16/01/2027
r = M.gerar({ hoje: ms('2026-10-04'), inicio: ms('2026-10-05'), eventos: [ev('c','C','2026-10-25',null,'C'), ev('b','B','2026-11-15',null,'B'), ev('a','A','2027-01-16',null,'A')], baseline: 1000 });
const W = M.semanasEntre(ms('2026-10-05'), ms('2027-01-16')) + 1;
const d = M.distribuicao(W);
console.log('W', W, d);
ok(r.semanas.filter(s=>s.bloco==='acumulacao').length === d[0], 'acumulação cresce para '+d[0]);

// A cancelado sem outro A
r = M.gerar({ hoje: ms('2026-10-04'), inicio: ms('2026-10-05'), eventos: [ev('c','C','2026-10-25',null,'C'), ev('b','B','2026-11-15',null,'B'), ev('a','A','2026-12-12',null,'A','cancelled')], baseline: 1000 });
ok(r.semanas.every(s=>s.bloco==='manutencao'), 'sem A: manutenção');
ok(r.sugestoes.some(s=>s.tipo==='sem_a' && s.evento==='b'), 'sugere promover o B');

// Tabela e divisão
ok(JSON.stringify(M.dividir(5,4))==='[3,2]' && JSON.stringify(M.dividir(6,4))==='[3,3]' && JSON.stringify(M.dividir(7,4))==='[4,3]', 'divisão 5=3+2, 6=3+3, 7=4+3');
ok(JSON.stringify(M.distribuicao(14))==='[6,4,4]', 'W≥13: W−8, 4, 4');
ok(JSON.stringify(M.distribuicao(1))==='[0,0,1]', 'W=1 só polimento');

// Dois A com menos de 6 semanas
r = M.gerar({ hoje: ms('2026-10-04'), inicio: ms('2026-10-05'), eventos: [ev('a1','A1','2026-11-14',null,'A'), ev('a2','A2','2026-12-12',null,'A')], baseline: 1000 });
ok(r.conflitos.some(c=>c.tipo==='dois_a_proximos'), 'dois A a 4 semanas: conflito');
// B a menos de 7 dias do A vira C
r = M.gerar({ hoje: ms('2026-10-04'), inicio: ms('2026-10-05'), eventos: [ev('b','B','2026-12-06',null,'B'), ev('a','A','2026-12-12',null,'A')], baseline: 1000 });
ok(r.conflitos.some(c=>c.tipo==='b_perto_do_a'), 'B a 6 dias do A vira C');
// Dois B muito próximos
r = M.gerar({ hoje: ms('2026-10-04'), inicio: ms('2026-10-05'), eventos: [ev('b1','B1','2026-11-01',null,'B','confirmed','Estadual'), ev('b2','B2','2026-11-05',null,'B','confirmed','Nacional'), ev('a','A','2026-12-12',null,'A')], baseline: 1000 });
ok(r.conflitos.some(c=>c.tipo==='dois_b_proximos' && c.evento==='b1'), 'dois B a 4 dias: o de menor nível vira C');
// Congelamento: no meio do ciclo, regenerar não mexe no passado
const base = M.gerar({ hoje: ms('2026-10-04'), inicio: ms('2026-10-05'), eventos, baseline: 1000 });
const hojeMeio = ms('2026-11-04'); // quarta da semana 5
const reg = M.gerar({ hoje: hojeMeio, inicio: ms('2026-10-05'), eventos: [...eventos.slice(0,2), ev('a','A','2027-01-16',null,'A')], baseline: 1000, congelado: base.semanas });
const congel = base.semanas.filter(s=>s.inicio <= M.domingoDe(hojeMeio));
ok(congel.every((s,i)=>JSON.stringify(s)===JSON.stringify(reg.semanas[i])), 'semanas passadas e a corrente não mudam');
const dif = M.diferenca(base.semanas, reg.semanas, hojeMeio);
ok(dif.length > 0 && dif.every(x=>x.inicio > M.domingoDe(hojeMeio)), 'diferença só no futuro ('+dif.length+' semanas)');

// Sessões: ondulatória e dia principal
const sem = r.semanas; // não usado
const semana = base.semanas[3];
const ses = M.sessoesDaSemana({ ...semana, alvoUA: 2000 }, 4, {});
console.log(ses.map(s=>`${s.dia}:${s.diaTipo}:${s.dur}x${s.pse}`).join(' '));
const soma = ses.reduce((a,s)=>a+s.dur*s.pse,0);
ok(Math.abs(soma-2000)/2000 < 0.1, 'carga das sessões perto da meta ('+soma+')');
ok(ses.filter(s=>s.diaTipo==='heavy').length===1, 'um dia heavy');
const pr = ses.find(s=>s.principal); ok(pr && pr.dur*pr.pse/soma > 0.33 && pr.dur*pr.pse/soma < 0.47, 'dia principal ~40% ('+(pr.dur*pr.pse/soma).toFixed(2)+')');
console.log(falhas ? falhas+' FALHAS' : 'TUDO OK');
