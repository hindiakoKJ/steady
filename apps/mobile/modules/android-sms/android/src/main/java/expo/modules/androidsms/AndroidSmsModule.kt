package expo.modules.androidsms

import android.app.PendingIntent
import android.content.Intent
import android.os.Build
import android.telephony.SmsManager
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise

class AndroidSmsModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("AndroidSms")

    AsyncFunction("sendSMS") { phoneNumber: String, message: String, promise: Promise ->
      try {
        val smsManager: SmsManager = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
          appContext.reactContext!!.getSystemService(SmsManager::class.java)
        } else {
          @Suppress("DEPRECATION")
          SmsManager.getDefault()
        }

        // Split message if it exceeds single SMS length
        val parts = smsManager.divideMessage(message)

        if (parts.size == 1) {
          smsManager.sendTextMessage(phoneNumber, null, message, null, null)
        } else {
          smsManager.sendMultipartTextMessage(phoneNumber, null, parts, null, null)
        }

        promise.resolve(null)
      } catch (e: Exception) {
        promise.reject("SMS_SEND_FAILED", e.message ?: "Unknown error sending SMS", e)
      }
    }
  }
}
