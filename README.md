# Cardápio digital — Bar do Marcelo

Página pública com o cardápio (nome, foto, descrição e preço) e uma área restrita para o proprietário incluir, editar e excluir itens. Sem pedidos online.

| Parte | Tecnologia | Hospedagem | Documentação |
|---|---|---|---|
| `frontend/` | React 19 + TypeScript + Vite + Tailwind | Vercel | [frontend/README.md](frontend/README.md) |
| `backend/` | Java 21 + Spring Boot 3.5 | Render (`render.yaml`) | [backend/README.md](backend/README.md) |
| Banco | PostgreSQL | Neon | [backend/README.md](backend/README.md#deploy-neon-banco--render-api--vercel-front) |

Ordem do deploy: **Neon → Render → Vercel**, e por fim colocar o domínio da Vercel em `APP_CORS_ORIGINS` no Render.

## Rodar tudo localmente
```bash
cd backend  && mvn spring-boot:run -Dspring-boot.run.profiles=dev   # API em :8080 (admin / admin12345)
cd frontend && npm install && npm run dev                            # site em :5173
```

## Testes
- Back: `cd backend && mvn verify` — 94 testes, cobertura ≥ 85% exigida.
- Front: `cd frontend && npm test` (135 testes) e `npm run e2e` (Playwright contra a API real, em desktop, celular e celular pequeno).
- CI no GitHub Actions: `.github/workflows/backend.yml` e `frontend.yml`.

Capturas de tela: [docs/screenshots](docs/screenshots). Plano original: [PLANO.md](PLANO.md).

## Produção
- **API (Render):** https://bar-do-marcelo-api.onrender.com — plano gratuito (dorme após 15 min sem acesso; o primeiro acesso leva ~1 min).
- **Banco (Neon):** projeto `bar-do-marcelo`, região Ohio (`aws-us-east-2`).
- **Site (Vercel):** projeto `cardapio-bar-do-marcelo`, pasta raiz `frontend`. O domínio dele precisa estar em `APP_CORS_ORIGINS` no Render.
- O Render publica a partir da branch `claude/menu-app-react-spring-eg9i8t`; se for passar para `main`, troque a branch no serviço.
