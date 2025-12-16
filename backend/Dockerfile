# Multi-stage build for Spring Boot application

# Stage 1: Build
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app

# Copy pom.xml first for better Docker layer caching
COPY pom.xml .

# Copy source code
COPY src ./src

# Build with BuildKit cache mount for Maven dependencies
# This caches ~/.m2/repository between builds, making subsequent builds MUCH faster
# First build: downloads all dependencies (~2-3 min)
# Subsequent builds: uses cached dependencies (~30 sec)
# Works automatically with: docker buildx build (which you're already using for ARM64)
RUN --mount=type=cache,target=/root/.m2 \
    mvn clean package -DskipTests -B

# Stage 2: Runtime
# Using Debian-based image for multi-arch support (amd64 + arm64)
FROM eclipse-temurin:21-jre
WORKDIR /app

# Install wget for health check
RUN apt-get update && apt-get install -y --no-install-recommends wget && \
    rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd -r appuser && useradd -r -g appuser appuser

# Create logs directory (matching volume mount path)
RUN mkdir -p /logs && chown -R appuser:appuser /logs && \
    chown -R appuser:appuser /app

# Copy jar from build stage
COPY --from=build /app/target/*.jar app.jar

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/actuator/health || exit 1

# Run the application
ENTRYPOINT ["java", "-jar", "app.jar"]

