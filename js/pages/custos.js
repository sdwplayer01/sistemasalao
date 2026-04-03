// ═══════════════════════════════════════════════════════
// pages/custos.js
// ═══════════════════════════════════════════════════════
import { Custos, Config, MESES } from '../storage.js';
import { R$, mesKey, toast } from '../utils.js';

export function renderCustos(container) {
  const cfg = Config.get();
  const ano = cfg.ano;
  const mesAtual = new Date().getMonth();

  container.innerHTML = `
    <div class="section-title">Custos Fixos Mensais</div>
    <div class="section-sub">Preencha mês a mês. A média é calculada automaticamente.</div>

    <div class="action-bar">
      <label style="font-weight:500;color:var(--txt-muted);font-size:13px">Mês:</label>
      <select id="custosMesSel" style="max-width:180px">
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
    ['aluguel', '🏠 Aluguel'],
    ['condominio', '🏢 Condomínio'],
    ['energia', '⚡ Energia Elétrica'],
    ['agua', '💧 Água'],
    ['internet', '🌐 Internet / Telefone'],
    ['auxiliar', '👩 Ajuda de Auxiliar / Funcionário'],
    ['limpeza', '🧹 Material de Limpeza'],
    ['contabilidade', '📋 Contabilidade'],
    ['software', '💻 Sistema / Software'],
    ['marketing', '📣 Marketing / Publicidade'],
  ];

  const outros = data.outros || [{ desc: '', valor: '' }];

  formEl.innerHTML = `
    <div class="card">
      <div class="card-header">
        <span class="card-title">Custos — ${MESES[mesIdx]}</span>
        <span class="badge badge-rose">${R$(total)}</span>
      </div>
      <div class="card-body">
        <div class="form-grid cols-2">
          ${campos.map(([k, lbl]) => `
            <div class="form-group">
              <label>${lbl}</label>
              <input type="number" id="cf-${k}" value="${data[k] || ''}" min="0" step="0.01" placeholder="0,00" />
            </div>
          `).join('')}
        </div>

        <div class="divider"></div>

        <div class="fw-600 mb-16" style="color:var(--plum)">Outros Custos</div>
        <div id="outrosContainer">
          ${outros.map((o, i) => outroRow(o, i)).join('')}
        </div>
        <button class="btn btn-secondary btn-sm mt-8" id="btnAddOutro">+ Adicionar linha</button>

        <div class="divider"></div>

        <div class="flex-between">
          <div>
            <div style="font-size:12px;color:#ffffff;font-weight:700">Total do mês</div>
            <div class="font-serif" style="font-size:28px;font-weight:600;color:var(--txt-white)" id="cfTotal">${R$(total)}</div>
          </div>
          <button class="btn btn-primary" id="btnSalvarCustos">Salvar ${MESES[mesIdx]}</button>
        </div>
      </div>
    </div>

    <!-- Resumo anual -->
    <div class="card mt-24">
      <div class="card-header"><span class="card-title">Resumo Anual de Custos</span></div>
      <div class="card-body" style="padding:0">
        <div class="table-wrap" style="border:none;box-shadow:none">
          <table>
            <thead><tr>
              ${MESES.map(m => `<th class="td-center">${m.slice(0, 3)}</th>`).join('')}
              <th class="td-center">Média</th>
            </tr></thead>
            <tbody><tr>
              ${MESES.map((_, i) => {
    const t = Custos.totalMes(mesKey(ano, i));
    return `<td class="td-center td-mono ${i === mesIdx ? 'fw-600 text-plum' : ''}">${t ? R$(t) : '<span class="text-muted">—</span>'}</td>`;
  }).join('')}
              <td class="td-center td-mono fw-600">${R$(Custos.mediaMeses())}</td>
            </tr></tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  document.getElementById('btnAddOutro').onclick = () => {
    const c = document.getElementById('outrosContainer');
    const idx = c.children.length;
    const div = document.createElement('div');
    div.innerHTML = outroRow({ desc: '', valor: '' }, idx);
    c.appendChild(div.firstElementChild);
    bindOutros();
  };

  document.getElementById('btnSalvarCustos').onclick = () => salvarCustos(key, campos, mesIdx, ano);

  // Live total
  formEl.querySelectorAll('input[type="number"]').forEach(inp => {
    inp.oninput = () => atualizarTotal(campos);
  });

  bindOutros();
}

function outroRow(o, i) {
  return `<div class="form-grid cols-2 mb-16" data-outro="${i}">
    <div class="form-group">
      <input type="text" class="outro-desc" value="${o.desc || ''}" placeholder="Descrição" />
    </div>
    <div class="form-group" style="flex-direction:row;gap:8px;align-items:flex-end">
      <input type="number" class="outro-val" value="${o.valor || ''}" min="0" step="0.01" placeholder="0,00" style="flex:1" />
      <button class="btn btn-danger btn-icon" onclick="this.closest('[data-outro]').remove()" style="flex-shrink:0">×</button>
    </div>
  </div>`;
}

function bindOutros() {
  document.querySelectorAll('.outro-val').forEach(inp => {
    inp.oninput = () => {
      const campos = [['aluguel'], ['condominio'], ['energia'], ['agua'], ['internet'], ['auxiliar'], ['limpeza'], ['contabilidade'], ['software'], ['marketing']];
      atualizarTotal(campos);
    };
  });
}

function atualizarTotal(campos) {
  let total = campos.reduce((s, [k]) => {
    const v = parseFloat(document.getElementById(`cf-${k}`)?.value) || 0;
    return s + v;
  }, 0);
  document.querySelectorAll('.outro-val').forEach(inp => {
    total += parseFloat(inp.value) || 0;
  });
  const el = document.getElementById('cfTotal');
  if (el) el.textContent = R$(total);
}

function salvarCustos(key, campos, mesIdx, ano) {
  const data = {};
  campos.forEach(([k]) => {
    data[k] = parseFloat(document.getElementById(`cf-${k}`)?.value) || 0;
  });
  const outros = [];
  document.querySelectorAll('[data-outro]').forEach(row => {
    const desc = row.querySelector('.outro-desc')?.value.trim();
    const valor = parseFloat(row.querySelector('.outro-val')?.value) || 0;
    if (desc || valor) outros.push({ desc, valor });
  });
  data.outros = outros;
  Custos.saveMes(key, data);
  toast(`Custos de ${MESES[mesIdx]} salvos! ✓`, 'success');
  renderForm(ano, mesIdx);
}
