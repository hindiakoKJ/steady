import { Controller, Get, Post, Delete, Param, Body, UseGuards, Request } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { ContactsService } from './contacts.service'
import { CreateContactDto } from './dto/create-contact.dto'

interface AuthRequest {
  user: { userId: string; householdId: string }
}

@ApiTags('contacts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('contacts')
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Get()
  @ApiOperation({ summary: 'List emergency contacts for your household' })
  findAll(@Request() req: AuthRequest) {
    return this.contactsService.findAll(req.user.householdId)
  }

  @Post()
  @ApiOperation({ summary: 'Add an emergency contact — phone number is OPTIONAL' })
  create(@Body() dto: CreateContactDto, @Request() req: AuthRequest) {
    return this.contactsService.create(dto, req.user.householdId)
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove an emergency contact' })
  remove(@Param('id') id: string, @Request() req: AuthRequest) {
    return this.contactsService.remove(id, req.user.householdId)
  }
}
