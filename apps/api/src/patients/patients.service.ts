import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreatePatientDto } from './dto/create-patient.dto'

@Injectable()
export class PatientsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(householdId: string) {
    return this.prisma.patient.findMany({
      where: { householdId },
      orderBy: { createdAt: 'asc' },
    })
  }

  async create(dto: CreatePatientDto, householdId: string) {
    return this.prisma.patient.create({
      data: {
        nickname: dto.nickname,
        birthYear: dto.birthYear,
        notes: dto.notes,
        householdId,
      },
    })
  }

  async remove(id: string, householdId: string) {
    const patient = await this.prisma.patient.findFirst({
      where: { id, householdId },
    })
    if (!patient) throw new NotFoundException('Patient not found')
    return this.prisma.patient.delete({ where: { id } })
  }
}
