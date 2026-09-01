import { betterAuth } from "better-auth";
import { emailOTP } from "better-auth/plugins";
import { AwsClient } from "aws4fetch";

export function getAuth(env: any) {
  return betterAuth({
    database: env.DB, 
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BASE_URL || "https://divorcelele-staging.pages.dev", 
    emailAndPassword: {
      enabled: true
    },
    plugins: [
      emailOTP({
        async sendVerificationOTP({ email, otp }) {
          const aws = new AwsClient({
            accessKeyId: env.AWS_ACCESS_KEY_ID,
            secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
            region: env.AWS_REGION
          });

          const res = await aws.fetch(`https://email.${env.AWS_REGION}.amazonaws.com/v2/email/outbound-emails`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              FromEmailAddress: `Verify OTP <${env.EMAIL_FROM}>`,
              Destination: { ToAddresses: [email] },
              Content: {
                // Changed text to sound more premium
                Simple: {
                  Subject: { Data: `Your Access Code: ${otp}`, Charset: "UTF-8" },
                  Body: { Text: { Data: `Your secure access code is: ${otp}. It will expire shortly.`, Charset: "UTF-8" } }
                }
              }
            })
          });

          if (!res.ok) {
            console.error("SES Email Delivery Failed:", await res.text());
            throw new Error("Email sending failed");
          }
        }
      })
    ]
  });
}