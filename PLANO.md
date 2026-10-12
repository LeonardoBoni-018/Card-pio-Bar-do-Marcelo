# Plano — Cardápio Digital do Bar do Marcelo

## 1. Objetivo
Site público com o cardápio (nome, imagem, descrição, preço, categoria) e uma área restrita do proprietário para incluir, editar e excluir itens. **Sem pedidos online.**

## 2. Interfaces
| Interface | Acesso | Funções |
|---|---|---|
| **Cliente** (`/`) | Público | Ver cardápio por categoria, busca, filtros, detalhe do item. Somente leitura. |
| **Proprietário** (`/admin`) | Login | CRUD de itens (nome, descrição, preço, categoria, foto, disponível/indisponível, destaque), CRUD de categorias, ordenação. |

## 3. Arquitetura
```
Card-pio-Bar-do-Marcelo/
├── frontend/   React + TypeScript + Vite
├── backend/    Java 21 + Spring Boot 3 (API REST)
├── docker-compose.yml   (frontend + backend + PostgreSQL)
└── .claude/skills/      (skills de apoio, ver seção 7)
```

### Backend (Spring Boot)
- Camadas: `controller → service → repository`, DTOs separados das entidades (records Java), MapStruct para mapeamento.
- Banco: PostgreSQL (H2 em testes/dev rápido), migrations com **Flyway**.
- Endpoints:
  - Públicos: `GET /api/menu` (cardápio agrupado por categoria, só itens disponíveis), `GET /api/items/{id}`.
  - Admin (JWT): `POST/PUT/DELETE /api/admin/items`, `/api/admin/categories`, `POST /api/admin/images`, `POST /api/auth/login`.
- Upload de imagem: validar tipo (jpeg/png/webp) pelo conteúdo, limite de tamanho, nome aleatório (UUID), redimensionar/comprimir (thumbnailator). Armazenamento em disco/volume, trocável por S3 depois.
- Validação com Bean Validation; erros padronizados (RFC 7807 `ProblemDetail`); OpenAPI/Swagger (springdoc).
- Preço com `BigDecimal` (nunca `double`).

### Frontend (React)
- Vite + React + TypeScript, React Router, TanStack Query (cache/performance), React Hook Form + Zod (formulários), Tailwind CSS + shadcn/ui (componentes acessíveis).
- Mobile-first (clientes acessam pelo celular, provavelmente via QR code na mesa).
- Rotas admin com guarda de autenticação; `lazy` loading do bundle admin para o cliente baixar menos JS.

## 4. Experiência do usuário (UX)
- Cliente: barra de categorias fixa no topo com rolagem para a seção, cards com foto + preço bem legíveis, busca, itens indisponíveis ocultos (ou marcados), carregamento com skeleton, imagens com `lazy` e `srcset`.
- Proprietário: lista com busca, formulário simples com pré-visualização da foto, confirmação ao excluir, alternar "disponível" com um toque, feedback (toasts), funciona bem no celular.
- Acessibilidade: contraste AA, navegação por teclado, `alt` nas imagens, labels nos campos.
- Layout/cores/identidade: **a definir com você** (seção 9).

## 5. Segurança
- Senha com BCrypt; login do proprietário com JWT de curta duração (cookie `HttpOnly` + `SameSite`, ou token + refresh); usuário admin criado via variável de ambiente/seed, nunca hardcoded.
- Spring Security: rotas `/api/admin/**` exigem role `ADMIN`; `GET` públicos liberados; CORS restrito ao domínio do front; CSRF conforme estratégia de cookie.
- Rate limiting no login (Bucket4j) contra força bruta; headers de segurança (CSP, HSTS, X-Content-Type-Options).
- Validação de entrada e de upload; sem SQL concatenado (JPA/parametrizado); segredos só por variáveis de ambiente; `npm audit` / OWASP Dependency-Check no CI.
- HTTPS obrigatório em produção.

## 6. Performance
- Cache HTTP (`Cache-Control`/ETag) + cache Spring no `GET /api/menu`, invalidado nas escritas do admin.
- Compressão gzip/brotli, imagens redimensionadas/WebP, paginação nas listas admin, índices no banco.
- Front: code-splitting, TanStack Query, fontes otimizadas, meta Lighthouse ≥ 90.

## 7. Skills pesquisadas (Claude Code)
Nenhuma instalada ainda — todas são de terceiros, então vou ler cada `SKILL.md` antes de adotar. Aguardo seu OK.

| Área | Skill | Observação |
|---|---|---|
| Layout/UI | [`frontend-design`](https://claudemarketplaces.com/skills/skillcreatorai/ai-agent-skills/frontend-design) (Anthropic) | Define direção de design antes de gerar UI. `/plugin install frontend-design@claude-code-plugins` |
| Layout/UI | [`ui-ux-pro-max`](https://claudemarketplaces.com/skills/likaia/nginxpulse/ui-ux-pro-max) | Estilos, paletas, tipografia; suporta React/Tailwind/shadcn |
| Back-end | [`java-springboot`](https://claudemarketplaces.com/skills/github/awesome-copilot/java-springboot) (awesome-copilot) | REST, JPA, segurança, logging, testes |
| Back-end | [`spring-boot-engineer`](https://vibeindex.ai/skills/jeffallan/claude-skills/spring-boot-engineer) (jeffallan) | Alternativa mais modular |
| Testes | [`webapp-testing`](https://www.mdskills.ai/skills/webapp-testing) (anthropics/skills, Playwright) | Testes E2E/visuais do front rodando |
| Segurança | skill nativa `security-review` | Já disponível nesta sessão |

Recomendação: `frontend-design` + `java-springboot` + `webapp-testing` (+ `ui-ux-pro-max` quando definirmos o layout).

## 8. Testes
- Backend: JUnit 5 + Mockito (services), `@WebMvcTest` (controllers + segurança), Testcontainers/PostgreSQL (repositórios e integração), ArchUnit opcional.
- Frontend: Vitest + React Testing Library (componentes), MSW (mock da API), Playwright (E2E: cliente vê o cardápio; admin faz login, cria, edita e exclui item com foto).
- Acessibilidade automatizada (axe) e Lighthouse no CI.
- CI no GitHub Actions: build + lint + testes + auditoria de dependências em cada push.

## 9. Etapas
1. **Estrutura**: monorepo `frontend/` + `backend/`, Docker Compose, README, CI base.
2. **Backend**: modelo, migrations, API pública, segurança/JWT, CRUD admin, upload de imagem, testes.
3. **Frontend cliente**: cardápio (com layout provisório neutro).
4. **Frontend admin**: login e CRUD completo.
5. **Layout e identidade visual**: aplicar cores/estilo definidos por você.
6. **Testes E2E, segurança, performance** e ajustes.
7. **Deploy** (ex.: front em Vercel/Netlify/Cloudflare, API + banco em Render/Railway/Fly.io ou uma VPS com Docker).

## 10. Decisões em aberto
- Layout, cores, logo, tom (rústico, moderno, descontraído…) — você informa depois.
- Um único proprietário ou mais de um usuário admin?
- Hospedagem desejada e domínio (afeta o deploy).
- Cardápio precisa de variações (tamanhos, porções), alergênicos ou itens por horário?
- Idioma: apenas português (BR)?
