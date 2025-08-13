import { IsEmail, IsNotEmpty, IsPhoneNumber, IsString } from "class-validator";

export class CreateUserDto {
    @IsNotEmpty()
    username: string;

    @IsNotEmpty()
    firstname: string;

    @IsNotEmpty()
    lastname: string;

    // Email format validation
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @IsPhoneNumber()
    phone: string;

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
    accounts: {
        password: string | null;
    }[];
}

export interface UserInfo {
    id: string;
    username: string;
    email: string | null;
    phone: string | null;
    firstName: string | null;
    lastName: string | null;
}

export class LoginDto {
    @IsNotEmpty()
    @IsEmail()
    email: string;

    @IsNotEmpty()
    @IsString()
    password: string;
}
