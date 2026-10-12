# API do Cardápio — Bar do Marcelo

Java 21 · Spring Boot 3.5 · PostgreSQL · Flyway · JWT.

## Rodar em desenvolvimento (sem instalar nada além do JDK/Maven)
```bash
cd backend
mvn spring-boot:run -Dspring-boot.run.profiles=dev
```
H2 em memória, cardápio de exemplo, admin `admin` / `admin12345`, Swagger em http://localhost:8080/swagger-ui.html.

## Rodar com PostgreSQL (produção)
```bash
cp .env.example .env   # preencha os segredos
docker compose up --build
```
Sem `APP_JWT_SECRET` (≥ 32 caracteres) ou com senha de admin curta, a aplicação **não sobe**.

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
- **Performance:** cardápio em cache Caffeine invalidado só após o *commit* de qualquer escrita; ETag/304 + `Cache-Control`; query única com `join fetch` (sem N+1); imagens reduzidas a 1200 px, recomprimidas e servidas com cache de 1 ano (nome UUID imutável); gzip; `open-in-view` desligado; batch no Hibernate.
- **Segurança:** JWT HS256 stateless, BCrypt, papel `ADMIN` em `/api/admin/**`, tudo não mapeado é negado, CORS por origem, CSP/nosniff/no-referrer, upload validado pelo conteúdo (não pelo Content-Type) e regravado com nome aleatório, anti path-traversal, tamanho de resolução limitado (anti *decompression bomb*), mesma resposta para usuário inexistente e senha errada.
- **Imagens:** apenas JPG/PNG (o Java não lê WebP nativamente); o arquivo guardado já é otimizado.
- Atrás de proxy reverso, configure `server.forward-headers-strategy=native` para o limite de login usar o IP real do cliente.
