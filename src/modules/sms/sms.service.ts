import { HttpService } from "@nestjs/axios";
import { HttpException, Injectable } from "@nestjs/common";
import { catchError, firstValueFrom } from 'rxjs';

@Injectable()
export class SmsService {
  constructor(
    private readonly httpService: HttpService
  ) {}
  
  async send(mobile: string, contentMsg: string) {
    const { data } = await firstValueFrom(
      this.httpService.post('https://studentapi.vus.edu.vn/StudentPortalAPI/doAction', {
        method: "SendSms",
        userName: process.env.SMS_USERNAME,
        password: process.env.SMS_PASSWORD,
        accessKey: process.env.SMS_ACCESSKEY,
        ListDepartmentID: process.env.SMS_LISTDEPARTMENTID,
        BranchCode: process.env.SMS_BRANCHCODE,
        Mobile: mobile,
        ContentMSG: contentMsg,
        FullNameStudent: ""
      })
      .pipe(
        catchError(e => {
          throw new HttpException(e.response.data, e.response.status);
        })
      )
    );
    const rs = JSON.parse(data.replace("ResponseCode", '"ResponseCode"'))
    if (rs.ResponseCode !== 1) return false;
    return true;
  }
}
