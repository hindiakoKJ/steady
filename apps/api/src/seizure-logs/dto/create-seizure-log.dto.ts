import { IsString, IsISO8601, IsOptional, IsNumber, IsInt, IsIn, Min, Max } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateSeizureLogDto {
  @ApiProperty({ example: 'cld1234abcdef' })
  @IsString()
  patientId: string

  @ApiProperty({ example: '2025-06-15T14:32:00.000Z' })
  @IsISO8601()
  startedAt: string

  @ApiPropertyOptional({ enum: ['AURA', 'BEACON', 'PASSIVE', 'MANUAL'] })
  @IsOptional()
  @IsIn(['AURA', 'BEACON', 'PASSIVE', 'MANUAL'])
  triggeredBy?: string

  @ApiPropertyOptional({ example: 32.1 })
  @IsOptional()
  @IsNumber()
  weatherTempC?: number

  @ApiPropertyOptional({ example: 'Rain' })
  @IsOptional()
  @IsString()
  weatherCondition?: string

  @ApiPropertyOptional({ example: 78 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
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
