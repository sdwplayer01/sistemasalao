// ═══════════════════════════════════════════════════════
// pages/dashboard.js
// ═══════════════════════════════════════════════════════
import { Config, Diario, Servicos, Custos, Receitas, MESES } from '../storage.js';
import { R$, pct, num, mesKey } from '../utils.js';

export function renderDashboard(container) {
  const cfg  = Config.get();
  const ano  = cfg.ano;
  const agora = new Date();
  const mesAtual = agora.getMonth();

  // Calcular resumos anuais
  let totalAtend = 0, totalCustoProd = 0, totalCustoTotal = 0;
  const fatMeses = [];

  for (let m = 0; m < 12; m++) {
    const res = Diario.resumoMes(ano, m);
    totalAtend      += res.atendimentos;
    totalCustoProd  += res.custoProduto;
    totalCustoTotal += res.custoTotal;
    fatMeses.push({ mes: MESES[m].slice(0,3), custo: res.custoTotal, atend: res.atendimentos });
  }

  const custoFixoMedio = Custos.mediaMeses();
  const custoFixoReal  = Receitas.mediaCustoFixoReal();

  // Serviços cadastrados
  const svcs = Servicos.getAll();
  const ticketMedio = totalAtend > 0 ? (totalCustoTotal / totalAtend) : 0;

  // Serviço mais cadastrado por preço ideal
  const cfg2 = cfg;
  const custoFixoPorCliente = cfg2.atendMedios > 0 ? custoFixoReal / cfg2.atendMedios : 0;
  let svcDestaque = null;
  if (svcs.length) {
    const com = svcs.map(s => ({ ...s, ...Servicos.calcPrecos(s, cfg, custoFixoPorCliente) }));
    svcDestaque = com.sort((a,b) => b.precoIdeal - a.precoIdeal)[0];
  }

  // Resumo do mês atual
  const resMes = Diario.resumoMes(ano, mesAtual);

  container.innerHTML = `
    <div class="section-title">Dashboard</div>
    <div class="section-sub">Ano ${ano} · ${MESES[mesAtual]} em foco</div>

    <!-- KPIs anuais -->
    <div class="kpi-grid">
      <div class="kpi-card plum">
        <div class="kpi-label">Atendimentos no Ano</div>
        <div class="kpi-value">${num(totalAtend)}</div>
        <div class="kpi-sub">${num(resMes.atendimentos)} este mês</div>
      </div>
      <div class="kpi-card green">
        <div class="kpi-label">Custo Total Acumulado</div>
        <div class="kpi-value">${R$(totalCustoTotal)}</div>
        <div class="kpi-sub">Custo de produto + tempo + fixo</div>
      </div>
      <div class="kpi-card rose">
        <div class="kpi-label">Ticket Médio</div>
        <div class="kpi-value">${R$(ticketMedio)}</div>
        <div class="kpi-sub">Por atendimento</div>
      </div>
      <div class="kpi-card warn">
        <div class="kpi-label">Custo Fixo Real Médio / Mês</div>
        <div class="kpi-value">${R$(custoFixoReal)}</div>
        <div class="kpi-sub">Após receitas internas</div>
      </div>
      <div class="kpi-card blue">
        <div class="kpi-label">Custo Fixo / Cliente</div>
        <div class="kpi-value">${R$(custoFixoPorCliente)}</div>
        <div class="kpi-sub">Base: ${num(cfg2.atendMedios)} atend/mês</div>
      </div>
      <div class="kpi-card plum">
        <div class="kpi-label">Serviços Cadastrados</div>
        <div class="kpi-value">${num(svcs.length)}</div>
        <div class="kpi-sub">Na tabela de serviços</div>
      </div>
    </div>

    <!-- Gráfico de atendimentos por mês -->
    <div class="card mb-16">
      <div class="card-header">
        <span class="card-title">Atendimentos por Mês — ${ano}</span>
      </div>
      <div class="card-body">
        <div class="chart-placeholder" id="chartAtend"></div>
      </div>
    </div>

    <!-- Destaques -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
      <div class="card">
        <div class="card-header"><span class="card-title">✦ Serviço em Destaque</span></div>
        <div class="card-body">
          ${svcDestaque ? `
            <div class="fw-600 font-serif" style="font-size:18px;color:var(--noir)">${svcDestaque.nome}</div>
            <div class="text-muted mt-4">${svcDestaque.categoria || '—'}</div>
            <div class="preco-grid mt-16">
              <div class="preco-box preco-min">
                <div class="preco-label">Mínimo</div>
                <div class="preco-val">${R$(svcDestaque.precoMin)}</div>
              </div>
              <div class="preco-box preco-ideal">
                <div class="preco-label">Ideal</div>
                <div class="preco-val">${R$(svcDestaque.precoIdeal)}</div>
              </div>
              <div class="preco-box preco-prem">
                <div class="preco-label">Premium</div>
                <div class="preco-val">${R$(svcDestaque.precoPrem)}</div>
              </div>
            </div>
          ` : '<p class="text-muted">Nenhum serviço cadastrado ainda.</p>'}
        </div>
      </div>

      <div class="card">
        <div class="card-header"><span class="card-title">📅 Resumo — ${MESES[mesAtual]}</span></div>
        <div class="card-body">
          <table style="width:100%;font-size:13px">
            <tr><td class="text-muted">Atendimentos</td><td class="text-right fw-600">${num(resMes.atendimentos)}</td></tr>
            <tr><td class="text-muted">Custo de produto</td><td class="text-right">${R$(resMes.custoProduto)}</td></tr>
            <tr><td class="text-muted">Custo total serviços</td><td class="text-right">${R$(resMes.custoTotal)}</td></tr>
            <tr><td class="text-muted">Tempo trabalhado</td><td class="text-right">${Math.round(resMes.tempoMin/60)}h ${resMes.tempoMin%60}min</td></tr>
          </table>
        </div>
      </div>
    </div>
  `;

  // Renderizar gráfico
  const maxAtend = Math.max(...fatMeses.map(m => m.atend), 1);
  const chartEl  = document.getElementById('chartAtend');
  if (chartEl) {
    chartEl.innerHTML = fatMeses.map(m => `
      <div class="chart-bar-wrap">
        <div class="chart-val">${m.atend || ''}</div>
        <div class="chart-bar" style="height:${Math.round((m.atend/maxAtend)*160)}px"></div>
        <div class="chart-label">${m.mes}</div>
      </div>
    `).join('');
  }
}
