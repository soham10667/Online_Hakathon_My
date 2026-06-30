import { PrismaService } from '../prisma.service';
import { AiService } from '../ai/ai.service';
export declare class TeamsService {
    private prisma;
    private aiService;
    constructor(prisma: PrismaService, aiService: AiService);
    getTeams(userId: string): Promise<({
        members: {
            email: string;
            name: string;
            id: string;
        }[];
        channels: {
            name: string;
            id: string;
            createdAt: Date;
            description: string | null;
            teamId: string;
        }[];
    } & {
        name: string;
        id: string;
        createdAt: Date;
    })[]>;
    createTeam(userId: string, name: string): Promise<{
        members: {
            email: string;
            name: string;
            id: string;
        }[];
        channels: {
            name: string;
            id: string;
            createdAt: Date;
            description: string | null;
            teamId: string;
        }[];
    } & {
        name: string;
        id: string;
        createdAt: Date;
    }>;
    joinTeam(userId: string, teamId: string): Promise<{
        members: {
            email: string;
            name: string;
            id: string;
        }[];
        channels: {
            name: string;
            id: string;
            createdAt: Date;
            description: string | null;
            teamId: string;
        }[];
    } & {
        name: string;
        id: string;
        createdAt: Date;
    }>;
    createChannel(teamId: string, name: string, description?: string): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        description: string | null;
        teamId: string;
    }>;
    getChannels(teamId: string): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        description: string | null;
        teamId: string;
    }[]>;
    getChannelMessages(channelId: string): Promise<{
        id: string;
        createdAt: Date;
        channelId: string;
        text: string;
        senderName: string;
        senderId: string;
    }[]>;
    getAllUsers(userId: string): Promise<{
        email: string;
        name: string;
        id: string;
    }[]>;
    getDirectMessages(myId: string, userId: string): Promise<({
        sender: {
            email: string;
            name: string;
            id: string;
        };
        receiver: {
            email: string;
            name: string;
            id: string;
        };
    } & {
        id: string;
        createdAt: Date;
        text: string;
        senderId: string;
        receiverId: string;
    })[]>;
    getChannelAiSummary(channelId: string): Promise<{
        summary: string;
        keyPoints: string[];
    }>;
}
