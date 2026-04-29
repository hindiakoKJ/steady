import {
  IsISO8601, IsOptional, IsString, IsBoolean,
  IsIn, IsArray, IsInt, Min, MaxLength,
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
}
