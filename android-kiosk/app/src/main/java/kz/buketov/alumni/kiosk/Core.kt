package kz.buketov.alumni.kiosk

import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.io.FileOutputStream
import java.io.IOException
import java.net.URI
import java.nio.file.Files
import java.nio.file.StandardCopyOption
import java.security.MessageDigest
import java.security.SecureRandom
import java.time.Instant
import java.util.UUID
import javax.crypto.Cipher
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

fun sha256(bytes: ByteArray): String = MessageDigest.getInstance("SHA-256").digest(bytes).joinToString("") { "%02x".format(it) }

object Endpoint {
    fun validate(value: String, allowLocalHttp: Boolean): String {
        val uri = try { URI(value) } catch (_: Exception) { throw IllegalArgumentException("Invalid server origin") }
        require(uri.rawUserInfo == null && uri.rawQuery == null && uri.rawFragment == null && (uri.rawPath.isNullOrEmpty() || uri.rawPath == "/")) { "Use an origin without credentials or a path" }
        val host = uri.host?.lowercase() ?: throw IllegalArgumentException("Origin needs a host")
        require(uri.port == -1 || uri.port in 1..65535)
        require(uri.scheme == "https" || (uri.scheme == "http" && allowLocalHttp && privateIpv4(host))) { "HTTPS required; demo HTTP requires a private IPv4 address" }
        require(!host.endsWith(".") && !host.contains('%'))
        val port = if (uri.port == -1 || (uri.scheme == "https" && uri.port == 443) || (uri.scheme == "http" && uri.port == 80)) "" else ":${uri.port}"
        return "${uri.scheme}://$host$port"
    }
    private fun privateIpv4(host: String): Boolean {
        val octets = host.split('.')
        if (octets.size != 4 || octets.any { !it.matches(Regex("0|[1-9][0-9]{0,2}")) || it.toInt() > 255 }) return false
        val a = octets.map { it.toInt() }
        return a[0] == 10 || (a[0] == 172 && a[1] in 16..31) || (a[0] == 192 && a[1] == 168)
    }
}

/** Synchronous file data flush followed by atomic replacement on the same filesystem. */
fun atomicWrite(file: File, bytes: ByteArray) {
    check(file.parentFile!!.isDirectory || file.parentFile!!.mkdirs())
    val candidate = File(file.parentFile, file.name + ".new")
    try {
        FileOutputStream(candidate).use { it.write(bytes); it.fd.sync() }
        Files.move(candidate.toPath(), file.toPath(), StandardCopyOption.ATOMIC_MOVE, StandardCopyOption.REPLACE_EXISTING)
        // Android's private filesystem supports fsync on the directory. Atomic rename
        // avoids torn records; syncing the directory makes the new name durable.
        java.nio.channels.FileChannel.open(file.parentFile!!.toPath(), java.nio.file.StandardOpenOption.READ).use { it.force(true) }
    } catch (error: Exception) {
        candidate.delete()
        throw error
    }
}

class Crypto(private val key: () -> SecretKey) {
    fun encrypt(bytes: ByteArray): ByteArray {
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.ENCRYPT_MODE, key())
        return byteArrayOf(1, cipher.iv.size.toByte()) + cipher.iv + cipher.doFinal(bytes)
    }
    fun decrypt(bytes: ByteArray): ByteArray {
        require(bytes.size > 30 && bytes[0] == 1.toByte() && bytes[1] == 12.toByte()) { "Invalid encrypted record" }
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.DECRYPT_MODE, key(), GCMParameterSpec(128, bytes.copyOfRange(2, 14)))
        return cipher.doFinal(bytes.copyOfRange(14, bytes.size))
    }
}

fun canonical(value: Any?): String = when (value) {
    is JSONObject -> value.keys().asSequence().sorted().joinToString(",", "{", "}") { JSONObject.quote(it) + ":" + canonical(value.get(it)) }
    is JSONArray -> (0 until value.length()).joinToString(",", "[", "]") { canonical(value.get(it)) }
    null, JSONObject.NULL -> "null"
    is String -> JSONObject.quote(value)
    else -> value.toString()
}

class Outbox(private val directory: File, private val crypto: Crypto, private val available: () -> Long) {
    init { directory.mkdirs() }
    private fun file(id: String) = File(directory, "$id.enc")
    private fun receipt(id: String) = File(directory, "$id.receipt")
    private fun read(file: File) = JSONObject(String(crypto.decrypt(file.readBytes()), Charsets.UTF_8))
    private fun write(file: File, record: JSONObject) = atomicWrite(file, crypto.encrypt(record.toString().toByteArray(Charsets.UTF_8)))
    private fun records() = directory.listFiles()?.filter { it.name.endsWith(".enc") } ?: emptyList()
    private fun validReceipt(record: JSONObject): Boolean = try {
        val saved = read(receipt(record.getString("id")))
        saved.getString("id") == record.getString("id") && saved.getString("origin") == record.getString("origin") && saved.getString("fingerprint") == record.getString("fingerprint") && saved.getJSONObject("serverReceipt").getString("id").isNotEmpty()
    } catch (_: Exception) { false }
    private fun validateText(value: Any?, required: Boolean = false): Boolean {
        if (value is String) return value.length <= 20000 && (!required || value.isNotBlank())
        if (value !is JSONObject || value.length() == 0) return false
        val keys = value.keys().asSequence().toList()
        return keys.all { it in listOf("ru", "kz", "en") && value.get(it) is String && value.getString(it).length <= 20000 } && (!required || keys.any { value.getString(it).isNotBlank() })
    }
    private fun validateApplication(payload: JSONObject) {
        val allowed = setOf("clientSubmissionId", "name", "year", "fac", "contact", "spec", "pos", "bio", "mentor", "students", "photoUrl", "media")
        require(payload.keys().asSequence().all { it in allowed }) { "Unsupported application field" }
        require(validateText(payload.opt("name"), true)) { "Name is required" }
        require(payload.opt("fac") is String && payload.getString("fac").isNotBlank() && payload.getString("fac").length <= 200) { "Faculty is required" }
        payload.put("fac", payload.getString("fac").trim())
        if (payload.has("year") && !payload.isNull("year")) {
            val value = payload.get("year")
            require(value is Number && value.toDouble().isFinite() && value.toDouble() % 1.0 == 0.0 && value.toDouble() in 1900.0..java.time.Year.now().value.toDouble()) { "Invalid graduation year" }
        }
        for (name in listOf("spec", "pos", "bio")) if (payload.has(name) && !payload.isNull(name)) require(validateText(payload.get(name))) { "Invalid $name" }
        for (name in listOf("contact", "mentor", "students")) if (payload.has(name) && !payload.isNull(name)) require(payload.get(name) is String && payload.getString(name).length <= 20000) { "Invalid $name" }
        require(!payload.has("photoUrl") || payload.isNull("photoUrl") || payload.get("photoUrl") == "") { "Kiosk accepts text only" }
        require(!payload.has("media") || payload.isNull("media") || (payload.opt("media") is JSONArray && payload.getJSONArray("media").length() == 0)) { "Kiosk accepts text only" }
    }

    @Synchronized fun enqueue(origin: String, body: JSONObject): JSONObject {
        val payload = JSONObject(body.toString())
        validateApplication(payload)
        payload.remove("photoUrl"); payload.remove("media")
        val id = if (payload.has("clientSubmissionId")) payload.getString("clientSubmissionId").lowercase() else UUID.randomUUID().toString()
        require(id.matches(Regex("[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}"))) { "Invalid submission identifier" }
        payload.put("clientSubmissionId", id)
        val fingerprint = sha256(canonical(payload).toByteArray())
        val existing = when { file(id).exists() -> read(file(id)); receipt(id).exists() -> read(receipt(id)); else -> null }
        if (existing != null) {
            require(existing.getString("origin") == origin && existing.getString("fingerprint") == fingerprint) { "Submission identifier reused with different content or server" }
            return existing.getJSONObject("localReceipt")
        }
        require(payload.toString().toByteArray().size <= 128 * 1024) { "Application too large" }
        require(payload.has("name") && payload.optString("fac").isNotBlank()) { "Name and faculty are required" }
        if (records().size >= 500 || available() < 32L * 1024 * 1024) throw IOException("Storage unavailable; application has not been saved")
        val local = JSONObject().put("id", id).put("status", "queued").put("submittedAt", Instant.now().toString())
        val record = JSONObject().put("schemaVersion", 1).put("id", id).put("origin", origin).put("fingerprint", fingerprint).put("payload", payload).put("localReceipt", local).put("state", "pending").put("attempts", 0)
        write(file(id), record)
        return local
    }
    @Synchronized fun pending(origin: String): List<JSONObject> = records().mapNotNull { file ->
        // A corrupt record is retained for recovery and counted as attention, never deleted.
        try { read(file).takeIf { it.getString("origin") == origin && it.optString("state") != "attention" && !validReceipt(it) } } catch (_: Exception) { null }
    }.sortedBy { it.getJSONObject("localReceipt").getString("submittedAt") }
    @Synchronized fun stats(origin: String): Pair<Int, Int> {
        var pending = 0; var attention = 0
        for (file in records()) try {
            val record = read(file)
            if (validReceipt(record)) { file.delete(); continue }
            if (record.optString("state") == "attention" || record.optString("origin") != origin) attention++ else pending++
        } catch (_: Exception) { attention++ }
        return pending to attention
    }
    @Synchronized fun hasUndelivered(): Boolean = records().any { try { !validReceipt(read(it)) } catch (_: Exception) { true } }
    @Synchronized fun sending(record: JSONObject) {
        record.put("state", "sending").put("attempts", record.optInt("attempts") + 1)
        write(file(record.getString("id")), record)
    }
    @Synchronized fun fail(record: JSONObject, permanent: Boolean, code: String) {
        record.put("state", if (permanent) "attention" else "pending").put("error", code)
        write(file(record.getString("id")), record)
    }
    @Synchronized fun acknowledge(id: String, serverReceipt: JSONObject) {
        val record = read(file(id))
        // Receipt deliberately has no application payload. Persist before deleting PII.
        val safe = JSONObject().put("id", id).put("origin", record.getString("origin")).put("fingerprint", record.getString("fingerprint")).put("localReceipt", record.getJSONObject("localReceipt"))
            .put("serverReceipt", JSONObject().put("id", serverReceipt.getString("id")).put("status", serverReceipt.getString("status")).put("submittedAt", serverReceipt.getString("submittedAt")))
        write(receipt(id), safe)
        file(id).delete()
        // Compact receipts are kept for retry deduplication for 90 days.
        directory.listFiles()?.filter { it.name.endsWith(".receipt") && it.lastModified() < System.currentTimeMillis() - 90L * 86400000 }?.forEach { it.delete() }
    }
}

class Snapshots(private val directory: File) {
    init { directory.mkdirs() }
    fun validate(value: JSONObject): JSONObject {
        require(value.getInt("schemaVersion") == 1)
        val payload = value.getString("payload")
        require(payload.toByteArray().size <= 8 * 1024 * 1024)
        val digest = sha256(payload.toByteArray(Charsets.UTF_8))
        require(value.getString("sha256") == digest && value.getString("revision") == digest) { "Snapshot integrity mismatch" }
        Instant.parse(value.getString("generatedAt"))
        val parsed = JSONObject(payload)
        for (key in listOf("faculties", "alumni", "teachers", "laureates", "veterans")) parsed.getJSONArray(key)
        parsed.getJSONObject("teach")
        val manifest = value.getJSONArray("media")
        require(manifest.length() <= 10000)
        for (i in 0 until manifest.length()) {
            val item = manifest.getJSONObject(i)
            require(item.getString("path").matches(Regex("/media/[a-zA-Z0-9_-][a-zA-Z0-9_.-]*\\.(?i:png|jpg|jpeg|gif|webp|avif|mp4|webm|ogv|mov)")))
            require(item.getString("sha256").matches(Regex("[a-f0-9]{64}")))
            require(item.getLong("size") in 0..25L * 1024 * 1024)
            require(item.getString("kind") in listOf("image", "video"))
        }
        return value
    }
    @Synchronized fun load(): JSONObject? = listOf("current.json", "previous.json").firstNotNullOfOrNull { name ->
        try { val file = File(directory, name); if (file.length() > 10 * 1024 * 1024) null else validate(JSONObject(file.readText())) } catch (_: Exception) { null }
    }
    @Synchronized fun promote(value: JSONObject) {
        validate(value)
        val old = load()
        if (old != null) atomicWrite(File(directory, "previous.json"), old.toString().toByteArray())
        atomicWrite(File(directory, "current.json"), value.toString().toByteArray())
    }
    @Synchronized fun clear() { for (name in listOf("current.json", "previous.json", "current.json.new", "previous.json.new")) File(directory, name).delete() }
}
