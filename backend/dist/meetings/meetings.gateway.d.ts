import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { MeetingsService } from './meetings.service';
import { AiService } from '../ai/ai.service';
export declare class MeetingsGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private readonly meetingsService;
    private readonly aiService;
    server: Server;
    private readonly logger;
    private meetingAnalysisCounters;
    private waitingParticipants;
    private activeParticipants;
    constructor(meetingsService: MeetingsService, aiService: AiService);
    handleConnection(client: Socket): void;
    handleDisconnect(client: Socket): void;
    handleJoinWaitingRoom(client: Socket, data: {
        meetingId: string;
        name: string;
        email: string;
    }): {
        status: string;
        waitingCount: number;
    };
    handleApproveParticipant(client: Socket, data: {
        meetingId: string;
        guestSocketId: string;
    }): {
        status: string;
    };
    handleRejectParticipant(client: Socket, data: {
        meetingId: string;
        guestSocketId: string;
    }): {
        status: string;
    };
    handleGetWaitingList(client: Socket, data: {
        meetingId: string;
    }): {
        status: string;
        waitingList: {
            socketId: string;
            name: string;
            email: string;
        }[];
    };
    handleGetParticipants(client: Socket, data: {
        meetingId: string;
    }): {
        status: string;
        participants: {
            socketId: string;
            name: string;
        }[];
    };
    handleJoinMeeting(client: Socket, data: {
        meetingId: string;
        name?: string;
    }): {
        status: string;
        room: string;
    };
    handleLeaveMeeting(client: Socket, data: {
        meetingId: string;
    }): {
        status: string;
        room: string;
    };
    handleSendTranscript(client: Socket, data: {
        meetingId: string;
        speakerName: string;
        text: string;
        languageCode?: string;
    }): Promise<void>;
    handleAskAiQuestion(client: Socket, data: {
        meetingId: string;
        question: string;
        askerName: string;
        languageCode?: string;
    }): Promise<{
        status: string;
        answer: string;
        diagram: any;
        message?: undefined;
    } | {
        status: string;
        message: any;
        answer?: undefined;
        diagram?: undefined;
    }>;
    handleManualAnalysis(client: Socket, data: {
        meetingId: string;
    }): Promise<{
        status: string;
        message?: undefined;
    } | {
        status: string;
        message: any;
    }>;
    handleJoinChannel(client: Socket, data: {
        channelId: string;
    }): {
        status: string;
        room: string;
    };
    handleLeaveChannel(client: Socket, data: {
        channelId: string;
    }): {
        status: string;
        room: string;
    };
    handleSendChannelMessage(client: Socket, data: {
        channelId: string;
        senderId: string;
        senderName: string;
        text: string;
    }): Promise<{
        status: string;
    }>;
    handleJoinUserRoom(client: Socket, data: {
        userId: string;
    }): {
        status: string;
        room: string;
    };
    handleSendDirectMessage(client: Socket, data: {
        senderId: string;
        receiverId: string;
        text: string;
    }): Promise<{
        status: string;
    }>;
    handleWebRTCOffer(client: Socket, data: {
        target: string;
        sdp: any;
        meetingId: string;
    }): void;
    handleWebRTCAnswer(client: Socket, data: {
        target: string;
        sdp: any;
    }): void;
    handleWebRTCIceCandidate(client: Socket, data: {
        target: string;
        candidate: any;
        meetingId: string;
    }): void;
    handleUpdateActionItem(client: Socket, data: {
        meetingId: string;
        actionItemId: string;
        assigneeName: string;
    }): Promise<{
        status: string;
        actionItem: {
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
        };
        message?: undefined;
    } | {
        status: string;
        message: any;
        actionItem?: undefined;
    }>;
}
