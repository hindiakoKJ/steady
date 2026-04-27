import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, Request } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { SeizureLogsService } from './seizure-logs.service'
import { CreateSeizureLogDto } from './dto/create-seizure-log.dto'
import { EndSeizureLogDto } from './dto/end-seizure-log.dto'

interface AuthRequest {
  user: { userId: string; householdId: string }
}

@ApiTags('seizure-logs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('seizure-logs')
export class SeizureLogsController {
  constructor(private readonly seizureLogsService: SeizureLogsService) {}

  @Post()
  @ApiOperation({ summary: 'Start a seizure log — call when AURA button is pressed' })
  create(@Body() dto: CreateSeizureLogDto, @Request() req: AuthRequest) {
    return this.seizureLogsService.create(dto, req.user.householdId)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'End a seizure — call when patient recovers' })
  end(@Param('id') id: string, @Body() dto: EndSeizureLogDto, @Request() req: AuthRequest) {
    return this.seizureLogsService.end(id, dto, req.user.householdId)
  }

  @Post(':id/beacon')
  @ApiOperation({ summary: 'Fire BEACON — records beacon activation and updates GPS location' })
  fireBeacon(
    @Param('id') id: string,
    @Body() body: { latitude?: number; longitude?: number },
    @Request() req: AuthRequest,
  ) {
    return this.seizureLogsService.fireBeacon(id, req.user.householdId, body.latitude, body.longitude)
  }

  @Get()
  @ApiOperation({ summary: 'Get seizure history for a patient — always scoped to your household' })
  @ApiQuery({ name: 'patientId', required: false })
  findAll(@Query('patientId') patientId: string | undefined, @Request() req: AuthRequest) {
    return this.seizureLogsService.findAll(req.user.householdId, patientId)
  }
}
