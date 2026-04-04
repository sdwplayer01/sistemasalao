// ═══════════════════════════════════════════════════════
// js/pages/diario.js — Diário / Frente de Caixa
// Fix: excluirLancamento via event delegation (sem window.__utils)
// ═══════════════════════════════════════════════════════
import { Diario, Servicos, Produtos, Config, MESES } from '../storage.js';
import {
  R$, hoje, toast, openModal, closeModal,
  emptyState, applyMoneyMask, initIcons
} from '../utils.js';
import { resumoCards } from '../ui.js';

let _tabAtiva = 'hoje'; // 'hoje' | 'historico'

export function renderDiario(container) {
  const data = Diario.getAll();
  const hojeISO = hoje();

  container.innerHTML = `
    <div class="section-header">
      <div>
        <div class="section-title">Diário / Frente de Caixa</div>
        <div class="section-sub">Gestão de atendimentos e fluxo de caixa diário.</div>
      </div>
      <button class="btn btn-primary" id="btn-novo-lancamento">
        <i data-lucide="plus"></i> Novo Lançamento
      </button>
    </div>

    <div class="tabs-bar">
      <button class="tab-btn ${_tabAtiva === 'hoje' ? 'active' : ''}" data-tab="hoje">Hoje</button>
      <button class="tab-btn ${_tabAtiva === 'historico' ? 'active' : ''}" data-tab="historico">Histórico</button>
    </div>

    <div id="diario-content"></div>
  `;

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.onclick = () => {
      _tabAtiva = btn.dataset.tab;
      renderDiario(container);
    };
  });

  const content = container.querySelector('#diario-content');
  if (_tabAtiva === 'hoje') {
    renderTabHoje(content, data.filter(d => d.data === hojeISO));
  } else {
    renderTabHistorico(content, data);
  }

  document.getElementById('btn-novo-lancamento').onclick = () => abrirModalLancamento(container);

  // ── Event delegation para excluir ────────────────────
  // Evita crash de window.__utils ao usar data-excluir-id nos botões
  content.addEventListener('click', e => {
    const btn = e.target.closest('[data-excluir-id]');
    if (!btn) return;
    const id = Number(btn.dataset.excluirId);
    if (confirm('Excluir este registro?')) {
      Diario.remove(id);
      toast('Registro removido.');
      renderDiario(container); // re-render no lugar
    }
  });

  initIcons();
}

// ── Tab: Hoje ─────────────────────────────────────────
function renderTabHoje(container, lista) {
  if (lista.length === 0) {
    container.innerHTML = emptyState('Nenhum lançamento hoje.', 'Ainda não há movimentações registradas para este dia.');
    return;
  }

  // Cálculos para o resumo hoje
  const fat = lista.reduce((s, e) => s + (parseFloat(e.precoCobrado) || 0), 0);
  const fatSvc = lista.filter(e => e.tipo === 'servico' || !e.tipo).reduce((s, e) => s + (parseFloat(e.precoCobrado) || 0), 0);
  const fatProd = lista.filter(e => e.tipo === 'produto').reduce((s, e) => s + (parseFloat(e.precoCobrado) || 0), 0);
  const atend = lista.length;

  container.innerHTML = `
    <!-- Resumo do dia -->
    ${resumoCards([
    { label: 'Caixa Hoje', value: R$(fat), cor: 'green', sub: atend + ' atendimento' + (atend !== 1 ? 's' : '') },
    { label: 'Serviços', value: R$(fatSvc), cor: 'plum' },
    { label: 'Produtos', value: R$(fatProd), cor: 'rose' }
  ])}

    <div class="card mt-16">
      <table class="table">
        <thead>
          <tr>
            <th>Cliente</th>
            <th>Serviço/Produto</th>
            <th>Valor</th>
            <th>PGTO</th>
            <th style="text-align:right">Ações</th>
          </tr>
        </thead>
        <tbody>
          ${lista.map(item => `
            <tr>
              <td><strong>${item.cliente || '—'}</strong></td>
              <td><span class="badge">${item.servicoNome || item.produtoNome || '—'}</span></td>
              <td>${R$(item.precoCobrado)}</td>
              <td><span class="badge-outline">${item.formaPagamento || '—'}</span></td>
              <td style="text-align:right">
                <button class="btn-icon" data-excluir-id="${item.id}" title="Excluir registro">
                  <i data-lucide="trash-2"></i>
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

// ── Tab: Histórico ────────────────────────────────────
function renderTabHistorico(container, lista) {
  container.innerHTML = `<div class="card"><p style="padding:20px; color:var(--txt-muted)">O histórico completo pode ser visualizado no módulo de Controle Anual.</p></div>`;
}

// ── Modal de Novo Lançamento ──────────────────────────
function abrirModalLancamento(container) {
  const svcs  = Servicos.getAll();
  const prods = Produtos.getAll();
  const cfg   = Config.get();
  const formas = cfg.formasPagamento || ['Dinheiro', 'Pix', 'Cartão Débito', 'Cartão Crédito'];

  const body = `
    <div class="form-grid">
      <div class="form-group">
        <label>Cliente</label>
        <input type="text" id="f-cliente" placeholder="Nome do cliente">
      </div>
      <div class="form-group">
        <label>Item (Serviço ou Produto)</label>
        <select id="f-item">
          <option value="" data-tipo="" data-preco="0">— Selecione —</option>
          ${svcs.length ? `<optgroup label="Serviços">
            ${svcs.map(s => `<option value="${s.nome}" data-tipo="servico" data-preco="${s.precoVenda || 0}">${s.nome}</option>`).join('')}
          </optgroup>` : ''}
          ${prods.length ? `<optgroup label="Produtos">
            ${prods.map(p => `<option value="${p.nome}" data-tipo="produto" data-preco="${p.precoVenda || 0}">${p.nome}</option>`).join('')}
          </optgroup>` : ''}
        </select>
      </div>
      <div class="form-group">
        <label>Valor Cobrado</label>
        <input type="text" id="f-valor" data-money inputmode="numeric" placeholder="0,00">
      </div>
      <div class="form-group">
        <label>Forma de Pagamento</label>
        <select id="f-pgto">
          ${formas.map(f => `<option>${f}</option>`).join('')}
        </select>
      </div>
    </div>
  `;

  const footer = `
    <button class="btn btn-secondary" id="btn-cancel-lan">Cancelar</button>
    <button class="btn btn-primary" id="btn-save-lan">Salvar Lançamento</button>
  `;

  openModal('Novo Atendimento', body, footer);
  applyMoneyMask(document.getElementById('modalBody'));

  document.getElementById('btn-cancel-lan').onclick = closeModal;

  // Auto-preenche valor ao selecionar item
  const selectItem = document.getElementById('f-item');
  selectItem.onchange = () => {
    const opt = selectItem.options[selectItem.selectedIndex];
    const preco = parseFloat(opt.dataset.preco) || 0;
    if (preco > 0) {
      const inputValor = document.getElementById('f-valor');
      inputValor.value = preco.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
      inputValor.dataset.rawValue = preco;
    }
  };

  document.getElementById('btn-save-lan').onclick = () => {
    const cliente     = document.getElementById('f-cliente').value.trim();
    const rawVal      = document.getElementById('f-valor').dataset.rawValue;
    const precoCobrado = parseFloat(rawVal) || 0;

    if (!cliente)        return toast('Informe o nome do cliente.', 'error');
    if (precoCobrado <= 0) return toast('Informe o valor cobrado.', 'error');

    const opt  = selectItem.options[selectItem.selectedIndex];
    const tipo = opt?.dataset.tipo || 'servico';

    Diario.add({
      data:           hoje(),
      cliente,
      servicoNome:    tipo === 'servico' ? selectItem.value : '',
      produtoNome:    tipo === 'produto' ? selectItem.value : '',
      tipo,
      precoCobrado,
      formaPagamento: document.getElementById('f-pgto').value,
      qtd: 1,
    });

    toast('Lançamento salvo!');
    closeModal();
    renderDiario(container); // re-render in place, sem navigateTo
  };
}