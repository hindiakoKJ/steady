import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { PrismaModule } from './prisma/prisma.module'
import { AuthModule } from './auth/auth.module'
import { PatientsModule } from './patients/patients.module'
import { SeizureLogsModule } from './seizure-logs/seizure-logs.module'
import { ContactsModule } from './contacts/contacts.module'
import { NotificationsModule } from './notifications/notifications.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    PatientsModule,
    SeizureLogsModule,
    ContactsModule,
    NotificationsModule,
  ],
})
export class AppModule {}
