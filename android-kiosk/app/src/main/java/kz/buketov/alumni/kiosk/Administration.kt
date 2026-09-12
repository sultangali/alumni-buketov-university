package kz.buketov.alumni.kiosk

import android.app.admin.DeviceAdminReceiver
import android.app.admin.DevicePolicyManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import org.json.JSONObject
import java.io.File
import java.security.MessageDigest
import java.security.SecureRandom
import java.util.Base64
import javax.crypto.SecretKeyFactory
import javax.crypto.spec.PBEKeySpec

class KioskAdminReceiver : DeviceAdminReceiver()

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Intent.ACTION_BOOT_COMPLETED) return
        // Device-owner apps are exempt from the normal background activity launch
        // restriction. Unmanaged installations rely on the user's chosen HOME app.
        if (context.getSystemService(DevicePolicyManager::class.java).isDeviceOwnerApp(context.packageName)) {
            context.startActivity(Intent(context, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
        }
    }
}

class AdminPassword(context: Context, private val crypto: Crypto) {
    private val file = File(context.filesDir, "administrator.enc")
    fun enrolled(): Boolean = file.exists()
    private fun read() = JSONObject(String(crypto.decrypt(file.readBytes()), Charsets.UTF_8))
    private fun write(value: JSONObject) = atomicWrite(file, crypto.encrypt(value.toString().toByteArray()))
    private fun derive(password: String, salt: ByteArray): ByteArray {
        val spec = PBEKeySpec(password.toCharArray(), salt, 210000, 256)
        return try { SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256").generateSecret(spec).encoded } finally { spec.clearPassword() }
    }
    @Synchronized fun enroll(password: String) {
        require(!enrolled()) { "Administrator already enrolled" }
        require(password.length in 12..256) { "Use a password of 12–256 characters" }
        val salt = ByteArray(32).also { SecureRandom().nextBytes(it) }
        write(JSONObject().put("salt", Base64.getEncoder().encodeToString(salt)).put("verifier", Base64.getEncoder().encodeToString(derive(password, salt))).put("failures", 0).put("lockedUntil", 0L))
    }
    @Synchronized fun verify(password: String): Boolean {
        val record = read()
        val now = System.currentTimeMillis()
        if (record.optLong("lockedUntil") > now) return false
        val valid = password.length <= 256 && MessageDigest.isEqual(derive(password, Base64.getDecoder().decode(record.getString("salt"))), Base64.getDecoder().decode(record.getString("verifier")))
        val failures = if (valid) 0 else record.optInt("failures") + 1
        record.put("failures", failures)
        record.put("lockedUntil", if (failures >= 5) now + minOf(3600000L, 30000L * (1L shl minOf(failures - 5, 7))) else 0L)
        write(record)
        return valid
    }
}
