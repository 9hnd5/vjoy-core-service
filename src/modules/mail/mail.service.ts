import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as SendGrid from "@sendgrid/mail";

@Injectable()
export class MailService {
  private sender: { email: string; name?: string };

  constructor(configService: ConfigService) {
    SendGrid.setApiKey(configService.get("SENDGRID_API_KEY")!);
    this.sender = {
      email: configService.get("SENDGRID_SENDER_EMAIL")!,
      name: configService.get("SENDGRID_SENDER_NAME") || "",
    };
  }

  send(mailData: { to: string; subject: string; text: string }) {
    const mail = {
      from: this.sender,
      ...mailData,
    };
    SendGrid.send(mail);
  }

  sendHtml(mailData: { to: string; subject: string; html: string }) {
    const mail = {
      from: this.sender,
      ...mailData,
    };
    SendGrid.send(mail);
  }
}
