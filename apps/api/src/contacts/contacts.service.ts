import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateContactDto } from './dto/create-contact.dto'

@Injectable()
export class ContactsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(householdId: string) {
    return this.prisma.emergencyContact.findMany({
      where: { householdId },
      orderBy: { createdAt: 'asc' },
    })
  }

  async create(dto: CreateContactDto, householdId: string) {
    return this.prisma.emergencyContact.create({
      data: {
        nickname: dto.nickname,
        phoneNumber: dto.phoneNumber,
        householdId,
      },
    })
  }

  async remove(id: string, householdId: string) {
    const contact = await this.prisma.emergencyContact.findFirst({
      where: { id, householdId },
    })
    if (!contact) throw new NotFoundException('Contact not found')
    return this.prisma.emergencyContact.delete({ where: { id } })
  }
}
