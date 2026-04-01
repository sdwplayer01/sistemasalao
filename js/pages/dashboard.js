// ═══════════════════════════════════════════════════════
// pages/dashboard.js — Dashboard 360° (v2.2)
// Centro de Comando: KPIs financeiros + 3 Widgets
//   A: Agenda do Dia  B: Alertas de Estoque  C: Caixa do Dia
// ═══════════════════════════════════════════════════════
import { Config, Diario, Servicos, Custos, Receitas, Agenda, Produtos, MESES } from '../storage.js';
import { R$, pct, num, mesKey, fmtData, linkWA, formatarTelefone } from '../utils.js';
import { getRetencao30dias } from './clientes.js';

export function renderDashboard(container) {
  const cfg      = Config.get();
  const ano      = cfg.ano;
  const mesAtual = new Date().getMonth();

  // ── Totais anuais ────────────────────────────────────
  let totalAtend = 0, totalCusto = 0, totalFat = 0, totalLucroReal = 0, totalComissao = 0;
  const fatMeses = [];

  for (let m = 0; m < 12; m++) {
    const res = Diario.resumoMes(ano, m);
    totalAtend     += res.atendimentos;
    totalCusto     += res.custoTotal;
    totalFat       += res.faturamento;
    totalLucroReal += res.lucroReal;   // v2.2: usa lucroReal (descontando comissões)
    totalComissao  += res.comissaoTotal;
    fatMeses.push({ mes: MESES[m].slice(0,3), fat: res.faturamento, lucro: res.lucroReal, atend: res.atendimentos });
  }

  const margemAnual    = totalFat > 0 ? totalLucroReal / totalFat : 0;
  const ticketMedio    = totalAtend > 0 ? totalFat / totalAtend : 0;
  const custoFixoMedio = Custos.mediaMeses();
  const custoFixoReal  = Receitas.mediaCustoFixoReal();
  const cfPorCliente   = Servicos.custoFixoPorClienteCalc(cfg);

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

  // ── Dados dos widgets ─────────────────────────────────
  const hoje        = new Date().toISOString().slice(0,10);
  const agendaHoje  = Agenda.getHoje().slice(0, 5);                    // widget A
  const estoqBaixo  = Produtos.getLowStock();                          // widget B
  const lancHoje    = Diario.getAll().filter(e => e.data === hoje);    // widget C
  const retencao    = getRetencao30dias().slice(0, 5);                 // widget D
  const caixaHoje   = lancHoje.reduce((s,e) => s+(parseFloat(e.precoCobrado)||0)*(parseInt(e.qtd)||1), 0);
  const caixaAtend  = lancHoje.reduce((s,e) => s+(parseInt(e.qtd)||1), 0);

  // ── Render ────────────────────────────────────────────
  container.innerHTML = `
    <div class="section-title">Dashboard</div>
    <div class="section-sub">Ano ${ano} · ${MESES[mesAtual]} em foco</div>

    <!-- KPIs financeiros -->
    <div class="kpi-grid">
      <div class="kpi-card green">
        <div class="kpi-label">Faturamento Acumulado</div>
        <div class="kpi-value">${R$(totalFat)}</div>
        <div class="kpi-sub">${R$(resMes.faturamento)} este mês</div>
      </div>
      <div class="kpi-card ${totalLucroReal >= 0 ? 'plum' : 'warn'}">
        <div class="kpi-label">Lucro Real Acumulado</div>
        <div class="kpi-value">${R$(totalLucroReal)}</div>
        <div class="kpi-sub">Após comissões pagas</div>
      </div>
      <div class="kpi-card rose">
        <div class="kpi-label">Margem de Lucro</div>
        <div class="kpi-value">${pct(margemAnual)}</div>
        <div class="kpi-sub">Média anual real</div>
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

    <!-- ═══ WIDGETS 360° ═══ -->
    <div class="widget-grid">

      <!-- Widget A: Agenda do Dia -->
      <div class="widget-card">
        <div class="widget-title">📅 Agenda de Hoje</div>
        ${agendaHoje.length
          ? agendaHoje.map(a => `
            <div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border);font-size:13px">
              <span class="badge badge-plum" style="min-width:48px;text-align:center">${a.horario || '—'}</span>
              <span style="flex:1;font-weight:500">${a.cliente || '—'}</span>
              <span class="badge ${a.status==='confirmado'?'badge-green':a.status==='realizado'?'badge-rose':'badge-plum'}" style="font-size:10px">${a.status||'agendado'}</span>
            </div>`).join('')
          : `<div style="text-align:center;padding:16px 0;color:var(--txt-muted);font-size:13px">
               <div style="font-size:24px;margin-bottom:6px">📅</div>
               Nenhum agendamento hoje
             </div>`
        }
        ${agendaHoje.length ? `<a href="#" id="linkVerAgenda" style="font-size:12px;color:var(--plum-light);display:block;margin-top:8px">Ver agenda completa →</a>` : ''}
      </div>

      <!-- Widget B: Alertas -->
      <div class="widget-card">
        <div class="widget-title">⚠ Alertas</div>
        ${estoqBaixo.length
          ? `<div style="font-size:11px;color:var(--txt-muted);margin-bottom:8px">Produtos com estoque baixo:</div>
             ${estoqBaixo.slice(0,5).map(p => `
               <div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid var(--border);font-size:13px">
                 <span class="badge badge-warn" style="font-family:monospace;font-size:10px">${p.sku}</span>
                 <span style="flex:1">${p.nome}</span>
                 <span style="color:var(--txt-red);font-weight:600">${p.estoque ?? 0} un.</span>
               </div>`).join('')}
             ${estoqBaixo.length > 5 ? `<p style="font-size:11px;color:var(--txt-muted);margin-top:6px">+${estoqBaixo.length - 5} outros. Ver em <a href="#" id="linkVerEstoque" style="color:var(--plum-light)">Produtos</a>.</p>` : ''}`
          : `<div style="text-align:center;padding:16px 0;color:var(--txt-muted);font-size:13px">
               <div style="font-size:24px;margin-bottom:6px">✅</div>
               Nenhum alerta de estoque
             </div>`
        }
      </div>

      <!-- Widget C: Caixa do Dia -->
      <div class="widget-card">
        <div class="widget-title">💰 Caixa de Hoje</div>
        ${lancHoje.length
          ? `<div style="text-align:center;padding:8px 0">
               <div style="font-size:32px;font-weight:700;font-family:var(--font-serif);color:var(--txt-green)">${R$(caixaHoje)}</div>
               <div style="font-size:12px;color:var(--txt-muted);margin-top:4px">${caixaAtend} lançamento${caixaAtend!==1?'s':''} · ${lancHoje.length} registro${lancHoje.length!==1?'s':''}</div>
             </div>
             <div style="margin-top:12px">
               ${(() => {
                 const fatSvc  = lancHoje.filter(e => (e.tipo??'servico')==='servico').reduce((s,e)=>s+(parseFloat(e.precoCobrado)||0)*(parseInt(e.qtd)||1),0);
                 const fatProd = lancHoje.filter(e => e.tipo==='produto').reduce((s,e)=>s+(parseFloat(e.precoCobrado)||0)*(parseInt(e.qtd)||1),0);
                 const rows = [];
                 if(fatSvc>0)  rows.push(`<div style="display:flex;justify-content:space-between;font-size:13px;padding:3px 0"><span class="text-muted">✂ Serviços</span><span class="fw-600">${R$(fatSvc)}</span></div>`);
                 if(fatProd>0) rows.push(`<div style="display:flex;justify-content:space-between;font-size:13px;padding:3px 0"><span class="text-muted">📦 Produtos</span><span class="fw-600">${R$(fatProd)}</span></div>`);
                 return rows.join('');
               })()}
             </div>`
          : `<div style="text-align:center;padding:16px 0;color:var(--txt-muted);font-size:13px">
               <div style="font-size:24px;margin-bottom:6px">💰</div>
               Nenhum lançamento hoje
             </div>`
        }
      </div>

      <!-- Widget D: CRM Retenção -->
      <div class="widget-card">
        <div class="widget-title">🔔 Retenção (>30 dias)</div>
        ${retencao.length
          ? retencao.map(r => `
            <div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border);font-size:13px">
              <span class="badge badge-rose" style="min-width:38px;text-align:center">${r.dias}d</span>
              <span style="flex:1;font-weight:500">${r.nome}</span>
              ${r.tel && linkWA(r.tel) 
                ? `<a href="${linkWA(r.tel)}" target="_blank" class="wa-link" title="${formatarTelefone(r.tel)}"><i data-lucide="message-circle" style="width:14px;height:14px"></i></a>` 
                : `<span class="text-muted" style="font-size:11px">Sem tel</span>`}
            </div>`).join('')
          : `<div style="text-align:center;padding:16px 0;color:var(--txt-muted);font-size:13px">
               <div style="font-size:24px;margin-bottom:6px">🎉</div>
               Retenção em dia!
             </div>`
        }
        ${retencao.length ? `<a href="#" id="linkVerCRM" style="font-size:12px;color:var(--plum-light);display:block;margin-top:8px">Ver todos no CRM →</a>` : ''}
      </div>

      <!-- Widget E: Lembretes de Operação -->
      <div class="widget-card" style="grid-column: 1 / -1; display:flex; flex-direction:column; justify-content:center; align-items:center;  background:rgba(201, 169, 110, .08); border-color:rgba(201, 169, 110, .2) ">
        <div class="widget-title" style="color:#D4B37F; margin-bottom:12px; font-size:12px"><i data-lucide="bell-ring" style="width:14px;height:14px;margin-right:6px"></i>Lembretes de Operação</div>
        <div style="font-size:13px; color:var(--txt-white);text-align:center;max-width:400px;line-height:1.6">
          <ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:8px">
            <li style="padding:8px;border-radius:6px;background:rgba(255,255,255,.03)">💡 Tem alguma <strong>conta fixa</strong> para pagar hoje? Confira em Custos.</li>
            <li style="padding:8px;border-radius:6px;background:${estoqBaixo.length > 0 ? 'rgba(255, 193, 7, .12)' : 'rgba(255,255,255,.03)'};color:${estoqBaixo.length > 0 ? '#F0D58A' : 'inherit'}">📦 Preciso fazer algum pedido de <strong>estoque</strong>? ${estoqBaixo.length > 0 ? '<strong>⚠ Sim, produtos esgotando!</strong>' : ''}</li>
            <li style="padding:8px;border-radius:6px;background:rgba(255,255,255,.03)">💬 Tem alguma cliente esperando <strong>produto ou orçamento</strong> no WhatsApp?</li>
          </ul>
        </div>
      </div>

    </div><!-- /widget-grid -->

    <!-- Gráfico Faturamento vs Lucro -->
    <div class="card mb-16">
      <div class="card-header">
        <span class="card-title">Faturamento e Lucro Real por Mês — ${ano}</span>
        <span class="badge badge-plum">${totalFat ? 'Com dados' : 'Aguardando lançamentos'}</span>
      </div>
      <div class="card-body">
        ${totalFat > 0
          ? `<div class="chart-placeholder" id="chartFat"></div>`
          : `<div style="text-align:center;padding:32px;color:var(--txt-muted)">
               <div style="font-size:32px;margin-bottom:8px">📊</div>
               <p>O gráfico aparece conforme você registra atendimentos no Diário.</p>
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
            <div class="fw-600 font-serif" style="font-size:18px;color:var(--txt-white)">${svcDestaque.nome}</div>
            <div class="text-muted mt-4">${svcDestaque.categoria || '—'}</div>
            <div class="preco-grid mt-16">
              <div class="preco-box preco-min"><div class="preco-label">Mínimo</div><div class="preco-val">${R$(svcDestaque.precoMin)}</div></div>
              <div class="preco-box preco-ideal"><div class="preco-label">Ideal</div><div class="preco-val">${R$(svcDestaque.precoIdeal)}</div></div>
              <div class="preco-box preco-prem"><div class="preco-label">Premium</div><div class="preco-val">${R$(svcDestaque.precoPrem)}</div></div>
            </div>
          ` : '<p class="text-muted">Nenhum serviço cadastrado ainda.</p>'}
        </div>
      </div>

      <div class="card">
        <div class="card-header"><span class="card-title">Resumo — ${MESES[mesAtual]}</span></div>
        <div class="card-body">
          <table style="width:100%;font-size:13px">
            <tr><td class="text-muted">Atendimentos</td><td class="text-right fw-600">${num(resMes.atendimentos)}</td></tr>
            <tr><td class="text-muted">Faturamento</td><td class="text-right fw-600" style="color:var(--txt-green)">${R$(resMes.faturamento)}</td></tr>
            <tr><td class="text-muted">Custo total serviços</td><td class="text-right">${R$(resMes.custoTotal)}</td></tr>
            ${resMes.comissaoTotal > 0 ? `<tr><td class="text-muted">Comissões pagas</td><td class="text-right" style="color:var(--plum-light)">${R$(resMes.comissaoTotal)}</td></tr>` : ''}
            <tr><td class="text-muted">Lucro real</td>
              <td class="text-right fw-600" style="color:${resMes.lucroReal>=0?'var(--txt-green)':'var(--txt-red)'}">
                ${R$(resMes.lucroReal)}
              </td>
            </tr>
            <tr><td class="text-muted">Margem real</td><td class="text-right">${pct(resMes.margem)}</td></tr>
            <tr><td class="text-muted">Horas trabalhadas</td><td class="text-right">${Math.floor(resMes.tempoMin/60)}h ${resMes.tempoMin%60}min</td></tr>
          </table>
        </div>
      </div>
    </div>

    ${totalFat > 0 ? `
    <div class="card mt-16">
      <div class="card-header"><span class="card-title">🔍 Destaques Operacionais</span></div>
      <div class="card-body">
        <table style="width:100%;font-size:13px">
          <tr><td class="text-muted">Mês de maior faturamento</td><td class="text-right fw-600">${MESES[melhorMes]} — ${R$(fatMeses[melhorMes].fat)}</td></tr>
          <tr><td class="text-muted">Comissões pagas no ano</td><td class="text-right" style="color:var(--plum-light)">${R$(totalComissao)}</td></tr>
          <tr><td class="text-muted">Custo Fixo por Cliente</td><td class="text-right">${R$(cfPorCliente)}</td></tr>
          <tr><td class="text-muted">Custo Fixo Bruto Médio / Mês</td><td class="text-right">${R$(custoFixoMedio)}</td></tr>
          <tr><td class="text-muted">Serviços cadastrados</td><td class="text-right">${svcs.length}</td></tr>
          <tr><td class="text-muted">Produtos no catálogo</td><td class="text-right">${Produtos.getAll().length}</td></tr>
        </table>
      </div>
    </div>` : ''}

    ${!totalAtend ? `
    <div class="card mt-16" style="border:2px dashed var(--border)">
      <div class="card-body" style="text-align:center;padding:32px">
        <div style="font-size:28px;margin-bottom:12px">📌</div>
        <div class="fw-600 font-serif" style="font-size:16px;margin-bottom:16px">Como começar</div>
        <div style="text-align:left;max-width:400px;margin:0 auto;font-size:13px;color:var(--txt-muted);line-height:1.8">
          1️⃣ <strong>Configurações</strong> → preencha o nome do salão e o ano<br>
          2️⃣ <strong>Custos Fixos</strong> → insira os custos mensais<br>
          3️⃣ <strong>Receitas Internas</strong> → informe repasses e aluguéis<br>
          4️⃣ <strong>Serviços & Produtos</strong> → cadastre serviços e produtos<br>
          5️⃣ <strong>Diário</strong> → registre cada atendimento e venda<br>
          6️⃣ Dashboard e Controle Anual atualizam automaticamente ✅
        </div>
      </div>
    </div>` : ''}
  `;

  // ── Handlers dos widgets ───────────────────────────
  document.getElementById('linkVerAgenda')?.addEventListener('click', e => {
    e.preventDefault();
    document.querySelector('[data-page="agenda"]')?.click();
  });
  document.getElementById('linkVerEstoque')?.addEventListener('click', e => {
    e.preventDefault();
    document.querySelector('[data-page="servicos"]')?.click();
  });
  document.getElementById('linkVerCRM')?.addEventListener('click', e => {
    e.preventDefault();
    document.querySelector('[data-page="clientes"]')?.click();
  });

  // ── Gráfico ────────────────────────────────────────
  if (totalFat > 0) {
    const maxVal = Math.max(...fatMeses.map(m => Math.max(m.fat, 0)), 1);
    const chartEl = document.getElementById('chartFat');
    if (chartEl) {
      chartEl.innerHTML = fatMeses.map(m => `
        <div class="chart-bar-wrap">
          <div class="chart-val" style="font-size:10px">${m.fat ? R$(m.fat).replace('R$\xa0','') : ''}</div>
          <div style="display:flex;gap:2px;align-items:flex-end;height:160px">
            <div class="chart-bar" style="height:${Math.round((m.fat/maxVal)*160)}px;width:14px" title="Fat: ${R$(m.fat)}"></div>
            <div class="chart-bar rose" style="height:${m.lucro>0?Math.round((m.lucro/maxVal)*160):2}px;width:10px;opacity:0.7" title="Lucro real: ${R$(m.lucro)}"></div>
          </div>
          <div class="chart-label">${m.mes}</div>
        </div>
      `).join('');
    }
  }
}
