import { Controller, Get, Post, Delete, Param, Body, UseGuards, Request } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { PatientsService } from './patients.service'
import { CreatePatientDto } from './dto/create-patient.dto'

interface AuthRequest {
  user: { userId: string; householdId: string }
}

@ApiTags('patients')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('patients')
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  @Get()
  @ApiOperation({ summary: 'List all patients in your household' })
  findAll(@Request() req: AuthRequest) {
    return this.patientsService.findAll(req.user.householdId)
  }

  @Post()
  @ApiOperation({ summary: 'Add a patient — nickname only, no legal name required' })
  create(@Body() dto: CreatePatientDto, @Request() req: AuthRequest) {
    return this.patientsService.create(dto, req.user.householdId)
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove a patient from the household' })
  remove(@Param('id') id: string, @Request() req: AuthRequest) {
    return this.patientsService.remove(id, req.user.householdId)
  }
}
