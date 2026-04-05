// ═══════════════════════════════════════════════════════
// pages/controle.js
// ═══════════════════════════════════════════════════════
import { Diario, Custos, Receitas, Config, MESES } from '../storage.js';
import { R$, pct, num, mesKey } from '../utils.js';

export function renderControle(container) {
  const cfg = Config.get();
  const ano = cfg.ano;

  const dados = MESES.map((mes, i) => {
    const key = mesKey(ano, i);
    const res = Diario.resumoMes(ano, i);
    const cfBruto = Custos.totalMes(key);
    const cfReal = Receitas.custoFixoRealMes(key);
    const allDiario = Diario.getAll().filter(e => e.data && e.data.startsWith(key));
    // Proteção Array fallback sugerida para resolver TypeError: filter is not a function
    const allReceitas = (Array.isArray(Receitas.getAll()) ? Receitas.getAll() : []).filter(item => {
        return item && item.data && item.data.startsWith(key);
    });

    const propResp = cfg.profissionais && cfg.profissionais.length > 0 ? cfg.profissionais[0] : '';
    const comissoes = allDiario.reduce((s, e) => s + (parseFloat(e.comissaoValor) || 0) * (parseInt(e.qtd) || 1), 0);
    const fatTerceiros = allDiario.reduce((s, e) => {
      if (e.profissional && e.profissional !== propResp) {
        return s + (parseFloat(e.precoCobrado) || 0) * (parseInt(e.qtd) || 1);
      }
      return s;
    }, 0);
    const aluguelCadeiras = allReceitas.reduce((s, r) => {
      if (r.categoria && r.categoria.toLowerCase() === 'aluguel') {
        return s + (parseFloat(r.valor) || 0);
      }
      return s;
    }, 0);

    return {
      mes, i,
      atend: res.atendimentos,
      faturamento: res.faturamento,
      custoProd: res.custoProduto,
      custoTotal: res.custoTotal,
      lucro: res.lucro,
      margem: res.margem,
      cfBruto,
      cfReal,
      tempoH: res.tempoMin / 60,
      ticket: res.atendimentos > 0 && res.faturamento > 0 ? res.faturamento / res.atendimentos : 0,
      comissoes,
      fatTerceiros,
      aluguelCadeiras,
    };
  });

  const T = {
    atend: dados.reduce((s, d) => s + d.atend, 0),
    faturamento: dados.reduce((s, d) => s + d.faturamento, 0),
    custoProd: dados.reduce((s, d) => s + d.custoProd, 0),
    custoTotal: dados.reduce((s, d) => s + d.custoTotal, 0),
    lucro: dados.reduce((s, d) => s + d.lucro, 0),
    cfBruto: dados.reduce((s, d) => s + d.cfBruto, 0),
    cfReal: dados.reduce((s, d) => s + d.cfReal, 0),
    tempoH: dados.reduce((s, d) => s + d.tempoH, 0),
    comissoes: dados.reduce((s, d) => s + d.comissoes, 0),
    fatTerceiros: dados.reduce((s, d) => s + d.fatTerceiros, 0),
    aluguelCadeiras: dados.reduce((s, d) => s + d.aluguelCadeiras, 0),
  };
  T.margem = T.faturamento > 0 ? T.lucro / T.faturamento : 0;
  T.ticket = T.atend > 0 && T.faturamento > 0 ? T.faturamento / T.atend : 0;

  const mesAtual = new Date().getMonth();

  container.innerHTML = `
    <div class="section-title">Controle Anual ${ano}</div>
    <div class="section-sub">Consolidado anual de faturamento, custos e lucro.</div>

    <div class="table-wrap controle-table">
      <table>
        <thead>
          <tr>
            <th>Indicador</th>
            ${MESES.map((m, i) => `<th class="td-center ${i === mesAtual ? 'text-plum' : ''}">${m.slice(0, 3)}</th>`).join('')}
            <th class="td-center" style="background:var(--plum-mid)">ANO</th>
          </tr>
        </thead>
        <tbody>
          ${linha('👤 Atendimentos', dados.map(d => d.atend ? num(d.atend) : '—'), num(T.atend))}
          ${linha('💰 Faturamento Bruto', dados.map(d => d.faturamento ? R$(d.faturamento) : '—'), R$(T.faturamento), false, 'var(--txt-green)')}
          ${linha('📦 Custo de Produto', dados.map(d => d.custoProd ? R$(d.custoProd) : '—'), R$(T.custoProd))}
          ${linha('🏷 Custo Total Serviços', dados.map(d => d.custoTotal ? R$(d.custoTotal) : '—'), R$(T.custoTotal), true)}
          ${linha('💸 Total de Comissões', dados.map(d => d.comissoes ? R$(d.comissoes) : '—'), R$(T.comissoes), false, 'var(--plum-light)')}
          ${linhaLucro('✅ Lucro Bruto', dados.map(d => d.faturamento ? d.lucro : null), T.lucro, T.faturamento > 0)}
          ${linhaMargem('📊 Margem de Lucro', dados.map(d => d.faturamento ? d.margem : null), T.margem, T.faturamento > 0)}
          ${linha('🎫 Ticket Médio', dados.map(d => d.ticket ? R$(d.ticket) : '—'), R$(T.ticket))}
          ${linha('🏠 Custo Fixo Bruto', dados.map(d => d.cfBruto ? R$(d.cfBruto) : '—'), R$(T.cfBruto))}
          ${linha('✅ Custo Fixo Real', dados.map(d => d.cfReal ? R$(d.cfReal) : '—'), R$(T.cfReal))}
          ${linha('⏱ Horas Trabalhadas', dados.map(d => d.tempoH ? d.tempoH.toFixed(1) + 'h' : '—'), T.tempoH.toFixed(1) + 'h')}
          
          <tr><td colspan="14" style="padding:10px;background:rgba(255,255,255,.02);font-size:11px;color:var(--txt-muted);letter-spacing:.5px;text-transform:uppercase;font-weight:600;text-align:center">Métricas Avançadas</td></tr>
          ${linha('🤝 Fat. de Terceiros', dados.map(d => d.fatTerceiros ? R$(d.fatTerceiros) : '—'), R$(T.fatTerceiros), false, '#A9E5C1')}
          ${linha('🪑 Aluguel de Cadeiras', dados.map(d => d.aluguelCadeiras ? R$(d.aluguelCadeiras) : '—'), R$(T.aluguelCadeiras))}
        </tbody>
      </table>
    </div>

    <!-- Gráfico lucro por mês -->
    ${T.faturamento > 0 ? `
    <div class="card mt-24">
      <div class="card-header"><span class="card-title">Faturamento vs Lucro Mensal</span></div>
      <div class="card-body">
        <div class="chart-placeholder" id="chartControle"></div>
      </div>
    </div>` : ''}
  `;

  if (T.faturamento > 0) {
    const maxVal = Math.max(...dados.map(d => d.faturamento), 1);
    const chartEl = document.getElementById('chartControle');
    if (chartEl) {
      chartEl.innerHTML = dados.map(d => `
        <div class="chart-bar-wrap">
          <div class="chart-val" style="font-size:9px">${d.faturamento ? R$(d.faturamento).replace('R$\xa0', '') : ''}</div>
          <div style="display:flex;gap:2px;align-items:flex-end;height:160px">
            <div class="chart-bar" style="height:${Math.round((d.faturamento / maxVal) * 160)}px;width:14px" title="${R$(d.faturamento)}"></div>
            <div class="chart-bar rose" style="height:${d.lucro > 0 ? Math.round((d.lucro / maxVal) * 160) : 2}px;width:10px;opacity:.7" title="${R$(d.lucro)}"></div>
          </div>
          <div class="chart-label">${d.mes.slice(0, 3)}</div>
        </div>
      `).join('');
    }
  }
}

function linha(label, vals, total, isTotal = false, cor = '') {
  return `<tr ${isTotal ? 'class="row-total"' : ''}>
    <td class="fw-600" style="white-space:nowrap">${label}</td>
    ${vals.map(v => `<td class="td-center td-mono" style="font-size:12px${cor ? ';color:' + cor : ''}">${v}</td>`).join('')}
    <td class="td-center td-mono fw-600" style="background:var(--mauve);color:var(--noir)${cor ? ';color:' + cor : ''}">${total}</td>
  </tr>`;
}

function linhaLucro(label, vals, total, hasData) {
  return `<tr>
    <td class="fw-600" style="white-space:nowrap">${label}</td>
    ${vals.map(v => {
    if (v === null) return `<td class="td-center td-mono" style="font-size:12px">—</td>`;
    const cor = v >= 0 ? 'var(--txt-green)' : 'var(--txt-red)';
    return `<td class="td-center td-mono fw-600" style="font-size:12px;color:${cor}">${R$(v)}</td>`;
  }).join('')}
    <td class="td-center td-mono fw-600" style="background:var(--mauve);color:${hasData && total >= 0 ? 'var(--txt-green)' : 'var(--txt-red)'}">${hasData ? R$(total) : '—'}</td>
  </tr>`;
}

function linhaMargem(label, vals, total, hasData) {
  return `<tr>
    <td class="fw-600" style="white-space:nowrap">${label}</td>
    ${vals.map(v => {
    if (v === null) return `<td class="td-center td-mono" style="font-size:12px">—</td>`;
    const cor = v >= 0.2 ? 'var(--txt-green)' : v >= 0 ? '#856404' : 'var(--txt-red)';
    return `<td class="td-center td-mono fw-600" style="font-size:12px;color:${cor}">${pct(v)}</td>`;
  }).join('')}
    <td class="td-center td-mono fw-600" style="background:var(--mauve)">${hasData ? pct(total) : '—'}</td>
  </tr>`;
}
