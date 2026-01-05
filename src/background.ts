/**
 * Background Service Worker
 *
 * Handles:
 * - Weekly automatic telemetry submission (if opted in)
 * - Alarm scheduling for periodic tasks
 */

import { submitTelemetry, shouldSubmitTelemetry, getMetricsSettings } from './lib/metrics'

const TELEMETRY_ALARM_NAME = 'telemetry-submission'
const TELEMETRY_CHECK_INTERVAL_MINUTES = 60 * 24 // Check daily (24 hours)

/**
 * Initialize background service worker
 */
async function initialize() {
  console.log('[Background] Service worker initialized')

  // Create alarm for periodic telemetry checks
  await createTelemetryAlarm()

  // Check telemetry on startup (in case we missed a scheduled submission)
  await checkAndSubmitTelemetry()
}

/**
 * Create alarm for periodic telemetry submission checks
 */
async function createTelemetryAlarm() {
  // Clear existing alarm
  await chrome.alarms.clear(TELEMETRY_ALARM_NAME)

  // Create new alarm (check daily)
  await chrome.alarms.create(TELEMETRY_ALARM_NAME, {
    periodInMinutes: TELEMETRY_CHECK_INTERVAL_MINUTES,
  })

  console.log('[Background] Telemetry alarm created (check every 24 hours)')
}

/**
 * Check if telemetry should be submitted and submit if needed
 */
async function checkAndSubmitTelemetry() {
  console.log('[Background] Checking telemetry submission...')

  const settings = await getMetricsSettings()

  // Check if automatic telemetry is enabled
  if (!settings.enableAutomaticTelemetry) {
    console.log('[Background] Automatic telemetry disabled')
    return
  }

  // Check if it's time to submit
  const shouldSubmit = await shouldSubmitTelemetry()

  if (shouldSubmit) {
    console.log('[Background] Time to submit telemetry')
    const success = await submitTelemetry()

    if (success) {
      console.log('[Background] Telemetry submitted successfully')
    } else {
      console.log('[Background] Telemetry submission failed, will retry on next check')
    }
  } else {
    console.log('[Background] Not time to submit telemetry yet')
  }
}

/**
 * Handle alarm events
 */
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === TELEMETRY_ALARM_NAME) {
    console.log('[Background] Telemetry alarm triggered')
    await checkAndSubmitTelemetry()
  }
})

/**
 * Handle messages from content scripts
 */
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'openOptions') {
    chrome.runtime.openOptionsPage()
    return true
  }
  return false
})

/**
 * Handle storage changes (e.g., user enables/disables telemetry)
 */
chrome.storage.onChanged.addListener(async (changes, areaName) => {
  if (areaName === 'local' && changes.jf_metrics_settings) {
    const newSettings = changes.jf_metrics_settings.newValue
    const oldSettings = changes.jf_metrics_settings.oldValue

    // Check if telemetry was just enabled
    if (newSettings?.enableAutomaticTelemetry && !oldSettings?.enableAutomaticTelemetry) {
      console.log('[Background] Automatic telemetry enabled, checking for submission...')
      await checkAndSubmitTelemetry()
    }

    // Check if telemetry was just disabled
    if (!newSettings?.enableAutomaticTelemetry && oldSettings?.enableAutomaticTelemetry) {
      console.log('[Background] Automatic telemetry disabled')
    }
  }
})

/**
 * Handle extension installation/update
 */
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    console.log('[Background] Extension installed')
  } else if (details.reason === 'update') {
    console.log('[Background] Extension updated to version', chrome.runtime.getManifest().version)
  }

  // Re-create alarms after update
  await createTelemetryAlarm()
})

// Initialize on service worker startup
initialize()
