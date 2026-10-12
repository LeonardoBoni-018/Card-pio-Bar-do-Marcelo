# Front — Cardápio do Bar do Marcelo

React 19 · TypeScript · Vite · Tailwind CSS 4 · React Router · TanStack Query · React Hook Form + Zod.

| Rota | Quem | O que faz |
|---|---|---|
| `/` | Cliente | Cardápio por categoria, busca (sem acento), detalhes do item |
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

## Decisões
- **Identidade:** vermelho do letreiro + laranja do toldo (listras no topo, como a fachada) + azul-céu só para foco e links. Textos sempre com contraste AA (laranja é usado em fundos/decoração; texto laranja não).
- **Cardápio como cardápio de bar:** linhas com pontilhado entre nome e preço, em vez de cartões iguais.
- **Performance:** o painel é carregado sob demanda (`lazy`) — quem só olha o cardápio baixa ~97 kB (gzip), sem formulários/validação; imagens com `loading="lazy"` e dimensões fixas (sem salto de layout); TanStack Query com cache e revalidação.
- **Segurança:** JWT em `localStorage` com expiração automática e logout em qualquer 401; React escapa todo conteúdo (sem `dangerouslySetInnerHTML`); CSP restritiva na Vercel; a validação final é sempre da API.
- **Acessibilidade:** navegação por teclado, foco visível, `<dialog>` nativo, campos com rótulo e erro ligados por `aria-describedby`, `prefers-reduced-motion` respeitado, alvos de toque ≥ 44 px.
