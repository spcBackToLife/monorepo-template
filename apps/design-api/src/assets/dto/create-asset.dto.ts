import { IsString, IsOptional, IsArray, IsIn } from 'class-validator';
import type { ComponentAssetSchema } from '../../shared/types';

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
  schema: ComponentAssetSchema;

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
  schema?: ComponentAssetSchema;

  @IsOptional()
  @IsString()
  thumbnail?: string;
}
