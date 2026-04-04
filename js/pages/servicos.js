import { Servicos, Produtos, Config, MESES } from '../storage.js';
import { R$, toast, openModal, closeModal, emptyState, applyMoneyMask, initIcons } from '../utils.js';

let _abaAtiva = 'servicos';

export function renderServicos(container) {
  const svcs = Servicos.getAll();
  const prods = Produtos.getAll();

  container.innerHTML = `
    <div class="section-header">
      <div>
        <div class="section-title">Serviços & Produtos</div>
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
  const lista = _abaAtiva === 'servicos' ? svcs : prods;

  if (lista.length === 0) {
    content.innerHTML = emptyState('Catálogo vazio.', 'Registe os seus itens para começar a vender.');
  } else {
    content.innerHTML = lista.map(item => `
      <div class="card item-card">
        <div class="item-info">
          <div class="item-name">${item.nome}</div>
          <div class="item-cat">${item.categoria || 'Geral'}</div>
        </div>
        <div class="item-price">${R$(item.precoVenda)}</div>
        <div class="item-actions">
           <button class="btn-icon" onclick="window.__utils.excluirItem('${item.id}', '${_abaAtiva}')">
            <i data-lucide="trash-2"></i>
          </button>
        </div>
      </div>
    `).join('');
  }

  document.getElementById('btn-novo-item').onclick = () => {
    if (_abaAtiva === 'servicos') abrirModalServico();
    else abrirModalProduto();
  };

  initIcons();
}

function abrirModalProduto() {
  const body = `
    <div class="form-grid">
      <div class="form-group span-2">
        <label>Nome do Produto</label>
        <input type="text" id="pd-nome">
      </div>
      <div class="form-group">
        <label>Custo de Aquisição</label>
        <input type="text" id="pd-custo" data-money inputmode="numeric">
      </div>
      <div class="form-group">
        <label>Preço de Venda</label>
        <input type="text" id="pd-preco" data-money inputmode="numeric">
      </div>
      <div id="pd-preview" class="span-2"></div>
    </div>
  `;

  const footer = `
    <button class="btn btn-secondary" onclick="window.__utils.closeModal()">Cancelar</button>
    <button class="btn btn-primary" id="pd-save">Salvar Produto</button>
  `;

  openModal('Novo Produto', body, footer);
  const container = document.getElementById('modalBody');
  applyMoneyMask(container);

  const calcMargem = () => {
    const custo = parseFloat(document.getElementById('pd-custo').dataset.rawValue) || 0;
    const preco = parseFloat(document.getElementById('pd-preco').dataset.rawValue) || 0;
    const prev = document.getElementById('pd-preview');

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
    const nome = document.getElementById('pd-nome').value.trim();
    const preco = parseFloat(document.getElementById('pd-preco').dataset.rawValue) || 0;

    if (!nome || preco <= 0) return toast('Preencha os campos corretamente.', 'error');

    Produtos.add({
      id: Date.now().toString(),
      nome,
      custoProd: parseFloat(document.getElementById('pd-custo').dataset.rawValue) || 0,
      precoVenda: preco,
      categoria: 'Produtos'
    });

    toast('Produto guardado!');
    closeModal();
    window.__navigateTo('servicos');
  };
}

function abrirModalServico() {
  // Lógica similar para serviços...
  toast('Módulo de serviços pronto para configurar.', 'info');
}

window.__utils.excluirItem = (id, tipo) => {
  if (!confirm('Deseja excluir este item do catálogo?')) return;
  if (tipo === 'servicos') Servicos.remove(id);
  else Produtos.remove(id);
  window.__navigateTo('servicos');
  toast('Item removido.');
};