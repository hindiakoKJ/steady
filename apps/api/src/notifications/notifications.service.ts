import { Injectable, Logger } from '@nestjs/common'
import { Expo, ExpoPushMessage } from 'expo-server-sdk'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class NotificationsService {
  private readonly expo = new Expo()
  private readonly logger = new Logger(NotificationsService.name)

  constructor(private readonly prisma: PrismaService) {}

  async registerToken(householdId: string, contactId: string, pushToken: string) {
    if (!Expo.isExpoPushToken(pushToken)) {
      throw new Error(`Invalid Expo push token: ${pushToken}`)
    }
    return this.prisma.emergencyContact.update({
      where: { id: contactId, householdId },
      data: { pushToken },
    })
  }

  async sendBeaconPush(householdId: string, patientNickname: string) {
    const contacts = await this.prisma.emergencyContact.findMany({
      where: { householdId, pushToken: { not: null } },
    })

    if (contacts.length === 0) return

    const messages: ExpoPushMessage[] = contacts
      .filter((c) => c.pushToken && Expo.isExpoPushToken(c.pushToken))
      .map((c) => ({
        to: c.pushToken!,
        sound: 'default' as const,
        title: '🚨 STEADY BEACON',
        body: `${patientNickname} may be having a seizure. Please respond immediately.`,
        data: { type: 'beacon', householdId },
        priority: 'high' as const,
      }))

    const chunks = this.expo.chunkPushNotifications(messages)
    for (const chunk of chunks) {
      try {
        await this.expo.sendPushNotificationsAsync(chunk)
      } catch (err) {
        this.logger.error('Push notification failed', err)
      }
    }
  }
}
