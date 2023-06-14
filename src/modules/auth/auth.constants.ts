export const OTP_TOKEN_EXPIRES = "2m";
export const PASSWORD_REGEX = new RegExp(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@#$%^&+=*!(){}[\]:;<>,.?\\\/\-_|]{8,}$/);
export const MAX_RESEND_OTP_MINS = 1;
export const GOOGLE_CLIENT_ID = {
  CORE_SERVICE: "101647183745-u9cc4tmi45plv1f3d9sr9fgkebmlkurd.apps.googleusercontent.com",
  WEB_LCMS: "101647183745-a9nnfn1vk4blpn7hhpqrc6aqjm7ebpu2.apps.googleusercontent.com",
};
export const EMAIL_RESET_PASSWORD_EXPIRES = "24h";
export const EMAIL_VERIFY_EXPIRES = "24h";
export const MAX_RESEND_EMAIL_HOURS = 24;
export const ERROR_CODE = {
  USER_DELETED: "UserDeleted",
  REQUEST_TOO_FAST: "RequestTooFast",
  USER_NOT_EXISTS: "UserNotExists",
  USER_DEACTIVATED: "UserDeactivated",
  TOKEN_EXPIRED: "TokenExpired",
  INVALID_CREDENTIAL: "InvalidCredential",
};
