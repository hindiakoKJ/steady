import { IsString, IsOptional, IsInt, Min, Max, MaxLength } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreatePatientDto {
  @ApiProperty({ example: 'Ate Mia', description: 'Nickname or alias only — no legal name required' })
  @IsString()
  @MaxLength(40)
  nickname: string

  @ApiPropertyOptional({ example: 2015 })
  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(new Date().getFullYear())
  birthYear?: number

  @ApiPropertyOptional({ example: 'Triggers: fever, missed sleep. Medication: Levetiracetam 500mg' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string
}
