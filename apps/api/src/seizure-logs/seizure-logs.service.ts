import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { NotificationsService } from '../notifications/notifications.service'
import { CreateSeizureLogDto } from './dto/create-seizure-log.dto'
import { EndSeizureLogDto } from './dto/end-seizure-log.dto'

@Injectable()
export class SeizureLogsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(dto: CreateSeizureLogDto, householdId: string) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: dto.patientId, householdId },
    })
    if (!patient) throw new ForbiddenException('Patient not found in your household')

    return this.prisma.seizureLog.create({
      data: {
        patientId: dto.patientId,
        householdId,
        startedAt: new Date(dto.startedAt),
        triggeredBy: dto.triggeredBy,
        weatherTempC: dto.weatherTempC,
        weatherCondition: dto.weatherCondition,
        weatherHumidity: dto.weatherHumidity,
        latitude: dto.latitude,
        longitude: dto.longitude,
      },
    })
  }

  async end(id: string, dto: EndSeizureLogDto, householdId: string) {
    const log = await this.prisma.seizureLog.findFirst({
      where: { id, householdId },
    })
    if (!log) throw new NotFoundException('Seizure log not found')

    const endedAt = new Date(dto.endedAt)
    const durationSeconds = Math.round((endedAt.getTime() - log.startedAt.getTime()) / 1000)

    return this.prisma.seizureLog.update({
      where: { id },
      data: {
        endedAt,
        durationSeconds,
        isFalseAlarm: dto.isFalseAlarm ?? false,
        seizureType: dto.seizureType,
        triggers: dto.triggers ?? [],
        consciousnessLost: dto.consciousnessLost,
        injuryOccurred: dto.injuryOccurred,
        postictalMinutes: dto.postictalMinutes,
        notes: dto.notes,
        // Weather captured in background — only update if not already set from create
        ...(dto.weatherTempC != null && !log.weatherTempC ? { weatherTempC: dto.weatherTempC } : {}),
        ...(dto.weatherCondition  && !log.weatherCondition ? { weatherCondition: dto.weatherCondition } : {}),
        ...(dto.weatherHumidity != null && !log.weatherHumidity ? { weatherHumidity: dto.weatherHumidity } : {}),
        ...(dto.latitude != null  && !log.latitude  ? { latitude: dto.latitude } : {}),
        ...(dto.longitude != null && !log.longitude ? { longitude: dto.longitude } : {}),
      },
    })
  }

  async fireBeacon(id: string, householdId: string, latitude?: number, longitude?: number) {
    const log = await this.prisma.seizureLog.findFirst({
      where: { id, householdId },
      include: { patient: { select: { nickname: true } } },
    })
    if (!log) throw new NotFoundException('Seizure log not found')

    const updated = await this.prisma.seizureLog.update({
      where: { id },
      data: {
        beaconFiredAt: new Date(),
        latitude: latitude ?? log.latitude,
        longitude: longitude ?? log.longitude,
      },
    })

    this.notifications
      .sendBeaconPush(householdId, log.patient.nickname)
      .catch(() => {})

    return updated
  }

  async findAll(householdId: string, patientId?: string) {
    return this.prisma.seizureLog.findMany({
      where: {
        householdId,
        ...(patientId ? { patientId } : {}),
      },
      orderBy: { startedAt: 'desc' },
      include: {
        patient: { select: { nickname: true } },
      },
    })
  }

}
