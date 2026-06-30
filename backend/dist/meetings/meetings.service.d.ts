import { PrismaService } from '../prisma.service';
import { AiService } from '../ai/ai.service';
import { IntegrationsService } from '../integrations/integrations.service';
export declare class MeetingsService {
    private prisma;
    private aiService;
    private integrationsService;
    constructor(prisma: PrismaService, aiService: AiService, integrationsService: IntegrationsService);
    createMeeting(hostId: string, title: string, description?: string, startTime?: string | Date, invitedEmails?: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.MeetingStatus;
        code: string | null;
        title: string;
        description: string | null;
        invitedEmails: string | null;
        startTime: Date;
        endTime: Date | null;
        hostId: string;
        channelId: string | null;
    }>;
    private generateUniqueMeetingCode;
    findMeetingByCodeOrId(identifier: string): Promise<any>;
    getMeetings(userId: string): Promise<({
        summary: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            overview: string;
            productivityScore: number;
            keyTakeaways: string;
            keyDecisions: string | null;
            nextSteps: string | null;
            meetingId: string;
        } | null;
        _count: {
            actionItems: number;
            transcripts: number;
            risks: number;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.MeetingStatus;
        code: string | null;
        title: string;
        description: string | null;
        invitedEmails: string | null;
        startTime: Date;
        endTime: Date | null;
        hostId: string;
        channelId: string | null;
    })[]>;
    getMeetingById(meetingId: string): Promise<{
        summary: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            overview: string;
            productivityScore: number;
            keyTakeaways: string;
            keyDecisions: string | null;
            nextSteps: string | null;
            meetingId: string;
        } | null;
        analytics: {
            id: string;
            createdAt: Date;
            duration: number;
            totalWords: number;
            sentimentScore: number;
            engagementScore: number;
            talkTimeDistribution: string;
            speakerSentiment: string;
            meetingId: string;
        } | null;
        actionItems: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.ActionItemStatus;
            text: string;
            meetingId: string;
            assigneeName: string | null;
            dueDate: Date | null;
            externalId: string | null;
            externalUrl: string | null;
            externalPlatform: string | null;
            assigneeId: string | null;
        }[];
        host: {
            email: string;
            name: string;
            id: string;
        };
        transcripts: {
            id: string;
            createdAt: Date;
            timestamp: Date;
            speakerName: string;
            speakerId: string | null;
            text: string;
            translation: string | null;
            meetingId: string;
        }[];
        risks: {
            id: string;
            createdAt: Date;
            status: import(".prisma/client").$Enums.RiskStatus;
            text: string;
            meetingId: string;
            severity: import(".prisma/client").$Enums.RiskSeverity;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.MeetingStatus;
        code: string | null;
        title: string;
        description: string | null;
        invitedEmails: string | null;
        startTime: Date;
        endTime: Date | null;
        hostId: string;
        channelId: string | null;
    }>;
    startMeeting(meetingId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.MeetingStatus;
        code: string | null;
        title: string;
        description: string | null;
        invitedEmails: string | null;
        startTime: Date;
        endTime: Date | null;
        hostId: string;
        channelId: string | null;
    }>;
    addTranscriptSegment(meetingId: string, speakerName: string, text: string, translation?: string): Promise<{
        id: string;
        createdAt: Date;
        timestamp: Date;
        speakerName: string;
        speakerId: string | null;
        text: string;
        translation: string | null;
        meetingId: string;
    }>;
    endMeeting(meetingId: string): Promise<{
        summary: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            overview: string;
            productivityScore: number;
            keyTakeaways: string;
            keyDecisions: string | null;
            nextSteps: string | null;
            meetingId: string;
        } | null;
        analytics: {
            id: string;
            createdAt: Date;
            duration: number;
            totalWords: number;
            sentimentScore: number;
            engagementScore: number;
            talkTimeDistribution: string;
            speakerSentiment: string;
            meetingId: string;
        } | null;
        actionItems: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.ActionItemStatus;
            text: string;
            meetingId: string;
            assigneeName: string | null;
            dueDate: Date | null;
            externalId: string | null;
            externalUrl: string | null;
            externalPlatform: string | null;
            assigneeId: string | null;
        }[];
        risks: {
            id: string;
            createdAt: Date;
            status: import(".prisma/client").$Enums.RiskStatus;
            text: string;
            meetingId: string;
            severity: import(".prisma/client").$Enums.RiskSeverity;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.MeetingStatus;
        code: string | null;
        title: string;
        description: string | null;
        invitedEmails: string | null;
        startTime: Date;
        endTime: Date | null;
        hostId: string;
        channelId: string | null;
    }>;
    analyzeRealTime(meetingId: string): Promise<{
        actionItems: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.ActionItemStatus;
            text: string;
            meetingId: string;
            assigneeName: string | null;
            dueDate: Date | null;
            externalId: string | null;
            externalUrl: string | null;
            externalPlatform: string | null;
            assigneeId: string | null;
        }[];
        risks: {
            id: string;
            createdAt: Date;
            status: import(".prisma/client").$Enums.RiskStatus;
            text: string;
            meetingId: string;
            severity: import(".prisma/client").$Enums.RiskSeverity;
        }[];
    } | null>;
    createChannelMessage(channelId: string, senderId: string, senderName: string, text: string): Promise<{
        id: string;
        createdAt: Date;
        channelId: string;
        text: string;
        senderName: string;
        senderId: string;
    }>;
    createDirectMessage(senderId: string, receiverId: string, text: string): Promise<{
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
    }>;
    syncActionItemToPlatform(actionItemId: string, platform: 'clickup'): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.ActionItemStatus;
        text: string;
        meetingId: string;
        assigneeName: string | null;
        dueDate: Date | null;
        externalId: string | null;
        externalUrl: string | null;
        externalPlatform: string | null;
        assigneeId: string | null;
    }>;
    getMeetingAnalytics(meetingId: string): Promise<{
        meetingId: string;
        duration: number;
        totalWords: number;
        talkTimeDistribution: {};
        sentimentScore: number;
        engagementScore: number;
        speakerSentiment: {};
        createdAt?: undefined;
    } | {
        meetingId: string;
        duration: number;
        totalWords: number;
        talkTimeDistribution: any;
        sentimentScore: number;
        engagementScore: number;
        speakerSentiment: any;
        createdAt: Date;
    }>;
    getTeamAnalytics(teamId: string): Promise<{
        teamId: string;
        averageDuration: number;
        averageSentiment: number;
        averageEngagement: number;
        totalMeetingsAnalyzed: number;
    }>;
    generateSpeech(text: string, languageCode?: string): Promise<string>;
    translateText(text: string, sourceLang: string, targetLang?: string): Promise<string>;
    answerMeetingQuestion(meetingId: string, question: string, askerName: string, languageCode?: string): Promise<{
        segment: {
            id: string;
            createdAt: Date;
            timestamp: Date;
            speakerName: string;
            speakerId: string | null;
            text: string;
            translation: string | null;
            meetingId: string;
        };
        diagram: any;
    }>;
    askDigitalTwin(meetingId: string, question: string): Promise<{
        answer: string;
        diagram?: any;
    }>;
    updateActionItem(id: string, data: {
        assigneeName?: string;
        status?: any;
    }): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.ActionItemStatus;
        text: string;
        meetingId: string;
        assigneeName: string | null;
        dueDate: Date | null;
        externalId: string | null;
        externalUrl: string | null;
        externalPlatform: string | null;
        assigneeId: string | null;
    }>;
}
