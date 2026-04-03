import * as UI from '../ui.js';
// ═══════════════════════════════════════════════════════
// pages/servicos.js — Serviços & Produtos (v2.2)
// Abas: [Serviços] [Produtos]
// ═══════════════════════════════════════════════════════
import { Servicos, Produtos, Receitas, Config, MESES } from '../storage.js';
import { R$, toast, openModal, closeModal, emptyState, applyMoneyMask } from '../utils.js';

let _abaAtiva = 'servicos'; // 'servicos' | 'produtos'

export function renderServicos(container) {
  const cfg = Config.get();
  const svcs = Servicos.getAll();
  const prods = Produtos.getAll();
  const cfPorCliente = Servicos.custoFixoPorClienteCalc(cfg);

  const mesCFNome = parseInt(cfg.mesCustoFixo) >= 0
    ? MESES[parseInt(cfg.mesCustoFixo)]
    : 'Média de todos os meses';

  const lowStockCount = Produtos.getLowStock().length;

  container.innerHTML = `
    <div class="section-title">Serviços & Produtos</div>
    <div class="section-sub">Precificação, catálogo de produtos e controle de estoque.</div>

    <!-- Abas -->
    <div class="tabs-bar">
      <button class="tab-btn ${_abaAtiva === 'servicos' ? 'active' : ''}" id="tabServicos">
        ✂ Serviços
      </button>
      <button class="tab-btn ${_abaAtiva === 'produtos' ? 'active' : ''}" id="tabProdutos">
        📦 Produtos
        ${lowStockCount > 0 ? `<span class="badge badge-warn" style="margin-left:6px">${lowStockCount} baixo</span>` : ''}
      </button>
    </div>

    <!-- Conteúdo das abas -->
    <div id="abaServicos" style="${_abaAtiva !== 'servicos' ? 'display:none' : ''}">
      <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;background:var(--lavender);padding:12px 16px;border-radius:var(--radius);margin-bottom:20px;border:1px solid var(--border)">
        <span style="font-size:12px;color:var(--plum)">⚙ Parâmetros:</span>
        <span class="badge badge-plum">Hora: ${R$(cfg.valorHora)}</span>
        <span class="badge badge-plum">CF/Cliente: ${R$(cfPorCliente)}</span>
        <span class="badge badge-plum">Atend. médios: ${cfg.atendMedios}/mês</span>
        <span class="badge badge-rose">×${cfg.multMin} Mín · ×${cfg.multIdeal} Ideal · ×${cfg.multPrem} Prem</span>
        <span class="badge" style="background:var(--mauve);color:var(--noir)">Ref. CF: ${mesCFNome}</span>
        <a href="#" id="linkAjustarParams" style="font-size:12px;color:var(--plum);margin-left:auto">Ajustar em Configurações →</a>
      </div>
      <div class="action-bar">
        <button class="btn btn-primary" id="btnNovoSvc">+ Novo Serviço</button>
      </div>
      <div id="svcsGrid"></div>
    </div>

    <div id="abaProdutos" style="${_abaAtiva !== 'produtos' ? 'display:none' : ''}">
      <div class="action-bar">
        <button class="btn btn-primary" id="btnNovoProd">+ Novo Produto</button>
      </div>
      <div id="prodsGrid"></div>
    </div>
  `;

  // ── Handlers das abas ──
  document.getElementById('tabServicos').onclick = () => {
    _abaAtiva = 'servicos';
    document.getElementById('abaServicos').style.display = '';
    document.getElementById('abaProdutos').style.display = 'none';
    document.getElementById('tabServicos').classList.add('active');
    document.getElementById('tabProdutos').classList.remove('active');
  };
  document.getElementById('tabProdutos').onclick = () => {
    _abaAtiva = 'produtos';
    document.getElementById('abaServicos').style.display = 'none';
    document.getElementById('abaProdutos').style.display = '';
    document.getElementById('tabServicos').classList.remove('active');
    document.getElementById('tabProdutos').classList.add('active');
  };

  // ── Aba Serviços ──
  document.getElementById('btnNovoSvc').onclick = () =>
    abrirFormSvc(null, cfg, cfPorCliente, () => renderServicos(container));
  document.getElementById('linkAjustarParams').onclick = e => {
    e.preventDefault();
    document.querySelector('[data-page="configuracoes"]').click();
  };
  renderGridServicos(container, svcs, cfg, cfPorCliente);

  // ── Aba Produtos ──
  document.getElementById('btnNovoProd').onclick = () =>
    abrirFormProd(null, cfg, () => renderServicos(container));
  renderGridProdutos(container, prods, cfg);
}

// ══════════════════════════════════════════
// SERVIÇOS
// ══════════════════════════════════════════
function renderGridServicos(container, svcs, cfg, cfPorCliente) {
  const gridEl = document.getElementById('svcsGrid');
  if (!gridEl) return;

  if (!svcs.length) {
    gridEl.innerHTML = emptyState('Nenhum serviço cadastrado. Clique em "+ Novo Serviço".');
    return;
  }

  gridEl.innerHTML = `
    <div class="table-wrap mobile-reflow">
      <table>
        <thead>
          <tr>
            <th>Nome do Serviço</th>
            <th>Categoria</th>
            <th class="td-center">Tempo</th>
            <th class="td-right">C. Produto</th>
            <th class="td-right">C. Tempo</th>
            <th class="td-right">C. Fixo</th>
            <th class="td-right">C. Total</th>
            <th class="td-right" style="background:#7B1414">Mín ×${cfg.multMin}</th>
            <th class="td-right" style="background:#1B5E20">Ideal ×${cfg.multIdeal}</th>
            <th class="td-right" style="background:#856404">Prem ×${cfg.multPrem}</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${svcs.map(s => {
    const p = Servicos.calcPrecos(s, cfg, cfPorCliente);
    return `<tr>
              <td data-label="Serviço" class="fw-600">${s.nome}</td>
              <td data-label="Categoria"><span class="badge badge-plum">${s.categoria || '—'}</span></td>
              <td data-label="Tempo" class="td-center">${s.tempoMin || 0}min</td>
              <td data-label="C. Produto" class="td-right td-mono">${R$(p.custoProduto)}</td>
              <td data-label="C. Tempo" class="td-right td-mono">${R$(p.custoTempo)}</td>
              <td data-label="C. Fixo" class="td-right td-mono">${R$(p.custoFixo)}</td>
              <td data-label="C. Total" class="td-right td-mono fw-600">${R$(p.custoTotal)}</td>
              <td data-label="Mín" class="td-right td-mono" style="background:#FEE2E2;color:var(--txt-red);font-weight:600">${R$(p.precoMin)}</td>
              <td data-label="Ideal" class="td-right td-mono" style="background:var(--sage);color:var(--txt-green);font-weight:700">${R$(p.precoIdeal)}</td>
              <td data-label="Prem" class="td-right td-mono" style="background:#FFF3CD;color:#856404;font-weight:600">${R$(p.precoPrem)}</td>
              <td class="td-actions">
                <button class="btn btn-sm btn-secondary" data-edit-svc="${s.id}">✎</button>
                <button class="btn btn-sm btn-danger" data-del-svc="${s.id}">×</button>
              </td>
            </tr>`;
  }).join('')}
        </tbody>
      </table>
    </div>
  `;

  gridEl.querySelectorAll('[data-edit-svc]').forEach(btn => {
    btn.onclick = () => {
      const svc = Servicos.byId(parseInt(btn.dataset.editSvc));
      if (svc) abrirFormSvc(svc, cfg, cfPorCliente, () => renderServicos(container));
    };
  });
  gridEl.querySelectorAll('[data-del-svc]').forEach(btn => {
    btn.onclick = () => {
      if (confirm('Remover este serviço?')) {
        Servicos.remove(parseInt(btn.dataset.delSvc));
        renderServicos(container);
        toast('Serviço removido.', 'default');
      }
    };
  });
}

function abrirFormSvc(svc, cfg, cfPorCliente, onSave) {
  const s = svc || {};
  const cats = cfg.categorias || [];
  const profs = cfg.profissionais || [];

  function calcPreview() {
    const tempo = parseFloat(document.getElementById('sv-tempo')?.value) || 0;
    const cprod = parseFloat(document.getElementById('sv-cprod')?.value) || 0;
    const qtd = parseFloat(document.getElementById('sv-qtd')?.value) || 0;
    const cpu = parseFloat(document.getElementById('sv-cpu')?.value) || 0;
    const custoProd = (qtd && cpu) ? qtd * cpu : cprod;
    const p = Servicos.calcPrecos({ tempoMin: tempo, custoProduto: custoProd }, cfg, cfPorCliente);
    const cprodCalc = document.getElementById('sv-cprod-calc');
    if (cprodCalc && qtd && cpu) cprodCalc.textContent = `= R$ ${custoProd.toFixed(2)}`;
    const prevEl = document.getElementById('sv-preview');
    if (prevEl) prevEl.innerHTML = `
      <div class="preco-grid" style="margin-top:12px">
        <div class="preco-box preco-min"><div class="preco-label">Mínimo</div><div class="preco-val">${R$(p.precoMin)}</div></div>
        <div class="preco-box preco-ideal"><div class="preco-label">Ideal</div><div class="preco-val">${R$(p.precoIdeal)}</div></div>
        <div class="preco-box preco-prem"><div class="preco-label">Premium</div><div class="preco-val">${R$(p.precoPrem)}</div></div>
      </div>
      <div style="font-size:11px;color:var(--txt-muted);margin-top:8px;text-align:center">
        Custo total: ${R$(p.custoTotal)} · Produto: ${R$(p.custoProduto)} · Tempo: ${R$(p.custoTempo)} · Fixo/cliente: ${R$(p.custoFixo)}
      </div>`;
  }

  const body = `
    <div class="form-grid cols-2">
      <div class="form-group full">
        <label>Nome do Serviço</label>
        <input type="text" id="sv-nome" value="${s.nome || ''}" placeholder="Ex: Corte Feminino" />
      </div>
      <div class="form-group">
        <label>Categoria</label>
        <select id="sv-cat">
          <option value="">— Selecione —</option>
          ${cats.map(c => `<option value="${c}" ${s.categoria === c ? 'selected' : ''}>${c}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Profissional Padrão</label>
        <select id="sv-prof">
          <option value="">— Selecione —</option>
          ${profs.map(p => `<option value="${p}" ${s.profissional === p ? 'selected' : ''}>${p}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Tempo estimado (minutos)</label>
        <input type="number" id="sv-tempo" value="${s.tempoMin || ''}" min="1" placeholder="60" />
      </div>
      <div class="form-group full" style="background:var(--lavender);padding:12px;border-radius:var(--radius)">
        <label style="font-weight:600;color:var(--plum)">📦 Custo do Produto</label>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:8px">
          <div class="form-group" style="margin:0">
            <label style="font-size:11px">Qtd usada (ml / g)</label>
            <input type="number" id="sv-qtd" value="${s.qtdProduto || ''}" min="0" step="0.1" placeholder="ex: 50" />
          </div>
          <div class="form-group" style="margin:0">
            <label style="font-size:11px">Custo por ml/g (R$)</label>
            <input type="number" id="sv-cpu" value="${s.custoPorUnidade || ''}" min="0" step="0.001" placeholder="ex: 0,85" />
          </div>
          <div class="form-group" style="margin:0">
            <label style="font-size:11px">OU custo direto (R$) <span id="sv-cprod-calc" style="color:var(--plum)"></span></label>
            <input type="number" id="sv-cprod" value="${s.custoProduto || ''}" min="0" step="0.01" placeholder="ex: 42,50" />
          </div>
        </div>
        <div style="font-size:11px;color:var(--txt-muted);margin-top:6px">
          Se preencher Qtd + Custo/ml, o sistema usa esses valores. Caso contrário usa o custo direto.
        </div>
      </div>
    </div>
    <div id="sv-preview"></div>
  `;

  const footer = `
    <button class="btn btn-secondary" id="sv-cancel">Cancelar</button>
    <button class="btn btn-primary" id="sv-save">${svc ? 'Salvar alterações' : 'Adicionar serviço'}</button>
  `;

  openModal(svc ? 'Editar Serviço' : 'Novo Serviço', body, footer);

  ['sv-tempo', 'sv-cprod', 'sv-qtd', 'sv-cpu'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.oninput = calcPreview;
  });
  calcPreview();

  document.getElementById('sv-cancel').onclick = closeModal;
  document.getElementById('sv-save').onclick = () => {
    const nome = document.getElementById('sv-nome').value.trim();
    if (!nome) return toast('Informe o nome do serviço.', 'error');
    const data = {
      nome,
      categoria: document.getElementById('sv-cat').value,
      profissional: document.getElementById('sv-prof').value,
      tempoMin: parseFloat(document.getElementById('sv-tempo').value) || 0,
      qtdProduto: parseFloat(document.getElementById('sv-qtd').value) || 0,
      custoPorUnidade: parseFloat(document.getElementById('sv-cpu').value) || 0,
      custoProduto: parseFloat(document.getElementById('sv-cprod').value) || 0,
    };
    if (svc) Servicos.update(svc.id, data);
    else Servicos.add(data);
    closeModal();
    toast(svc ? 'Serviço atualizado! ✓' : 'Serviço adicionado! ✓', 'success');
    onSave();
  };
}

// ══════════════════════════════════════════
// PRODUTOS
// ══════════════════════════════════════════
function renderGridProdutos(container, prods, cfg) {
  const gridEl = document.getElementById('prodsGrid');
  if (!gridEl) return;

  if (!prods.length) {
    gridEl.innerHTML = emptyState('Nenhum produto cadastrado. Clique em "+ Novo Produto".');
    return;
  }

  gridEl.innerHTML = `
    <div class="table-wrap mobile-reflow">
      <table>
        <thead>
          <tr>
            <th>SKU</th>
            <th>Nome do Produto</th>
            <th>Categoria</th>
            <th class="td-right">Custo</th>
            <th class="td-right" style="color:var(--txt-green)">Preço Venda</th>
            <th class="td-right">Margem</th>
            <th class="td-center">Estoque</th>
            <th class="td-center">Mínimo</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${prods.map(p => {
    const custo = parseFloat(p.custoProd) || 0;
    const preco = parseFloat(p.precoVenda) || 0;
    const margem = preco > 0 ? (preco - custo) / preco : 0;
    const estoque = parseFloat(p.estoque) || 0;
    const estoqMin = parseFloat(p.estoqueMin) ?? 2;
    const isLow = estoque <= estoqMin;
    return `<tr style="${isLow ? 'background:rgba(240,138,138,.07)' : ''}">
              <td data-label="SKU"><span class="badge badge-plum" style="font-family:monospace;font-size:11px">${p.sku || '—'}</span></td>
              <td data-label="Produto" class="fw-600">
                ${p.nome}
                ${isLow ? '<span class="badge badge-warn" style="margin-left:6px;font-size:10px">⚠ Baixo</span>' : ''}
              </td>
              <td data-label="Categoria"><span class="badge" style="background:var(--lavender);color:var(--plum-light);font-size:10px">${p.categoria || '—'}</span></td>
              <td data-label="Custo" class="td-right td-mono">${R$(custo)}</td>
              <td data-label="Preço" class="td-right td-mono fw-600" style="color:var(--txt-green)">${R$(preco)}</td>
              <td data-label="Margem" class="td-right td-mono" style="color:${margem >= 0.3 ? 'var(--txt-green)' : margem >= 0.1 ? '#F0D58A' : 'var(--txt-red)'}">
                ${(margem * 100).toFixed(1)}%
              </td>
              <td data-label="Estoque" class="td-center td-mono fw-600" style="color:${isLow ? 'var(--txt-red)' : 'var(--txt-dark)'}">
                ${estoque}
              </td>
              <td data-label="Mínimo" class="td-center td-mono text-muted">${estoqMin}</td>
              <td class="td-actions">
                <button class="btn btn-sm btn-secondary" data-edit-prod="${p.id}">✎</button>
                <button class="btn btn-sm btn-danger" data-del-prod="${p.id}">×</button>
              </td>
            </tr>`;
  }).join('')}
        </tbody>
      </table>
    </div>
  `;

  gridEl.querySelectorAll('[data-edit-prod]').forEach(btn => {
    btn.onclick = () => {
      const prod = Produtos.byId(parseInt(btn.dataset.editProd));
      if (prod) abrirFormProd(prod, cfg, () => renderServicos(container));
    };
  });
  gridEl.querySelectorAll('[data-del-prod]').forEach(btn => {
    btn.onclick = () => {
      if (confirm('Remover este produto do catálogo?')) {
        Produtos.remove(parseInt(btn.dataset.delProd));
        renderServicos(container);
        toast('Produto removido.', 'default');
      }
    };
  });
}

function abrirFormProd(prod, cfg, onSave) {
  const p = prod || {};
  const cats = cfg.categorias || [];
  const isEdit = !!prod;

  const body = `
    <div class="form-grid cols-2">
      ${isEdit ? `
      <div class="form-group">
        <label>SKU (gerado automaticamente)</label>
        <input type="text" value="${p.sku || ''}" readonly style="font-family:monospace;font-weight:600;color:var(--plum-light)" />
      </div>
      <div class="form-group"></div>
      ` : `
      <div class="form-group full" style="background:var(--lavender);padding:10px 14px;border-radius:8px;font-size:12px;color:var(--plum-light)">
        🏷 O SKU será gerado automaticamente (ex: P001, P002...) após o cadastro.
      </div>
      `}
      <div class="form-group full">
        <label>Nome do Produto</label>
        <input type="text" id="pd-nome" value="${p.nome || ''}" placeholder="Ex: Ox 20vol 900ml" />
      </div>
      <div class="form-group">
        <label>Categoria</label>
        <select id="pd-cat">
          <option value="">— Selecione —</option>
          ${cats.map(c => `<option value="${c}" ${p.categoria === c ? 'selected' : ''}>${c}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"></div>
      <div class="form-group" style="background:var(--rose-pale);padding:12px;border-radius:var(--radius);border:1px solid rgba(196,135,154,.2)">
        <label style="color:var(--rose)">Custo do Produto (R$)</label>
        <input type="number" id="pd-custo" value="${p.custoProd || ''}" min="0" step="0.01" placeholder="0,00" />
      </div>
      <div class="form-group" style="background:var(--sage);padding:12px;border-radius:var(--radius);border:2px solid #4CAF50">
        <label style="color:var(--txt-green);font-weight:600">💰 Preço de Venda (R$)</label>
        <input type="number" id="pd-preco" value="${p.precoVenda || ''}" min="0" step="0.01" placeholder="0,00"
          data-money style="font-size:16px;font-weight:600" />
      </div>
      <div class="form-group">
        <label>Estoque Atual (unidades)</label>
        <input type="number" id="pd-estoque" value="${p.estoque ?? ''}" min="0" step="1" placeholder="0" />
      </div>
      <div class="form-group">
        <label>Alerta Estoque Mínimo (unidades)</label>
        <input type="number" id="pd-estoque-min" value="${p.estoqueMin ?? 2}" min="0" step="1" placeholder="2" />
      </div>
    </div>
    <div id="pd-preview" style="margin-top:12px"></div>
  `;

  const footer = `
    <button class="btn btn-secondary" id="pd-cancel">Cancelar</button>
    <button class="btn btn-primary" id="pd-save">${isEdit ? 'Salvar alterações' : 'Cadastrar Produto'}</button>
  `;

  openModal(isEdit ? `Editar Produto — ${p.sku}` : 'Novo Produto', body, footer);
  applyMoneyMask(document.getElementById('modalBody'));

  // Preview de margem em tempo real
  function calcMargem() {
    const custo = parseFloat(document.getElementById('pd-custo')?.value) || 0;
    const preco = parseFloat(document.getElementById('pd-preco')?.value) || 0;
    const prev = document.getElementById('pd-preview');
    if (!prev) return;
    if (preco > 0) {
      const margem = preco > 0 ? (preco - custo) / preco : 0;
      const cor = margem >= 0.3 ? 'var(--txt-green)' : margem >= 0.1 ? '#F0D58A' : 'var(--txt-red)';
      prev.innerHTML = `
        <div style="display:flex;gap:16px;padding:10px 14px;background:var(--bg-soft);border-radius:var(--radius);font-size:13px">
          <span>Lucro/un.: <strong style="color:${cor}">${R$(preco - custo)}</strong></span>
          <span>Margem: <strong style="color:${cor}">${(margem * 100).toFixed(1)}%</strong></span>
        </div>`;
    } else {
      prev.innerHTML = '';
    }
  }
  document.getElementById('pd-custo').oninput = calcMargem;
  document.getElementById('pd-preco').oninput = calcMargem;
  if (isEdit) calcMargem();

  document.getElementById('pd-cancel').onclick = closeModal;
  document.getElementById('pd-save').onclick = () => {
    const nome = document.getElementById('pd-nome').value.trim();
    if (!nome) return toast('Informe o nome do produto.', 'error');
    const preco = parseFloat(document.getElementById('pd-preco').value);
    if (!preco) return toast('Informe o preço de venda.', 'error');

    const data = {
      nome,
      categoria: document.getElementById('pd-cat').value,
      custoProd: parseFloat(document.getElementById('pd-custo').value) || 0,
      precoVenda: preco,
      estoque: parseFloat(document.getElementById('pd-estoque').value) || 0,
      estoqueMin: parseFloat(document.getElementById('pd-estoque-min').value) ?? 2,
    };

    if (isEdit) {
      Produtos.update(prod.id, data);
      toast('Produto atualizado! ✓', 'success');
    } else {
      Produtos.add(data);
      toast('Produto cadastrado! ✓', 'success');
    }
    closeModal();
    onSave();
  };
}