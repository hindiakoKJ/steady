import { Module } from '@nestjs/common'
import { SeizureLogsController } from './seizure-logs.controller'
import { SeizureLogsService } from './seizure-logs.service'
import { NotificationsModule } from '../notifications/notifications.module'

@Module({
  imports: [NotificationsModule],
  controllers: [SeizureLogsController],
  providers: [SeizureLogsService],
})
export class SeizureLogsModule {}
