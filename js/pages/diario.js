import { Diario, Servicos, Produtos, Clientes, Config, MESES } from '../storage.js';
import {
  R$, pct, fmtData, hoje, diaSemana, formatarTelefone,
  linkWA, limparTelefone, toast, openModal, closeModal,
  emptyState, applyMoneyMask, initIcons
} from '../utils.js';

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

  document.getElementById('btn-novo-lancamento').onclick = () => abrirModalLancamento();
  initIcons();
}

function renderTabHoje(container, lista) {
  if (lista.length === 0) {
    container.innerHTML = emptyState('Nenhum lançamento hoje.', 'Ainda não há movimentações registradas para este dia.');
    return;
  }

  container.innerHTML = `
    <div class="card">
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
                <button class="btn-icon" onclick="window.__utils.excluirLancamento('${item.id}')">
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

function renderTabHistorico(container, lista) {
  // Lógica de histórico simplificada para o exemplo
  container.innerHTML = `<div class="card"><p style="padding:20px; color:var(--txt-muted)">O histórico completo pode ser visualizado no módulo de Controle Anual.</p></div>`;
}

function abrirModalLancamento(editId = null) {
  const svcs = Servicos.getAll();
  const prods = Produtos.getAll();

  const body = `
    <div class="form-grid">
      <div class="form-group">
        <label>Cliente</label>
        <input type="text" id="f-cliente" placeholder="Nome do cliente">
      </div>
      <div class="form-group">
        <label>Item (Serviço ou Produto)</label>
        <select id="f-item">
          <optgroup label="Serviços">
            ${svcs.map(s => `<option value="${s.nome}" data-tipo="servico" data-preco="${s.precoVenda}">${s.nome}</option>`).join('')}
          </optgroup>
          <optgroup label="Produtos">
            ${prods.map(p => `<option value="${p.nome}" data-tipo="produto" data-preco="${p.precoVenda}">${p.nome}</option>`).join('')}
          </optgroup>
        </select>
      </div>
      <div class="form-group">
        <label>Valor Total</label>
        <input type="text" id="f-valor" data-money inputmode="numeric">
      </div>
      <div class="form-group">
        <label>Forma de Pagamento</label>
        <select id="f-pgto">
          <option>Dinheiro</option>
          <option>Pix</option>
          <option>Cartão Débito</option>
          <option>Cartão Crédito</option>
        </select>
      </div>
    </div>
  `;

  const footer = `
    <button class="btn btn-secondary" onclick="window.__utils.closeModal()">Cancelar</button>
    <button class="btn btn-primary" id="btn-save-lan">Salvar Lançamento</button>
  `;

  openModal('Novo Atendimento', body, footer);
  applyMoneyMask(document.getElementById('modalBody'));

  // Auto-preenche valor ao mudar item
  const selectItem = document.getElementById('f-item');
  selectItem.onchange = () => {
    const opt = selectItem.options[selectItem.selectedIndex];
    const inputValor = document.getElementById('f-valor');
    const preco = parseFloat(opt.dataset.preco) || 0;
    inputValor.value = preco.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    inputValor.dataset.rawValue = preco;
  };

  document.getElementById('btn-save-lan').onclick = () => {
    const cliente = document.getElementById('f-cliente').value.trim();
    const rawVal = document.getElementById('f-valor').dataset.rawValue;
    const precoCobrado = parseFloat(rawVal) || 0;

    if (!cliente || precoCobrado <= 0) return toast('Preencha os campos obrigatórios.', 'error');

    const opt  = selectItem.options[selectItem.selectedIndex];
    const tipo = opt?.dataset.tipo || 'servico';

    const novo = {
      data: hoje(),
      cliente,
      servicoNome:    tipo === 'servico' ? selectItem.value : '',
      produtoNome:    tipo === 'produto' ? selectItem.value : '',
      tipo,
      precoCobrado,
      formaPagamento: document.getElementById('f-pgto').value,
      qtd: 1,
    };

    Diario.add(novo);
    toast('Lançamento salvo!');
    closeModal();
    window.__navigateTo('diario');
  };
}

window.__utils.excluirLancamento = (id) => {
  if (confirm('Excluir este registo?')) {
    Diario.remove(id);
    window.__navigateTo('diario');
    toast('Removido.');
  }
};