import { IsString, IsOptional, IsArray, IsIn } from 'class-validator';

export class CreateAssetDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsIn(['project', 'team', 'global'])
  scope: 'project' | 'team' | 'global';

  @IsOptional()
  @IsString()
  projectId?: string;

  /** ComponentNode JSON */
  schema: Record<string, unknown>;

  @IsOptional()
  @IsString()
  thumbnail?: string;
}

export class UpdateAssetDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  schema?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  thumbnail?: string;
}
