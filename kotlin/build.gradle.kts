plugins {
    kotlin("jvm") version "2.3.20"
    application
}

repositories { mavenCentral() }

dependencies {
    implementation("com.anthropic:anthropic-java:3.3.0")
    implementation("com.fasterxml.jackson.module:jackson-module-kotlin:2.19.4")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.10.2")
    implementation("io.modelcontextprotocol:kotlin-sdk:0.16.0")
    testImplementation(kotlin("test"))
    testImplementation("org.junit.jupiter:junit-jupiter:5.13.4")
    testImplementation("org.assertj:assertj-core:3.27.6")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

kotlin { jvmToolchain(17) }

tasks.test { useJUnitPlatform() }

// ./gradlew run -Pexample=Ex02AgentLoop --args="Where is ORD-1003?"
application {
    mainClass.set("handbook.examples.${providers.gradleProperty("example").getOrElse("Ex01AugmentedLlm")}Kt")
}
tasks.named<JavaExec>("run") { standardInput = System.`in` }
