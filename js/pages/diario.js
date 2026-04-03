// ═══════════════════════════════════════════════════════
// pages/diario.js — Diário / Frente de Caixa (v3.0)
// Fase 4: dois modos — Hoje (caixa operacional) e Histórico
//
// O QUE MUDOU:
//   - Tab "Hoje": tabela compacta (7 col), botões de ação grandes,
//     rodapé de totais por forma de pagamento
//   - Tab "Histórico": exatamente igual ao v2.2, preservado intacto
//   - Formulário: mesmos campos, reorganizados em 3 blocos lógicos
//   - syncFromDiarioAgenda() substituído por upsert direto no save
//   - Inline styles substituídos por classes do ui.js / style.css
//
// O QUE NÃO MUDOU:
//   - Toda a lógica de negócio (cálculo de comissão, lucro real,
//     baixa de estoque, tipos serviço/produto, retrocompat.)
//   - A função abrirPerfilCliente() — intacta
//   - Os dados salvos — mesmo schema
// ═══════════════════════════════════════════════════════
import { Diario, Servicos, Produtos, Clientes, Config, MESES } from '../storage.js';
import { R$, pct, fmtData, hoje, diaSemana, formatarTelefone,
         linkWA, limparTelefone, toast, openModal, closeModal, emptyState, applyMoneyMask } from '../utils.js';
import { sectionHeader, resumoCards, timelineList, waLink,
         clienteStatCards, statRow, formBloco, pgtoTotalsBar,
         agendaRow, emptyStateLucide } from '../ui.js';

let _filtroMes  = '';
let _filtroProf = '';
let _tabAtiva   = 'hoje'; // 'hoje' | 'historico'

// ── Cor do badge conforme profissional ─────────────────
function badgeProfissional(nome, cfg) {
  if (!nome) return 'badge-rose';
  const profs  = cfg.profissionais || [];
  if (profs[0] && nome === profs[0]) return 'badge-plum';
  const palette = ['badge-rose', 'badge-green', 'badge-warn', 'badge-blue'];
  const idx     = profs.indexOf(nome);
  return idx >= 0 ? palette[idx % palette.length] : 'badge-rose';
}

// ══════════════════════════════════════════════════════
// RENDER PRINCIPAL
// ══════════════════════════════════════════════════════
export function renderDiario(container) {
  const cfg    = Config.get();
  const svcs   = Servicos.getAll();
  const prods  = Produtos.getAll();
  const profs  = cfg.profissionais || [];
  const formas = cfg.formasPagamento || ['Dinheiro','PIX','Cartão Débito','Cartão Crédito','Transferência'];

  // Conta lançamentos de hoje para o badge
  const lancHoje = Diario.getAll().filter(e => e.data === hoje());

  container.innerHTML = `
    ${sectionHeader('Diário / Caixa', 'Frente de caixa — registre serviços e vendas de produtos.')}

    <!-- Tabs Hoje / Histórico -->
    <div class="caixa-tabs">
      <button class="caixa-tab-btn ${_tabAtiva === 'hoje' ? 'active' : ''}" id="tabHoje">
        <i data-lucide="store" style="width:15px;height:15px"></i>
        Hoje
        ${lancHoje.length ? `<span class="caixa-tab-badge">${lancHoje.length}</span>` : ''}
      </button>
      <button class="caixa-tab-btn ${_tabAtiva === 'historico' ? 'active' : ''}" id="tabHistorico">
        <i data-lucide="history" style="width:15px;height:15px"></i>
        Histórico
      </button>
    </div>

    <div id="caixaConteudo"></div>
  `;

  document.getElementById('tabHoje').onclick = () => {
    _tabAtiva = 'hoje';
    document.getElementById('tabHoje').classList.add('active');
    document.getElementById('tabHistorico').classList.remove('active');
    renderTabHoje(svcs, prods, profs, formas, cfg);
  };

  document.getElementById('tabHistorico').onclick = () => {
    _tabAtiva = 'historico';
    document.getElementById('tabHistorico').classList.add('active');
    document.getElementById('tabHoje').classList.remove('active');
    renderTabHistorico(svcs, prods, profs, formas, cfg);
  };

  if (_tabAtiva === 'hoje') {
    renderTabHoje(svcs, prods, profs, formas, cfg);
  } else {
    renderTabHistorico(svcs, prods, profs, formas, cfg);
  }
}

// ══════════════════════════════════════════════════════
// TAB: HOJE — modo caixa operacional
// ══════════════════════════════════════════════════════
function renderTabHoje(svcs, prods, profs, formas, cfg) {
  const el = document.getElementById('caixaConteudo');
  if (!el) return;

  const hojeStr  = hoje();
  const entries  = Diario.getAll().filter(e => e.data === hojeStr);
  const fat      = entries.reduce((s,e) => s+(parseFloat(e.precoCobrado)||0)*(parseInt(e.qtd)||1), 0);
  const atend    = entries.reduce((s,e) => s+(parseInt(e.qtd)||1), 0);
  const fatSvc   = entries.filter(e => (e.tipo??'servico')==='servico')
                          .reduce((s,e) => s+(parseFloat(e.precoCobrado)||0)*(parseInt(e.qtd)||1), 0);
  const fatProd  = entries.filter(e => e.tipo==='produto')
                          .reduce((s,e) => s+(parseFloat(e.precoCobrado)||0)*(parseInt(e.qtd)||1), 0);

  // Item 4: layout duas colunas no desktop via CSS grid (.caixa-layout-desktop)
  // A coluna direita tem painel lateral fixo com resumo e totais por pgto.
  el.innerHTML = `
    <!-- Mini-resumo: carrossel no mobile, grid no desktop -->
    ${resumoCards([
      { label: 'Caixa Hoje',  value: R$(fat),        cor: 'green', sub: \`\${atend} atendimento\${atend!==1?'s':''}\` },
      { label: 'Serviços',    value: R$(fatSvc),      cor: 'plum'  },
      { label: 'Produtos',    value: R$(fatProd),     cor: 'rose'  },
      { label: 'Lançamentos', value: entries.length,  cor: 'blue'  },
    ])}

    <!-- Botões de ação -->
    <div class="caixa-actions">
      <button class="btn-caixa-primary btn-caixa-servico" id="btnNovoServico">
        <i data-lucide="scissors" style="width:18px;height:18px"></i>
        Novo Atendimento
      </button>
      <button class="btn-caixa-primary btn-caixa-produto" id="btnNovoProduto">
        <i data-lucide="package" style="width:18px;height:18px"></i>
        Venda de Produto
      </button>
    </div>

    <!-- Grade duas colunas no desktop (CSS grid) -->
    <div class="caixa-layout-desktop">

      <!-- Coluna principal: tabela -->
      <div class="caixa-col-principal">
        <div id="tabelaHoje"></div>
      </div>

      <!-- Coluna lateral: painel de resumo financeiro -->
      <div class="caixa-col-lateral">
        <div class="caixa-painel-lateral">

          <!-- Total do dia -->
          <div class="caixa-resumo-lateral">
            <div class="caixa-resumo-lateral-titulo">
              <i data-lucide="banknote" style="width:13px;height:13px"></i>
              Total do Dia
            </div>
            <div class="caixa-total-dia">${R$(fat)}</div>
            <div class="caixa-total-dia-sub">${atend} atendimento${atend!==1?'s':''} registrado${atend!==1?'s':''}</div>

            <!-- Split serviços / produtos -->
            ${fatSvc > 0 ? \`<div class="caixa-pgto-linha">
              <span class="caixa-pgto-nome">Serviços</span>
              <span class="caixa-pgto-valor">\${R$(fatSvc)}</span>
            </div>\` : ''}
            ${fatProd > 0 ? \`<div class="caixa-pgto-linha">
              <span class="caixa-pgto-nome">Produtos</span>
              <span class="caixa-pgto-valor">\${R$(fatProd)}</span>
            </div>\` : ''}
          </div>

          <!-- Totais por forma de pagamento -->
          ${(() => {
            if (!entries.length) return '';
            const totaisPgto = {};
            entries.forEach(e => {
              const forma = e.formaPagamento || 'Sem forma';
              const val   = (parseFloat(e.precoCobrado)||0) * (parseInt(e.qtd)||1);
              totaisPgto[forma] = (totaisPgto[forma]||0) + val;
            });
            if (!Object.keys(totaisPgto).length) return '';
            return \`<div class="caixa-resumo-lateral">
              <div class="caixa-resumo-lateral-titulo">
                <i data-lucide="credit-card" style="width:13px;height:13px"></i>
                Por Forma de Pagamento
              </div>
              \${Object.entries(totaisPgto).sort((a,b)=>b[1]-a[1]).map(([forma,val]) => \`
                <div class="caixa-pgto-linha">
                  <span class="caixa-pgto-nome">\${forma}</span>
                  <span class="caixa-pgto-valor">\${R$(val)}</span>
                </div>\`).join('')}
            </div>\`;
          })()}

        </div>
      </div>

    </div><!-- /caixa-layout-desktop -->
  `;

  document.getElementById('btnNovoServico').onclick = () =>
    abrirFormAtend(null, svcs, prods, profs, formas, cfg, 'servico', () => renderTabHoje(svcs, prods, profs, formas, cfg));

  document.getElementById('btnNovoProduto').onclick = () =>
    abrirFormAtend(null, svcs, prods, profs, formas, cfg, 'produto', () => renderTabHoje(svcs, prods, profs, formas, cfg));

  renderTabelaHoje(entries, svcs, prods, profs, formas, cfg);

  if (window.lucide) window.lucide.createIcons();
}

function renderTabelaHoje(entries, svcs, prods, profs, formas, cfg) {
  const el = document.getElementById('tabelaHoje');
  if (!el) return;

  if (!entries.length) {
    el.innerHTML = emptyStateLucide('clipboard-list', 'Nenhum lançamento ainda hoje.', 'Use os botões acima para registrar o primeiro atendimento.');
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  el.innerHTML = `
    <div class="table-wrap">
      <table class="tabela-hoje">
        <thead>
          <tr>
            <th>Cliente</th>
            <th>📱</th>
            <th>Serviço / Produto</th>
            <th>Profissional</th>
            <th class="td-center">Qtd</th>
            <th class="td-right" style="color:var(--txt-green)">Cobrado</th>
            <th>Pgto</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${entries.map(e => rowHoje(e, svcs, prods, cfg)).join('')}
        </tbody>
      </table>
    </div>
  `;

  el.querySelectorAll('[data-edit]').forEach(btn => {
    btn.onclick = () => {
      const entry = Diario.getAll().find(e => e.id == btn.dataset.edit);
      if (entry) abrirFormAtend(entry, svcs, prods, profs, formas, cfg, entry.tipo ?? 'servico',
        () => renderTabHoje(svcs, prods, profs, formas, cfg));
    };
  });

  el.querySelectorAll('[data-del]').forEach(btn => {
    btn.onclick = () => {
      if (confirm('Remover este lançamento?')) {
        Diario.remove(parseInt(btn.dataset.del));
        renderTabHoje(svcs, prods, profs, formas, cfg);
        toast('Lançamento removido.', 'default');
      }
    };
  });

  el.querySelectorAll('.cliente-link').forEach(btn => {
    btn.onclick = () => abrirPerfilCliente(btn.dataset.nome, cfg);
  });
}

function rowHoje(e, svcs, prods, cfg) {
  const tipo    = e.tipo ?? 'servico';
  const qtd     = parseInt(e.qtd) || 1;
  const cobrado = (parseFloat(e.precoCobrado) || 0) * qtd;
  const tel     = e.telefone ? limparTelefone(e.telefone) : '';
  const url     = tel.length >= 10 ? linkWA(tel) : null;

  let itemNome = '—';
  if (tipo === 'produto') {
    const prod = prods.find(p => p.id == e.produtoId);
    itemNome = `<span class="badge" style="background:var(--lavender);color:var(--plum);font-size:10px;font-family:monospace;margin-right:4px">${prod?.sku || 'P?'}</span>${e.produtoNome || prod?.nome || '—'}`;
  } else {
    itemNome = e.servicoNome || (svcs.find(s => s.id == e.servicoId)?.nome) || '—';
  }

  const nomeCliente = e.cliente
    ? `<button class="cliente-link" data-nome="${e.cliente}">${e.cliente}</button>`
    : '<span class="text-muted">—</span>';

  return `<tr>
    <td>${nomeCliente}</td>
    <td>${url
      ? `<a class="wa-link" href="${url}" target="_blank" rel="noopener" title="${formatarTelefone(tel)}"><i data-lucide="message-circle" style="width:13px;height:13px"></i></a>`
      : '<span class="text-muted" style="font-size:11px">—</span>'
    }</td>
    <td>${itemNome}</td>
    <td><span class="badge ${badgeProfissional(e.profissional, cfg)}">${e.profissional || '—'}</span></td>
    <td class="td-center">${qtd}</td>
    <td class="td-right td-mono fw-600" style="color:var(--txt-green)">${cobrado ? R$(cobrado) : '<span class="text-muted">—</span>'}</td>
    <td><span class="badge badge-plum" style="font-size:10px">${e.formaPagamento || '—'}</span></td>
    <td style="white-space:nowrap">
      <button class="btn btn-sm btn-secondary" data-edit="${e.id}" title="Editar">✎</button>
      <button class="btn btn-sm btn-danger" data-del="${e.id}" title="Remover">×</button>
    </td>
  </tr>`;
}

// ══════════════════════════════════════════════════════
// TAB: HISTÓRICO — preservado intacto do v2.2
// ══════════════════════════════════════════════════════
function renderTabHistorico(svcs, prods, profs, formas, cfg) {
  const el = document.getElementById('caixaConteudo');
  if (!el) return;

  el.innerHTML = `
    <div class="action-bar">
      <button class="btn btn-primary" id="btnNovoAtend">+ Novo Lançamento</button>
      <select id="filtroMes" style="max-width:160px">
        <option value="">Todos os meses</option>
        ${MESES.map((m,i) => `<option value="${i}" ${_filtroMes===String(i)?'selected':''}>${m}</option>`).join('')}
      </select>
      <select id="filtroProf" style="max-width:160px">
        <option value="">Todas as profissionais</option>
        ${profs.map(p => `<option value="${p}" ${_filtroProf===p?'selected':''}>${p}</option>`).join('')}
      </select>
    </div>
    <div id="diarioResumo"></div>
    <div id="diarioTabela"></div>
  `;

  document.getElementById('btnNovoAtend').onclick = () =>
    abrirFormAtend(null, svcs, prods, profs, formas, cfg, 'servico', () => renderTabHistorico(svcs, prods, profs, formas, cfg));

  document.getElementById('filtroMes').onchange  = e => { _filtroMes  = e.target.value; renderTabelaHistorico(svcs, prods, formas, cfg); };
  document.getElementById('filtroProf').onchange = e => { _filtroProf = e.target.value; renderTabelaHistorico(svcs, prods, formas, cfg); };

  renderTabelaHistorico(svcs, prods, formas, cfg);
}

function renderTabelaHistorico(svcs, prods, formas, cfg) {
  const container = document.getElementById('diarioTabela');
  if (!container) return;

  let entries = Diario.getAll();

  if (_filtroMes !== '') {
    const m = parseInt(_filtroMes);
    entries = entries.filter(e => e.data && new Date(e.data + 'T12:00:00').getMonth() === m);
  }
  if (_filtroProf) {
    entries = entries.filter(e => e.profissional === _filtroProf);
  }

  renderResumoMes(entries);

  if (!entries.length) {
    container.innerHTML = emptyState('Nenhum lançamento no período. Ajuste os filtros ou registre novos lançamentos.');
    return;
  }

  container.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Data</th>
            <th>Dia</th>
            <th>Tipo</th>
            <th>Cliente</th>
            <th>📱</th>
            <th>Serviço / Produto</th>
            <th>Profissional</th>
            <th class="td-center">Qtd</th>
            <th class="td-right">Custo</th>
            <th class="td-right" style="color:var(--txt-green)">Cobrado</th>
            <th class="td-right" style="color:var(--plum)">Comissão</th>
            <th class="td-right">Lucro Real</th>
            <th>Pgto</th>
            <th>Obs.</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${entries.map(e => rowHistorico(e, svcs, prods, cfg)).join('')}
        </tbody>
      </table>
    </div>
  `;

  container.querySelectorAll('[data-edit]').forEach(btn => {
    btn.onclick = () => {
      const entry = Diario.getAll().find(e => e.id == btn.dataset.edit);
      if (entry) abrirFormAtend(entry, svcs, prods, cfg.profissionais||[], formas, cfg, entry.tipo ?? 'servico',
        () => renderTabelaHistorico(svcs, prods, formas, cfg));
    };
  });

  container.querySelectorAll('[data-del]').forEach(btn => {
    btn.onclick = () => {
      if (confirm('Remover este lançamento?')) {
        Diario.remove(parseInt(btn.dataset.del));
        renderTabelaHistorico(svcs, prods, formas, cfg);
        toast('Lançamento removido.', 'default');
      }
    };
  });

  container.querySelectorAll('.cliente-link').forEach(btn => {
    btn.onclick = () => abrirPerfilCliente(btn.dataset.nome, cfg);
  });
}

function renderResumoMes(entries) {
  const resumoEl = document.getElementById('diarioResumo');
  if (!resumoEl || !entries.length) { if(resumoEl) resumoEl.innerHTML=''; return; }

  const atend     = entries.reduce((s,e) => s+(parseInt(e.qtd)||1), 0);
  const fat       = entries.reduce((s,e) => s+(parseFloat(e.precoCobrado)||0)*(parseInt(e.qtd)||1), 0);
  const custo     = entries.reduce((s,e) => s+(parseFloat(e.custoTotal)||0)*(parseInt(e.qtd)||1), 0);
  const comissao  = entries.reduce((s,e) => s+(parseFloat(e.comissaoValor)||0)*(parseInt(e.qtd)||1), 0);
  const lucroReal = fat - custo - comissao;
  const margem    = fat > 0 ? lucroReal/fat : 0;
  const fatSvc    = entries.filter(e => (e.tipo??'servico')==='servico').reduce((s,e) => s+(parseFloat(e.precoCobrado)||0)*(parseInt(e.qtd)||1), 0);
  const fatProd   = entries.filter(e => e.tipo==='produto').reduce((s,e) => s+(parseFloat(e.precoCobrado)||0)*(parseInt(e.qtd)||1), 0);

  const cards = [
    { label: 'Lançamentos',  value: atend, cor: 'plum' },
    { label: 'Faturamento',  value: R$(fat), cor: 'green', sub: `Serv: ${R$(fatSvc)} · Prod: ${R$(fatProd)}` },
    { label: 'Custo Total',  value: R$(custo), cor: 'rose' },
    ...(comissao > 0 ? [{ label: 'Comissões Pagas', value: R$(comissao), cor: 'plum-mid-border' }] : []),
    { label: 'Lucro Real',   value: R$(lucroReal), cor: lucroReal >= 0 ? 'green' : 'warn', sub: 'Após comissões' },
    { label: 'Margem Real',  value: pct(margem), cor: 'blue' },
  ];

  resumoEl.innerHTML = resumoCards(cards);
}

function rowHistorico(e, svcs, prods, cfg) {
  const tipo     = e.tipo ?? 'servico';
  const qtd      = parseInt(e.qtd) || 1;
  const tel      = e.telefone ? limparTelefone(e.telefone) : '';
  const url      = tel.length >= 10 ? linkWA(tel) : null;
  const custoT   = (parseFloat(e.custoTotal)||0) * qtd;
  const cobrado  = (parseFloat(e.precoCobrado)||0) * qtd;
  const comissao = (parseFloat(e.comissaoValor)||0) * qtd;
  const lucroReal= cobrado - custoT - comissao;

  let itemNome = '—';
  if (tipo === 'produto') {
    const prod = prods.find(p => p.id == e.produtoId);
    itemNome = `<span class="badge" style="background:var(--lavender);color:var(--plum);font-size:10px;font-family:monospace;margin-right:4px">${prod?.sku || 'P?'}</span>${e.produtoNome || prod?.nome || '—'}`;
  } else {
    const svc = svcs.find(s => s.id == e.servicoId);
    itemNome = svc ? svc.nome : (e.servicoNome || '—');
  }

  const tipoBadge = tipo === 'produto'
    ? `<span class="badge badge-blue" style="font-size:10px">Produto</span>`
    : `<span class="badge badge-rose" style="font-size:10px">Serviço</span>`;

  const nomeCliente = e.cliente
    ? `<button class="cliente-link" data-nome="${e.cliente}">${e.cliente}</button>`
    : '<span class="text-muted">—</span>';

  return `<tr>
    <td>${fmtData(e.data)}</td>
    <td><span class="badge badge-plum">${diaSemana(e.data)}</span></td>
    <td>${tipoBadge}</td>
    <td>${nomeCliente}</td>
    <td>${url
      ? `<a class="wa-link" href="${url}" target="_blank" rel="noopener"><i data-lucide="message-circle" style="width:13px;height:13px"></i></a>`
      : '<span class="text-muted">—</span>'
    }</td>
    <td>${itemNome}</td>
    <td><span class="badge ${badgeProfissional(e.profissional, cfg)}">${e.profissional || '—'}</span></td>
    <td class="td-center">${qtd}</td>
    <td class="td-right td-mono">${R$(custoT)}</td>
    <td class="td-right td-mono fw-600" style="color:var(--txt-green)">${cobrado ? R$(cobrado) : '<span class="text-muted">—</span>'}</td>
    <td class="td-right td-mono" style="color:var(--plum)">${comissao > 0 ? R$(comissao) : '<span class="text-muted">—</span>'}</td>
    <td class="td-right td-mono fw-600" style="color:${lucroReal >= 0 ? 'var(--txt-green)' : 'var(--txt-red)'}">
      ${cobrado ? R$(lucroReal) : '<span class="text-muted">—</span>'}
    </td>
    <td><span class="badge badge-plum" style="font-size:10px">${e.formaPagamento || '—'}</span></td>
    <td class="text-muted" style="font-size:12px;max-width:90px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e.obs || ''}</td>
    <td style="white-space:nowrap">
      <button class="btn btn-sm btn-secondary" data-edit="${e.id}">✎</button>
      <button class="btn btn-sm btn-danger" data-del="${e.id}">×</button>
    </td>
  </tr>`;
}

// ══════════════════════════════════════════════════════
// FORMULÁRIO PDV — 3 blocos, mesma lógica do v2.2
// ══════════════════════════════════════════════════════
function abrirFormAtend(entry, svcs, prods, profs, formas, cfg, tipoInicial = 'servico', onSave) {
  const isEdit   = !!entry;
  const e        = entry || { data: hoje(), qtd: 1, tipo: tipoInicial };
  const tipoAtual = e.tipo ?? tipoInicial;

  const svcOptions  = svcs.map(s =>
    `<option value="${s.id}" ${e.servicoId == s.id ? 'selected' : ''}>${s.nome}</option>`
  ).join('');
  const profOptions = profs.map(p =>
    `<option value="${p}" ${e.profissional === p ? 'selected' : ''}>${p}</option>`
  ).join('');
  const pgtoOptions = formas.map(f =>
    `<option value="${f}" ${e.formaPagamento === f ? 'selected' : ''}>${f}</option>`
  ).join('');
  const prodDatalist = prods.map(p =>
    `<option value="${p.sku}">${p.sku} — ${p.nome} (R$ ${Number(p.precoVenda||0).toFixed(2)})</option>`
  ).join('');

  const prodAtual = isEdit && tipoAtual === 'produto' ? prods.find(p => p.id == e.produtoId) : null;

  const alertaEdicaoProd = isEdit && tipoAtual === 'produto'
    ? `<div style="background:var(--rose-pale);border:1px solid var(--rose);border-radius:var(--radius-sm);padding:10px 14px;font-size:12px;color:var(--txt-red);margin-bottom:12px">
        Ao editar venda de produto, a quantidade <strong>não ajusta o estoque automaticamente</strong>. Corrija manualmente em Produtos se necessário.
       </div>`
    : '';

  // ── Bloco 1: O que e para quem ──────────────────────
  const bloco1 = `
    <!-- Toggle Tipo -->
    <div class="form-group full" style="margin-bottom:8px">
      <label>Tipo de Lançamento</label>
      <div class="pdv-tipo-toggle">
        <button type="button" id="fa-tipo-svc"  class="pdv-tipo-btn ${tipoAtual==='servico'?'active':''}">✂ Serviço</button>
        <button type="button" id="fa-tipo-prod" class="pdv-tipo-btn ${tipoAtual==='produto'?'active':''}">📦 Produto</button>
      </div>
    </div>

    <!-- Seção Serviço -->
    <div class="form-group full" id="sec-servico" style="${tipoAtual!=='servico'?'display:none':''}">
      <label>Serviço</label>
      <select id="fa-svc">
        <option value="">— Selecione o serviço —</option>
        ${svcOptions}
      </select>
    </div>
    <div class="form-grid cols-2">
      <div class="form-group" id="sec-cat" style="${tipoAtual!=='servico'?'display:none':''}">
        <label>Categoria (auto)</label>
        <input type="text" id="fa-cat" readonly value="${e.categoria || ''}" />
      </div>
      <div class="form-group" id="sec-tempo" style="${tipoAtual!=='servico'?'display:none':''}">
        <label>Tempo em min (auto)</label>
        <input type="number" id="fa-tempo" readonly value="${e.tempoMin || ''}" />
      </div>
    </div>

    <!-- Seção Produto -->
    <div class="form-group full" id="sec-produto" style="${tipoAtual!=='produto'?'display:none':''}">
      <label>Produto (SKU ou nome)</label>
      <input type="text" id="fa-prod-busca" list="listProdutos"
        value="${prodAtual ? prodAtual.sku : ''}"
        placeholder="Ex: P001 ou 'Ox 20vol'" />
      <datalist id="listProdutos">${prodDatalist}</datalist>
    </div>
    <div class="form-group full" id="sec-prod-nome" style="${tipoAtual!=='produto'?'display:none':''}">
      <label>Produto selecionado</label>
      <input type="text" id="fa-prod-nome" readonly value="${prodAtual?.nome || ''}" />
    </div>
    <input type="hidden" id="fa-prod-id" value="${e.produtoId || ''}" />

    <!-- Cliente e telefone -->
    <div class="form-grid cols-2">
      <div class="form-group">
        <label>Nome da Cliente</label>
        <input type="text" id="fa-cliente" value="${e.cliente || ''}" placeholder="Nome da cliente" />
      </div>
      <div class="form-group">
        <label>Telefone / WhatsApp</label>
        <input type="text" id="fa-tel" value="${e.telefone || ''}" placeholder="(43) 99999-1234" />
      </div>
    </div>
  `;

  // ── Bloco 2: Quanto e como ───────────────────────────
  const bloco2 = `
    <!-- Preço cobrado — campo de destaque -->
    <div class="form-group full">
      <label style="font-weight:700;color:var(--txt-green)">Preço Cobrado (R$)</label>
      <input type="number" id="fa-cobrado" class="input-cobrado"
        value="${e.precoCobrado || ''}" min="0" step="0.01"
        placeholder="0,00" />
    </div>
    <div class="form-grid cols-2">
      <div class="form-group">
        <label>Forma de Pagamento</label>
        <select id="fa-pgto">
          <option value="">— Selecione —</option>
          ${pgtoOptions}
        </select>
      </div>
      <div class="form-group">
        <label>Profissional</label>
        <select id="fa-prof">
          <option value="">— Selecione —</option>
          ${profOptions}
        </select>
      </div>
    </div>
    <div id="fa-lucro-preview"></div>
  `;

  // ── Bloco 3: Detalhes ────────────────────────────────
  const bloco3 = `
    <div class="form-grid cols-2">
      <div class="form-group">
        <label>Data</label>
        <input type="date" id="fa-data" value="${e.data || hoje()}" />
      </div>
      <div class="form-group">
        <label>Qtd</label>
        <input type="number" id="fa-qtd" value="${e.qtd || 1}" min="1" />
      </div>
      <div class="form-group">
        <label>Comissão (%)</label>
        <input type="number" id="fa-comissao-pct"
          value="${e.comissaoPct || ''}"
          min="0" max="100" step="1" placeholder="Ex: 40" />
      </div>
      <div class="form-group">
        <label>Comissão R$ (auto)</label>
        <input type="text" id="fa-comissao-val" readonly
          value="${e.comissaoValor ? R$(e.comissaoValor) : ''}" />
      </div>
      <div class="form-group">
        <label>Custo Total (auto)</label>
        <input type="number" id="fa-ctotal" readonly value="${e.custoTotal || ''}" />
      </div>
      <div class="form-group">
        <label>Observações</label>
        <input type="text" id="fa-obs" value="${e.obs || ''}" placeholder="Opcional" />
      </div>
    </div>
  `;

  const body = `
    ${alertaEdicaoProd}
    ${formBloco('O que e para quem', bloco1, 'scissors')}
    ${formBloco('Quanto e como pagar', bloco2, 'banknote')}
    ${formBloco('Detalhes opcionais', bloco3, 'sliders')}
    <div id="fa-wa-preview" style="margin-top:4px"></div>
  `;

  const footer = `
    <button class="btn btn-secondary" id="fa-cancel">Cancelar</button>
    <button class="btn btn-primary" id="fa-save">${isEdit ? 'Salvar alterações' : 'Registrar lançamento'}</button>
  `;

  openModal(isEdit ? 'Editar Lançamento' : 'Novo Lançamento', body, footer);
  if (window.lucide) window.lucide.createIcons();
  applyMoneyMask(document.getElementById('modalBody'));

  // ── Toggle tipo ──────────────────────────────────────
  let tipoSelecionado = tipoAtual;

  function setTipo(t) {
    tipoSelecionado = t;
    document.getElementById('fa-tipo-svc').classList.toggle('active', t === 'servico');
    document.getElementById('fa-tipo-prod').classList.toggle('active', t === 'produto');
    ['sec-servico','sec-cat','sec-tempo'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = t === 'servico' ? '' : 'none';
    });
    ['sec-produto','sec-prod-nome'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = t === 'produto' ? '' : 'none';
    });
    document.getElementById('fa-ctotal').value = '';
    document.getElementById('fa-cobrado').value = '';
    document.getElementById('fa-comissao-val').value = '';
    document.getElementById('fa-lucro-preview').innerHTML = '';
  }

  document.getElementById('fa-tipo-svc').onclick  = () => setTipo('servico');
  document.getElementById('fa-tipo-prod').onclick = () => setTipo('produto');

  // ── Auto-fill ao selecionar serviço ─────────────────
  document.getElementById('fa-svc').onchange = () => {
    const svcId = parseInt(document.getElementById('fa-svc').value);
    const svc   = svcs.find(s => s.id === svcId);
    if (!svc) return;
    document.getElementById('fa-cat').value   = svc.categoria || '';
    document.getElementById('fa-tempo').value = svc.tempoMin || '';
    const tempoH    = (parseFloat(svc.tempoMin)||0)/60;
    const custoTempo= tempoH * (parseFloat(cfg.valorHora)||0);
    let custoProd   = 0;
    if (svc.qtdProduto && svc.custoPorUnidade)
      custoProd = (parseFloat(svc.qtdProduto)||0) * (parseFloat(svc.custoPorUnidade)||0);
    else
      custoProd = parseFloat(svc.custoProduto)||0;
    document.getElementById('fa-ctotal').value = (custoProd + custoTempo).toFixed(2);
    atualizarLucro();
  };

  // ── Auto-fill ao buscar produto ──────────────────────
  document.getElementById('fa-prod-busca').oninput = () => {
    const busca = document.getElementById('fa-prod-busca').value.trim();
    const prod  = Produtos.bySku(busca) || prods.find(p =>
      p.nome.toLowerCase().includes(busca.toLowerCase())
    );
    if (prod) {
      document.getElementById('fa-prod-id').value   = prod.id;
      document.getElementById('fa-prod-nome').value = prod.nome;
      document.getElementById('fa-cobrado').value   = prod.precoVenda?.toFixed(2) || '';
      document.getElementById('fa-ctotal').value    = prod.custoProd?.toFixed(2) || '0.00';
      atualizarLucro();
    } else {
      document.getElementById('fa-prod-id').value   = '';
      document.getElementById('fa-prod-nome').value = '';
    }
  };

  // ── Preview de lucro em tempo real ───────────────────
  function atualizarLucro() {
    const cobrado  = parseFloat(document.getElementById('fa-cobrado').value) || 0;
    const custo    = parseFloat(document.getElementById('fa-ctotal').value)  || 0;
    const pctVal   = parseFloat(document.getElementById('fa-comissao-pct').value) || 0;
    const comissao = cobrado * (pctVal / 100);
    const lucroReal= cobrado - custo - comissao;

    const comissaoEl = document.getElementById('fa-comissao-val');
    if (comissaoEl) comissaoEl.value = comissao > 0 ? R$(comissao) : '';

    const prev = document.getElementById('fa-lucro-preview');
    if (!prev) return;
    if (cobrado > 0) {
      const margem = (lucroReal/cobrado*100).toFixed(1);
      const cls    = lucroReal >= 0 ? 'lucro-preview--pos' : 'lucro-preview--neg';
      prev.innerHTML = `
        <div class="lucro-preview ${cls}">
          <span>Lucro real: <strong style="color:${lucroReal>=0?'var(--txt-green)':'var(--txt-red)'}">${R$(lucroReal)}</strong></span>
          <span>Margem: <strong>${margem}%</strong></span>
          ${comissao > 0 ? `<span>Comissão: <strong style="color:var(--plum)">${R$(comissao)}</strong></span>` : ''}
        </div>`;
    } else {
      prev.innerHTML = '';
    }
  }

  document.getElementById('fa-cobrado').oninput       = atualizarLucro;
  document.getElementById('fa-comissao-pct').oninput  = atualizarLucro;
  if (isEdit) atualizarLucro();

  // ── Preview WhatsApp ─────────────────────────────────
  document.getElementById('fa-tel').onblur = () => {
    const n       = limparTelefone(document.getElementById('fa-tel').value);
    const preview = document.getElementById('fa-wa-preview');
    if (n.length >= 10) {
      const url = linkWA(n);
      preview.innerHTML = url
        ? `<a class="wa-link" href="${url}" target="_blank" rel="noopener">📱 Abrir WhatsApp → ${formatarTelefone(n)}</a>`
        : '';
    } else if (n.length > 0) {
      preview.innerHTML = `<span style="color:var(--txt-red);font-size:12px">⚠ Número incompleto — inclua o DDD</span>`;
    } else {
      preview.innerHTML = '';
    }
  };

  // ── Cancelar / Salvar ────────────────────────────────
  document.getElementById('fa-cancel').onclick = closeModal;

  document.getElementById('fa-save').onclick = () => {
    const data    = document.getElementById('fa-data').value;
    if (!data) return toast('Informe a data.', 'error');

    const cobrado        = parseFloat(document.getElementById('fa-cobrado').value) || 0;
    const pctVal         = parseFloat(document.getElementById('fa-comissao-pct').value) || 0;
    const custo          = parseFloat(document.getElementById('fa-ctotal').value) || 0;
    const comissaoValor  = cobrado * (pctVal / 100);
    const cliente        = document.getElementById('fa-cliente').value.trim();
    const tel            = document.getElementById('fa-tel').value.trim();
    const qtd            = parseInt(document.getElementById('fa-qtd').value) || 1;
    const obs            = document.getElementById('fa-obs').value.trim();

    let entryData;

    if (tipoSelecionado === 'produto') {
      const prodId = parseInt(document.getElementById('fa-prod-id').value);
      if (!prodId) return toast('Selecione um produto.', 'error');
      const prod = Produtos.byId(prodId);

      entryData = {
        tipo: 'produto', produtoId: prodId, produtoNome: prod?.nome || '',
        servicoId: null, servicoNome: '', categoria: prod?.categoria || '',
        data, cliente, telefone: tel, profissional: document.getElementById('fa-prof').value,
        qtd, tempoMin: 0,
        custoProduto: prod ? (parseFloat(prod.custoProd)||0) : 0,
        custoTotal: custo, precoCobrado: cobrado,
        comissaoPct: pctVal, comissaoValor,
        formaPagamento: document.getElementById('fa-pgto').value, obs,
      };

      // Baixa estoque apenas em novos lançamentos
      if (!isEdit && prodId) Produtos.baixarEstoque(prodId, qtd);

    } else {
      const svcId = parseInt(document.getElementById('fa-svc').value);
      if (!svcId) return toast('Selecione um serviço.', 'error');
      const prof  = document.getElementById('fa-prof').value;
      if (!prof)  return toast('Selecione a profissional.', 'error');
      const svc   = svcs.find(s => s.id === svcId);

      entryData = {
        tipo: 'servico', produtoId: null, produtoNome: '',
        servicoId: svcId, servicoNome: svc ? svc.nome : '',
        categoria: svc ? svc.categoria : '',
        data, cliente, telefone: tel, profissional: prof,
        qtd, tempoMin: parseFloat(document.getElementById('fa-tempo').value) || 0,
        custoProduto: svc ? (parseFloat(svc.custoProduto)||0) : 0,
        custoTotal: custo, precoCobrado: cobrado,
        comissaoPct: pctVal, comissaoValor,
        formaPagamento: document.getElementById('fa-pgto').value, obs,
      };
    }

    if (isEdit) {
      Diario.update(e.id, { ...entryData, id: e.id });
    } else {
      Diario.add(entryData);
    }

    // Indexa cliente no CRM diretamente — sem reindexar tudo
    if (cliente) Clientes.upsert(cliente, {});

    closeModal();
    toast(isEdit ? 'Lançamento atualizado! ✓' : 'Lançamento registrado! ✓', 'success');
    onSave();
  };
}

// ── Modal de Perfil de Cliente (CRM rápido) ─────────────
// Preservado intacto do v2.2, apenas migrado para helpers do ui.js
function abrirPerfilCliente(nome, cfg) {
  if (!nome) return;
  Clientes.syncFromDiarioAgenda();
  const cliente = Clientes.getByNome(nome) || { nome, obs: '' };
  const stats   = Clientes.calcStats(nome);

  const body = `
    ${clienteStatCards(stats)}

    <div class="form-group" style="margin-bottom:16px">
      <label>Observações Técnicas</label>
      <textarea id="crm-obs" rows="3" placeholder="Ex: Coloração 7.1 com ox 20. Alergia a amônia.">${cliente.obs || ''}</textarea>
    </div>
    <button class="btn btn-primary btn-sm" id="crm-salvar-obs" style="margin-bottom:16px">Salvar Observações</button>

    <div class="total-label-dark" style="margin-bottom:8px">Timeline de Atendimentos</div>
    <div style="max-height:260px;overflow-y:auto">
      ${timelineList(stats.timeline, 12)}
    </div>
    ${stats.timeline.length > 12
      ? `<p class="text-muted" style="font-size:12px;margin-top:8px">Exibindo 12 de ${stats.timeline.length}. Ver todos em <strong>Clientes</strong>.</p>`
      : ''}
  `;

  const footer = `<button class="btn btn-secondary" id="crm-fechar">Fechar</button>`;
  openModal(`✦ ${nome}`, body, footer);

  document.getElementById('crm-fechar').onclick = closeModal;
  document.getElementById('crm-salvar-obs').onclick = () => {
    const obs = document.getElementById('crm-obs').value.trim();
    Clientes.upsert(nome, { obs });
    toast('Observações salvas! ✓', 'success');
    document.getElementById('crm-salvar-obs').textContent = 'Salvo ✓';
  };
}
