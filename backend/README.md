# API do Cardápio — Bar do Marcelo

Java 21 · Spring Boot 3.5 · PostgreSQL · Flyway · JWT.

## Rodar em desenvolvimento (sem instalar nada além do JDK/Maven)
```bash
cd backend
mvn spring-boot:run -Dspring-boot.run.profiles=dev
```
H2 em memória, cardápio de exemplo, admin `admin` / `admin12345`, Swagger em http://localhost:8080/swagger-ui.html.

## Rodar localmente com PostgreSQL
```bash
cp .env.example .env   # preencha os segredos
docker compose up --build
```
Sem `APP_JWT_SECRET` (≥ 32 caracteres) ou com senha de admin curta, a aplicação **não sobe**.

## Deploy: Neon (banco) + Render (API) + Vercel (front)

### 1. Neon — banco
1. Crie o projeto e copie a connection string **direta** (host *sem* `-pooler`; o Flyway usa travas que o pooler em modo transação não suporta).
2. Pode colar a string como o Neon entrega (`postgresql://usuario:senha@ep-xxx.neon.tech/neondb?sslmode=require&channel_binding=require`): a API converte para JDBC sozinha. As tabelas são criadas na primeira subida (Flyway).

### 2. Render — API
1. *New → Blueprint* apontando para este repositório (usa o `render.yaml` da raiz) ou crie um *Web Service* Docker com `backend/Dockerfile`.
2. Variáveis de ambiente:

| Variável | Valor |
|---|---|
| `DB_URL` | string do Neon (item acima) |
| `APP_JWT_SECRET` | aleatório, ≥ 32 caracteres (o blueprint gera) |
| `APP_ADMIN_USER` / `APP_ADMIN_PASSWORD` | login do proprietário (senha ≥ 8 caracteres; alterar a variável e reiniciar troca a senha) |
| `APP_CORS_ORIGINS` | domínio(s) do front, separados por vírgula. Aceita curinga, ex.: `https://cardapio-bar-marcelo.vercel.app,https://cardapio-bar-marcelo-*.vercel.app` |

   O `PORT` é definido pelo Render. Health check: `/actuator/health/liveness` (não toca no banco).
3. **Plano free:** a API dorme após ~15 min sem acesso e o primeiro acesso leva ~30–60 s; com o Neon free também suspendendo, a 1ª requisição pode demorar um pouco mais. Para o cardápio dos clientes isso importa: considere o plano *Starter* do Render.

### 3. Vercel — front
Duas formas de o front falar com a API; recomendo a **primeira**:
1. **Rewrite no `frontend/vercel.json`**: `/api/*` → `https://SUA-API.onrender.com/api/*`. As fotos (`/api/images/...`, imutáveis, cache de 1 ano) passam a ser cacheadas pela CDN da Vercel, aliviando a API, e o front não precisa saber o endereço do Render.
2. **Chamada direta** com `VITE_API_URL` (e ajuste de `connect-src`/`img-src` no `vercel.json`).

> **Atenção — CORS vale nas duas formas.** Mesmo com o rewrite, o navegador envia o cabeçalho `Origin` nas escritas (`POST/PUT/PATCH/DELETE`, ex.: login e salvar item), e a API as vê como vindas de outro site. Sem o domínio da Vercel em `APP_CORS_ORIGINS`, o login responde **403 "Você não tem permissão"**. Leituras (`GET`) funcionariam, o que engana no primeiro teste.

### Fotos
Ficam **no banco** (tabela `image`), não em disco, porque o disco do Render é apagado a cada deploy. Cada foto é reduzida a 1200 px e recomprimida (algumas dezenas de KB); uploads abandonados há mais de 24 h são removidos por uma rotina diária para poupar o espaço do Neon free.

## Testes
```bash
mvn verify    # testes + relatório JaCoCo (target/site/jacoco) + exige ≥ 85% de linhas
```

## Endpoints
| Método | Rota | Acesso |
|---|---|---|
| GET | `/api/menu` | público — cardápio agrupado por categoria (só itens disponíveis) |
| GET | `/api/items/{id}` | público |
| GET | `/api/images/{arquivo}` | público |
| POST | `/api/auth/login` | público (limitado a 5 falhas/15 min por IP) |
| GET/POST/PUT/DELETE | `/api/admin/items[/{id}]` | ADMIN — `GET` aceita `q`, `categoryId`, `page`, `size` |
| PATCH | `/api/admin/items/{id}/availability` | ADMIN |
| GET/POST/PUT/DELETE | `/api/admin/categories[/{id}]` | ADMIN |
| POST | `/api/admin/images` (multipart `file`) | ADMIN — JPG/PNG até 5 MB |

Erros seguem RFC 7807 (`application/problem+json`); validação traz `errors` por campo.

## Decisões
- **Pacotes por funcionalidade** (`item`, `category`, `auth`, `image`, `menu`), injeção por construtor, DTOs em `record`, entidades nunca expostas.
- **Performance:** cardápio em cache Caffeine invalidado só após o *commit* de qualquer escrita; ETag/304 com `Cache-Control: no-cache` (o navegador sempre revalida, então o cliente nunca vê cardápio defasado; sem mudança a resposta é um 304 sem corpo); query única com `join fetch` (sem N+1); imagens reduzidas a 1200 px, recomprimidas e servidas com cache de 1 ano (nome UUID imutável); gzip; `open-in-view` desligado; batch no Hibernate.
- **Segurança:** JWT HS256 stateless, BCrypt, papel `ADMIN` em `/api/admin/**`, tudo não mapeado é negado, CORS por origem, CSP/nosniff/no-referrer, upload validado pelo conteúdo (não pelo Content-Type) e regravado com nome aleatório, anti path-traversal, tamanho de resolução limitado (anti *decompression bomb*), mesma resposta para usuário inexistente e senha errada.
- **Imagens:** apenas JPG/PNG (o Java não lê WebP nativamente). Fotos grandes (ex.: 48 MP do celular) são lidas com subamostragem para não estourar a memória de 512 MB.
- **Proxy:** `server.forward-headers-strategy=native` já vem ligado, então o limite de login usa o IP real do cliente atrás do Render.
