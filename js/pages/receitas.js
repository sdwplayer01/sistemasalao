import * as UI from '../ui.js';
// ═══════════════════════════════════════════════════════
// pages/receitas.js
// ═══════════════════════════════════════════════════════
import { Receitas, Custos, Config, MESES } from '../storage.js';
import { R$, mesKey, toast } from '../utils.js';

export function renderReceitas(container) {
  const cfg = Config.get();
  const ano = cfg.ano;
  const mesAtual = new Date().getMonth();

  container.innerHTML = `
    <div class="section-title">Receitas Internas</div>
    <div class="section-sub">Repasses, aluguel de cadeiras e comissões que abatam o custo fixo.</div>

    <div class="action-bar">
      <label style="font-weight:500;color:var(--txt-muted);font-size:13px">Mês:</label>
      <select id="recMesSel" style="max-width:180px">
        ${MESES.map((m,i) => `<option value="${i}" ${i===mesAtual?'selected':''}>${m} ${ano}</option>`).join('')}
      </select>
    </div>

    <div id="recForm"></div>
  `;

  let mesIdx = mesAtual;
  renderForm(ano, mesIdx);

  document.getElementById('recMesSel').onchange = e => {
    mesIdx = parseInt(e.target.value);
    renderForm(ano, mesIdx);
  };
}

function renderForm(ano, mesIdx) {
  const formEl = document.getElementById('recForm');
  if (!formEl) return;

  const key     = mesKey(ano, mesIdx);
  const data    = Receitas.getMes(key);
  const totalRec= Receitas.totalMes(key);
  const totalCF = Custos.totalMes(key);
  const cfReal  = Math.max(0, totalCF - totalRec);

  const campos = [
    ['cadeira1', '🪑 Aluguel de Cadeira — Cabeleireira 1'],
    ['cadeira2', '🪑 Aluguel de Cadeira — Cabeleireira 2'],
    ['manicure', '💅 Comissão / Repasse — Manicure'],
    ['pedicure', '💅 Comissão / Repasse — Pedicure'],
    ['outros1',  '💼 Aluguel de Espaço — Profissional 1'],
    ['outros2',  '💼 Outras Receitas Internas'],
  ];

  formEl.innerHTML = `
    <div class="card">
      <div class="card-header">
        <span class="card-title">Receitas — ${MESES[mesIdx]}</span>
        <span class="badge badge-green">${R$(totalRec)}</span>
      </div>
      <div class="card-body">
        <div class="form-grid cols-2">
          ${campos.map(([k, lbl]) => `
            <div class="form-group">
              <label>${lbl}</label>
              <input type="number" id="ri-${k}" value="${data[k] || ''}" min="0" step="0.01" placeholder="0,00" />
            </div>
          `).join('')}
        </div>

        <div class="divider"></div>

        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:16px">
          <div style="text-align:center;padding:14px;background:var(--lavender);border-radius:var(--radius)">
            <div style="font-size:11px;color:var(--txt-muted);text-transform:uppercase;letter-spacing:.5px">Custo Fixo Bruto</div>
            <div class="font-serif" style="font-size:22px;font-weight:600;color:var(--noir)">${R$(totalCF)}</div>
          </div>
          <div style="text-align:center;padding:14px;background:var(--rose-light);border-radius:var(--radius)">
            <div style="font-size:11px;color:var(--txt-muted);text-transform:uppercase;letter-spacing:.5px">Total Receitas</div>
            <div class="font-serif" style="font-size:22px;font-weight:600;color:var(--plum)" id="riTotal">${R$(totalRec)}</div>
          </div>
          <div style="text-align:center;padding:14px;background:var(--sage);border-radius:var(--radius);border:2px solid #4CAF50">
            <div style="font-size:11px;color:var(--txt-muted);text-transform:uppercase;letter-spacing:.5px">✅ Custo Fixo REAL</div>
            <div class="font-serif" style="font-size:22px;font-weight:700;color:var(--txt-green)" id="riCFReal">${R$(cfReal)}</div>
          </div>
        </div>

        <div class="flex-between">
          <p style="font-size:12px;color:var(--txt-muted)">Custo Fixo Real = Custo Bruto − Receitas Internas. Este valor é usado na precificação.</p>
          <button class="btn btn-primary" id="btnSalvarRec">Salvar ${MESES[mesIdx]}</button>
        </div>
      </div>
    </div>

    <!-- Resumo anual -->
    <div class="card mt-24">
      <div class="card-header"><span class="card-title">Custo Fixo Real por Mês</span></div>
      <div class="card-body" style="padding:0">
        <div class="table-wrap" style="border:none;box-shadow:none">
          <table>
            <thead><tr>
              ${MESES.map(m => `<th class="td-center">${m.slice(0,3)}</th>`).join('')}
              <th class="td-center">Média</th>
            </tr></thead>
            <tbody><tr>
              ${MESES.map((_,i) => {
                const cfr = Receitas.custoFixoRealMes(mesKey(ano, i));
                const tot = Custos.totalMes(mesKey(ano, i));
                return `<td class="td-center td-mono ${i===mesIdx?'fw-600 text-plum':''}"
                  title="Custo bruto: ${R$(tot)}">${cfr ? R$(cfr) : '<span class="text-muted">—</span>'}</td>`;
              }).join('')}
              <td class="td-center td-mono fw-600 text-green">${R$(Receitas.mediaCustoFixoReal())}</td>
            </tr></tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  // Live update
  formEl.querySelectorAll('input[type="number"]').forEach(inp => {
    inp.oninput = () => {
      const total = campos.reduce((s,[k]) => s + (parseFloat(document.getElementById(`ri-${k}`)?.value)||0), 0);
      const cfr   = Math.max(0, totalCF - total);
      const riEl  = document.getElementById('riTotal');
      const cfEl  = document.getElementById('riCFReal');
      if (riEl) riEl.textContent = R$(total);
      if (cfEl) cfEl.textContent = R$(cfr);
    };
  });

  document.getElementById('btnSalvarRec').onclick = () => {
    const saved = {};
    campos.forEach(([k]) => { saved[k] = parseFloat(document.getElementById(`ri-${k}`)?.value) || 0; });
    Receitas.saveMes(key, saved);
    toast(`Receitas de ${MESES[mesIdx]} salvas! ✓`, 'success');
    renderForm(ano, mesIdx);
  };
}
