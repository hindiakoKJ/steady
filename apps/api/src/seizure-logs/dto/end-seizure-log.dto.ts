import {
  IsISO8601, IsOptional, IsString, IsBoolean,
  IsIn, IsArray, IsInt, IsNumber, Min, MaxLength,
} from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

const SEIZURE_TYPES = ['tonic-clonic', 'absence', 'focal', 'myoclonic', 'unknown']
const TRIGGER_VALUES = [
  'missed_meds', 'stress', 'sleep', 'heat', 'illness',
  'flashing_lights', 'alcohol', 'menstrual', 'unknown',
]

export class EndSeizureLogDto {
  @ApiProperty({ example: '2025-06-15T14:34:30.000Z' })
  @IsISO8601()
  endedAt: string

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isFalseAlarm?: boolean

  @ApiPropertyOptional({ enum: SEIZURE_TYPES })
  @IsOptional()
  @IsIn(SEIZURE_TYPES)
  seizureType?: string

  @ApiPropertyOptional({ example: ['missed_meds', 'stress'] })
  @IsOptional()
  @IsArray()
  @IsIn(TRIGGER_VALUES, { each: true })
  triggers?: string[]

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  consciousnessLost?: boolean

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  injuryOccurred?: boolean

  @ApiPropertyOptional({ example: 15 })
  @IsOptional()
  @IsInt()
  @Min(0)
  postictalMinutes?: number

  @ApiPropertyOptional({ example: 'Patient was on their side. Recovered normally.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string

  // Weather captured in background during the seizure
  @ApiPropertyOptional({ example: 32.5 })
  @IsOptional()
  @IsNumber()
  weatherTempC?: number

  @ApiPropertyOptional({ example: 'Rain' })
  @IsOptional()
  @IsString()
  weatherCondition?: string

  @ApiPropertyOptional({ example: 80 })
  @IsOptional()
  @IsInt()
  weatherHumidity?: number

  @ApiPropertyOptional({ example: 14.5995 })
  @IsOptional()
  @IsNumber()
  latitude?: number

  @ApiPropertyOptional({ example: 120.9842 })
  @IsOptional()
  @IsNumber()
  longitude?: number
}
