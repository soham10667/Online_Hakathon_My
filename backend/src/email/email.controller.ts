import { Controller, Post, Body, Param, UseGuards, Req, BadRequestException } from '@nestjs/common';
import { EmailService } from './email.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MeetingsService } from '../meetings/meetings.service';
import { IsArray, IsString, IsOptional, IsEmail } from 'class-validator';

class SendInviteDto {
  @IsArray()
  @IsString({ each: true })
  emails: string[];

  @IsString()
  meetingId: string;

  @IsOptional()
  @IsString()
  appBaseUrl?: string;
}

class SendSingleInviteDto {
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  appBaseUrl?: string;
}
@Controller('email')
@UseGuards(JwtAuthGuard)
export class EmailController {
  constructor(
    private readonly emailService: EmailService,
    private readonly meetingsService: MeetingsService,
  ) {}

  /**
   * POST /email/invite
   * Sends meeting invite emails to one or more recipients.
   * Body: { meetingId, emails: string[], appBaseUrl? }
   */
  @Post('invite')
  async sendInvites(@Body() body: SendInviteDto, @Req() req: any) {
    const { emails, meetingId, appBaseUrl } = body;

    if (!emails || emails.length === 0) {
      throw new BadRequestException('At least one email address is required');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = emails.filter((e) => !emailRegex.test(e));
    if (invalidEmails.length > 0) {
      throw new BadRequestException(`Invalid email address(es): ${invalidEmails.join(', ')}`);
    }

    // Fetch meeting details
    const meeting = await this.meetingsService.getMeetingById(meetingId);

    const hostName = req.user?.name || req.user?.email || 'Meeting Host';
    const baseUrl = appBaseUrl || process.env.APP_BASE_URL || 'http://localhost:5173';
    const joinLink = `${baseUrl}/join?code=${meeting.code}`;

    const result = await this.emailService.sendBulkInvites(emails, {
      meetingId: meeting.id,
      meetingTitle: meeting.title,
      meetingCode: meeting.code ?? '',
      hostName,
      scheduledAt: meeting.startTime ?? undefined,
      joinLink,
    });

    return {
      message: `Invites sent: ${result.sent}/${result.total}`,
      ...result,
    };
  }

  /**
   * POST /email/invite/:meetingId/single
   * Sends a single invite — for quick share from meeting view.
   */
  @Post('invite/:meetingId/single')
  async sendSingleInvite(
    @Param('meetingId') meetingId: string,
    @Body() body: SendSingleInviteDto,
    @Req() req: any,
  ) {
    const { email, appBaseUrl } = body;

    if (!email) throw new BadRequestException('Email is required');

    const meeting = await this.meetingsService.getMeetingById(meetingId);
    const hostName = req.user?.name || req.user?.email || 'Meeting Host';
    const baseUrl = appBaseUrl || process.env.APP_BASE_URL || 'http://localhost:5173';
    const joinLink = `${baseUrl}/join?code=${meeting.code}`;

    const result = await this.emailService.sendMeetingInvite({
      recipientEmail: email,
      meetingId: meeting.id,
      meetingTitle: meeting.title,
      meetingCode: meeting.code ?? '',
      hostName,
      scheduledAt: meeting.startTime ?? undefined,
      joinLink,
    });

    if (!result.success) {
      throw new BadRequestException(`Failed to send invite: ${result.error}`);
    }

    return { message: `Invite sent to ${email}`, messageId: result.messageId };
  }
}
