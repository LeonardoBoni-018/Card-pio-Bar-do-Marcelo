# Comandas dos garçons — escopo e regras de desenvolvimento

Branch: **`feature/comandas`** · Banco de desenvolvimento: **Neon, branch `dev-comandas`** · Produção: **intocada até o lançamento**

O sistema passa a registrar os pedidos das mesas. Cada garçom tem login próprio, abre comandas por mesa, lança e edita os itens e fecha a conta. O valor fechado vai para os relatórios do painel do dono.

**Não emite nota fiscal nem registra forma de pagamento.** Serve só para somar a conta e manter o histórico.

## 1. Isolamento da produção

| Parte | Produção (não mexer) | Desenvolvimento desta funcionalidade |
|---|---|---|
| Código | `claude/menu-app-react-spring-eg9i8t` | `feature/comandas` |
| API (Render) | `bar-do-marcelo-api` publica só a branch de produção | `bar-do-marcelo-api-teste` (plano free) publica `feature/comandas`, usa o banco `dev-comandas`, chave ligada |
| Site (Vercel) | `bardomarcelo.com.br` = branch de produção | **`https://bardomarcelo-teste.vercel.app`** = branch `feature/comandas`; o `/api` desse endereço vai para a API de testes (regra por host no `vercel.json`) |
| Banco (Neon) | branch `main` | branch `dev-comandas`, uma cópia dos dados de 09/11/2026 |
| Chave de funcionalidade | `APP_FEATURE_COMANDAS` ausente = **desligada** | `application-dev.yml` e `frontend/.env.development` ligam |

Regras:

1. **Nunca** apontar o `DB_URL` local para o banco `main`. Use H2 (perfil `dev`) ou a branch `dev-comandas`. A connection string fica no console do Neon e **não** vai para o repositório.
2. Todo bean do módulo leva `@ComandasEnabled`. Com a chave desligada, os endpoints nem existem (404).
3. No front, as rotas e os menus novos ficam atrás de `comandasEnabled()` (`src/lib/features.ts`).
4. **As migrations do módulo usam a faixa V10–V19.** V5–V9 ficam reservadas para correções urgentes em produção, para não haver conflito de numeração no merge.
5. As migrations **só adicionam** (tabelas, colunas e índices novos). Nada do cardápio atual é apagado ou renomeado de forma incompatível.
6. Traga a produção para cá com frequência: `git merge origin/claude/menu-app-react-spring-eg9i8t`.
7. No build da Vercel, a branch `feature/comandas` liga `VITE_FEATURE_COMANDAS` e desliga as leituras rápidas, que leem o banco de produção (ver `frontend/vite.config.ts`). Os links de preview com hash dessa branch falam com a API de produção, por isso use só `bardomarcelo-teste.vercel.app`.

### Ambiente de testes

- Site: https://bardomarcelo-teste.vercel.app (painel em `/admin`, garçom em `/garcom`).
- Login de teste do proprietário: `marcelo` / `teste1234`. É diferente da produção e vale só aqui.
- A API de testes está no plano free do Render: depois de ~15 min parada, a 1ª requisição demora até ~1 min.
- Os previews da Vercel exigem login na Vercel (Vercel Authentication). Para o cliente testar sem conta, libere em *Settings → Deployment Protection* ou gere um link de compartilhamento.

## 2. Decisões do cliente

| Tema | Decisão |
|---|---|
| Mesas | Cadastradas pelo dono no painel (nome, ordem, ativa) |
| Comandas por mesa | Pode haver **várias abertas na mesma mesa**, com identificação opcional ("João", "Comanda 2") |
| Taxa de serviço | **Não cobra** |
| Forma de pagamento | **Não registra** |
| Item avulso | **Sim**: o garçom digita nome, preço e quantidade |
| Itens indisponíveis | Aparecem em cinza com "Indisponível", **sem poder selecionar**; a API também recusa |
| Fechar e remover itens | **Confirmado pelo cliente:** qualquer garçom lança, edita, remove itens e fecha a conta; só o dono reabre ou cancela uma comanda já fechada |
| Auditoria | Toda ação guarda quem fez e quando |

## 3. Modelo de dados

V10 (etapa 1, feita):

| Tabela | Campos principais |
|---|---|
| `admin_user` (entidade `AppUser`) | + `display_name`, `role` (`ADMIN`, `GARCOM`), `active`. O login atual vira ADMIN |
| `dining_table` (entidade `DiningTable`) | `id`, `name` (único), `display_order`, `active` |

Próximas (etapa 2):

| Tabela | Campos principais |
|---|---|
| `comanda` | `id`, `mesa_id`, `identificacao`, `status` (`ABERTA`, `FECHADA`, `CANCELADA`), `pessoas`, `desconto`, `total`, `aberta_por/em`, `fechada_por/em`, `cancelada_por/em`, `version` |
| `comanda_item` | `id`, `comanda_id`, `menu_item_id` (nulo = avulso), `nome` e `preco_unitario` **copiados**, `unidade` (`UNIT`, `KG`), `quantidade NUMERIC(10,3)`, `observacao`, `lancado_por/em` |

- Valores em `NUMERIC` e `BigDecimal`, arredondados aos centavos (HALF_UP) **no servidor**.
- Edição simultânea: travamento otimista (`@Version`). Quem salvar por último numa versão velha recebe 409 e recarrega a comanda.
- Itens com preço por kg: a quantidade aceita 3 casas decimais (ex.: 0,350 kg).

## 4. API planejada

| Quem | Rota | Função |
|---|---|---|
| Garçom/dono | `GET /api/pedidos/mesas` | mesas ativas (feito); na etapa 2, com as comandas abertas, total e tempo |
| Garçom/dono | `POST /api/pedidos/comandas` | abrir comanda (mesa, identificação, pessoas) |
| Garçom/dono | `GET /api/pedidos/comandas/{id}` | detalhe com itens e total |
| Garçom/dono | `POST/PATCH/DELETE /api/pedidos/comandas/{id}/itens[/{itemId}]` | lançar, alterar ou remover item (do cardápio ou avulso) |
| Garçom/dono | `POST /api/pedidos/comandas/{id}/mover` · `/juntar` | trocar de mesa · juntar duas comandas |
| Garçom/dono | `POST /api/pedidos/comandas/{id}/fechar` | fechar (desconto e divisão por pessoas só informativa) |
| Garçom/dono | `GET /api/pedidos/cardapio` | produtos para lançar, com o estado de disponibilidade |
| Dono | `/api/admin/garcons` (GET, POST, PUT) · `/api/admin/mesas` (GET, POST, `POST /lote`, PUT, DELETE) | cadastros (feito) |
| Dono | `POST /api/admin/comandas/{id}/reabrir` · `/cancelar` | correções |
| Dono | `GET /api/admin/relatorios?de&ate` · `.csv` | total, nº de comandas, ticket médio, por garçom/dia/mesa, mais vendidos, avulsos |

O "dia" dos relatórios usa o fuso America/Sao_Paulo e vira às 05:00, para a madrugada contar no dia anterior.

## 5. Telas

- **`/garcom`** (celular, uma mão):
  - lista de mesas com o número de comandas abertas e o total;
  - comandas da mesa e o botão "+ Nova comanda";
  - comanda: itens, + e −, observação, barra fixa com o total e "Fechar conta";
  - lançamento: busca e categorias numa gaveta que sobe da parte de baixo; "Item avulso"; indisponíveis em cinza;
  - atualização automática (a cada ~5 s e ao voltar para o app).
- **`/admin`**: novos menus Garçons, Mesas, Comandas (abertas e histórico) e Relatórios.
- **Login único**: o ADMIN vai para `/admin` e o GARCOM para `/garcom`.

## 6. Etapas

- [x] 0. Estrutura: branch, banco isolado, chaves de funcionalidade, este documento
- [x] 1. Perfis (ADMIN/GARCOM) no login e no token, cadastro de garçons, cadastro de mesas (migration V10), ambiente de testes
- [ ] 2. API de comandas: abrir, lançar (cardápio e avulso), editar, remover, mover, juntar; testes de cálculo (kg, desconto, arredondamento) e de concorrência
- [ ] 3. Tela do garçom: mesas, comandas, lançamento
- [ ] 4. Fechamento e divisão por pessoas; reabrir e cancelar pelo dono
- [ ] 5. Relatórios e exportação CSV
- [ ] 6. Testes E2E do fluxo completo e nos 17 tamanhos de tela; validação com o cliente no banco `dev-comandas`
- [ ] 7. Lançamento (ver abaixo)

## 7. Lançamento

1. Suítes verdes (Vitest, Maven e Playwright) e aprovação do cliente.
2. Fazer backup: criar uma branch ou snapshot do Neon `main` antes do merge.
3. Remover do `frontend/vercel.json` a regra do host `bardomarcelo-teste` (ou mantê-la: ela só vale para esse host). Fazer o merge de `feature/comandas` na branch de produção. O Render publica e a migration V10 roda; ela só adiciona tabelas e colunas.
4. Com a chave ainda **desligada**, conferir que o cardápio segue igual.
5. Ligar `APP_FEATURE_COMANDAS=true` no Render e `VITE_FEATURE_COMANDAS=1` na Vercel (produção), e fazer um novo deploy do front.
6. O dono cadastra as mesas e os garçons.
7. Para voltar atrás: desligar as duas chaves. As tabelas novas ficam, sem afetar o cardápio.
