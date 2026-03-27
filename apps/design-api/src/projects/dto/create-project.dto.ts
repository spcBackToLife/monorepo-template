import { IsString, IsIn, IsOptional } from 'class-validator';

export class CreateProjectDto {
  @IsString()
  name: string;

  @IsIn(['pc', 'mobile'])
  platform: 'pc' | 'mobile';

  @IsOptional()
  @IsString()
  viewportId?: string;
}
