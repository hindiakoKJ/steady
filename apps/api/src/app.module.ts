import { Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { ConfigModule } from '@nestjs/config'
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler'
import { PrismaModule } from './prisma/prisma.module'
import { AuthModule } from './auth/auth.module'
import { PatientsModule } from './patients/patients.module'
import { SeizureLogsModule } from './seizure-logs/seizure-logs.module'
import { ContactsModule } from './contacts/contacts.module'
import { NotificationsModule } from './notifications/notifications.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{
      ttl: 60000,  // 1-minute window
      limit: 30,   // max 30 requests per IP per minute
    }]),
    PrismaModule,
    AuthModule,
    PatientsModule,
    SeizureLogsModule,
    ContactsModule,
    NotificationsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
