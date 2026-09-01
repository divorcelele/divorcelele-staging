import { betterAuth } from "better-auth";
import { passkey } from "@better-auth/passkey";
import { emailOTP } from "better-auth/plugins";

export const auth = betterAuth({
  database: {
    provider: "sqlite",
    url: ":memory:" // Dummy database string just for schema generation
  },
  plugins: [
    passkey(),
    emailOTP({
      async sendVerificationOTP() {} // Empty dummy function
    })
  ]
});