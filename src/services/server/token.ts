import { Token, TokenType } from "@prisma/client";
import { gql } from "graphql-request";
import moment from "moment";

import { STRAPI_TOKEN_KEY } from "@/configs/environment";
import { ACCOUNT_ACTIVATION_EXPIRATION_SECONDS, FORGOT_PASSWORD_EXPIRATION_SECONDS } from "@/constants/token";
import { SignUpForm } from "@/forms/auth";
import { fetcher } from "@/utils/graphql";
import { encodeJWT } from "@/utils/security";
import { randomString } from "@/utils/string";

/**
 * Create a token for forgot password verification.
 *
 * @param email - The user's email for which the token is created.
 * @returns A promise that resolves with the created token.
 */
export const createForgotPasswordToken = async (email: string): Promise<Token> => {
  const query = gql`
    mutation (
      $type: ENUM_TOKEN_TYPE!
      $value: String!
      $data: String!
      $publishedAt: DateTime
      $expirationTime: DateTime
    ) {
      createToken(
        data: {
          type: $type
          value: $value
          data: $data
          publishedAt: $publishedAt
          expirationTime: $expirationTime
          isActive: true
        }
      ) {
        data {
          id
          attributes {
            value
          }
        }
      }
    }
  `;

  const verificationCode = randomString(6, true);

  const expirationTime = moment().add(FORGOT_PASSWORD_EXPIRATION_SECONDS, "seconds").toDate();
  const { data } = await fetcher<Token>(STRAPI_TOKEN_KEY, query, {
    type: TokenType.FORGOT_PASSWORD,
    value: verificationCode,
    data: email,
    expirationTime,
    publishedAt: new Date(),
  });
  return data.createToken;
};

/**
 * Creates a verification token for the sign up feature.
 *
 * @param userId - The user's ID for whom the verification token is being created.
 * @param data - The register information
 * @returns A promise that resolves with the created verification token.
 */
export const createAccountActivationToken = async (userId: number, data: Partial<SignUpForm>): Promise<Token> => {
  const query = gql`
    mutation (
      $type: ENUM_TOKEN_TYPE!
      $value: String!
      $data: String!
      $publishedAt: DateTime
      $expirationTime: DateTime
    ) {
      createToken(
        data: {
          type: $type
          value: $value
          data: $data
          publishedAt: $publishedAt
          expirationTime: $expirationTime
          isActive: true
        }
      ) {
        data {
          id
          attributes {
            value
          }
        }
      }
    }
  `;

  const { email, phoneNumber, firstName, lastName } = data;
  const token = encodeJWT({
    id: userId,
    email,
  });
  const expirationTime = moment().add(ACCOUNT_ACTIVATION_EXPIRATION_SECONDS, "seconds").toDate();
  const { data: createTokenData } = await fetcher<Token>(STRAPI_TOKEN_KEY, query, {
    type: TokenType.ACCOUNT_ACTIVATION,
    value: token,
    data: JSON.stringify({
      email,
      phoneNumber,
      firstName,
      lastName,
    }),
    expirationTime,
    publishedAt: new Date(),
  });
  return createTokenData.createToken;
};

/**
 * Check if a forgot password token is valid for a given verification code and email.
 *
 * @param code - The verification code.
 * @param email - The user's email.
 * @returns A promise that resolves with a boolean indicating if the token is valid.
 */
export const getForgotPasswordToken = async (code: string, email: string): Promise<Token | undefined> => {
  const query = gql`
    query ($type: String!, $code: String!, $email: String!) {
      tokens(
        filters: {
          type: { eq: $type }
          value: { eq: $code }
          data: { eq: $email }
          isActive: { eq: true }
          publishedAt: { ne: null }
        }
      ) {
        data {
          id
          attributes {
            expirationTime
          }
        }
      }
    }
  `;

  const { data } = await fetcher<Token[]>(STRAPI_TOKEN_KEY, query, {
    type: TokenType.FORGOT_PASSWORD,
    code,
    email,
  });

  return data.tokens[0];
};

/**
 * Deactivates a token by setting its `isActive` attribute to false.
 *
 * @param {number} id - The ID of the token to deactivate.
 * @param {string} [jwt] - Optional JWT token for authentication.
 * @returns {Promise<number>} The number of tokens updated (usually 1 if successful).
 */
export const deactivateToken = async (id: number, jwt?: string): Promise<number> => {
  const query = gql`
    mutation ($id: ID!) {
      updateToken(id: $id, data: { isActive: false }) {
        data {
          id
        }
      }
    }
  `;

  const { data } = await fetcher<Token[]>(jwt ?? STRAPI_TOKEN_KEY, query, { id });
  return data.updateToken.length;
};

/**
 * Check if a forgot sign up token is valid for a given token.
 *
 * @param token - The token.
 * @returns A promise that resolves with a boolean indicating if the token is valid.
 */
export const getAccountActivationToken = async (token: string): Promise<Token | undefined> => {
  const query = gql`
    query ($type: String!, $token: String!) {
      tokens(
        filters: { type: { eq: $type }, value: { eq: $token }, isActive: { eq: true }, publishedAt: { ne: null } }
      ) {
        data {
          id
          attributes {
            data
            expirationTime
          }
        }
      }
    }
  `;

  const { data } = await fetcher<Token[]>(STRAPI_TOKEN_KEY, query, {
    type: TokenType.ACCOUNT_ACTIVATION,
    token,
  });

  return data.tokens[0];
};
