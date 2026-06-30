import { TeamsService } from './teams.service';
export declare class TeamsController {
    private readonly teamsService;
    constructor(teamsService: TeamsService);
    getTeams(req: any): Promise<({
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
    createTeam(req: any, body: {
        name: string;
    }): Promise<{
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
    joinTeam(req: any, id: string): Promise<{
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
    createChannel(id: string, body: {
        name: string;
        description?: string;
    }): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        description: string | null;
        teamId: string;
    }>;
    getChannels(id: string): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        description: string | null;
        teamId: string;
    }[]>;
    getChannelMessages(id: string): Promise<{
        id: string;
        createdAt: Date;
        channelId: string;
        text: string;
        senderName: string;
        senderId: string;
    }[]>;
    getAllUsers(req: any): Promise<{
        email: string;
        name: string;
        id: string;
    }[]>;
    getDirectMessages(req: any, otherUserId: string): Promise<({
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
    getChannelAiSummary(id: string): Promise<{
        summary: string;
        keyPoints: string[];
    }>;
}
