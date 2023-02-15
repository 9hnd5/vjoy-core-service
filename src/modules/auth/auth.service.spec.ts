import { ConfigService } from "@nestjs/config";
import { JwtModule, JwtService } from "@nestjs/jwt";
import { getModelToken } from "@nestjs/sequelize";
import { Test, TestingModuleBuilder } from "@nestjs/testing";
import { Role } from "entities/role.entity";
import { User } from "entities/user.entity";
import { SMSModule } from "modules/sms/sms.module";
import { SMSService } from "modules/sms/sms.service";
import { USER_STATUS } from "modules/users/users.constants";
import { AUTH_ERROR_MESSAGE } from "./auth.constants";
import { AuthService } from "./auth.service";

describe("AuthService", () => {
  let authService: AuthService;
  let jwtService: JwtService;
  let smsService: SMSService;
  let moduleBuilder: TestingModuleBuilder;
  const loginByEmail = {
    type: "email",
    email: "huy.nguyendinh@vus-etsc.edu.vn",
    password: "123456",
  };
  const loginByPhone = {
    type: "phone",
    phone: "0931335283",
  };
  const mockRole = {
    id: 1,
  };
  const mockUser = {
    id: 1,
    firstname: "Nguyen",
    lastname: "Huy",
    phone: "0931335283",
    email: "huy.nguyendinh@vus-etsc.edu.vn",
    roleId: 1,
    role: {
      permissions: [{ resource: "*", action: "*" }],
    },
    save: () => {},
  };
  const mockUserToken = {
    id: mockUser.id,
    firstname: mockUser.firstname,
    lastname: mockUser.lastname,
    email: mockUser.email,
    roleId: mockUser.roleId,
    permissions: mockUser.role.permissions,
    accessToken: "accessToken",
  };

  beforeEach(async () => {
    moduleBuilder = Test.createTestingModule({
      imports: [SMSModule, JwtModule],
      providers: [
        AuthService,
        {
          provide: ConfigService,
          useValue: {
            get: (param: string) => param,
          },
        },
        {
          provide: getModelToken(User),
          useValue: {
            findOne: jest.fn(async () => {
              const password = await authService.createPassword("123456");
              return { ...mockUser, password };
            }),
          },
        },
        {
          provide: getModelToken(Role),
          useValue: {
            findOne: jest.fn(() => mockRole),
          },
        },
      ],
    });

    const module = await moduleBuilder.compile();
    authService = module.get(AuthService);
    smsService = module.get(SMSService);
    jwtService = module.get(JwtService);
  });

  it("should login success by email", async () => {
    jest.spyOn(jwtService, "signAsync").mockResolvedValue("accessToken");
    const result = await authService.login({ ...loginByEmail } as any);
    expect(result).toEqual(mockUserToken);
  });

  it("should login fail by email because wrong password", async () => {
    const login = () => authService.login({ ...loginByEmail, password: "1234567" } as any);
    await expect(login).rejects.toThrow(AUTH_ERROR_MESSAGE.INVALID_CREDENTIAL);
  });

  it("should login fail by email because wrong email address, account deleted or deactivated", async () => {
    moduleBuilder.overrideProvider(getModelToken(User)).useValue({
      findOne: jest.fn(async () => {
        return null;
      }),
    });
    const module = await moduleBuilder.compile();
    const authService = module.get<AuthService>(AuthService);
    const login = () => authService.login({ ...loginByEmail } as any);
    await expect(login).rejects.toThrow(AUTH_ERROR_MESSAGE.INVALID_CREDENTIAL);
  });

  it("should login success by phone, return create otptoken with existing user", async () => {
    jest.spyOn(smsService, "send").mockResolvedValue(true);
    const result = await authService.login({ ...loginByPhone } as any);
    expect(result).not.toBeNull();
  });

  it("should login success by phone, return create otptoken with non-existing user", async () => {
    const module = await moduleBuilder
      .overrideProvider(getModelToken(User))
      .useValue({ findOne: () => null, create: () => ({ phone: loginByPhone.phone }) })
      .compile();
    const authService = module.get(AuthService);
    const smsService = module.get(SMSService);
    jest.spyOn(smsService, "send").mockResolvedValue(true);
    const result = await authService.login({ ...loginByPhone } as any);
    expect(result).not.toBeNull();
  });

  it("should login fail by phone because phone was already exist and deleted", async () => {
    moduleBuilder.overrideProvider(getModelToken(User)).useValue({
      findOne: jest.fn(async () => {
        const password = await authService.createPassword("123456");
        return { ...mockUser, deletedAt: "2022-02-02", password };
      }),
    });
    const module = await moduleBuilder.compile();
    const authService = module.get<AuthService>(AuthService);
    const login = () => authService.login({ ...loginByPhone } as any);
    await expect(login).rejects.toThrow(AUTH_ERROR_MESSAGE.USER_DELETED);
  });

  it("should login fail by phone because phone was already exist and deactivated", async () => {
    moduleBuilder.overrideProvider(getModelToken(User)).useValue({
      findOne: jest.fn(async () => {
        const password = await authService.createPassword("123456");
        return { ...mockUser, status: USER_STATUS.DEACTIVED, password };
      }),
    });
    const module = await moduleBuilder.compile();
    const authService = module.get<AuthService>(AuthService);
    const login = () => authService.login({ ...loginByPhone } as any);
    await expect(login).rejects.toThrow(AUTH_ERROR_MESSAGE.USER_DEACTIVATED);
  });

  it("should verify otp success", async () => {
    jest.spyOn(smsService, "send").mockResolvedValue(true);
    const otpToken = (await authService.login({ ...loginByPhone } as any)) as any;
    jest.spyOn(authService, "verifyOTPToken").mockResolvedValue("");
    jest.spyOn(jwtService, "signAsync").mockResolvedValue("accessToken");
    const result = await authService.verifyOTP(otpToken, "1234");
    expect(result).toEqual(mockUserToken);
  });

  it("should verify otp fail wrong otpCode", async () => {
    jest.spyOn(smsService, "send").mockResolvedValue(true);
    const otpToken = (await authService.login({ ...loginByPhone } as any)) as any;
    const login = () => authService.verifyOTP(otpToken, "wrong otpCode");
    await expect(login).rejects.toThrow(AUTH_ERROR_MESSAGE.INVALID_CREDENTIAL);
  });

  it("should verify otp fail wrong otpToken", async () => {
    const login = () => authService.verifyOTP("wrong otpToken", "1234");
    await expect(login).rejects.toThrow(AUTH_ERROR_MESSAGE.INVALID_CREDENTIAL);
  });
});
