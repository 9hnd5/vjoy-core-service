export class LoginDTO {
  type: "email" | "phone";
  phone?: string;
  email?: string;
  password?: string;
}
