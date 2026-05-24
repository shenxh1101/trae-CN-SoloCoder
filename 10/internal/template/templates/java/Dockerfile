FROM maven:{{.JavaVersion}}-eclipse-temurin AS builder

WORKDIR /app

COPY pom.xml .
RUN mvn dependency:go-offline

COPY src ./src
RUN mvn package -DskipTests

FROM eclipse-temurin:{{.JavaVersion}}-jre

WORKDIR /app

COPY --from=builder /app/target/*.jar app.jar

EXPOSE {{.AppPort}}

CMD ["java", "-jar", "app.jar"]
