import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

export type UserPublic = {
  id: string;
  email: string;
  created_at: Date;
};

type UserRow = UserPublic & { password_hash: string };

@Injectable()
export class UsersService {
  constructor(private readonly db: DatabaseService) {}

  async findByEmail(email: string): Promise<UserRow | null> {
    const r = await this.db.getPool().query<UserRow>(
      `SELECT id, email, password_hash, created_at FROM users WHERE email = $1 LIMIT 1`,
      [email.toLowerCase().trim()],
    );
    return r.rows[0] ?? null;
  }

  async create(email: string, passwordHash: string): Promise<UserPublic> {
    const r = await this.db.getPool().query<UserPublic>(
      `INSERT INTO users (email, password_hash)
       VALUES ($1, $2)
       RETURNING id, email, created_at`,
      [email.toLowerCase().trim(), passwordHash],
    );
    const row = r.rows[0];
    if (!row) throw new Error('failed to create user');
    return row;
  }
}
