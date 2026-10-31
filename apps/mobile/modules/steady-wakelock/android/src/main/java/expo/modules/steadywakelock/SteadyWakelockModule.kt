package expo.modules.steadywakelock

import android.content.Context
import android.os.PowerManager
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

// Partial wake lock for the background seizure monitor.
//
// The foreground service only prevents the PROCESS from being killed — it does
// not keep the CPU awake. With the screen off and the device idle, the SoC
// suspends and the (non-wakeup) accelerometer stops delivering, silently
// blinding the monitor for exactly the overnight scenario it exists for.
// A PARTIAL_WAKE_LOCK keeps the CPU (not the screen) running while monitoring
// is armed. Released in stop(); the OS reclaims it automatically if the
// process dies. Requires android.permission.WAKE_LOCK (declared in app.json).
class SteadyWakelockModule : Module() {
  private var wakeLock: PowerManager.WakeLock? = null

  override fun definition() = ModuleDefinition {
    Name("SteadyWakelock")

    Function("acquire") {
      val held = wakeLock?.isHeld == true
      if (held) return@Function true
      val pm = appContext.reactContext?.getSystemService(Context.POWER_SERVICE) as? PowerManager
        ?: return@Function false
      wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "Steady:MonitorWakeLock").apply {
        setReferenceCounted(false)
        acquire()
      }
      true
    }

    Function("release") {
      wakeLock?.let { if (it.isHeld) it.release() }
      wakeLock = null
      true
    }

    Function("isHeld") {
      wakeLock?.isHeld == true
    }
  }
}
