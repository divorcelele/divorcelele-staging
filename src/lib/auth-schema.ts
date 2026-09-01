import { betterAuth } from "better-auth";
import { passkey } from "@better-auth/passkey";
import { emailOTP } from "better-auth/plugins";

export const auth = betterAuth({
  database: {
    provider: "sqlite",
    url: ":memory:" // Dummy database string just for schema generation
  },
  
  // Must mirror your server config for accurate database schema generation
  emailAndPassword: {
    enabled: true
  },
  
  plugins: [
    passkey(),
    emailOTP({
      async sendVerificationOTP() {} // Empty dummy function
    })
  ]
});