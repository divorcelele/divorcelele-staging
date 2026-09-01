import { betterAuth } from "better-auth";
import { emailOTP } from "better-auth/plugins";

export const auth = betterAuth({
  database: {
    provider: "sqlite",
    url: ":memory:"
  },
  emailAndPassword: {
    enabled: true
  },
  plugins: [
    emailOTP({
      async sendVerificationOTP() {} 
    })
  ]
});