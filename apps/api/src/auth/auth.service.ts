import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcryptjs'
import { PrismaService } from '../prisma/prisma.service'
import { RegisterDto } from './dto/register.dto'
import { LoginDto } from './dto/login.dto'

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } })
    if (existing) throw new ConflictException('Email already registered')

    const passwordHash = await bcrypt.hash(dto.password, 10)

    // Create household → user → first patient in a single transaction
    const result = await this.prisma.$transaction(async (tx) => {
      const household = await tx.household.create({
        data: { alias: dto.householdAlias },
      })

      const user = await tx.user.create({
        data: {
          email: dto.email,
          passwordHash,
          householdId: household.id,
        },
      })

      const patient = await tx.patient.create({
        data: {
          nickname: dto.patientNickname,
          householdId: household.id,
        },
      })

      return { household, user, patient }
    })

    const token = this.jwtService.sign({
      sub: result.user.id,
      householdId: result.household.id,
      email: result.user.email,
    })

    return {
      token,
      householdId: result.household.id,
      patientId: result.patient.id,
      patientNickname: result.patient.nickname,
    }
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } })
    if (!user) throw new UnauthorizedException('Invalid credentials')

    const valid = await bcrypt.compare(dto.password, user.passwordHash)
    if (!valid) throw new UnauthorizedException('Invalid credentials')

    const patients = await this.prisma.patient.findMany({
      where: { householdId: user.householdId },
      orderBy: { createdAt: 'asc' },
      take: 1,
    })

    const token = this.jwtService.sign({
      sub: user.id,
      householdId: user.householdId,
      email: user.email,
    })

    return {
      token,
      householdId: user.householdId,
      patientId: patients[0]?.id ?? null,
      patientNickname: patients[0]?.nickname ?? null,
    }
  }
}
