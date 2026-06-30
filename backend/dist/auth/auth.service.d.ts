import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';
export declare class AuthService {
    private prisma;
    private jwtService;
    constructor(prisma: PrismaService, jwtService: JwtService);
    register(dto: RegisterDto): Promise<{
        token: string;
        user: {
            id: string;
            email: string;
            name: string;
        };
    }>;
    login(dto: LoginDto): Promise<{
        token: string;
        user: {
            id: string;
            email: string;
            name: string;
        };
    }>;
    validateUser(userId: string): Promise<{
        email: string;
        name: string;
        id: string;
    } | null>;
}
