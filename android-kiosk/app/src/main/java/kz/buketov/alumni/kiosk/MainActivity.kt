package kz.buketov.alumni.kiosk

import android.app.Activity
import android.app.AlertDialog
import android.app.admin.DevicePolicyManager
import android.content.*
import android.net.Uri
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.*
import android.webkit.*
import android.widget.*
import androidx.webkit.WebViewAssetLoader
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewFeature
import org.json.JSONObject
import java.io.ByteArrayInputStream
import java.util.concurrent.ArrayBlockingQueue
import java.util.concurrent.ThreadPoolExecutor
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean

class MainActivity : Activity() {
    private val handler = Handler(Looper.getMainLooper())
    private val requests = ThreadPoolExecutor(1, 1, 0, TimeUnit.SECONDS, ArrayBlockingQueue(16))
    private val syncing = AtomicBoolean(false)
    private lateinit var repository: Repository
    private lateinit var frame: android.widget.FrameLayout
    private var web: WebView? = null
    private var pageGeneration = 0
    private var maintenanceUntil = 0L
    private var loginVisible = false
    private val localOrigin = "https://appassets.androidplatform.net"
    private val periodic = object : Runnable {
        override fun run() { requestSync(); if (maintenanceUntil != 0L && System.currentTimeMillis() >= maintenanceUntil) { maintenanceUntil = 0; restoreKiosk() }; handler.postDelayed(this, 20000) }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON or WindowManager.LayoutParams.FLAG_SECURE)
        repository = Repository.get(this)
        frame = FrameLayout(this); setContentView(frame)
        createWebView()
        restoreKiosk()
        if (!AdminPassword(this, repository.crypto).enrolled()) handler.post { showLogin() }
    }
    override fun onResume() { super.onResume(); restoreKiosk(); handler.removeCallbacks(periodic); handler.post(periodic) }
    override fun onPause() { super.onPause(); handler.removeCallbacks(periodic) }
    override fun onDestroy() { handler.removeCallbacksAndMessages(null); web?.destroy(); requests.shutdownNow(); super.onDestroy() }
    @Deprecated("Kiosk owns navigation") override fun onBackPressed() {}
    override fun onWindowFocusChanged(hasFocus: Boolean) { super.onWindowFocusChanged(hasFocus); if (hasFocus) hideBars() }

    private fun hideBars() {
        window.setDecorFitsSystemWindows(false)
        window.insetsController?.apply { hide(WindowInsets.Type.systemBars()); systemBarsBehavior = WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE }
    }
    private fun restoreKiosk() {
        hideBars()
        val manager = getSystemService(DevicePolicyManager::class.java)
        if (manager.isDeviceOwnerApp(packageName)) {
            val admin = ComponentName(this, KioskAdminReceiver::class.java)
            manager.setLockTaskPackages(admin, arrayOf(packageName))
            manager.setLockTaskFeatures(admin, DevicePolicyManager.LOCK_TASK_FEATURE_NONE)
            val filter = IntentFilter(Intent.ACTION_MAIN).apply { addCategory(Intent.CATEGORY_HOME); addCategory(Intent.CATEGORY_DEFAULT) }
            manager.addPersistentPreferredActivity(admin, filter, ComponentName(this, MainActivity::class.java))
            if (System.currentTimeMillis() >= maintenanceUntil) runCatching { startLockTask() }
        }
    }
    private fun requestSync() {
        if (!syncing.compareAndSet(false, true)) return
        repository.executor.execute { try { repository.sync() } finally { syncing.set(false) } }
    }
    private fun empty(status: Int = 403) = WebResourceResponse("text/plain", "UTF-8", status, if (status == 404) "Not Found" else "Blocked", mapOf("Cache-Control" to "no-store"), ByteArrayInputStream(ByteArray(0)))
    private fun createWebView() {
        pageGeneration++
        val generation = pageGeneration
        web?.let { frame.removeView(it); it.destroy() }
        web = null
        frame.removeAllViews()
        val missing = listOf(WebViewFeature.WEB_MESSAGE_LISTENER, WebViewFeature.DOCUMENT_START_SCRIPT)
            .filterNot { feature -> runCatching { WebViewFeature.isFeatureSupported(feature) }.getOrDefault(false) }
        if (missing.isNotEmpty()) {
            val provider = runCatching { WebViewCompat.getCurrentWebViewPackage(this)?.let { "${it.packageName} ${it.versionName}" } }.getOrNull()
                ?: "Не удалось определить активный WebView"
            showWebViewRecovery(missing, provider)
            return
        }
        val view = WebView(this); web = view
        val assetLoader = WebViewAssetLoader.Builder().addPathHandler("/") { path ->
            val safe = if (path.isEmpty()) "index.html" else path
            if (safe.contains("..") || safe.contains('\\') || safe.startsWith("/")) null else try {
                val mime = when (safe.substringAfterLast('.')) { "html" -> "text/html"; "js" -> "application/javascript"; "css" -> "text/css"; "svg" -> "image/svg+xml"; "json" -> "application/json"; "woff2" -> "font/woff2"; else -> android.webkit.MimeTypeMap.getSingleton().getMimeTypeFromExtension(safe.substringAfterLast('.')) ?: "application/octet-stream" }
                WebResourceResponse(mime, "UTF-8", this@MainActivity.assets.open("web/$safe"))
            } catch (_: Exception) { null }
        }.build()
        view.settings.apply {
            javaScriptEnabled = true; domStorageEnabled = false
            allowFileAccess = false; allowContentAccess = false
            mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            blockNetworkLoads = true; setSupportMultipleWindows(false)
            javaScriptCanOpenWindowsAutomatically = false
            mediaPlaybackRequiresUserGesture = true
            cacheMode = WebSettings.LOAD_NO_CACHE
            setGeolocationEnabled(false)
        }
        CookieManager.getInstance().setAcceptCookie(false)
        CookieManager.getInstance().setAcceptThirdPartyCookies(view, false)
        ServiceWorkerController.getInstance().serviceWorkerWebSettings.blockNetworkLoads = true
        ServiceWorkerController.getInstance().setServiceWorkerClient(object : ServiceWorkerClient() { override fun shouldInterceptRequest(request: WebResourceRequest) = empty() })
        WebView.setWebContentsDebuggingEnabled(false)
        view.setDownloadListener { _, _, _, _, _ -> }
        view.webChromeClient = object : WebChromeClient() {
            override fun onPermissionRequest(request: PermissionRequest) { request.deny() }
            override fun onShowFileChooser(view: WebView, callback: ValueCallback<Array<Uri>>, params: FileChooserParams): Boolean { callback.onReceiveValue(null); return true }
            override fun onGeolocationPermissionsShowPrompt(origin: String, callback: GeolocationPermissions.Callback) { callback.invoke(origin, false, false) }
        }
        view.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean = request.url.scheme != "https" || request.url.host != "appassets.androidplatform.net" || request.url.port != -1 || request.url.path?.startsWith("/api/") == true
            override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse {
                val uri = request.url
                if (uri.scheme != "https" || uri.host != "appassets.androidplatform.net" || uri.port != -1 || request.method != "GET") return empty()
                if (uri.path?.startsWith("/cached-media/") == true) {
                    val mediaPath = "/media/" + uri.path!!.removePrefix("/cached-media/")
                    val file = runCatching { repository.cachedMedia(mediaPath) }.getOrNull() ?: return empty(404)
                    return try { WebResourceResponse(MimeTypeMap.getSingleton().getMimeTypeFromExtension(mediaPath.substringAfterLast('.')) ?: "application/octet-stream", null, file.inputStream()) } catch (_: Exception) { empty(404) }
                }
                val response = assetLoader.shouldInterceptRequest(uri) ?: return empty(404)
                response.responseHeaders = mapOf("Cache-Control" to "no-store", "X-Content-Type-Options" to "nosniff", "Content-Security-Policy" to "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; font-src 'self'; connect-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'")
                return response
            }
            override fun onReceivedSslError(view: WebView, handler: android.webkit.SslErrorHandler, error: android.net.http.SslError) { handler.cancel() }
            override fun onRenderProcessGone(view: WebView, detail: RenderProcessGoneDetail): Boolean { handler.post { if (!isFinishing && !isDestroyed) createWebView() }; return true }
        }
        frame.addView(view, FrameLayout.LayoutParams(-1, -1))
        // A small transparent corner target stays native even if the web renderer fails.
        val handle = View(this)
        handle.contentDescription = "Maintenance"
        handle.setOnLongClickListener { showLogin(); true }
        frame.addView(handle, FrameLayout.LayoutParams((16 * resources.displayMetrics.density).toInt(), (16 * resources.displayMetrics.density).toInt(), Gravity.TOP or Gravity.END))
        if (WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) WebViewCompat.addWebMessageListener(view, "AlumniPipe", setOf(localOrigin)) { _, message, sourceOrigin, isMainFrame, _ ->
            if (!isMainFrame || sourceOrigin.toString().trimEnd('/') != localOrigin) return@addWebMessageListener
            val raw = message.data ?: return@addWebMessageListener
            if (raw.length > 160 * 1024) return@addWebMessageListener
            val request = runCatching { JSONObject(raw) }.getOrNull() ?: return@addWebMessageListener
            val id = request.optString("id")
            if (!id.matches(Regex("[a-zA-Z0-9-]{1,80}"))) return@addWebMessageListener
            val method = request.optString("method")
            if (method == "maintenance") { showLogin(); respond(id, JSONObject().put("ok", true).put("data", JSONObject()), generation); return@addWebMessageListener }
            try { requests.execute {
                val result = try {
                    val payload = JSONObject(request.optString("payload", "{}"))
                    val data = when (method) {
                        "bootstrap" -> { requestSync(); repository.bootstrap() }
                        "status" -> repository.status()
                        "submit" -> repository.submit(payload).also { requestSync() }
                        "handoff" -> repository.handoff(payload)
                        else -> throw IllegalArgumentException("Unsupported kiosk operation")
                    }
                    JSONObject().put("ok", true).put("data", data)
                } catch (error: Exception) {
                    // Never echo server bodies or application content into diagnostics.
                    JSONObject().put("ok", false).put("error", if (error is IllegalArgumentException || error is java.io.IOException) error.message ?: "Operation unavailable" else "Operation unavailable").put("status", (error as? HttpFailure)?.code ?: 503)
                }
                respond(id, result, generation)
            } } catch (_: java.util.concurrent.RejectedExecutionException) { respond(id, JSONObject().put("ok", false).put("error", "Kiosk is busy; retry").put("status", 429), generation) }
        }
        if (WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)) WebViewCompat.addDocumentStartJavaScript(view, "Object.defineProperty(window,'AlumniNative',{value:Object.freeze({request:function(id,method,payload){AlumniPipe.postMessage(JSON.stringify({id:id,method:method,payload:payload}));}}),writable:false,configurable:false});", setOf(localOrigin))
        view.loadUrl("$localOrigin/")
    }
    private fun showWebViewRecovery(missing: List<String>, provider: String) {
        // Never ask an incompatible renderer to display its own recovery page.
        val padding = (24 * resources.displayMetrics.density).toInt()
        val content = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(padding, padding, padding, padding)
            gravity = Gravity.CENTER_VERTICAL
        }
        fun label(value: String, size: Float) {
            content.addView(TextView(this).apply {
                text = value; textSize = size
                setTextColor(android.graphics.Color.rgb(28, 40, 52))
                setPadding(0, 0, 0, padding)
            })
        }
        label("Требуется обновление Android System WebView", 24f)
        label("Дождитесь завершения обновления, выберите обновлённый компонент в настройках «Сервис WebView» и заново откройте приложение. Сброс Android и удаление приложения не нужны.", 18f)
        label("Активный компонент: $provider\nНедоступные функции: ${missing.joinToString()}\nВерсия приложения: ${BuildConfig.VERSION_NAME}", 14f)
        content.addView(Button(this).apply { text = "Проверить снова"; setOnClickListener { createWebView() } })
        content.addView(Button(this).apply { text = "Вход администратора"; setOnClickListener { showLogin() } })
        frame.addView(ScrollView(this).apply {
            isFillViewport = true
            setBackgroundColor(android.graphics.Color.WHITE)
            addView(content)
        }, FrameLayout.LayoutParams(-1, -1))
    }
    private fun respond(id: String, result: JSONObject, generation: Int) { handler.post { if (!isDestroyed && generation == pageGeneration) web?.evaluateJavascript("window.__alumniNativeResponse&&window.__alumniNativeResponse(${JSONObject.quote(id)},${JSONObject.quote(result.toString())});", null) } }

    private fun showLogin() {
        if (loginVisible || isFinishing) return
        loginVisible = true
        val auth = AdminPassword(this, repository.crypto)
        val enrollment = !auth.enrolled()
        val layout = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(32, 24, 32, 0) }
        val password = EditText(this).apply { hint = if (enrollment) "New password (12+ characters)" else "Administrator password"; inputType = 129 }
        val confirmation = EditText(this).apply { hint = "Repeat password"; inputType = 129 }
        layout.addView(password); if (enrollment) layout.addView(confirmation)
        val builder = AlertDialog.Builder(this).setTitle(if (enrollment) "Enroll kiosk administrator" else "Maintenance access").setMessage(if (enrollment) "The operator must enroll a password before public use. Keep it in the university password manager." else "Use the enrolled kiosk password.").setView(layout).setPositiveButton("Continue", null).setCancelable(!enrollment)
        if (!enrollment) builder.setNegativeButton("Cancel", null)
        val dialog = builder.create()
        dialog.setOnDismissListener { loginVisible = false }
        dialog.setOnShowListener { dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener {
            val input = password.text.toString()
            if (enrollment && input != confirmation.text.toString()) { password.error = "Passwords do not match"; return@setOnClickListener }
            dialog.getButton(AlertDialog.BUTTON_POSITIVE).isEnabled = false
            requests.execute {
                val result = runCatching { if (enrollment) auth.enroll(input) else require(auth.verify(input)) { "Incorrect password or rate limited" } }
                handler.post { if (result.isSuccess) { password.text.clear(); confirmation.text.clear(); dialog.dismiss(); showMaintenance() } else { password.text.clear(); password.error = result.exceptionOrNull()?.message ?: "Authentication unavailable"; dialog.getButton(AlertDialog.BUTTON_POSITIVE).isEnabled = true } }
            }
        } }
        dialog.show()
    }
    private fun showMaintenance() {
        val layout = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(32, 16, 32, 16) }
        val server = EditText(this).apply { hint = "Kiosk server origin"; setText(runCatching { repository.origin() }.getOrDefault("")); inputType = 17 }
        val public = EditText(this).apply { hint = "Public HTTPS origin (optional)"; setText(repository.publicOrigin()); inputType = 17 }
        val status = TextView(this).apply { text = "Version ${BuildConfig.VERSION_NAME} / ${BuildConfig.FLAVOR}\n${repository.status()}" }
        layout.addView(status); layout.addView(server); layout.addView(public)
        fun button(title: String, action: () -> Unit) { layout.addView(Button(this).apply { text = title; setOnClickListener { action() } }) }
        val dialog = AlertDialog.Builder(this).setTitle("Kiosk maintenance").setView(ScrollView(this).apply { addView(layout) }).setNegativeButton("Return to kiosk") { _, _ -> maintenanceUntil = 0; restoreKiosk() }.create()
        button("Save origins") { runCatching { repository.configure(server.text.toString(), public.text.toString()); requestSync(); createWebView() }.onSuccess { Toast.makeText(this, "Configuration saved", Toast.LENGTH_SHORT).show() }.onFailure { server.error = it.message } }
        button("Synchronize now") { requestSync(); Toast.makeText(this, "Synchronization started", Toast.LENGTH_SHORT).show() }
        button("Refresh status") { status.text = "Version ${BuildConfig.VERSION_NAME} / ${BuildConfig.FLAVOR}\n${repository.status()}" }
        button("Copy diagnostics (no application content)") {
            val diagnostic = JSONObject().put("version", BuildConfig.VERSION_NAME).put("profile", BuildConfig.FLAVOR).put("status", repository.status()).toString()
            getSystemService(android.content.ClipboardManager::class.java).setPrimaryClip(ClipData.newPlainText("Alumni kiosk diagnostics", diagnostic))
            Toast.makeText(this, "Diagnostics copied", Toast.LENGTH_SHORT).show()
        }
        button("Clear catalogue and media (keeps applications)") { repository.executor.execute { repository.clearCache(); requestSync(); handler.post { createWebView() } } }
        button("Exit Lock Task for two minutes") {
            maintenanceUntil = System.currentTimeMillis() + 120000
            runCatching { stopLockTask() }
            handler.postDelayed({ maintenanceUntil = 0; dialog.dismiss(); startActivity(Intent(this, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_REORDER_TO_FRONT)); restoreKiosk() }, 120000)
            dialog.dismiss()
            startActivity(Intent(android.provider.Settings.ACTION_SETTINGS))
        }
        // Maintenance sessions expire even when the dialog stays in front of WebView.
        handler.postDelayed({ if (dialog.isShowing) { dialog.dismiss(); restoreKiosk() } }, 120000)
        dialog.show()
    }
}
