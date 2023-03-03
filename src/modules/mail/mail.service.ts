import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as SendGrid from "@sendgrid/mail";

@Injectable()
export class MailService {
  private from: string;

  constructor(configService: ConfigService) {
    SendGrid.setApiKey(configService.get("EMAIL_KEY") || "");
    this.from = configService.get("EMAIL_ADDRESS") || "";
  }

  async send(mailDto: any) {
    const mail = {
      from: {
        email: this.from,
        name: "V-JOY",
      },
      ...mailDto,
    };
    const transport = await SendGrid.send(mail);
    return transport;
  }
}
