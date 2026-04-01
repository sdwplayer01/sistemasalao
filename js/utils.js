// ═══════════════════════════════════════════════════════
// utils.js — Formatação, helpers e máscara de moeda
// v2.3: + formatarMoeda() + applyMoneyMask()
// ═══════════════════════════════════════════════════════

export const R$ = (v) =>
  Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const pct = (v) =>
  Number(v || 0).toLocaleString('pt-BR', { style: 'percent', minimumFractionDigits: 1 });

export const num = (v) =>
  Number(v || 0).toLocaleString('pt-BR');

export function fmtData(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export function hoje() {
  return new Date().toISOString().slice(0, 10);
}

export function mesKey(ano, mesIdx) {
  return `${ano}-${String(mesIdx + 1).padStart(2, '0')}`;
}

export function diaSemana(iso) {
  if (!iso) return '—';
  const dias = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
  const [y, m, d] = iso.split('-').map(Number);
  return dias[new Date(y, m - 1, d).getDay()];
}

export function limparTelefone(v) {
  return v.replace(/\D/g, '');
}

export function formatarTelefone(v) {
  const n = limparTelefone(v);
  if (n.length === 11)
    return `(${n.slice(0,2)}) ${n.slice(2,7)}-${n.slice(7)}`;
  if (n.length === 10)
    return `(${n.slice(0,2)}) ${n.slice(2,6)}-${n.slice(6)}`;
  return v;
}

export function linkWA(telefone) {
  let n = limparTelefone(telefone);
  if (n.length > 11 && n.startsWith('55')) n = n.slice(2);
  if (n.length < 10 || n.length > 11) return null;
  return `https://wa.me/55${n}`;
}

// ── Máscara de moeda (Anotação 4b) ─────────────────────
// Formata 2500 → "R$ 2.500,00" no blur
// Retorna o valor numérico limpo para usar em cálculos
export function formatarMoeda(valor) {
  const n = parseFloat(String(valor).replace(/[^\d.,\-]/g, '').replace(',', '.'));
  if (isNaN(n)) return '';
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Aplica listener blur em inputs type=number de preço
// Converte para exibição formatada on blur, volta para número on focus
// Uso: após renderizar HTML, chamar applyMoneyMask(container, '.money-input')
export function applyMoneyMask(container, selector = '[data-money]') {
  if (!container) return;
  container.querySelectorAll(selector).forEach(input => {
    // Marca que já foi bindado para evitar duplicidade
    if (input._moneyMask) return;
    input._moneyMask = true;

    input.addEventListener('blur', () => {
      const val = parseFloat(input.value);
      if (!isNaN(val) && val > 0) {
        input.dataset.rawValue = val;
        input.type = 'text';
        input.value = formatarMoeda(val);
      }
    });

    input.addEventListener('focus', () => {
      if (input.dataset.rawValue) {
        input.type = 'number';
        input.value = input.dataset.rawValue;
        input.dataset.rawValue = '';
      }
    });
  });
}

// ── UI helpers ─────────────────────────────────────────
export function toast(msg, tipo = 'default', dur = 3000) {
  const tc = document.getElementById('toastContainer');
  const t  = document.createElement('div');
  t.className = `toast ${tipo}`;
  t.textContent = msg;
  tc.appendChild(t);
  setTimeout(() => t.remove(), dur);
}

export function openModal(title, bodyHTML, footerHTML = '') {
  document.getElementById('modalTitle').textContent  = title;
  document.getElementById('modalBody').innerHTML     = bodyHTML;
  document.getElementById('modalFooter').innerHTML   = footerHTML;
  document.getElementById('modalOverlay').classList.add('open');
  // Lucide: re-renderiza ícones dentro do modal
  if (window.lucide) window.lucide.createIcons();
}

export function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
}

export function el(id) { return document.getElementById(id); }

export function ce(tag, attrs = {}, ...children) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') e.className = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v);
  }
  for (const c of children) {
    if (typeof c === 'string') e.appendChild(document.createTextNode(c));
    else if (c) e.appendChild(c);
  }
  return e;
}

export function emptyState(msg = 'Nenhum dado encontrado.') {
  return `<div class="empty-state">
    <div class="empty-icon">✦</div>
    <p>${msg}</p>
  </div>`;
}

// Renderiza ícones Lucide após injeção de HTML dinâmico
export function initIcons() {
  if (window.lucide) window.lucide.createIcons();
}
