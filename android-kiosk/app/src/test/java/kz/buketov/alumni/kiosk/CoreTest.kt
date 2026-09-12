package kz.buketov.alumni.kiosk

import org.junit.Assert.*
import org.junit.Test
import org.json.JSONObject
import java.nio.file.Files
import javax.crypto.KeyGenerator

class CoreTest {
    @Test fun invalidApplicationsAreRejectedBeforeOfflineSuccess() {
        val key = KeyGenerator.getInstance("AES").apply { init(256) }.generateKey()
        val dir = Files.createTempDirectory("invalid").toFile()
        val outbox = Outbox(dir, Crypto { key }, { Long.MAX_VALUE })
        for (payload in listOf(
            JSONObject().put("name", "   ").put("fac", "math"),
            JSONObject().put("name", "Valid").put("fac", "math").put("year", 2000.5),
            JSONObject().put("name", JSONObject().put("xx", "Invalid locale")).put("fac", "math"),
            JSONObject().put("name", "Valid").put("fac", "math").put("contact", "x".repeat(20001)),
            JSONObject().put("name", "Valid").put("fac", "math").put("year", 1899),
            JSONObject().put("name", "Valid").put("fac", "math").put("admin", true)
        )) assertThrows(IllegalArgumentException::class.java) { outbox.enqueue("https://one.edu", payload) }
        assertEquals(0, outbox.pending("https://one.edu").size)
    }
    @Test fun originsFailClosed() {
        assertEquals("http://192.168.50.1:8083", Endpoint.validate("http://192.168.50.1:8083", true))
        for (value in listOf("http://example.com", "http://127.0.0.1", "http://192.168.1.1/path", "https://user:pass@example.com", "https://example.com/#x", "http://192.168.1.1.evil.test")) {
            assertThrows(IllegalArgumentException::class.java) { Endpoint.validate(value, true) }
        }
        assertThrows(IllegalArgumentException::class.java) { Endpoint.validate("http://192.168.1.1", false) }
        assertEquals("https://alumni.example.edu", Endpoint.validate("https://alumni.example.edu/", false))
    }
    @Test fun encryptedOutboxRetainsUuidAndRejectsConflictingRetry() {
        val dir = Files.createTempDirectory("outbox").toFile()
        val key = KeyGenerator.getInstance("AES").apply { init(256) }.generateKey()
        val outbox = Outbox(dir, Crypto { key }, { Long.MAX_VALUE })
        val id = "37f239e6-cc4f-4f12-a360-4c1573490c46"
        val payload = JSONObject().put("clientSubmissionId", id).put("name", "PRIVATE_NAME").put("fac", "math")
        val first = outbox.enqueue("https://one.edu", payload)
        assertEquals(first.toString(), outbox.enqueue("https://one.edu", payload).toString())
        assertFalse(dir.walkTopDown().filter { it.isFile }.any { it.readText().contains("PRIVATE_NAME") })
        assertEquals(id, outbox.pending("https://one.edu").single().getString("id"))
        assertEquals(0, outbox.pending("https://other.edu").size)
        assertThrows(IllegalArgumentException::class.java) { outbox.enqueue("https://one.edu", JSONObject(payload.toString()).put("name", "Changed")) }
        outbox.acknowledge(id, JSONObject().put("id", "server-id").put("status", "review").put("submittedAt", "2026-09-12"))
        assertEquals(0, outbox.pending("https://one.edu").size)
        assertFalse(dir.resolve("$id.enc").exists())
        assertEquals(first.toString(), outbox.enqueue("https://one.edu", payload).toString())
    }
    @Test fun diskFullNeverReturnsReceipt() {
        val key = KeyGenerator.getInstance("AES").apply { init(256) }.generateKey()
        val outbox = Outbox(Files.createTempDirectory("full").toFile(), Crypto { key }, { 0 })
        assertThrows(java.io.IOException::class.java) { outbox.enqueue("https://one.edu", JSONObject().put("name", "Name").put("fac", "x")) }
    }
    @Test fun corruptReceiptCannotDeleteOrSuppressSurvivingPayload() {
        val key = KeyGenerator.getInstance("AES").apply { init(256) }.generateKey()
        val dir = Files.createTempDirectory("receipt-corrupt").toFile()
        val outbox = Outbox(dir, Crypto { key }, { Long.MAX_VALUE })
        val receipt = outbox.enqueue("https://one.edu", JSONObject().put("name", "Name").put("fac", "math"))
        val id = receipt.getString("id")
        dir.resolve("$id.receipt").writeText("corrupt")
        assertTrue(outbox.hasUndelivered())
        assertEquals(1, outbox.pending("https://one.edu").size)
        assertEquals(1 to 0, outbox.stats("https://one.edu"))
        assertTrue(dir.resolve("$id.enc").isFile)
    }
    @Test fun processRestartRetriesSendingAndRetainsPermanentFailure() {
        val key = KeyGenerator.getInstance("AES").apply { init(256) }.generateKey()
        val dir = Files.createTempDirectory("restart").toFile()
        val box = Outbox(dir, Crypto { key }, { Long.MAX_VALUE })
        val local = box.enqueue("https://one.edu", JSONObject().put("name", "Name").put("fac", "math"))
        box.sending(box.pending("https://one.edu").single())
        val restarted = Outbox(dir, Crypto { key }, { Long.MAX_VALUE })
        val retry = restarted.pending("https://one.edu").single()
        assertEquals(local.getString("id"), retry.getJSONObject("payload").getString("clientSubmissionId"))
        assertEquals(1, retry.getInt("attempts"))
        restarted.fail(retry, true, "http_409")
        assertTrue(restarted.pending("https://one.edu").isEmpty())
        assertEquals(0 to 1, restarted.stats("https://one.edu"))
        assertTrue(restarted.hasUndelivered())
    }
    @Test fun durableReceiptCleansSurvivingPayloadAfterInterruptedDeletion() {
        val key = KeyGenerator.getInstance("AES").apply { init(256) }.generateKey()
        val dir = Files.createTempDirectory("acknowledgement").toFile()
        val box = Outbox(dir, Crypto { key }, { Long.MAX_VALUE })
        val local = box.enqueue("https://one.edu", JSONObject().put("name", "Name").put("fac", "math"))
        val id = local.getString("id")
        val pendingBytes = dir.resolve("$id.enc").readBytes()
        box.acknowledge(id, JSONObject().put("id", "server-id").put("status", "review").put("submittedAt", "2026-09-12"))
        dir.resolve("$id.enc").writeBytes(pendingBytes)
        assertTrue(box.pending("https://one.edu").isEmpty())
        assertEquals(0 to 0, box.stats("https://one.edu"))
        assertFalse(dir.resolve("$id.enc").exists())
    }
    @Test fun encryptionDetectsTampering() {
        val key = KeyGenerator.getInstance("AES").apply { init(256) }.generateKey()
        val crypto = Crypto { key }
        val sealed = crypto.encrypt("secret".toByteArray())
        assertEquals("secret", String(crypto.decrypt(sealed)))
        sealed[sealed.lastIndex] = (sealed.last().toInt() xor 1).toByte()
        assertThrows(Exception::class.java) { crypto.decrypt(sealed) }
    }
    @Test fun snapshotFallbackAndMalformedCandidate() {
        val dir = Files.createTempDirectory("snapshots").toFile()
        val store = Snapshots(dir)
        fun snapshot(name: String): JSONObject {
            val payload = JSONObject().put("faculties", org.json.JSONArray()).put("alumni", org.json.JSONArray()).put("teachers", org.json.JSONArray()).put("laureates", org.json.JSONArray()).put("veterans", org.json.JSONArray()).put("teach", JSONObject()).put("test", name).toString()
            return JSONObject().put("schemaVersion", 1).put("revision", sha256(payload.toByteArray())).put("sha256", sha256(payload.toByteArray())).put("payload", payload).put("generatedAt", "2026-09-12T00:00:00Z").put("media", org.json.JSONArray())
        }
        store.promote(snapshot("first")); store.promote(snapshot("second"))
        assertThrows(IllegalArgumentException::class.java) { store.promote(snapshot("bad").put("sha256", "bad")) }
        assertEquals("second", JSONObject(store.load()!!.getString("payload")).getString("test"))
        dir.resolve("current.json").writeText("corrupt")
        assertEquals("first", JSONObject(store.load()!!.getString("payload")).getString("test"))
    }
}
