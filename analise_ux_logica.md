# ✦ Análise de UX e Regras de Negócio (Comissões e Sidebar)

Com base no seu áudio, compreendi perfeitamente os 4 pontos de melhoria solicitados. Como você pediu parar **apenas analisar** e não implementar ainda, preparei este documento dissecando a viabilidade e o que precisará ser alterado futuramente.

---

## 1. Melhoria de UX: Barra Lateral Retrátil (Sidebar Collapse)

**O Cenário Atual:**
A barra lateral (`sidebar`) no desktop é fixa com largura total (aproximadamente 260px). Ela só tem um comportamento diferente no celular, onde e escondida totalmente e aberta pelo menu hambúrguer `☰`.

**A Solução Analisada:**
Para fazer com que "recolha para o lado":
- Criaremos uma classe combinada no CSS (ex: `.sidebar.collapsed`), que diminui a largura para uns `80px`.
- Ocultaremos o texto e a logo, deixando apenas visíveis os `.nav-icon`.
- O botão do menu `☰` (que hoje só aparece no mobile) passará a aparecer no topo do Desktop também, servindo como o gatilho (toggle) para expandir/recolher a barra.

## 2. Ícones Profissionais vs. Emojis

**O Cenário Atual:**
No arquivo `index.html`, atualmente usamos caracteres Unicode/Emojis dentro da tag `<span class="nav-icon">` (ex: ◈, 🗓, 📅, ✂). Embora charmosos, emojis variam de design entre Windows, Mac e iOS.

**A Solução Analisada:**
- Para garantir que sejam esteticamente coesos e finos (Premium), deveremos usar uma biblioteca de ícones em vetor (SVG), como **Lucide Icons** ou **Phosphor Icons**.
- Nenhum pacote pesado será instalado. Importaremos apenas via CDN, e trocaremos coisas como `📅` por `<i data-lucide="calendar"></i>`. Isso garantirá um design idêntico em qualquer tela e que combine com as variações de cores.

---

## 3. Lógica de Negócio: Comissão Manual de Profissionais (ex: Manicure)

**O Cenário Atual no Código:**
Hoje, ao registrar um atendimento no **Diário** (`diario.js`), o sistema pergunta: 
- Nome da Cliente, Serviço, Valor Cobrado, e o *Custo Total* é calculado automaticamente baseado no tempo (Valor/Hora) + Custo do Produto. 
- **Não há** atualmente um campo nativo estruturado para "% de Comissão" ou "Valor da Comissão" da profissional na hora desse registro. O lucro é secamente  `Faturamento` - `Custo Total`.

**A Solução Analisada:**
Para introduzir isso:
1. No formulário do Diário (Modal de Novo Atendimento), adicionaremos uma área nova: **Comissionamento**.
2. Terá um campo numérico para "% de Comissão" (que pode ser salvo no perfil da profissional ou inserido na hora).
3. Terá um campo automático (somente leitura) que calcula em Reais (R$) o valor exato que aquela profissional vai receber. Ex: `Serviço de R$100` x `40% comissão` = `R$40`.
4. Os cálculos de lucro final do salão deverão passar a descontar esse repasse (A matemática seria: `Preço Cobrado` - `Custo Produto/Fixo` - `Comissão` = `Lucro Real do Salão`).

## 4. Destaque Visual Dinâmico para Profissionais

**O Cenário Atual no Código:**
Na tabela do Diário, na coluna "Profissional", todo mundo recebe a mesma cor. O código atual diz claramente: 
`<td><span class="badge badge-rose">${e.profissional}</span></td>`
Ou seja, qualquer profissional fica com o fundo "Rose" (rosa).

**A Solução Analisada:**
Podemos criar uma lógica condicional simples (um `if / else`) para a UI:
- Se for a **Proprietária** (ou a conta logada): Permanece a cor `badge-plum` (Roxo denso Premium) garantindo aquele "destaque de dona".
- Se for **qualquer outra profissional**: Recebe uma cor auxiliar do nosso Design System, como um `badge-rose` (rosa) ou `badge-sage` (verde neutro). 
- Assim, ao bater o olho na tabela de 50 atendimentos, você visualmente identifica quem produziu mais naquele dia, sem precisar ler todos os nomes intensamente.

---

### Conclusão

A arquitetura atual do código permite inserir essas 4 mudanças sem "quebrar" o que já está feito. A integração com o Supabase também aceitará normalmente um novo campo `comissao` no pacote que é salvo na nuvem.

Quando você configurar suas chaves do Supabase e estiver pronto para codificar, basta me dar a aprovação explícita e eu farei essa **refatoração (Sidebar retrátil + Ícones vetoriais + UI de Comissão + Pílulas de Cores)** ser implementada perfeitamente.
