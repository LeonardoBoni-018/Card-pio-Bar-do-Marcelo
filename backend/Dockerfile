# --- build ---
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn -q -B dependency:go-offline
COPY src ./src
RUN mvn -q -B -DskipTests package

# --- runtime (JRE enxuto, usuário sem privilégios) ---
FROM eclipse-temurin:21-jre
RUN useradd --system --uid 10001 app
USER app
WORKDIR /app
COPY --from=build /app/target/menu-api-*.jar app.jar
# Memória pensada para instâncias de 512 MB (Render free): GC serial, heap em 60% da RAM do contêiner.
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=60 -XX:+UseSerialGC -XX:TieredStopAtLevel=1 -Xss512k"
EXPOSE 8080
# A porta vem da variável PORT (definida pelo Render); sem ela usa 8080.
ENTRYPOINT ["java", "-jar", "app.jar"]
