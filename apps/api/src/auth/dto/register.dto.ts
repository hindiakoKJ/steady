import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class RegisterDto {
  @ApiProperty({ example: 'parent@example.com' })
  @IsEmail()
  email: string

  @ApiProperty({ example: 'securepassword123', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string

  @ApiProperty({ example: 'The Cruz Family', description: 'Nickname or alias — no legal name required' })
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  householdAlias: string

  @ApiProperty({ example: 'Ate Mia', description: 'Nickname for the first patient — no legal name required' })
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  patientNickname: string
}
