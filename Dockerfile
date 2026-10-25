# Build stage
FROM maven:3.9.9-eclipse-temurin-17 AS build
WORKDIR /workspace
COPY pom.xml .
RUN mvn -q -DskipTests dependency:go-offline
COPY src ./src
RUN mvn -q -DskipTests package

# Runtime stage
FROM eclipse-temurin:17-jre
RUN groupadd --system sheild && useradd --system --gid sheild --home-dir /app sheild \
    && mkdir -p /app/data/evidence \
    && chown -R sheild:sheild /app
WORKDIR /app
COPY --from=build /workspace/target/sheild-0.0.1-SNAPSHOT.jar /app/sheild.jar
USER sheild
ENV SHEILD_STORAGE_DIR=/app/data/evidence
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/sheild.jar"]
