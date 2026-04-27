import { IsString, IsOptional, MaxLength } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateContactDto {
  @ApiProperty({ example: 'Lola', description: 'Alias or nickname — no legal name required' })
  @IsString()
  @MaxLength(40)
  nickname: string

  @ApiPropertyOptional({ example: '+639171234567', description: 'Optional — contacts can receive push-only alerts without a phone number' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phoneNumber?: string
}
