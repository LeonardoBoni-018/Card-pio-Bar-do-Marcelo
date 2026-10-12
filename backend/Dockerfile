# --- build ---
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn -q -B dependency:go-offline
COPY src ./src
RUN mvn -q -B -DskipTests package

# --- runtime (JRE enxuto, usuário sem privilégios) ---
FROM eclipse-temurin:21-jre
RUN useradd --system --uid 10001 app && mkdir -p /data/uploads && chown app /data/uploads
USER app
WORKDIR /app
COPY --from=build /app/target/menu-api-*.jar app.jar
ENV APP_UPLOAD_DIR=/data/uploads \
    JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75 -XX:+UseSerialGC -XX:TieredStopAtLevel=1"
VOLUME /data/uploads
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
