import { IsEmail, IsString } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class LoginDto {
  @ApiProperty({ example: 'parent@example.com' })
  @IsEmail()
  email: string

  @ApiProperty({ example: 'securepassword123' })
  @IsString()
  password: string
}
