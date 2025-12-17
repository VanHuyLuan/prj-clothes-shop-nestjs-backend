import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsPhoneNumber, IsString } from 'class-validator';

export class CreateUserDto {
  @ApiProperty()
  @IsNotEmpty()
  username: string;

  @ApiProperty()
  @IsNotEmpty()
  firstname: string;

  @ApiProperty()
  @IsNotEmpty()
  lastname: string;

  // Email format validation
  @ApiProperty()
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty()
  @IsPhoneNumber()
  phone: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  password: string;
}

export interface CreateUserResponse {
  id: string;
  username: string;
  email: string | null;
  phone: string | null;
}

export class CreateUserByAdminDto {
  @ApiProperty()
  @IsNotEmpty()
  username: string;

  @ApiProperty()
  @IsNotEmpty()
  firstname: string;

  @ApiProperty()
  @IsNotEmpty()
  lastname: string;

  // Email format validation
  @ApiProperty()
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty()
  @IsPhoneNumber()
  phone: string;

  @ApiProperty()
  @IsNotEmpty()
  role: string;
}

export interface CreateUserByAdminResponse {
  id: string;
  username: string;
  email: string | null;
  phone: string | null;
  role: {
    name: string;
  };
}

export interface UserResponse {
  id: string;
  username: string;
  email: string | null;
  phone: string | null;
  firstName: string | null;
  lastName: string | null;
  avatar: string | null;
  accounts: {
    password: string | null;
  }[];
  role: {
    name: string;
  };
  status: boolean;
}

export interface UserInfo {
  id: string;
  username: string;
  email: string | null;
  phone: string | null;
  firstName: string | null;
  lastName: string | null;
  avatar: string | null;
  status: boolean;
  role: {
    name: string;
  };
}

export class LoginDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  password: string;
}

export class ChangePasswordDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  new_password: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  old_password: string;
}

export class ListUsersQueryDto {
  @ApiProperty({ required: false })
  role_id?: string;

  @ApiProperty({ required: false, default: 1 })
  page?: number;

  @ApiProperty({ required: false, default: 10 })
  limit?: number;

  @ApiProperty({ required: false, default: 'created_at' })
  sortBy?: string;

  @ApiProperty({ required: false, enum: ['asc', 'desc'], default: 'desc' })
  sortOrder?: 'asc' | 'desc';
}

export interface ListUsersResponse {
  data: UserInfo[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class UpdateUserDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  username: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  firstname: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  lastname: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsPhoneNumber()
  phone: string;

  @ApiProperty({ required: false })
  @IsString()
  avatar?: string;

  @ApiProperty({ required: false })
  @IsString()
  gender?: string;

  @ApiProperty({ required: false })
  @IsString()
  birthday?: string;
}

export interface UpdateUserResponse {
  id: string;
  username: string;
  email: string | null;
  phone: string | null;
  firstName: string | null;
  lastName: string | null;
  avatar: string | null;
  gender: string | null;
  birthday: string | null;
}

export class UpdateAddressDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  street: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  city: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  state: string;

  @ApiProperty({ required: false })
  @IsString()
  zip: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  country: string;
}

export interface UpdateAddressResponse {
  id: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}