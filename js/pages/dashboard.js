// ═══════════════════════════════════════════════════════
// pages/dashboard.js
// ═══════════════════════════════════════════════════════
import { Config, Diario, Servicos, Custos, Receitas, MESES } from '../storage.js';
import { R$, pct, num, mesKey } from '../utils.js';

export function renderDashboard(container) {
  const cfg     = Config.get();
  const ano     = cfg.ano;
  const mesAtual = new Date().getMonth();

  // Totais anuais
  let totalAtend = 0, totalCusto = 0, totalFat = 0, totalLucro = 0;
  const fatMeses = [];

  for (let m = 0; m < 12; m++) {
    const res = Diario.resumoMes(ano, m);
    totalAtend += res.atendimentos;
    totalCusto += res.custoTotal;
    totalFat   += res.faturamento;
    totalLucro += res.lucro;
    fatMeses.push({ mes: MESES[m].slice(0,3), fat: res.faturamento, lucro: res.lucro, atend: res.atendimentos });
  }

  const margemAnual      = totalFat > 0 ? totalLucro / totalFat : 0;
  const ticketMedio      = totalAtend > 0 ? totalFat / totalAtend : 0;
  const custoFixoMedio   = Custos.mediaMeses();
  const custoFixoReal    = Receitas.mediaCustoFixoReal();
  const cfPorCliente     = Servicos.custoFixoPorClienteCalc(cfg);

  // Serviço destaque
  const svcs = Servicos.getAll();
  let svcDestaque = null;
  if (svcs.length) {
    const com = svcs.map(s => ({ ...s, ...Servicos.calcPrecos(s, cfg, cfPorCliente) }));
    svcDestaque = com.sort((a,b) => b.precoIdeal - a.precoIdeal)[0];
  }

  // Resumo mês atual
  const resMes = Diario.resumoMes(ano, mesAtual);

  // Mês de maior faturamento
  const melhorMes = fatMeses.reduce((best, m, i) => m.fat > (fatMeses[best]?.fat||0) ? i : best, 0);

  container.innerHTML = `
    <div class="section-title">Dashboard</div>
    <div class="section-sub">Ano ${ano} · ${MESES[mesAtual]} em foco</div>

    <!-- KPIs financeiros principais -->
    <div class="kpi-grid">
      <div class="kpi-card green">
        <div class="kpi-label">Faturamento Acumulado</div>
        <div class="kpi-value">${R$(totalFat)}</div>
        <div class="kpi-sub">${R$(resMes.faturamento)} este mês</div>
      </div>
      <div class="kpi-card ${totalLucro >= 0 ? 'plum' : 'warn'}">
        <div class="kpi-label">Lucro Acumulado</div>
        <div class="kpi-value">${R$(totalLucro)}</div>
        <div class="kpi-sub">Faturamento − Custos</div>
      </div>
      <div class="kpi-card rose">
        <div class="kpi-label">Margem de Lucro</div>
        <div class="kpi-value">${pct(margemAnual)}</div>
        <div class="kpi-sub">Média anual</div>
      </div>
      <div class="kpi-card blue">
        <div class="kpi-label">Ticket Médio</div>
        <div class="kpi-value">${R$(ticketMedio)}</div>
        <div class="kpi-sub">Por atendimento cobrado</div>
      </div>
      <div class="kpi-card plum">
        <div class="kpi-label">Atendimentos no Ano</div>
        <div class="kpi-value">${num(totalAtend)}</div>
        <div class="kpi-sub">${num(resMes.atendimentos)} este mês</div>
      </div>
      <div class="kpi-card warn">
        <div class="kpi-label">Custo Fixo Real / Mês</div>
        <div class="kpi-value">${R$(custoFixoReal)}</div>
        <div class="kpi-sub">Após receitas internas</div>
      </div>
    </div>

    <!-- Gráfico Faturamento vs Lucro -->
    <div class="card mb-16">
      <div class="card-header">
        <span class="card-title">Faturamento e Lucro por Mês — ${ano}</span>
        <span class="badge badge-plum">${totalFat ? 'Com dados' : 'Aguardando lançamentos'}</span>
      </div>
      <div class="card-body">
        ${totalFat > 0
          ? `<div class="chart-placeholder" id="chartFat"></div>`
          : `<div style="text-align:center;padding:32px;color:var(--txt-muted)">
               <div style="font-size:32px;margin-bottom:8px">📊</div>
               <p>O gráfico aparece conforme você registra atendimentos com preço cobrado no Diário.</p>
             </div>`
        }
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
            <tr><td class="text-muted">Faturamento</td><td class="text-right fw-600" style="color:var(--txt-green)">${R$(resMes.faturamento)}</td></tr>
            <tr><td class="text-muted">Custo total serviços</td><td class="text-right">${R$(resMes.custoTotal)}</td></tr>
            <tr><td class="text-muted">Lucro estimado</td>
              <td class="text-right fw-600" style="color:${resMes.lucro>=0?'var(--txt-green)':'var(--txt-red)'}">
                ${R$(resMes.lucro)}
              </td>
            </tr>
            <tr><td class="text-muted">Margem</td><td class="text-right">${pct(resMes.margem)}</td></tr>
            <tr><td class="text-muted">Horas trabalhadas</td><td class="text-right">${Math.floor(resMes.tempoMin/60)}h ${resMes.tempoMin%60}min</td></tr>
          </table>
        </div>
      </div>
    </div>

    ${totalFat > 0 ? `
    <!-- Destaques operacionais -->
    <div class="card mt-16">
      <div class="card-header"><span class="card-title">🔍 Destaques Operacionais</span></div>
      <div class="card-body">
        <table style="width:100%;font-size:13px">
          <tr>
            <td class="text-muted">Mês de maior faturamento</td>
            <td class="text-right fw-600">${MESES[melhorMes]} — ${R$(fatMeses[melhorMes].fat)}</td>
          </tr>
          <tr>
            <td class="text-muted">Custo Fixo por Cliente</td>
            <td class="text-right">${R$(cfPorCliente)}</td>
          </tr>
          <tr>
            <td class="text-muted">Custo Fixo Bruto Médio / Mês</td>
            <td class="text-right">${R$(custoFixoMedio)}</td>
          </tr>
          <tr>
            <td class="text-muted">Serviços cadastrados</td>
            <td class="text-right">${svcs.length}</td>
          </tr>
        </table>
      </div>
    </div>` : ''}

    <!-- Guia de uso se dados vazios -->
    ${!totalAtend ? `
    <div class="card mt-16" style="border:2px dashed var(--border)">
      <div class="card-body" style="text-align:center;padding:32px">
        <div style="font-size:28px;margin-bottom:12px">📌</div>
        <div class="fw-600 font-serif" style="font-size:16px;margin-bottom:16px">Como começar</div>
        <div style="text-align:left;max-width:400px;margin:0 auto;font-size:13px;color:var(--txt-muted);line-height:1.8">
          1️⃣ <strong>Configurações</strong> → preencha o nome do salão e o ano<br>
          2️⃣ <strong>Custos Fixos</strong> → insira os custos mensais<br>
          3️⃣ <strong>Receitas Internas</strong> → informe repasses e aluguéis<br>
          4️⃣ <strong>Serviços</strong> → cadastre seus serviços e preços<br>
          5️⃣ <strong>Diário</strong> → registre cada atendimento com o valor cobrado<br>
          6️⃣ Dashboard e Controle Anual atualizam automaticamente ✅
        </div>
      </div>
    </div>` : ''}
  `;

  // Gráfico
  if (totalFat > 0) {
    const maxVal = Math.max(...fatMeses.map(m => Math.max(m.fat, 0)), 1);
    const chartEl = document.getElementById('chartFat');
    if (chartEl) {
      chartEl.innerHTML = fatMeses.map(m => `
        <div class="chart-bar-wrap">
          <div class="chart-val" style="font-size:10px">${m.fat ? R$(m.fat).replace('R$\xa0','') : ''}</div>
          <div style="display:flex;gap:2px;align-items:flex-end;height:160px">
            <div class="chart-bar" style="height:${Math.round((m.fat/maxVal)*160)}px;width:14px" title="Fat: ${R$(m.fat)}"></div>
            <div class="chart-bar rose" style="height:${m.lucro>0?Math.round((m.lucro/maxVal)*160):2}px;width:10px;opacity:0.7" title="Lucro: ${R$(m.lucro)}"></div>
          </div>
          <div class="chart-label">${m.mes}</div>
        </div>
      `).join('');
    }
  }
}
