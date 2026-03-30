// ═══════════════════════════════════════════════════════
// pages/controle.js
// ═══════════════════════════════════════════════════════
import { Diario, Custos, Receitas, Config, MESES } from '../storage.js';
import { R$, pct, num, mesKey } from '../utils.js';

export function renderControle(container) {
  const cfg = Config.get();
  const ano = cfg.ano;

  // Calcular dados por mês
  const dados = MESES.map((mes, i) => {
    const key    = mesKey(ano, i);
    const res    = Diario.resumoMes(ano, i);
    const cfBruto= Custos.totalMes(key);
    const cfReal = Receitas.custoFixoRealMes(key);
    const cfAlocado = res.atendimentos > 0
      ? Math.min(cfReal, cfReal) // total real alocado
      : 0;
    const custoTotal = res.custoProduto + cfAlocado;
    return {
      mes, i,
      atend:     res.atendimentos,
      custoProd: res.custoProduto,
      cfBruto,
      cfReal,
      cfAlocado,
      custoTotal,
      ticket:    res.atendimentos > 0 ? custoTotal / res.atendimentos : 0,
      tempoH:    res.tempoMin / 60,
    };
  });

  const totais = {
    atend:     dados.reduce((s,d) => s+d.atend, 0),
    custoProd: dados.reduce((s,d) => s+d.custoProd, 0),
    cfBruto:   dados.reduce((s,d) => s+d.cfBruto, 0),
    cfReal:    dados.reduce((s,d) => s+d.cfReal, 0),
    cfAlocado: dados.reduce((s,d) => s+d.cfAlocado, 0),
    custoTotal:dados.reduce((s,d) => s+d.custoTotal, 0),
    tempoH:    dados.reduce((s,d) => s+d.tempoH, 0),
  };
  totais.ticket = totais.atend > 0 ? totais.custoTotal / totais.atend : 0;

  const mesAtual = new Date().getMonth();

  container.innerHTML = `
    <div class="section-title">Controle Anual ${ano}</div>
    <div class="section-sub">Visão consolidada mês a mês. Dados vindos do Diário, Custos e Receitas.</div>

    <div class="table-wrap controle-table">
      <table>
        <thead>
          <tr>
            <th>Indicador</th>
            ${MESES.map((m,i) => `<th class="td-center ${i===mesAtual?'':''}"> ${m.slice(0,3)}</th>`).join('')}
            <th class="td-center" style="background:var(--plum-mid)">TOTAL / ANO</th>
          </tr>
        </thead>
        <tbody>
          ${linhaControle('👤 Atendimentos', dados.map(d => num(d.atend) || '—'), num(totais.atend), false)}
          ${linhaControle('📦 Custo de Produto', dados.map(d => d.custoProd ? R$(d.custoProd) : '—'), R$(totais.custoProd), false)}
          ${linhaControle('🏠 Custo Fixo Bruto', dados.map(d => d.cfBruto ? R$(d.cfBruto) : '—'), R$(totais.cfBruto), false)}
          ${linhaControle('✅ Custo Fixo Real', dados.map(d => d.cfReal ? R$(d.cfReal) : '—'), R$(totais.cfReal), false)}
          ${linhaControle('🏷 Custo Total', dados.map(d => d.custoTotal ? R$(d.custoTotal) : '—'), R$(totais.custoTotal), true)}
          ${linhaControle('🎫 Ticket Médio', dados.map(d => d.ticket ? R$(d.ticket) : '—'), R$(totais.ticket), false)}
          ${linhaControle('⏱ Horas Trabalhadas', dados.map(d => d.tempoH ? d.tempoH.toFixed(1)+'h' : '—'), totais.tempoH.toFixed(1)+'h', false)}
        </tbody>
      </table>
    </div>

    <!-- Gráfico de custo fixo real por mês -->
    <div class="card mt-24">
      <div class="card-header"><span class="card-title">Custo Fixo Real Mensal</span></div>
      <div class="card-body">
        <div class="chart-placeholder" id="chartCF"></div>
      </div>
    </div>
  `;

  // Gráfico
  const maxCF = Math.max(...dados.map(d => d.cfReal), 1);
  const chartEl = document.getElementById('chartCF');
  if (chartEl) {
    chartEl.innerHTML = dados.map(d => `
      <div class="chart-bar-wrap">
        <div class="chart-val">${d.cfReal ? R$(d.cfReal).replace('R$\xa0','') : ''}</div>
        <div class="chart-bar rose" style="height:${Math.round((d.cfReal/maxCF)*160)}px"></div>
        <div class="chart-label">${d.mes.slice(0,3)}</div>
      </div>
    `).join('');
  }
}

function linhaControle(label, vals, total, isTotal) {
  return `<tr ${isTotal ? 'class="row-total"' : ''}>
    <td class="fw-600" style="white-space:nowrap">${label}</td>
    ${vals.map(v => `<td class="td-center td-mono" style="font-size:12px">${v}</td>`).join('')}
    <td class="td-center td-mono fw-600" style="background:var(--mauve);color:var(--noir)">${total}</td>
  </tr>`;
}
