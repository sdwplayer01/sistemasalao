// ═══════════════════════════════════════════════════════
// pages/diario.js — Diário / Frente de Caixa (PDV) v2.2
// Suporta Serviços e Venda de Produtos com:
//   - Toggle Serviço / Produto
//   - Abatimento de estoque com alerta em edições
//   - Comissão sobre preço de venda bruto
//   - LucroReal = Cobrado - Custo - Comissão
// ═══════════════════════════════════════════════════════
import { Diario, Servicos, Produtos, Clientes, Config, MESES } from '../storage.js';
import { R$, pct, fmtData, hoje, diaSemana, formatarTelefone,
         linkWA, limparTelefone, toast, openModal, closeModal, emptyState, applyMoneyMask } from '../utils.js';

let _filtroMes  = '';
let _filtroProf = '';

// ── Cor do badge conforme profissional ─────────────────
// Conv.: O 1º item de cfg.profissionais[] é a proprietária → badge-plum
function badgeProfissional(nome, cfg) {
  if (!nome) return 'badge-rose';
  const profs = cfg.profissionais || [];
  if (profs[0] && nome === profs[0]) return 'badge-plum';             // Proprietária
  const palette = ['badge-rose', 'badge-green', 'badge-warn', 'badge-blue'];
  const idx = profs.indexOf(nome);
  return idx >= 0 ? palette[(idx) % palette.length] : 'badge-rose';
}

export function renderDiario(container) {
  const cfg    = Config.get();
  const svcs   = Servicos.getAll();
  const prods  = Produtos.getAll();
  const profs  = cfg.profissionais || [];
  const formas = cfg.formasPagamento || ['Dinheiro','PIX','Cartão Débito','Cartão Crédito','Transferência'];

  container.innerHTML = `
    <div class="section-title">Diário de Atendimentos</div>
    <div class="section-sub">Frente de caixa unificada — registre serviços e vendas de produtos.</div>

    <div class="action-bar">
      <button class="btn btn-primary" id="btnNovoAtend">+ Novo Lançamento</button>
      <select id="filtroMes" style="max-width:160px">
        <option value="">Todos os meses</option>
        ${MESES.map((m,i)=>`<option value="${i}">${m}</option>`).join('')}
      </select>
      <select id="filtroProf" style="max-width:160px">
        <option value="">Todas as profissionais</option>
        ${profs.map(p=>`<option value="${p}">${p}</option>`).join('')}
      </select>
    </div>

    <div id="diarioResumo"></div>
    <div id="diarioTabela"></div>
  `;

  document.getElementById('btnNovoAtend').onclick = () =>
    abrirFormAtend(null, svcs, prods, profs, formas, cfg, () => renderDiario(container));
  document.getElementById('filtroMes').onchange  = e => { _filtroMes  = e.target.value; renderTabela(svcs, prods, formas, cfg); };
  document.getElementById('filtroProf').onchange = e => { _filtroProf = e.target.value; renderTabela(svcs, prods, formas, cfg); };

  renderTabela(svcs, prods, formas, cfg);
}

// ── Resumo do período filtrado ──────────────────────────
function renderResumoMes(entries) {
  const resumoEl = document.getElementById('diarioResumo');
  if (!resumoEl || !entries.length) { if(resumoEl) resumoEl.innerHTML=''; return; }

  const atend      = entries.reduce((s,e) => s+(parseInt(e.qtd)||1), 0);
  const fat        = entries.reduce((s,e) => s+(parseFloat(e.precoCobrado)||0)*(parseInt(e.qtd)||1), 0);
  const custo      = entries.reduce((s,e) => s+(parseFloat(e.custoTotal)||0)*(parseInt(e.qtd)||1), 0);
  const comissao   = entries.reduce((s,e) => s+(parseFloat(e.comissaoValor)||0)*(parseInt(e.qtd)||1), 0);
  const lucroReal  = fat - custo - comissao;
  const margem     = fat > 0 ? lucroReal/fat : 0;

  const fatServicos = entries
    .filter(e => (e.tipo ?? 'servico') === 'servico')
    .reduce((s,e) => s+(parseFloat(e.precoCobrado)||0)*(parseInt(e.qtd)||1), 0);
  const fatProdutos = entries
    .filter(e => e.tipo === 'produto')
    .reduce((s,e) => s+(parseFloat(e.precoCobrado)||0)*(parseInt(e.qtd)||1), 0);

  resumoEl.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:12px;margin-bottom:16px">
      <div class="kpi-card plum" style="padding:12px 16px">
        <div class="kpi-label">Lançamentos</div>
        <div class="kpi-value" style="font-size:22px">${atend}</div>
      </div>
      <div class="kpi-card green" style="padding:12px 16px">
        <div class="kpi-label">Faturamento</div>
        <div class="kpi-value" style="font-size:22px">${R$(fat)}</div>
        <div class="kpi-sub">Serv: ${R$(fatServicos)} · Prod: ${R$(fatProdutos)}</div>
      </div>
      <div class="kpi-card rose" style="padding:12px 16px">
        <div class="kpi-label">Custo Total</div>
        <div class="kpi-value" style="font-size:22px">${R$(custo)}</div>
      </div>
      ${comissao > 0 ? `
      <div class="kpi-card" style="padding:12px 16px;border-left:3px solid var(--plum-mid)">
        <div class="kpi-label">Comissões Pagas</div>
        <div class="kpi-value" style="font-size:22px;color:var(--plum-light)">${R$(comissao)}</div>
      </div>` : ''}
      <div class="kpi-card ${lucroReal >= 0 ? 'green' : 'warn'}" style="padding:12px 16px">
        <div class="kpi-label">Lucro Real</div>
        <div class="kpi-value" style="font-size:22px">${R$(lucroReal)}</div>
        <div class="kpi-sub">Após comissões</div>
      </div>
      <div class="kpi-card blue" style="padding:12px 16px">
        <div class="kpi-label">Margem Real</div>
        <div class="kpi-value" style="font-size:22px">${pct(margem)}</div>
      </div>
    </div>
  `;
}

// ── Tabela de lançamentos ───────────────────────────────
function renderTabela(svcs, prods, formas, cfg) {
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
    container.innerHTML = emptyState('Nenhum lançamento registrado. Clique em "+ Novo Lançamento".');
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
            <th class="td-right" style="color:var(--plum-light)">Comissão</th>
            <th class="td-right">Lucro Real</th>
            <th>Pgto</th>
            <th>Obs.</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${entries.map(e => rowHTML(e, svcs, prods, cfg)).join('')}
        </tbody>
      </table>
    </div>
  `;

  // Handlers de edição / deleção
  container.querySelectorAll('[data-edit]').forEach(btn => {
    btn.onclick = () => {
      const entry = Diario.getAll().find(e => e.id == btn.dataset.edit);
      if (entry) abrirFormAtend(entry, svcs, prods, cfg.profissionais||[], formas, cfg, () => renderTabela(svcs, prods, formas, cfg));
    };
  });
  container.querySelectorAll('[data-del]').forEach(btn => {
    btn.onclick = () => {
      if (confirm('Remover este lançamento?')) {
        Diario.remove(parseInt(btn.dataset.del));
        renderTabela(svcs, prods, formas, cfg);
        toast('Lançamento removido.', 'default');
      }
    };
  });

  // Links de perfil de cliente
  container.querySelectorAll('.cliente-link').forEach(btn => {
    btn.onclick = () => abrirPerfilCliente(btn.dataset.nome, cfg);
  });
}

// ── Linha da tabela ─────────────────────────────────────
function rowHTML(e, svcs, prods, cfg) {
  const tipo       = e.tipo ?? 'servico';
  const qtd        = parseInt(e.qtd) || 1;
  const tel        = e.telefone ? limparTelefone(e.telefone) : '';
  const url        = tel.length >= 10 ? linkWA(tel) : null;
  const custoT     = (parseFloat(e.custoTotal)||0) * qtd;
  const cobrado    = (parseFloat(e.precoCobrado)||0) * qtd;
  const comissao   = (parseFloat(e.comissaoValor)||0) * qtd;
  const lucroReal  = cobrado - custoT - comissao;

  // Identificar nome do item
  let itemNome = '—';
  if (tipo === 'produto') {
    const prod = prods.find(p => p.id == e.produtoId);
    itemNome = `<span class="badge" style="background:var(--lavender);color:var(--plum-light);font-size:10px;margin-right:4px;font-family:monospace">${prod?.sku || 'P?'}</span>${e.produtoNome || prod?.nome || '—'}`;
  } else {
    const svc = svcs.find(s => s.id == e.servicoId);
    itemNome = svc ? svc.nome : (e.servicoNome || '—');
  }

  const tipoBadge = tipo === 'produto'
    ? `<span class="badge" style="background:rgba(126,177,255,.12);color:var(--txt-blue);font-size:10px">📦 Produto</span>`
    : `<span class="badge" style="background:rgba(196,135,154,.12);color:#F1C6D3;font-size:10px">✂ Serviço</span>`;

  const nomeCliente = e.cliente
    ? `<button class="cliente-link" data-nome="${e.cliente}">${e.cliente}</button>`
    : '<span class="text-muted">—</span>';

  return `<tr>
    <td>${fmtData(e.data)}</td>
    <td><span class="badge badge-plum">${diaSemana(e.data)}</span></td>
    <td>${tipoBadge}</td>
    <td>${nomeCliente}</td>
    <td>${url
      ? `<a class="wa-link" href="${url}" target="_blank" rel="noopener">📱</a>`
      : `<span class="text-muted">—</span>`
    }</td>
    <td>${itemNome}</td>
    <td><span class="badge ${badgeProfissional(e.profissional, cfg)}">${e.profissional || '—'}</span></td>
    <td class="td-center">${qtd}</td>
    <td class="td-right td-mono">${R$(custoT)}</td>
    <td class="td-right td-mono fw-600" style="color:var(--txt-green)">${cobrado ? R$(cobrado) : '<span class="text-muted">—</span>'}</td>
    <td class="td-right td-mono" style="color:var(--plum-light)">${comissao > 0 ? R$(comissao) : '<span class="text-muted">—</span>'}</td>
    <td class="td-right td-mono fw-600" style="color:${lucroReal >= 0 ? 'var(--txt-green)' : 'var(--txt-red)'}">
      ${cobrado ? R$(lucroReal) : '<span class="text-muted">—</span>'}
    </td>
    <td><span class="badge" style="background:var(--lavender);color:var(--plum);font-size:10px">${e.formaPagamento || '—'}</span></td>
    <td class="text-muted" style="font-size:12px;max-width:90px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e.obs || ''}</td>
    <td style="white-space:nowrap">
      <button class="btn btn-sm btn-secondary" data-edit="${e.id}">✎</button>
      <button class="btn btn-sm btn-danger" data-del="${e.id}">×</button>
    </td>
  </tr>`;
}

// ── Formulário PDV (Novo / Editar) ──────────────────────
function abrirFormAtend(entry, svcs, prods, profs, formas, cfg, onSave) {
  const isEdit  = !!entry;
  const e       = entry || { data: hoje(), qtd: 1, tipo: 'servico' };
  const tipoAtual = e.tipo ?? 'servico';

  const svcOptions  = svcs.map(s =>
    `<option value="${s.id}" ${e.servicoId == s.id ? 'selected' : ''}>${s.nome}</option>`
  ).join('');
  const profOptions = profs.map(p =>
    `<option value="${p}" ${e.profissional === p ? 'selected' : ''}>${p}</option>`
  ).join('');
  const pgtoOptions = formas.map(f =>
    `<option value="${f}" ${e.formaPagamento === f ? 'selected' : ''}>${f}</option>`
  ).join('');

  // Datalist de produtos (busca por SKU ou nome)
  const prodDatalist = prods.map(p =>
    `<option value="${p.sku}">${p.sku} — ${p.nome} (R$ ${Number(p.precoVenda).toFixed(2)})</option>`
  ).join('');

  // Produto selecionado no momento da edição
  const prodAtual = isEdit && tipoAtual === 'produto' ? prods.find(p => p.id == e.produtoId) : null;

  // Alerta de edição de produto (estoque não é revertido automaticamente)
  const alertaEdicaoProd = isEdit && tipoAtual === 'produto'
    ? `<div style="background:rgba(240,138,138,.12);border:1px solid rgba(240,138,138,.25);border-radius:8px;padding:10px 14px;font-size:12px;color:var(--txt-red);margin-bottom:12px">
        ⚠ Atenção: ao editar uma venda de produto, a alteração de quantidade <strong>não ajusta o estoque automaticamente</strong>. Corrija o estoque manualmente na aba de Produtos se necessário.
       </div>`
    : '';

  const body = `
    ${alertaEdicaoProd}

    <!-- Toggle Tipo -->
    <div class="form-group full" style="margin-bottom:4px">
      <label>Tipo de Lançamento</label>
      <div class="pdv-tipo-toggle">
        <button type="button" id="fa-tipo-svc" class="pdv-tipo-btn ${tipoAtual === 'servico' ? 'active' : ''}">✂ Serviço</button>
        <button type="button" id="fa-tipo-prod" class="pdv-tipo-btn ${tipoAtual === 'produto' ? 'active' : ''}">📦 Venda de Produto</button>
      </div>
    </div>

    <div class="form-grid cols-2" style="margin-top:12px">

      <!-- Campos comuns -->
      <div class="form-group">
        <label>Data</label>
        <input type="date" id="fa-data" value="${e.data || hoje()}" />
      </div>
      <div class="form-group">
        <label>Qtd de Itens / Atendimentos</label>
        <input type="number" id="fa-qtd" value="${e.qtd || 1}" min="1" />
      </div>
      <div class="form-group">
        <label>Nome da Cliente</label>
        <input type="text" id="fa-cliente" value="${e.cliente || ''}" placeholder="Nome da cliente" />
      </div>
      <div class="form-group">
        <label>Telefone / WhatsApp</label>
        <input type="text" id="fa-tel" value="${e.telefone || ''}" placeholder="(43) 99999-1234" />
      </div>

      <!-- Seção: Serviço -->
      <div class="form-group full" id="sec-servico" style="${tipoAtual !== 'servico' ? 'display:none' : ''}">
        <label>Serviço</label>
        <select id="fa-svc">
          <option value="">— Selecione o serviço —</option>
          ${svcOptions}
        </select>
      </div>
      <div class="form-group" id="sec-cat" style="${tipoAtual !== 'servico' ? 'display:none' : ''}">
        <label>Categoria (auto)</label>
        <input type="text" id="fa-cat" readonly value="${e.categoria || ''}" />
      </div>
      <div class="form-group" id="sec-tempo" style="${tipoAtual !== 'servico' ? 'display:none' : ''}">
        <label>Tempo (min, auto)</label>
        <input type="number" id="fa-tempo" readonly value="${e.tempoMin || ''}" />
      </div>

      <!-- Seção: Produto -->
      <div class="form-group full" id="sec-produto" style="${tipoAtual !== 'produto' ? 'display:none' : ''}">
        <label>Produto (busque por SKU ou nome)</label>
        <input type="text" id="fa-prod-busca" list="listProdutos"
          value="${prodAtual ? prodAtual.sku : ''}"
          placeholder="Ex: P001 ou 'Ox 20vol'" />
        <datalist id="listProdutos">${prodDatalist}</datalist>
      </div>
      <div class="form-group" id="sec-prod-nome" style="${tipoAtual !== 'produto' ? 'display:none' : ''}">
        <label>Produto selecionado</label>
        <input type="text" id="fa-prod-nome" readonly value="${prodAtual?.nome || ''}" />
      </div>
      <input type="hidden" id="fa-prod-id" value="${e.produtoId || ''}" />

      <!-- Custo Total (ambos os tipos) -->
      <div class="form-group">
        <label>Custo Total (auto)</label>
        <input type="text" id="fa-ctotal" readonly value="${e.custoTotal ? Number(e.custoTotal).toFixed(2) : ''}" />
      </div>

      <!-- Preço Cobrado -->
      <div class="form-group" style="background:var(--sage);padding:12px;border-radius:var(--radius);border:2px solid #4CAF50">
        <label style="color:var(--txt-green);font-weight:600">💰 Preço Cobrado (R$)</label>
        <input type="number" id="fa-cobrado" value="${e.precoCobrado || ''}" min="0" step="0.01" placeholder="0,00"
          data-money style="font-size:16px;font-weight:600" />
      </div>

      <!-- Profissional -->
      <div class="form-group">
        <label>Profissional</label>
        <select id="fa-prof">
          <option value="">— Selecione —</option>
          ${profOptions}
        </select>
      </div>

      <!-- Comissão -->
      <div class="form-group" style="background:var(--lavender);padding:12px;border-radius:var(--radius)">
        <label style="color:var(--plum-light)">% Comissão (sobre cobrado)</label>
        <input type="number" id="fa-comissao-pct" value="${e.comissaoPct ?? ''}"
          min="0" max="100" step="1" placeholder="Ex: 40" />
      </div>
      <div class="form-group">
        <label>Comissão em R$ (auto)</label>
        <input type="text" id="fa-comissao-val" readonly
          value="${e.comissaoValor ? R$(e.comissaoValor) : ''}"
          style="color:var(--plum-light)" />
      </div>

      <!-- Forma de Pagamento -->
      <div class="form-group">
        <label>Forma de Pagamento</label>
        <select id="fa-pgto">
          <option value="">— Selecione —</option>
          ${pgtoOptions}
        </select>
      </div>
      <div class="form-group full">
        <label>Observações</label>
        <textarea id="fa-obs" rows="2">${e.obs || ''}</textarea>
      </div>
    </div>

    <div id="fa-lucro-preview" style="margin-top:8px"></div>
    <div id="fa-wa-preview" style="margin-top:8px"></div>
  `;

  const footer = `
    <button class="btn btn-secondary" id="fa-cancel">Cancelar</button>
    <button class="btn btn-primary" id="fa-save">${isEdit ? 'Salvar alterações' : 'Registrar lançamento'}</button>
  `;

  openModal(isEdit ? 'Editar Lançamento' : 'Novo Lançamento', body, footer);
  applyMoneyMask(document.getElementById('modalBody'));

  // ── Toggle tipo ─────────────────────────────────────
  let tipoSelecionado = tipoAtual;

  function setTipo(t) {
    tipoSelecionado = t;
    document.getElementById('fa-tipo-svc').classList.toggle('active', t === 'servico');
    document.getElementById('fa-tipo-prod').classList.toggle('active', t === 'produto');
    const secServico = ['sec-servico','sec-cat','sec-tempo'];
    const secProduto = ['sec-produto','sec-prod-nome'];
    secServico.forEach(id => { const el = document.getElementById(id); if(el) el.style.display = t === 'servico' ? '' : 'none'; });
    secProduto.forEach(id => { const el = document.getElementById(id); if(el) el.style.display = t === 'produto' ? '' : 'none'; });
    document.getElementById('fa-ctotal').value = '';
    document.getElementById('fa-cobrado').value = '';
    document.getElementById('fa-comissao-val').value = '';
    document.getElementById('fa-lucro-preview').innerHTML = '';
  }

  document.getElementById('fa-tipo-svc').onclick  = () => setTipo('servico');
  document.getElementById('fa-tipo-prod').onclick = () => setTipo('produto');

  // ── Auto-preenchimento ao selecionar serviço ─────────
  document.getElementById('fa-svc').onchange = () => {
    const svcId = parseInt(document.getElementById('fa-svc').value);
    const svc   = svcs.find(s => s.id === svcId);
    if (!svc) return;
    document.getElementById('fa-cat').value   = svc.categoria || '';
    document.getElementById('fa-tempo').value = svc.tempoMin || '';
    const tempoH = (parseFloat(svc.tempoMin)||0)/60;
    const custoTempo = tempoH * (parseFloat(cfg.valorHora)||0);
    let custoProd = 0;
    if (svc.qtdProduto && svc.custoPorUnidade) custoProd = (parseFloat(svc.qtdProduto)||0)*(parseFloat(svc.custoPorUnidade)||0);
    else custoProd = parseFloat(svc.custoProduto)||0;
    document.getElementById('fa-ctotal').value = (custoProd + custoTempo).toFixed(2);
    atualizarLucro();
  };

  // ── Auto-preenchimento ao selecionar produto ─────────
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

  // ── Preview lucro em tempo real ─────────────────────
  function atualizarLucro() {
    const cobrado  = parseFloat(document.getElementById('fa-cobrado').value) || 0;
    const custo    = parseFloat(document.getElementById('fa-ctotal').value)  || 0;
    const pctVal   = parseFloat(document.getElementById('fa-comissao-pct').value) || 0;
    const comissao = cobrado * (pctVal / 100);
    const lucroReal = cobrado - custo - comissao;

    // Atualiza campo comissão em R$
    const comissaoEl = document.getElementById('fa-comissao-val');
    if (comissaoEl) comissaoEl.value = comissao > 0 ? R$(comissao) : '';

    const prev = document.getElementById('fa-lucro-preview');
    if (!prev) return;
    if (cobrado > 0) {
      const margem = cobrado > 0 ? (lucroReal/cobrado*100).toFixed(1) : 0;
      const cor    = lucroReal >= 0 ? 'var(--sage)' : '#FEE2E2';
      prev.innerHTML = `
        <div style="display:flex;gap:16px;flex-wrap:wrap;padding:10px 14px;background:${cor};border-radius:var(--radius);font-size:13px">
          <span>Lucro real: <strong style="color:${lucroReal>=0?'var(--txt-green)':'var(--txt-red)'}">${R$(lucroReal)}</strong></span>
          <span>Margem: <strong>${margem}%</strong></span>
          ${comissao>0 ? `<span>Comissão: <strong style="color:var(--plum-light)">${R$(comissao)}</strong></span>` : ''}
        </div>`;
    } else {
      prev.innerHTML = '';
    }
  }

  document.getElementById('fa-cobrado').oninput        = atualizarLucro;
  document.getElementById('fa-comissao-pct').oninput   = atualizarLucro;
  if (isEdit) atualizarLucro();

  // ── Preview WhatsApp ─────────────────────────────────
  const telInput = document.getElementById('fa-tel');
  telInput.onblur = () => {
    const n       = limparTelefone(telInput.value);
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
    const data = document.getElementById('fa-data').value;
    if (!data) return toast('Informe a data.', 'error');

    const cobrado = parseFloat(document.getElementById('fa-cobrado').value) || 0;
    const pctVal  = parseFloat(document.getElementById('fa-comissao-pct').value) || 0;
    const custo   = parseFloat(document.getElementById('fa-ctotal').value) || 0;
    const comissaoValor = cobrado * (pctVal / 100);

    let entryData;

    if (tipoSelecionado === 'produto') {
      const prodId  = parseInt(document.getElementById('fa-prod-id').value);
      if (!prodId) return toast('Selecione um produto.', 'error');
      const prod    = Produtos.byId(prodId);
      const qtd     = parseInt(document.getElementById('fa-qtd').value) || 1;

      entryData = {
        tipo:         'produto',
        produtoId:    prodId,
        produtoNome:  prod?.nome || '',
        servicoId:    null,
        servicoNome:  '',
        categoria:    prod?.categoria || '',
        data,
        cliente:      document.getElementById('fa-cliente').value.trim(),
        telefone:     document.getElementById('fa-tel').value.trim(),
        profissional: document.getElementById('fa-prof').value,
        qtd,
        tempoMin:     0,
        custoProduto: prod ? (parseFloat(prod.custoProd)||0) : 0,
        custoTotal:   custo,
        precoCobrado: cobrado,
        comissaoPct:  pctVal,
        comissaoValor,
        formaPagamento: document.getElementById('fa-pgto').value,
        obs:          document.getElementById('fa-obs').value.trim(),
      };

      // Abatimento de estoque apenas em NOVOS lançamentos
      if (!isEdit && prodId) {
        Produtos.baixarEstoque(prodId, qtd);
      }

    } else {
      const svcId = parseInt(document.getElementById('fa-svc').value);
      if (!svcId) return toast('Selecione um serviço.', 'error');
      const prof  = document.getElementById('fa-prof').value;
      if (!prof)  return toast('Selecione a profissional.', 'error');
      const svc   = svcs.find(s => s.id === svcId);
      const qtd   = parseInt(document.getElementById('fa-qtd').value) || 1;

      entryData = {
        tipo:         'servico',
        produtoId:    null,
        produtoNome:  '',
        servicoId:    svcId,
        servicoNome:  svc ? svc.nome : '',
        categoria:    svc ? svc.categoria : '',
        data,
        cliente:      document.getElementById('fa-cliente').value.trim(),
        telefone:     document.getElementById('fa-tel').value.trim(),
        profissional: prof,
        qtd,
        tempoMin:     parseFloat(document.getElementById('fa-tempo').value) || 0,
        custoProduto: svc ? (parseFloat(svc.custoProduto)||0) : 0,
        custoTotal:   custo,
        precoCobrado: cobrado,
        comissaoPct:  pctVal,
        comissaoValor,
        formaPagamento: document.getElementById('fa-pgto').value,
        obs:          document.getElementById('fa-obs').value.trim(),
      };
    }

    if (isEdit) {
      Diario.update(e.id, { ...entryData, id: e.id });
    } else {
      Diario.add(entryData);
    }

    // Indexa cliente no CRM sempre que houver nome preenchido
    if (entryData.cliente) {
      Clientes.syncFromDiarioAgenda();
    }

    closeModal();
    toast(isEdit ? 'Lançamento atualizado! ✓' : 'Lançamento registrado! ✓', 'success');
    onSave();
  };
}

// ── Modal de Perfil de Cliente (CRM rápido) ────────────
function abrirPerfilCliente(nome, cfg) {
  if (!nome) return;
  Clientes.syncFromDiarioAgenda();
  const cliente = Clientes.getByNome(nome) || { nome, obs: '' };
  const stats   = Clientes.calcStats(nome);

  const timelineHTML = stats.timeline.slice(0, 12).map(t => {
    const origem = t._origem === 'diario'
      ? `<span class="badge badge-green" style="font-size:10px">Atend.</span>`
      : `<span class="badge badge-plum" style="font-size:10px">Agenda</span>`;
    const valor = t.precoCobrado
      ? `<span style="color:var(--txt-green);font-weight:600">${R$(parseFloat(t.precoCobrado))}</span>`
      : (t.status ? `<span class="badge badge-${t.status==='confirmado'?'green':t.status==='cancelado'?'':' plum'}" style="font-size:10px">${t.status}</span>` : '');
    const item = t._origem === 'diario' ? (t.servicoNome || t.produtoNome || '—') : (t.servicoNome || t.obs || '—');
    return `<div style="display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid var(--border);font-size:13px">
      ${origem}
      <span style="color:var(--txt-muted);min-width:70px">${fmtData(t.data)}</span>
      <span style="flex:1">${item}</span>
      ${valor}
    </div>`;
  }).join('');

  const body = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
      <div class="kpi-card plum" style="padding:12px">
        <div class="kpi-label">Visitas</div>
        <div class="kpi-value" style="font-size:22px">${stats.qtdTotal}</div>
      </div>
      <div class="kpi-card green" style="padding:12px">
        <div class="kpi-label">Ticket Médio</div>
        <div class="kpi-value" style="font-size:22px">${R$(stats.ticket)}</div>
      </div>
      <div class="kpi-card" style="padding:12px;border-left:3px solid var(--txt-green)">
        <div class="kpi-label">Fat. Total</div>
        <div class="kpi-value" style="font-size:18px;color:var(--txt-green)">${R$(stats.fat)}</div>
      </div>
      <div class="kpi-card" style="padding:12px;border-left:3px solid var(--plum-mid)">
        <div class="kpi-label">Última Visita</div>
        <div class="kpi-value" style="font-size:18px">${fmtData(stats.ultimaVisita) || '—'}</div>
      </div>
    </div>

    <div class="form-group" style="margin-bottom:16px">
      <label>Observações Técnicas</label>
      <textarea id="crm-obs" rows="3" placeholder="Ex: Coloração 7.1 com ox 20. Alergia a amônia.">${cliente.obs || ''}</textarea>
    </div>
    <button class="btn btn-primary btn-sm" id="crm-salvar-obs" style="margin-bottom:16px">Salvar Observações</button>

    <div style="font-size:11px;font-weight:600;color:var(--txt-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">
      Timeline de Atendimentos
    </div>
    <div>${timelineHTML || '<p class="text-muted" style="font-size:13px">Nenhum registro ainda.</p>'}</div>
    ${stats.timeline.length > 12 ? `<p class="text-muted" style="font-size:12px;margin-top:8px">Exibindo os 12 mais recentes. Ver todos em <strong>Clientes</strong>.</p>` : ''}
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
