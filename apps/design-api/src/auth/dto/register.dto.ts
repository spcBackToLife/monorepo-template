import { IsEmail, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: '请输入有效邮箱' })
  email!: string;

  @IsString()
  @MinLength(8, { message: '密码至少 8 位' })
  password!: string;
}
