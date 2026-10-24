import { Injectable, UnauthorizedException, ConflictException, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UserRole } from '@rscb/shared';
import { User } from './entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async validateUser(username: string, pass: string): Promise<User | null> {
    const user = await this.userRepository.findOne({ where: { username } });
    if (!user) {
      return null;
    }
    const isMatch = await bcrypt.compare(pass, user.password);
    if (!isMatch) {
      return null;
    }
    return user;
  }

  async login(user: any) {
    const payload = { username: user.username, sub: user.id, role: user.role };
    return {
      accessToken: this.jwtService.sign(payload),
    };
  }

  async register(
    username: string,
    password: string,
    displayName?: string,
    role: UserRole = UserRole.OPERATOR,
  ): Promise<User> {
    const existing = await this.userRepository.findOne({ where: { username } });
    if (existing) {
      throw new ConflictException('Username already exists');
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const user = this.userRepository.create({
      username,
      password: hashedPassword,
      displayName: displayName || username,
      isActive: true,
      role,
    });
    return this.userRepository.save(user);
  }

  async listUsers(): Promise<User[]> {
    return this.userRepository.find({ order: { createdAt: 'ASC' } });
  }

  async updateUserRole(id: string, role: UserRole): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.role === UserRole.ADMIN && role !== UserRole.ADMIN) {
      // Tanpa proteksi ini operator bisa mencabut satu-satunya ADMIN dan
      // tidak ada lagi yang dapat mengelola user (deadlock administratif).
      const otherAdmins = await this.userRepository.count({
        where: { role: UserRole.ADMIN, id: Not(id) },
      });
      if (otherAdmins === 0) {
        throw new BadRequestException('Cannot demote the last administrator');
      }
    }
    user.role = role;
    return this.userRepository.save(user);
  }

  async deleteUser(id: string, actingUsername: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.username === actingUsername) {
      throw new BadRequestException('Cannot delete your own account');
    }
    if (user.role === UserRole.ADMIN) {
      const otherAdmins = await this.userRepository.count({
        where: { role: UserRole.ADMIN, id: Not(id) },
      });
      if (otherAdmins === 0) {
        throw new BadRequestException('Cannot delete the last administrator');
      }
    }
    await this.userRepository.remove(user);
  }

  async getProfile(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }
    return user;
  }

  async changePassword(id: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Current password is incorrect');
    }
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await this.userRepository.save(user);
  }

  async seedAdmin(): Promise<void> {
    const username = this.configService.get('ADMIN_USERNAME') || 'admin';
    const password = this.configService.get('ADMIN_PASSWORD');
    if (!password) {
      throw new Error('ADMIN_PASSWORD must be set to seed the admin user');
    }
    const existing = await this.userRepository.findOne({ where: { username } });
    if (!existing) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      await this.userRepository.save(
        this.userRepository.create({
          username,
          password: hashedPassword,
          displayName: 'Administrator',
          isActive: true,
          role: UserRole.ADMIN,
        }),
      );
      console.log(`Admin user "${username}" seeded`);
    }
  }
}