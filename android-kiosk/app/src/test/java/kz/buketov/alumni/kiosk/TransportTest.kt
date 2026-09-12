package kz.buketov.alumni.kiosk

import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test
import java.net.InetSocketAddress
import java.net.ServerSocket
import java.net.Socket
import java.nio.file.Files
import java.util.concurrent.atomic.AtomicInteger

/** Tiny real HTTP fixture using only Android-visible java.net APIs. */
private class HttpServer private constructor(private val socket: ServerSocket) {
    companion object { fun create(address: InetSocketAddress, backlog: Int): HttpServer = HttpServer(ServerSocket().apply { bind(address, backlog) }) }
    val address: InetSocketAddress get() = socket.localSocketAddress as InetSocketAddress
    private val handlers = java.util.concurrent.ConcurrentHashMap<String, (Exchange) -> Unit>()
    private var thread: Thread? = null
    fun createContext(path: String, handler: (Exchange) -> Unit) { handlers[path] = handler }
    fun start() { thread = Thread {
        while (!socket.isClosed) try {
            socket.accept().use { client ->
                client.soTimeout = 5000
                val reader = client.getInputStream().bufferedReader()
                val path = reader.readLine().split(' ')[1]
                val headers = Headers()
                while (true) { val line = reader.readLine() ?: break; if (line.isEmpty()) break; headers.add(line.substringBefore(':'), line.substringAfter(':').trim()) }
                val exchange = Exchange(client, headers)
                handlers[path]?.invoke(exchange) ?: exchange.sendResponseHeaders(404, -1)
            }
        } catch (_: java.io.IOException) { /* Client may disconnect when a bounded read rejects the body. */ }
    }.apply { isDaemon = true; start() } }
    fun stop(@Suppress("UNUSED_PARAMETER") delay: Int) { socket.close(); thread?.join(1000) }
    class Headers {
        private val values = linkedMapOf<String, String>()
        fun add(key: String, value: String) { values[key.lowercase()] = value }
        fun getFirst(key: String): String? = values[key.lowercase()]
        fun lines(): String = values.entries.joinToString("") { "${it.key}: ${it.value}\r\n" }
    }
    class Exchange(private val socket: Socket, val requestHeaders: Headers) {
        val responseHeaders = Headers()
        val responseBody get() = socket.getOutputStream()
        fun sendResponseHeaders(status: Int, length: Long) {
            if (length > 0) responseHeaders.add("Content-Length", length.toString())
            responseHeaders.add("Connection", "close")
            responseBody.write(("HTTP/1.1 $status Response\r\n" + responseHeaders.lines() + "\r\n").toByteArray())
            responseBody.flush()
        }
        fun close() { socket.close() }
    }
}

class TransportTest {
    private fun withServer(action: (HttpServer, String) -> Unit) {
        val server = HttpServer.create(InetSocketAddress("127.0.0.1", 0), 0)
        server.start()
        try { action(server, "http://127.0.0.1:${server.address.port}") } finally { server.stop(0) }
    }
    @Test fun redirectNeverReachesOtherEndpoint() = withServer { server, origin ->
        val hits = AtomicInteger()
        server.createContext("/api/redirect") { exchange -> exchange.responseHeaders.add("Location", "$origin/api/target"); exchange.sendResponseHeaders(302, -1); exchange.close() }
        server.createContext("/api/target") { exchange -> hits.incrementAndGet(); exchange.sendResponseHeaders(200, -1); exchange.close() }
        val error = assertThrows(HttpFailure::class.java) { AlumniHttp(origin).json("/api/redirect") }
        assertEquals(302, error.code)
        assertEquals(0, hits.get())
    }
    @Test fun streamedResponseIsBoundedWithoutContentLength() = withServer { server, origin ->
        server.createContext("/api/large") { exchange -> exchange.sendResponseHeaders(200, 0); exchange.responseBody.use { it.write("x".repeat(10000).toByteArray()) } }
        assertThrows(java.io.IOException::class.java) { AlumniHttp(origin).json("/api/large", limit = 100) }
    }
    @Test fun actualHttpEtagIsRetainedAndUsedFor304() = withServer { server, origin ->
        server.createContext("/api/kiosk/snapshot") { exchange ->
            if (exchange.requestHeaders.getFirst("If-None-Match") == "\"media-aware-etag\"") exchange.sendResponseHeaders(304, -1)
            else { exchange.responseHeaders.add("ETag", "\"media-aware-etag\""); val bytes = "{}".toByteArray(); exchange.sendResponseHeaders(200, bytes.size.toLong()); exchange.responseBody.use { it.write(bytes) } }
            exchange.close()
        }
        val http = AlumniHttp(origin)
        val first = http.json("/api/kiosk/snapshot")!!
        assertEquals("\"media-aware-etag\"", first.getString("httpEtag"))
        assertNull(http.json("/api/kiosk/snapshot", etag = first.getString("httpEtag")))
    }
    @Test fun corruptMediaNeverReplacesVerifiedCache() = withServer { server, origin ->
        val data = "image-data".toByteArray()
        server.createContext("/media/photo.jpg") { exchange -> exchange.sendResponseHeaders(200, data.size.toLong()); exchange.responseBody.use { it.write(data) } }
        val dir = Files.createTempDirectory("media").toFile()
        val cache = MediaCache(dir, 100)
        val item = JSONObject().put("path", "/media/photo.jpg").put("sha256", "0".repeat(64)).put("kind", "image").put("size", data.size)
        assertThrows(IllegalArgumentException::class.java) { cache.fetch(AlumniHttp(origin), item, emptySet()) }
        assertNull(cache.cached(item))
        item.put("sha256", sha256(data))
        cache.fetch(AlumniHttp(origin), item, emptySet())
        assertArrayEquals(data, cache.cached(item)!!.readBytes())
    }
    @Test fun videoCannotEvictActiveImageAtQuota() = withServer { server, origin ->
        val data = "image-data".toByteArray()
        val video = "video-data".toByteArray()
        server.createContext("/media/photo.jpg") { exchange -> exchange.sendResponseHeaders(200, data.size.toLong()); exchange.responseBody.use { it.write(data) } }
        server.createContext("/media/video.mp4") { exchange -> exchange.sendResponseHeaders(200, video.size.toLong()); exchange.responseBody.use { it.write(video) } }
        val dir = Files.createTempDirectory("quota").toFile()
        val cache = MediaCache(dir, 10)
        val image = JSONObject().put("path", "/media/photo.jpg").put("sha256", sha256(data)).put("kind", "image").put("size", data.size)
        val movie = JSONObject().put("path", "/media/video.mp4").put("sha256", sha256(video)).put("kind", "video").put("size", video.size)
        cache.fetch(AlumniHttp(origin), image, emptySet())
        cache.fetch(AlumniHttp(origin), movie, setOf(image.getString("sha256")))
        assertNotNull(cache.cached(image))
        assertNull(cache.cached(movie))
    }
}
