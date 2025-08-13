import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsPhoneNumber, IsString } from "class-validator";

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
}

export interface UserInfo {
    id: string;
    username: string;
    email: string | null;
    phone: string | null;
    firstName: string | null;
    lastName: string | null;
    avatar: string | null;
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
