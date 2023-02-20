import axios from "axios";
import { AuthService } from "modules/auth/auth.service";
import { CreateUserDto } from "modules/users/dto/create-user.dto";
import { UsersService } from "modules/users/users.service";
const baseUrl = "https://vjoy-core-dev-qconrzsxya-de.a.run.app/api/v1/dev";
export const adminAccount = {
  email: "admin@vus-etsc.edu.vn",
  password: "admin",
};
type SigninResponse = Awaited<ReturnType<(typeof AuthService.prototype)["loginByEmail"]>>;
type SigninRequest = {
  email: string;
  password: string;
};

const instance = axios.create();
instance.interceptors.request.use((request) => {
  request.baseURL = baseUrl;
  return request;
});
instance.interceptors.response.use(
  (response) => {
    const { data } = response;
    return data;
  },
  (error) => {
    throw error;
  }
);
/**
 * Signs in a user using the provided email and password.
 *
 * @param signin An optional object containing the email and password to use for signing in.
 *               If not provided, the default admin account will be used.
 * @returns A promise that resolves with a `SigninResponse` object upon successful sign-in.
 * @throws If sign-in fails, an error will be thrown.
 */
export const signin = async (signin: SigninRequest = adminAccount) => {
  const { data } = await instance.post("core/auth/login", {
    type: "email",
    email: signin.email,
    password: signin.password,
  });
  return data as SigninResponse;
};

type CreateUserRequest = CreateUserDto;
type CreateUserResponse = Awaited<ReturnType<typeof UsersService.prototype.create>>;
/**
 * Create a user.
 *
 * @param newUser The new user to create.
 * @param accessToken The access token to use.
 * @returns The created user.
 */
export const createUser = async (newUser: CreateUserRequest, accessToken: string) => {
  const { data } = await instance.post("core/users", newUser, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return data as CreateUserResponse;
};

/**
 * Delete a user.
 *
 * @param {number} id - The id of the user to delete.
 * @param {string} accessToken - The access token of the user.
 * @returns {Promise<object>} - The data of the deleted user.
 */
export const deleteUser = async (id: number, accessToken: string): Promise<object> => {
  const { data } = await instance.delete(`core/users/${id}`, { headers: { Authorization: `Bearer ${accessToken}` } });
  return data;
};
