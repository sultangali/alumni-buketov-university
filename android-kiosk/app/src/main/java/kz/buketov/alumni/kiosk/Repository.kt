package kz.buketov.alumni.kiosk

import android.app.Application
import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import androidx.work.*
import org.json.JSONObject
import java.io.ByteArrayOutputStream
import java.io.File
import java.io.FileOutputStream
import java.io.IOException
import java.net.HttpURLConnection
import java.net.Proxy
import java.net.URL
import java.security.KeyStore
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey

class HttpFailure(val code: Int) : IOException("Server response $code")

class AlumniHttp(private val origin: String) {
    fun open(path: String, body: JSONObject? = null, etag: String? = null): HttpURLConnection {
        require(path.startsWith("/api/") || path.matches(Regex("/media/[a-zA-Z0-9_.-]+")))
        require(!path.contains("..") && !path.contains('?') && !path.contains('#'))
        val connection = URL(origin + path).openConnection(Proxy.NO_PROXY) as HttpURLConnection
        connection.instanceFollowRedirects = false
        connection.connectTimeout = 5000; connection.readTimeout = 10000
        connection.setRequestProperty("Accept", "application/json")
        connection.setRequestProperty("Accept-Encoding", "identity")
        if (etag != null && etag.length <= 200 && !etag.contains('\r') && !etag.contains('\n')) connection.setRequestProperty("If-None-Match", etag)
        if (body != null) {
            val bytes = body.toString().toByteArray(Charsets.UTF_8)
            connection.requestMethod = "POST"; connection.doOutput = true
            connection.setRequestProperty("Content-Type", "application/json")
            connection.setFixedLengthStreamingMode(bytes.size)
            try { connection.outputStream.use { it.write(bytes) } } catch (e: Exception) { connection.disconnect(); throw e }
        }
        return connection
    }
    fun json(path: String, body: JSONObject? = null, etag: String? = null, limit: Int = 10 * 1024 * 1024): JSONObject? {
        val connection = open(path, body, etag)
        try {
            val status = connection.responseCode
            if (status == 304 && body == null && etag != null) return null
            if (status !in 200..299) throw HttpFailure(status)
            if (connection.contentLengthLong > limit) throw IOException("Response too large")
            val output = ByteArrayOutputStream()
            connection.inputStream.use { input ->
                val buffer = ByteArray(16384)
                while (true) { val n = input.read(buffer); if (n < 0) break; if (output.size() + n > limit) throw IOException("Response too large"); output.write(buffer, 0, n) }
            }
            return JSONObject(output.toString("UTF-8")).also { result ->
                if (path == "/api/kiosk/snapshot") connection.getHeaderField("ETag")?.takeIf { it.length <= 200 && !it.contains('\r') && !it.contains('\n') }?.let { result.put("httpEtag", it) }
            }
        } finally { connection.disconnect() }
    }
}

class MediaCache(private val directory: File, private val quota: Long = 200L * 1024 * 1024) {
    init { directory.mkdirs() }
    private fun file(item: JSONObject) = File(directory, item.getString("sha256"))
    @Synchronized fun cached(item: JSONObject): File? {
        val file = file(item)
        if (!file.isFile || file.length() != item.getLong("size")) return null
        file.setLastModified(System.currentTimeMillis())
        return file
    }
    @Synchronized fun fetch(http: AlumniHttp, item: JSONObject, protectedImages: Set<String>) {
        val target = file(item)
        if (cached(item) != null) return
        val size = item.getLong("size")
        val all = directory.listFiles()?.filter { it.isFile } ?: emptyList()
        var used = all.sumOf { it.length() }
        for (candidate in all.sortedWith(compareBy<File> { it.name in protectedImages }.thenBy { it.lastModified() })) {
            if (used + size <= quota && directory.usableSpace > size + 32L * 1024 * 1024) break
            if (candidate.name in protectedImages && item.getString("kind") == "video") continue
            val bytes = candidate.length(); if (candidate.delete()) used -= bytes
        }
        if (used + size > quota || directory.usableSpace < size + 32L * 1024 * 1024) return
        val connection = http.open(item.getString("path"))
        val temp = File(directory, target.name + ".part")
        try {
            if (connection.responseCode != 200) throw HttpFailure(connection.responseCode)
            if (connection.contentLengthLong > size) throw IOException("Media size mismatch")
            val digest = java.security.MessageDigest.getInstance("SHA-256")
            var bytes = 0L
            connection.inputStream.use { input -> FileOutputStream(temp).use { output ->
                val buffer = ByteArray(16384)
                while (true) { val n = input.read(buffer); if (n < 0) break; bytes += n; if (bytes > size) throw IOException("Media size mismatch"); digest.update(buffer, 0, n); output.write(buffer, 0, n) }
                output.fd.sync()
            } }
            require(bytes == size && digest.digest().joinToString("") { "%02x".format(it) } == item.getString("sha256")) { "Media integrity mismatch" }
            java.nio.file.Files.move(temp.toPath(), target.toPath(), java.nio.file.StandardCopyOption.ATOMIC_MOVE, java.nio.file.StandardCopyOption.REPLACE_EXISTING)
        } finally { connection.disconnect(); temp.delete() }
    }
    @Synchronized fun clear() { directory.listFiles()?.forEach { it.delete() } }
}

class Repository private constructor(private val context: Context) {
    companion object {
        @Volatile private var instance: Repository? = null
        fun get(context: Context): Repository = instance ?: synchronized(this) { instance ?: Repository(context.applicationContext).also { instance = it } }
    }
    val executor = Executors.newSingleThreadExecutor()
    private val prefs = context.getSharedPreferences("configuration", Context.MODE_PRIVATE)
    private val snapshotStores = java.util.concurrent.ConcurrentHashMap<String, Snapshots>()
    private val mediaCaches = java.util.concurrent.ConcurrentHashMap<String, MediaCache>()
    val crypto = Crypto {
        val store = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        (store.getKey("alumni-storage-v1", null) as? SecretKey) ?: KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore").apply {
            init(KeyGenParameterSpec.Builder("alumni-storage-v1", KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT).setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).setKeySize(256).build())
        }.generateKey()
    }
    val outbox = Outbox(File(context.filesDir, "outbox"), crypto) { context.filesDir.usableSpace }
    @Volatile private var online = false
    @Volatile private var checkedAt = 0L
    @Synchronized fun origin(): String = Endpoint.validate(prefs.getString("origin", BuildConfig.SERVER_ORIGIN) ?: "", BuildConfig.ALLOW_LOCAL_HTTP)
    @Synchronized fun publicOrigin(): String = try { Endpoint.validate(prefs.getString("publicOrigin", BuildConfig.PUBLIC_ORIGIN) ?: "", false) } catch (_: Exception) { "" }
    private fun storage(boundOrigin: String): File = File(context.filesDir, "servers/" + sha256(boundOrigin.toByteArray()))
    private fun snapshots(boundOrigin: String = origin()) = snapshotStores.computeIfAbsent(boundOrigin) { Snapshots(File(storage(it), "snapshots")) }
    private fun media(boundOrigin: String = origin()) = mediaCaches.computeIfAbsent(boundOrigin) { MediaCache(File(storage(it), "media")) }
    private fun profilePaths(snapshot: JSONObject?): Set<String> {
        if (snapshot == null) return emptySet()
        val payload = JSONObject(snapshot.getString("payload"))
        return listOf("alumni", "teachers", "laureates", "veterans").flatMap { key ->
            val people = payload.getJSONArray(key)
            (0 until people.length()).map { people.getJSONObject(it).optString("photoUrl") }
        }.filter { it.startsWith("/media/") }.toSet()
    }
    @Synchronized fun configure(server: String, public: String) {
        val validated = Endpoint.validate(server.trim(), BuildConfig.ALLOW_LOCAL_HTTP)
        val publicValidated = if (public.isBlank()) "" else Endpoint.validate(public.trim(), false)
        val old = runCatching { origin() }.getOrNull()
        require(old == validated || !outbox.hasUndelivered()) { "Deliver or recover the existing outbox before changing server" }
        check(prefs.edit().putString("origin", validated).putString("publicOrigin", publicValidated).commit())
        online = false; checkedAt = 0
    }
    @Synchronized fun bootstrap(): JSONObject {
        val snapshot = snapshots().load() ?: throw IOException("No saved catalogue. Connect the kiosk and retry.")
        return JSONObject(snapshot.getString("payload"))
    }
    @Synchronized fun submit(payload: JSONObject): JSONObject = outbox.enqueue(origin(), payload)
    @Synchronized fun status(): JSONObject {
        val currentOrigin = runCatching { origin() }.getOrDefault("")
        val stats = outbox.stats(currentOrigin)
        val snapshot = runCatching { snapshots().load() }.getOrNull()
        return JSONObject().put("online", online && System.currentTimeMillis() - checkedAt < 60000).put("cachedAt", snapshot?.getString("generatedAt") ?: JSONObject.NULL)
            .put("pending", stats.first).put("needsAttention", stats.second).put("publicOrigin", publicOrigin())
    }
    fun handoff(payload: JSONObject): JSONObject {
        val public = publicOrigin()
        require(public.isNotEmpty()) { "Phone handoff is not configured" }
        val response = AlumniHttp(origin()).json("/api/kiosk/handoffs", JSONObject().put("draft", payload.getJSONObject("draft")), limit = 16384)!!
        val token = response.getString("token")
        require(token.matches(Regex("[a-f0-9]{64}")))
        java.time.Instant.parse(response.getString("expiresAt"))
        return JSONObject().put("url", "$public/u/apply#handoff=$token").put("expiresAt", response.getString("expiresAt"))
    }
    /** Called only on the process-wide serial executor, including WorkManager. */
    fun sync(): Boolean {
        val boundOrigin = try { origin() } catch (_: Exception) { return false }
        val http = AlumniHttp(boundOrigin)
        val snapshotStore = snapshots(boundOrigin)
        val cache = media(boundOrigin)
        var success = true
        // Send accepted applications first. A media download must not delay their delivery.
        for (record in outbox.pending(boundOrigin).take(10)) {
            try {
                outbox.sending(record)
                val result = http.json("/api/submissions", record.getJSONObject("payload"), limit = 256 * 1024)!!
                // Existing server returns the public submission object (id, status, submittedAt).
                outbox.acknowledge(record.getString("id"), result)
            } catch (error: Exception) {
                val code = (error as? HttpFailure)?.code
                outbox.fail(record, code in listOf(400, 401, 403, 404, 409, 413, 422), if (code != null) "http_$code" else "transport_or_storage")
                success = false
                if (code == null || code == 429 || (code ?: 0) >= 500) break
            }
        }
        try {
            val saved = snapshotStore.load()
            val fresh = http.json("/api/kiosk/snapshot", etag = saved?.optString("httpEtag")?.takeIf { it.isNotEmpty() })
            if (fresh != null) snapshotStore.promote(fresh)
            if (origin() == boundOrigin) { online = true; checkedAt = System.currentTimeMillis() }
        } catch (_: Exception) { if (origin() == boundOrigin) { online = false; checkedAt = System.currentTimeMillis() }; success = false }
        // Small image batches bound foreground sync latency. Missing gallery/video files
        // are fetched on use; no WebView networking is enabled.
        if (online) {
            val activeSnapshot = snapshotStore.load()
            val manifest = activeSnapshot?.optJSONArray("media")
            if (manifest != null) {
                val profiles = profilePaths(activeSnapshot)
                val images = (0 until manifest.length()).map { manifest.getJSONObject(it) }.filter { it.getString("kind") == "image" && it.getString("path") in profiles }
                val protected = images.map { it.getString("sha256") }.toSet()
                images.filter { cache.cached(it) == null }.take(3).forEach { runCatching { cache.fetch(http, it, protected) } }
            }
        }
        return success
    }
    fun cachedMedia(path: String): File? {
        val boundOrigin = origin()
        val snapshot = snapshots(boundOrigin).load()
        val manifest = snapshot?.optJSONArray("media") ?: return null
        val item = (0 until manifest.length()).map { manifest.getJSONObject(it) }.firstOrNull { it.getString("path") == path } ?: return null
        val cache = media(boundOrigin)
        val cached = cache.cached(item)
        if (cached != null) return cached
        // Interception runs on WebView's I/O thread. Complete this first load so
        // the image/video succeeds without requiring a React remount or URL change.
        val profiles = profilePaths(snapshot)
        val protectedImages = (0 until manifest.length()).map { manifest.getJSONObject(it) }.filter { it.getString("path") in profiles }.map { it.getString("sha256") }.toSet()
        runCatching { cache.fetch(AlumniHttp(boundOrigin), item, protectedImages) }
        return cache.cached(item)
    }
    fun clearCache() { val boundOrigin = origin(); snapshots(boundOrigin).clear(); media(boundOrigin).clear() }
}

class SyncWorker(context: Context, params: WorkerParameters) : Worker(context, params) {
    override fun doWork(): Result = try {
        val repository = Repository.get(applicationContext)
        if (repository.executor.submit<Boolean> { repository.sync() }.get(5, TimeUnit.MINUTES)) Result.success() else Result.retry()
    } catch (_: Exception) { Result.retry() }
}

class KioskApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        val request = PeriodicWorkRequestBuilder<SyncWorker>(15, TimeUnit.MINUTES)
            // No INTERNET_VALIDATED or CONNECTED constraint: the isolated Ethernet
            // server can work with neither public internet nor Android validation.
            .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS).build()
        WorkManager.getInstance(this).enqueueUniquePeriodicWork("alumni-sync", ExistingPeriodicWorkPolicy.KEEP, request)
    }
}
