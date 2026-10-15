# Front — Cardápio do Bar do Marcelo

React 19 · TypeScript · Vite · Tailwind CSS 4 · React Router · TanStack Query · React Hook Form + Zod.

| Rota | Quem | O que faz |
|---|---|---|
| `/` | Cliente | Cardápio por categoria, busca (sem acento), detalhes do item. **Não tem link para o painel**: o proprietário acessa digitando `/admin` (guarde nos favoritos / adicione à tela inicial) |
| `/admin/login` | Proprietário | Login |
| `/admin/items`, `/admin/items/new`, `/admin/items/:id` | Proprietário | Listar, buscar, criar, editar, ocultar e excluir itens (com foto) |
| `/admin/categories` | Proprietário | Criar, editar e excluir categorias |

## Rodar
```bash
# 1) API (outro terminal): cd ../backend && mvn spring-boot:run -Dspring-boot.run.profiles=dev
# 2) Front
cd frontend
npm install
npm run dev        # http://localhost:5173  (admin / admin12345 no perfil dev da API)
```
Em desenvolvimento o Vite encaminha `/api` para `http://localhost:8080` (mude com `VITE_PROXY_TARGET`).

## Testes
```bash
npm run lint && npm run typecheck
npm test                # Vitest + Testing Library + MSW (API simulada) — 95 testes
npm run test:coverage   # exige ≥ 80%
npm run e2e             # Playwright: sobe a API real (perfil dev) + o front compilado
npm run screenshots     # regrava docs/screenshots
```
Os testes E2E cobrem: cardápio (desktop e celular), busca, detalhes, login (certo/errado), criar categoria e item com foto, ver no cardápio público, ocultar, editar, excluir, sessão após recarregar, e checagem de acessibilidade (axe, WCAG A/AA) nas telas principais.

## Deploy na Vercel
1. *Add New → Project* → este repositório → **Root Directory: `frontend`** (o framework Vite é detectado).
2. O `vercel.json` já aponta para a API (`https://bar-do-marcelo-api.onrender.com`); se você criar a API com outro nome, troque o endereço lá. É esse *rewrite* que faz `/api/*` chegar à API: o navegador só fala com o domínio da Vercel, e as fotos (cache de 1 ano) passam a ser servidas pela CDN.
3. **No Render, coloque o domínio da Vercel em `APP_CORS_ORIGINS`** (ex.: `https://cardapio-marcelo.vercel.app`; para os links de preview use um padrão do seu projeto, ex.: `https://cardapio-marcelo-*.vercel.app`). Sem isso, o login e qualquer salvamento respondem 403, porque o navegador envia `Origin` nas escritas.
4. `vercel.json` também define os cabeçalhos de segurança (CSP, `X-Frame-Options`, `nosniff`…) e o cache imutável de `/assets`.

`VITE_API_URL` só é necessário se você optar por chamar a API em outro domínio, sem o rewrite (exige ajustar `connect-src`/`img-src` da CSP).

## Pensado para o celular (a maioria dos acessos)
- **Cliente:** cabeçalho compacto com o logo, busca grande, categorias fixas no topo ao rolar (com rolagem lateral e "ímã" por chip), itens em cartões com foto de 96 px e **preço sempre visível** (sem quebrar linha), detalhes numa **gaveta colada no rodapé** (fecha com o polegar). Em telas maiores vira o cardápio de bar com pontilhado entre nome e preço.
- **Proprietário:** navegação **fixa embaixo** (Itens · Categorias · Cardápio · Sair), botão flutuante **+ Novo item**, cada item num cartão com chave de disponibilidade grande, e no formulário uma **barra Cancelar/Salvar fixa no rodapé**. Alvos de toque ≥ 44 px (verificado nos testes E2E).
- **Fotos:** a foto tirada na hora é **reduzida no aparelho** (máx. 1600 px, JPEG) antes de enviar — uma foto de câmera de 8 MB vira ~300 KB. A API ainda gera uma **miniatura de 480 px** usada nas listas, então a lista carrega rápido no 4G.
- Instalável: ícone e manifesto, então dá para "Adicionar à tela inicial" (abre sem barra do navegador).

## API "dormindo" (plano gratuito do Render)
No plano gratuito a API **desliga após 15 min sem acesso** e leva ~70 s para religar. Para isso não parecer "site quebrado":
- O cardápio **mostra na hora o que o aparelho viu da última vez** e atualiza em seguida (sempre busca a versão atual).
- Na primeira visita do dia aparece o aviso *"Estamos acordando o cardápio…"* e o front **continua tentando** (até ~2–3 min) em vez de mostrar erro.
- O login espera e repete sozinho enquanto o servidor acorda (só repete em 502/503/504 ou sem conexão; senha errada nunca é repetida).
- Com o painel aberto e visível, uma chamada leve (`/api/ping`, 204) a cada 8 min mantém a API acordada durante a edição.

### Leitura pública sem depender da API (Vercel Functions)
O que o **cliente** vê (cardápio e fotos) é lido por duas funções da Vercel (`api/fast/menu.ts` e `api/fast/images/[filename].ts`) direto do Neon, com um usuário **somente leitura** (`cardapio_leitura`, só `SELECT` em categorias, itens e imagens; sem acesso a `admin_user`). Assim o cardápio abre na hora mesmo com a API dormindo.
- Liga com a variável `VITE_FAST_READS=1` (build) e `MENU_DATABASE_URL` (connection string do usuário somente leitura, só no servidor da Vercel).
- **Volta automática:** se a função falhar (503, rede, variável ausente), o front usa `/api/menu` na API do Render como antes; foto que não carrega troca para `/api/images/..`.
- Cache na CDN: cardápio ~15 s (+ 60 s servindo versão anterior enquanto atualiza), então uma edição do dono aparece em até ~1 min; fotos são imutáveis (1 ano).
- O `vercel.json` exclui `/api/fast/*` do encaminhamento para o Render. O painel do dono continua usando a API (a 1ª entrada do dia pode levar ~1 min).
- Testes: unitários (banco falso) e de integração em PostgreSQL real, aplicando as mesmas migrações Flyway do back-end — defina `TEST_DATABASE_URL` para rodá-los (a CI já faz isso).
- Observação: o plano Hobby da Vercel é para uso não comercial; para um negócio, considere o plano Pro.
- Para eliminar de vez a espera do painel: plano pago do Render ou um pinger externo (UptimeRobot) em `/actuator/health/liveness` no horário de funcionamento.

## Decisões
- **Identidade:** o **logo do letreiro** (vetorizado a partir da foto: `src/assets/logo-*.svg`, nítido em qualquer tamanho e sem fundo), vermelho do letreiro + laranja do toldo (listras no topo, como a fachada) + azul-céu só para foco e links. **Cores chapadas, sem degradês.** Textos com contraste AA (laranja só em fundos/decoração).
- **Performance:** o painel é carregado sob demanda (`lazy`) — quem só olha o cardápio baixa ~97 kB (gzip), sem formulários/validação; imagens com `loading="lazy"` e dimensões fixas (sem salto de layout); TanStack Query com cache e revalidação.
- **Segurança:** JWT em `localStorage` com expiração automática e logout em qualquer 401; React escapa todo conteúdo (sem `dangerouslySetInnerHTML`); CSP restritiva na Vercel; a validação final é sempre da API.
- **Acessibilidade:** navegação por teclado, foco visível, `<dialog>` nativo, campos com rótulo e erro ligados por `aria-describedby`, `prefers-reduced-motion` respeitado, alvos de toque ≥ 44 px.
