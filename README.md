# ✦ Salão Premium — Sistema Web de Gestão (v3.1)

Sistema web completo para gestão de salão de beleza. Arquitetura offline-first com sincronização em nuvem via Supabase, design premium com paleta lilás e dourado, e interface 100% responsiva.

---

## ✦ Visão Geral

O Salão Premium é uma aplicação SPA (Single Page Application) construída em JavaScript puro com ES Modules. Toda a interface é renderizada client-side, sem framework — apenas HTML, CSS e JS nativos.

### Destaques da v3.1

- **Dashboard operacional completo**: KPIs do mês, agenda de hoje/amanhã, saúde da carteira de clientes (CRM), gráfico semestral de faturamento vs lucro, e alerta de estoque baixo.
- **Barra de lembretes rotativos**: perguntas de gestão que giram automaticamente a cada 6 segundos, agora gerenciada via JavaScript (sem HTML estático duplicado).
- **Offline-first**: todos os dados são gravados no `localStorage` e sincronizados com o Supabase em background via debounce (1.5s).
- **Backend com Supabase**: autenticação (e-mail/senha, Google OAuth, magic link), armazenamento em nuvem por tipo de dado (`salao_data`).
- **Dark mode**: alternância claro/escuro persistida via `data-theme` no `<html>`.
- **Ícones vetoriais**: Lucide Icons (v0.344.0) em toda a interface.
- **Tipografia premium**: Cormorant Garamond (títulos), Inter (corpo), Playfair Display (destaques).
- **Linguagem padronizada**: tom profissional e próximo, com voz consistente em toasts, diálogos, subtítulos e estados vazios.

---

## ✦ Módulos

| Módulo | Descrição |
|--------|-----------|
| **Dashboard** | KPIs mensais (faturamento, lucro real, custo fixo, ticket médio), agenda de hoje e amanhã, widget de saúde da carteira com gráfico de pizza CSS, gráfico de barras dos últimos 6 meses, alerta de estoque baixo e barra de lembretes rotativos. |
| **Agenda** | Agendamento de horários com filtros por mês e status. Três mensagens automáticas de WhatsApp por agendamento: confirmação, lembrete de véspera e agradecimento pós-atendimento. |
| **Diário / Caixa** | Frente de caixa com lançamento de atendimentos (serviços e produtos), cálculo de comissões por profissional, e visualização do caixa do dia com resumo por forma de pagamento. |
| **Serviços & Produtos** | Catálogo com duas abas. Serviços com precificação baseada em tempo + custo de produto + custo fixo rateado. Produtos com estoque, SKU automático e cálculo de margem. |
| **Custos Fixos** | Dez campos fixos (aluguel, energia, internet, etc.) + linhas dinâmicas para outros custos. Atualização em tempo real do total enquanto a usuária digita. |
| **Receitas do Espaço** | Aluguéis de cadeira e repasses que reduzem o custo fixo bruto, resultando no custo fixo real usado na precificação. |
| **Controle Anual** | DRE consolidado com 14 indicadores mês a mês, incluindo métricas avançadas (faturamento de terceiros, aluguel de cadeiras). Gráfico de barras faturamento vs lucro. |
| **Clientes** | CRM com segmentação automática (fiel, nova, regular, ausente, inativa) baseada em frequência de visitas. Perfil com ficha técnica, timeline unificada (diário + agenda) e estatísticas. |
| **Configurações** | Dados do salão, parâmetros de precificação (multiplicadores), listas editáveis (profissionais, categorias, formas de pagamento) e toggle de tema claro/escuro. |

---

## 🚀 Como executar

O sistema usa ES Modules (`type="module"`) e precisa de um servidor HTTP local. A forma mais simples é usar o **Live Server** do VS Code.

1. Clone o repositório:
   ```bash
   git clone https://github.com/sdwplayer01/sistemasalao.git
   ```
2. Abra a pasta no VS Code e inicie o Live Server.
3. Faça login com e-mail/senha ou Google.

### Credenciais do Supabase

O projeto já vem configurado com as credenciais do Supabase em `js/supabase.js`. Para usar seu próprio projeto:

```javascript
export const SUPABASE_URL = 'https://seu-projeto.supabase.co'
export const SUPABASE_KEY = 'sua-chave-publica-anon'
```

---

## 📂 Estrutura do projeto

```
sistemasalao/
├── index.html                ← App Shell: sidebar, top bar, containers de página, modal e toast
├── css/
│   └── style.css             ← Design system: variáveis, temas (light/dark), layout Flexbox
├── js/
│   ├── app.js                ← Boot, roteador SPA, autenticação, tema, barra rotativa
│   ├── storage.js            ← CRUD offline-first (localStorage) + sync Supabase em background
│   ├── supabase.js           ← Cliente Supabase (auth + tabela salao_data)
│   ├── utils.js              ← Formatação (R$, datas, telefone), máscaras, modal, toast, ícones
│   ├── ui.js                 ← Componentes HTML reutilizáveis (KPIs, timeline, stat rows)
│   └── pages/
│       ├── login.js          ← Tela split-screen com login, cadastro e recuperação de senha
│       ├── dashboard.js      ← Painel com KPIs, agenda, CRM, gráfico semestral e alertas
│       ├── agenda.js         ← CRUD de agendamentos + WhatsApp automático
│       ├── diario.js         ← Frente de caixa com lançamentos e comissões
│       ├── servicos.js       ← Catálogo de serviços e produtos com precificação
│       ├── custos.js         ← Despesas fixas mensais
│       ├── receitas.js       ← Receitas internas (aluguéis e repasses)
│       ├── controle.js       ← DRE anual consolidado com gráfico
│       ├── clientes.js       ← CRM com segmentação automática
│       └── configuracoes.js  ← Dados do salão, precificação e preferências
├── assents/
│   └── favicon-32x32.png     ← Ícone do navegador
├── doc/
│   └── analise_ux_logica.md  ← Documentação técnica de UX
└── README.md
```

---

## 💾 Arquitetura de dados

Todo acesso a dados passa pelo `storage.js`, que funciona como um proxy:

1. **Leitura**: sempre do `localStorage` (instantânea).
2. **Escrita**: grava no `localStorage` e agenda sync para o Supabase via debounce de 1.5s.
3. **Carga inicial**: após login, os dados são puxados do Supabase e gravados no `localStorage`.

Tipos de dados sincronizados: `config`, `custos`, `receitas`, `servicos`, `diario`, `agenda`, `produtos`, `clientes`.

### Cache de performance

O módulo de clientes usa `_statsCache` (Map) para memoizar cálculos de estatísticas por nome. O cache é invalidado automaticamente em qualquer mutação do Diário ou da Agenda.

---

## 📱 Integração com WhatsApp

O módulo de Agenda gera três tipos de mensagem automática para cada agendamento:

| Tipo | Quando usar | Exemplo |
|------|-------------|---------|
| ✅ Confirmação | Ao agendar | "Oiii, Maria! 🌸 Seu horário está confirmado pra 05/04/2026 às 14:00..." |
| 💜 Lembrete | Na véspera | "Oiii, Maria! 💜 Passando pra lembrar que amanhã te espero às 14:00..." |
| 🌷 Agradecimento | Após atender | "Oiii, Maria! 🌷 Foi um prazer te atender hoje!..." |

O telefone é sanitizado automaticamente (remove espaços, hífens e pontos) antes de montar o link `wa.me`.

---

## 🎨 Design system

O sistema usa variáveis CSS com dois temas (`light` e `dark`), alternados via `data-theme` no `<html>`.

- **Paleta principal**: lilás (`--plum`), rosé (`--rose`), verde menta (`--sage`), dourado (`--gold`)
- **Tipografia**: Inter 300–600 (corpo), Cormorant Garamond 400–600 (títulos serif), Playfair Display 400–700 (destaques)
- **Ícones**: Lucide Icons v0.344.0 via CDN (UMD)
- **Layout**: Flexbox nativo para sidebar colapsável + área principal responsiva

---

## 🗣 Tom de voz

O sistema segue cinco princípios de comunicação documentados:

1. **Português brasileiro, sempre** — sem europeísmos ("registro", não "registo").
2. **Próxima, mas profissional** — direta e respeitosa, sem ser fria nem informal demais.
3. **Uma voz, dois contextos** — interface do sistema (tom profissional) vs. mensagens de WhatsApp (tom pessoal e caloroso).
4. **Ações no imperativo** — botões usam verbo no imperativo com capitalização consistente ("Salvar lançamento", não "Salvar Lançamento").
5. **Feedback padronizado** — toasts seguem o padrão `[Objeto] [verbo no passado]!` sem símbolos redundantes.
