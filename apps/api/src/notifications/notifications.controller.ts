import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { IsString } from 'class-validator'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { NotificationsService } from './notifications.service'

class RegisterTokenDto {
  @IsString() pushToken!: string
  @IsString() contactId!: string
}

interface AuthRequest {
  user: { userId: string; householdId: string }
}

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('token')
  @ApiOperation({ summary: 'Register an Expo push token for a contact' })
  registerToken(@Body() dto: RegisterTokenDto, @Request() req: AuthRequest) {
    return this.notificationsService.registerToken(
      req.user.householdId,
      dto.contactId,
      dto.pushToken,
    )
  }
}
