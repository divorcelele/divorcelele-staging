import { betterAuth } from "better-auth";
import { withCloudflare } from "better-auth-cloudflare";
import { emailOTP } from "better-auth/plugins";
import { passkey } from "@better-auth/passkey";
import { AwsClient } from "aws4fetch";

export function getAuth(env: any) {
  return betterAuth(
    withCloudflare(
      { d1Native: env.DB }, 
      {
        secret: env.BETTER_AUTH_SECRET,
        plugins: [
          passkey(), 
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
                  FromEmailAddress: `Divorcelele <${env.EMAIL_FROM}>`,
                  Destination: { ToAddresses: [email] },
                  Content: {
                    Simple: {
                      Subject: { Data: `Your Login Code: ${otp}`, Charset: "UTF-8" },
                      Body: { Text: { Data: `Your secure login code is: ${otp}. It will expire shortly.`, Charset: "UTF-8" } }
                    }
                  }
                })
              });

              if (!res.ok) {
                const errorText = await res.text();
                console.error("SES Email Delivery Failed:", errorText);
                throw new Error("Email sending failed");
              }
            }
          })
        ]
      }
    )
  );
}