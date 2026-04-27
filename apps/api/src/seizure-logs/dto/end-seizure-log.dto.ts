import { IsISO8601, IsOptional, IsString, MaxLength } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class EndSeizureLogDto {
  @ApiProperty({ example: '2025-06-15T14:34:30.000Z' })
  @IsISO8601()
  endedAt: string

  @ApiPropertyOptional({ example: 'Patient was on their side. Recovered normally.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string
}
