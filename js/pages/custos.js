// ═══════════════════════════════════════════════════════
// pages/custos.js
// ═══════════════════════════════════════════════════════
import { Custos, Config, MESES } from '../storage.js';
import { R$, mesKey, toast, applyMoneyMask, initIcons } from '../utils.js';

export function renderCustos(container) {
  const ano = Config.get().ano;
  const mesAtual = new Date().getMonth();

  container.innerHTML = `
    <div class="section-header">
      <div>
        <div class="section-title">Custos Fixos Mensais</div>
        <div class="section-sub">Preencha mês a mês. A média anual atualiza automaticamente.</div>
      </div>
      <select id="custosMesSel" class="badge-outline" style="font-size:14px;padding:6px 12px">
        ${MESES.map((m, i) => `<option value="${i}" ${i === mesAtual ? 'selected' : ''}>${m} ${ano}</option>`).join('')}
      </select>
    </div>
    <div id="custosForm"></div>
  `;

  let mesIdx = mesAtual;
  renderForm(ano, mesIdx);

  document.getElementById('custosMesSel').onchange = e => {
    mesIdx = parseInt(e.target.value);
    renderForm(ano, mesIdx);
  };
}

function renderForm(ano, mesIdx) {
  const formEl = document.getElementById('custosForm');
  if (!formEl) return;

  const key = mesKey(ano, mesIdx);
  const data = Custos.getMes(key);
  const total = Custos.totalMes(key);

  const campos = [
    ['aluguel', '🏠 Aluguel'], ['condominio', '🏢 Condomínio'],
    ['energia', '⚡ Energia Elétrica'], ['agua', '💧 Água'],
    ['internet', '🌐 Internet / Telefone'], ['auxiliar', '👩 Auxiliar / Funcionário'],
    ['limpeza', '🧹 Material de Limpeza'], ['contabilidade', '📋 Contabilidade'],
    ['software', '💻 Sistema / Software'], ['marketing', '📣 Marketing / Ads'],
  ];

  const outros = data.outros || [{ desc: '', valor: '' }];

  formEl.innerHTML = `
    <div class="card mb-24">
      <div class="card-header">
        <span class="card-title">Despesas de ${MESES[mesIdx]}</span>
        <span class="badge badge-rose" id="cfTotalBadge">${R$(total)}</span>
      </div>
      <div class="card-body">
        <div class="form-grid cols-2">
          ${campos.map(([k, lbl]) => `
            <div class="form-group">
              <label>${lbl}</label>
              <input type="text" id="cf-${k}" data-money inputmode="numeric" placeholder="0,00" value="${data[k] ? data[k].toFixed(2).replace('.', ',') : ''}" data-raw-value="${data[k] || ''}">
            </div>
          `).join('')}
        </div>

        <div class="divider"></div>
        <div class="fw-600 mb-16 text-plum">Outros Custos</div>
        <div id="outrosContainer">
          ${outros.map((o, i) => outroRow(o, i)).join('')}
        </div>
        <button class="btn btn-secondary btn-sm mt-8" id="btnAddOutro">+ Adicionar linha</button>

        <div class="divider"></div>
        <div class="flex-between">
          <div>
            <div class="text-muted" style="font-size:12px;font-weight:600">Total do mês</div>
            <div class="font-serif" style="font-size:28px;font-weight:600;color:var(--txt-dark)" id="cfTotal">${R$(total)}</div>
          </div>
          <button class="btn btn-primary" id="btnSalvarCustos">Salvar ${MESES[mesIdx]}</button>
        </div>
      </div>
    </div>
  `;

  applyMoneyMask(formEl);
  initIcons();

  document.getElementById('btnAddOutro').onclick = () => {
    const c = document.getElementById('outrosContainer');
    const div = document.createElement('div');
    div.innerHTML = outroRow({ desc: '', valor: '' }, c.children.length);
    c.appendChild(div.firstElementChild);
    applyMoneyMask(c.lastElementChild);
    bindTotalCalc(campos);
  };

  document.getElementById('btnSalvarCustos').onclick = () => salvarCustos(key, campos, mesIdx, ano);
  bindTotalCalc(campos);
}

function outroRow(o, i) {
  return `<div class="form-grid cols-2 mb-16" data-outro="${i}">
    <div class="form-group"><input type="text" class="outro-desc" value="${o.desc || ''}" placeholder="Descrição" /></div>
    <div class="form-group flex-row" style="gap:8px;align-items:flex-end">
      <input type="text" class="outro-val" data-money inputmode="numeric" placeholder="0,00" value="${o.valor ? o.valor.toFixed(2).replace('.', ',') : ''}" data-raw-value="${o.valor || ''}" style="flex:1" />
      <button class="btn btn-danger btn-icon" onclick="this.closest('[data-outro]').remove(); document.getElementById('cf-aluguel').dispatchEvent(new Event('input'))" style="flex-shrink:0"><i data-lucide="trash-2" style="width:14px;height:14px"></i></button>
    </div>
  </div>`;
}

function bindTotalCalc(campos) {
  const calc = () => {
    let t = campos.reduce((s, [k]) => s + (parseFloat(document.getElementById(`cf-${k}`)?.dataset.rawValue) || 0), 0);
    document.querySelectorAll('.outro-val').forEach(inp => t += (parseFloat(inp.dataset.rawValue) || 0));
    document.getElementById('cfTotal').textContent = R$(t);
    document.getElementById('cfTotalBadge').textContent = R$(t);
  };
  document.querySelectorAll('[data-money]').forEach(inp => inp.addEventListener('input', calc));
}

function salvarCustos(key, campos, mesIdx, ano) {
  const data = { outros: [] };
  campos.forEach(([k]) => data[k] = parseFloat(document.getElementById(`cf-${k}`).dataset.rawValue) || 0);

  document.querySelectorAll('[data-outro]').forEach(row => {
    const desc = row.querySelector('.outro-desc').value.trim();
    const valor = parseFloat(row.querySelector('.outro-val').dataset.rawValue) || 0;
    if (desc || valor) data.outros.push({ desc, valor });
  });

  Custos.saveMes(key, data);
  toast(`Custos de ${MESES[mesIdx]} salvos! ✓`, 'success');
  renderForm(ano, mesIdx);
}