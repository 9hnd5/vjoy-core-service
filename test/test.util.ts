import axios from "axios";
import { AuthService } from "modules/auth/auth.service";
import { CreateUserDto } from "modules/users/dto/create-user.dto";
import { UsersService } from "modules/users/users.service";
import * as crypto from "crypto";
import { ROLE_CODE } from "@common";

const baseUrl = `https://vjoy-core-dev-qconrzsxya-de.a.run.app/api/v1/${process.env.ENV}`;
export const API_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1lIjoiQVBJIGtleSBmb3IgdmpveS13ZWIiLCJ0eXBlIjoidmpveS13ZWIiLCJlbnYiOiJkZXYiLCJpYXQiOjE2NzcxMjYxMzN9.NaWXerIGMk24ITeLjXFr0YaaoRZwcrhk2y4I4p8JJE8";
export const API_CORE_PREFIX = `/api/v1/${process.env.ENV}/core`;

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
  request.headers.set("api-token", API_TOKEN);
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
type CreateUserResponse = Awaited<ReturnType<typeof UsersService.prototype.createByAdmin>>;
/**
 * Create a user.
 *
 * @param newUser The new user to create.
 * @param accessToken The access token to use.
 * @returns The created user.
 */
export const createUser = async (param: { newUser?: CreateUserRequest; accessToken: string }) => {
  const {
    newUser = {
      firstname: "APITEST-firstname",
      lastname: "APITEST-lastname",
      email: `APITEST-${crypto.randomUUID()}@gmail.com`,
      roleCode: ROLE_CODE.PARENT,
    },
    accessToken,
  } = param;
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
export const deleteUser = async (param: { id: number; accessToken: string }): Promise<object> => {
  const { id, accessToken } = param;
  const { data } = await instance.delete(`core/users/${id}?hardDelete=true`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return data;
};

export const expectError = (body: any) => {
  const { code, message } = body.error;
  expect(code).not.toBeNull();
  expect(message).not.toBeNull();
};

export const expectErrors = (body: any) => {
  const errors = body.error;
  expect(errors.length).toBeGreaterThan(0);
  const { code, message } = errors[0];
  expect(code).not.toBeNull();
  expect(message).not.toBeNull();
};
