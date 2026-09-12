package kz.buketov.alumni.kiosk

import android.view.View
import android.view.ViewGroup
import android.webkit.WebView
import android.widget.FrameLayout
import android.widget.TextView
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [31], application = android.app.Application::class)
class WebViewRecoveryTest {
    @Test fun unsupportedProviderShowsNativeDiagnosticsWithoutLoadingWebContent() {
        // Attach the actual Activity without starting storage/sync/enrollment.
        val activity = Robolectric.buildActivity(MainActivity::class.java).get()
        val frame = FrameLayout(activity)
        MainActivity::class.java.getDeclaredField("frame").apply { isAccessible = true }.set(activity, frame)
        MainActivity::class.java.getDeclaredMethod("showWebViewRecovery", List::class.java, String::class.java)
            .apply { isAccessible = true }
            .invoke(activity, listOf("DOCUMENT_START_SCRIPT"), "com.example.webview 91.0.4472.134")
        fun descendants(view: View): List<View> = listOf(view) + if (view is ViewGroup) (0 until view.childCount).flatMap { descendants(view.getChildAt(it)) } else emptyList()
        val views = descendants(frame)
        assertFalse("Recovery must not depend on a WebView", views.any { it is WebView })
        val text = views.filterIsInstance<TextView>().joinToString("\n") { it.text }
        assertTrue(text.contains("91.0.4472.134"))
        assertTrue(text.contains("DOCUMENT_START_SCRIPT"))
        assertTrue(views.filterIsInstance<TextView>().any { it.text == "Проверить снова" && it.hasOnClickListeners() })
        assertTrue(views.filterIsInstance<TextView>().any { it.text == "Вход администратора" && it.hasOnClickListeners() })
    }
}
