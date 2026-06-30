import { MeetingsService } from './meetings.service';
import { Response } from 'express';
import { MeetingsGateway } from './meetings.gateway';
export declare class MeetingsController {
    private readonly meetingsService;
    private readonly meetingsGateway;
    constructor(meetingsService: MeetingsService, meetingsGateway: MeetingsGateway);
    createMeeting(req: any, body: {
        title: string;
        description?: string;
        startTime?: string;
        invitedEmails?: string;
    }): Promise<{
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
    getMeetingByCode(code: string): Promise<any>;
    getMeetings(req: any): Promise<({
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
    getMeeting(id: string): Promise<{
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
    startMeeting(id: string): Promise<{
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
    endMeeting(id: string): Promise<{
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
    analyzeRealTime(id: string): Promise<{
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
    syncActionItem(actionItemId: string, platform: 'clickup'): Promise<{
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
    updateActionItem(id: string, body: {
        assigneeName?: string;
        status?: string;
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
    emailMeetingSummary(meetingId: string, req: any): Promise<{
        status: string;
        message: string;
    }>;
    askTwin(id: string, body: {
        question: string;
    }): Promise<{
        answer: string;
        diagram: any;
    }>;
    getFollowupCalendarLink(meetingId: string): Promise<{
        url: string;
    }>;
    exportMeetingPdfView(meetingId: string, res: Response): Promise<Response<any, Record<string, any>>>;
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
    private buildPdfHtml;
    speak(body: {
        text: string;
        languageCode?: string;
    }): Promise<{
        audioContent: string;
    }>;
    translate(body: {
        text: string;
        sourceLang: string;
        targetLang?: string;
    }): Promise<{
        translatedText: string;
    }>;
}
