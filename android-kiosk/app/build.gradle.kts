import java.util.Properties
plugins { id("com.android.application"); id("org.jetbrains.kotlin.android") }
val config = Properties().apply { rootProject.file(".env").takeIf { it.exists() }?.inputStream()?.use { load(it) } }
fun setting(name: String, fallback: String) = System.getenv(name) ?: config.getProperty(name, fallback)
fun quoted(value: String) = "\"" + value.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "") + "\""
android {
    namespace = "kz.buketov.alumni.kiosk"
    compileSdk = 35
    defaultConfig {
        applicationId = "kz.buketov.alumni.kiosk"
        minSdk = 31
        targetSdk = 35
        versionCode = 2
        versionName = "1.0.1"
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        buildConfigField("String", "PUBLIC_ORIGIN", quoted(setting("PUBLIC_APP_ORIGIN", "")))
    }
    flavorDimensions += "network"
    productFlavors {
        create("demo") {
            dimension = "network"
            buildConfigField("boolean", "ALLOW_LOCAL_HTTP", "true")
            buildConfigField("String", "SERVER_ORIGIN", quoted(setting("KIOSK_SERVER_ORIGIN", "http://192.168.50.1:8083")))
            manifestPlaceholders["cleartextAllowed"] = "true"
        }
        create("production") {
            dimension = "network"
            buildConfigField("boolean", "ALLOW_LOCAL_HTTP", "false")
            buildConfigField("String", "SERVER_ORIGIN", quoted(setting("KIOSK_SERVER_ORIGIN", "")))
            manifestPlaceholders["cleartextAllowed"] = "false"
        }
    }
    buildFeatures { buildConfig = true }
    compileOptions { sourceCompatibility = JavaVersion.VERSION_17; targetCompatibility = JavaVersion.VERSION_17 }
    kotlinOptions { jvmTarget = "17" }
    sourceSets["main"].assets.srcDir(layout.buildDirectory.dir("generated/kioskAssets"))
    testOptions { unitTests.isIncludeAndroidResources = true }
}
val bundleWeb by tasks.registering(Sync::class) {
    from("../../V3/app/dist")
    into(layout.buildDirectory.dir("generated/kioskAssets/web"))
    doFirst { check(file("../../V3/app/dist/index.html").exists()) { "Build V3/app with npm run build before Android." } }
}
tasks.named("preBuild") { dependsOn(bundleWeb) }
dependencies {
    implementation("androidx.webkit:webkit:1.12.1")
    implementation("androidx.work:work-runtime-ktx:2.10.0")
    testImplementation("junit:junit:4.13.2")
    testImplementation("org.json:json:20240303")
    testImplementation("org.robolectric:robolectric:4.14.1")
}
