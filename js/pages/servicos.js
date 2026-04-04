// ═══════════════════════════════════════════════════════
// js/pages/servicos.js — Serviços & Produtos
// Fix: excluirItem via event delegation (sem window.__utils)
// ═══════════════════════════════════════════════════════
import { Servicos, Produtos, Config } from '../storage.js';
import { R$, toast, openModal, closeModal, emptyState, applyMoneyMask, initIcons } from '../utils.js';

let _abaAtiva = 'servicos';

export function renderServicos(container) {
  const svcs  = Servicos.getAll();
  const prods = Produtos.getAll();

  container.innerHTML = `
    <div class="section-header">
      <div>
        <div class="section-title">Serviços &amp; Produtos</div>
        <div class="section-sub">Gestão de catálogo e precificação estratégica.</div>
      </div>
      <button class="btn btn-primary" id="btn-novo-item">
        <i data-lucide="plus"></i> Novo ${_abaAtiva === 'servicos' ? 'Serviço' : 'Produto'}
      </button>
    </div>

    <div class="tabs-bar">
      <button class="tab-btn ${_abaAtiva === 'servicos' ? 'active' : ''}" data-tab="servicos">Serviços</button>
      <button class="tab-btn ${_abaAtiva === 'produtos' ? 'active' : ''}" data-tab="produtos">Produtos / Estoque</button>
    </div>

    <div id="servicos-content" class="grid-cards"></div>
  `;

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.onclick = () => {
      _abaAtiva = btn.dataset.tab;
      renderServicos(container);
    };
  });

  const content = container.querySelector('#servicos-content');
  const lista   = _abaAtiva === 'servicos' ? svcs : prods;

  if (lista.length === 0) {
    content.innerHTML = emptyState('Catálogo vazio.', 'Registre os seus itens para começar a vender.');
  } else {
    content.innerHTML = lista.map(item => `
      <div class="card item-card">
        <div class="item-info">
          <div class="item-name">${item.nome}</div>
          <div class="item-cat">${item.categoria || 'Geral'}</div>
        </div>
        <div class="item-price">${R$(item.precoVenda)}</div>
        <div class="item-actions">
          <button class="btn-icon" data-excluir-id="${item.id}" data-excluir-tipo="${_abaAtiva}" title="Excluir">
            <i data-lucide="trash-2"></i>
          </button>
        </div>
      </div>
    `).join('');
  }

  // ── Event delegation para excluir ────────────────────
  // Evita crash de window.__utils ao usar data-excluir-id nos cards
  content.addEventListener('click', e => {
    const btn = e.target.closest('[data-excluir-id]');
    if (!btn) return;
    const id   = btn.dataset.excluirId;
    const tipo = btn.dataset.excluirTipo;
    if (!confirm('Deseja excluir este item do catálogo?')) return;
    if (tipo === 'servicos') Servicos.remove(Number(id));
    else Produtos.remove(Number(id));
    toast('Item removido.');
    renderServicos(container); // re-render no lugar
  });

  document.getElementById('btn-novo-item').onclick = () => {
    if (_abaAtiva === 'servicos') abrirModalServico(container);
    else abrirModalProduto(container);
  };

  initIcons();
}

// ── Modal: Novo Produto ───────────────────────────────
function abrirModalProduto(container) {
  const body = `
    <div class="form-grid">
      <div class="form-group span-2">
        <label>Nome do Produto</label>
        <input type="text" id="pd-nome" placeholder="Ex: Shampoo 300ml">
      </div>
      <div class="form-group">
        <label>Custo de Aquisição</label>
        <input type="text" id="pd-custo" data-money inputmode="numeric" placeholder="0,00">
      </div>
      <div class="form-group">
        <label>Preço de Venda</label>
        <input type="text" id="pd-preco" data-money inputmode="numeric" placeholder="0,00">
      </div>
      <div id="pd-preview" class="span-2"></div>
    </div>
  `;

  const footer = `
    <button class="btn btn-secondary" id="pd-cancel">Cancelar</button>
    <button class="btn btn-primary" id="pd-save">Salvar Produto</button>
  `;

  openModal('Novo Produto', body, footer);
  applyMoneyMask(document.getElementById('modalBody'));

  document.getElementById('pd-cancel').onclick = closeModal;

  const calcMargem = () => {
    const custo = parseFloat(document.getElementById('pd-custo').dataset.rawValue) || 0;
    const preco = parseFloat(document.getElementById('pd-preco').dataset.rawValue) || 0;
    const prev  = document.getElementById('pd-preview');
    if (preco > 0) {
      const margem = (preco - custo) / preco;
      const cor = margem >= 0.3 ? 'var(--success)' : (margem > 0 ? 'var(--warning)' : 'var(--danger)');
      prev.innerHTML = `
        <div style="display:flex;justify-content:space-between;padding:10px;background:var(--bg-soft);border-radius:var(--radius);font-size:13px;margin-top:10px">
          <span>Lucro: <strong style="color:${cor}">${R$(preco - custo)}</strong></span>
          <span>Margem: <strong style="color:${cor}">${(margem * 100).toFixed(1)}%</strong></span>
        </div>`;
    }
  };

  document.getElementById('pd-custo').oninput = calcMargem;
  document.getElementById('pd-preco').oninput = calcMargem;

  document.getElementById('pd-save').onclick = () => {
    const nome  = document.getElementById('pd-nome').value.trim();
    const preco = parseFloat(document.getElementById('pd-preco').dataset.rawValue) || 0;
    if (!nome)     return toast('Informe o nome do produto.', 'error');
    if (preco <= 0) return toast('Informe o preço de venda.', 'error');

    Produtos.add({
      nome,
      custoProd:  parseFloat(document.getElementById('pd-custo').dataset.rawValue) || 0,
      precoVenda: preco,
      categoria:  'Produtos',
      estoque:    0,
      estoqueMin: 1,
    });

    toast('Produto salvo!');
    closeModal();
    renderServicos(container);
  };
}

// ── Modal: Novo Serviço ───────────────────────────────
function abrirModalServico(container) {
  const cfg = Config.get();
  const categorias = cfg.categorias || ['Cabelo', 'Manicure', 'Outros'];

  const body = `
    <div class="form-grid">
      <div class="form-group span-2">
        <label>Nome do Serviço</label>
        <input type="text" id="sv-nome" placeholder="Ex: Corte Feminino">
      </div>
      <div class="form-group">
        <label>Categoria</label>
        <select id="sv-cat">
          ${categorias.map(c => `<option>${c}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Preço de Venda</label>
        <input type="text" id="sv-preco" data-money inputmode="numeric" placeholder="0,00">
      </div>
      <div class="form-group">
        <label>Tempo Estimado (min)</label>
        <input type="number" id="sv-tempo" min="0" placeholder="60">
      </div>
    </div>
  `;

  const footer = `
    <button class="btn btn-secondary" id="sv-cancel">Cancelar</button>
    <button class="btn btn-primary" id="sv-save">Salvar Serviço</button>
  `;

  openModal('Novo Serviço', body, footer);
  applyMoneyMask(document.getElementById('modalBody'));

  document.getElementById('sv-cancel').onclick = closeModal;

  document.getElementById('sv-save').onclick = () => {
    const nome  = document.getElementById('sv-nome').value.trim();
    const preco = parseFloat(document.getElementById('sv-preco').dataset.rawValue) || 0;
    if (!nome)     return toast('Informe o nome do serviço.', 'error');
    if (preco <= 0) return toast('Informe o preço de venda.', 'error');

    Servicos.add({
      nome,
      categoria:  document.getElementById('sv-cat').value,
      precoVenda: preco,
      tempoMin:   parseInt(document.getElementById('sv-tempo').value) || 60,
    });

    toast('Serviço salvo!');
    closeModal();
    renderServicos(container);
  };
}