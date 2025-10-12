export interface LoginRequestDto {
  email: string;
  password: string;
}

export interface LoginResponseDto {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  user: AuthUserDto;
}

export interface AuthUserDto {
  id: string;
  email: string;
  name: string;
  roles: string[];
  permissions: string[];
}

export interface RefreshRequestDto {
  refresh_token: string;
}

export interface RefreshResponseDto {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
}
