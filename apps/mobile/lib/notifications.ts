// expo-notifications removed — push notifications require FCM credentials
// to be configured in EAS before re-adding. Stubbed for now.

export async function registerForPushNotifications(): Promise<string | null> {
  return null
}

export async function registerPushTokenWithApi(_contactId: string): Promise<void> {
  // no-op until push notifications are configured
}
