import { IsString, IsIn } from 'class-validator';

export class CreateProjectDto {
  @IsString()
  name: string;

  @IsIn(['pc', 'mobile'])
  platform: 'pc' | 'mobile';
}
