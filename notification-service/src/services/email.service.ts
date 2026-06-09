import sgMail from "@sendgrid/mail";
import logger from "../config/logger";
import { getOtpTemplate } from "../utils/otpTemplate";
import { getWelcomeEmailTemplate } from "../utils/welcomeTemplate";

interface SendEmailParams {
    email: string;
    otp: number;
    ttlMinutes: number;
}

class EmailServices {
    private from: string;
    private maxRetries: number;

    constructor() {
        this.from = process.env.MAIL_SENDER!;
        this.maxRetries = Number(process.env.MAX_RETRIES || 3);

        sgMail.setApiKey(process.env.SENDGRID_API_KEY!);
    }

    async sendWithRetry(msg: sgMail.MailDataRequired, retries = 0): Promise<void> {
        try {
            await sgMail.send(msg);
            logger.info(`Email sent to ${msg.to}`);
        } catch (error) {
            logger.error(`Email send failed: ${error}`);

            if (retries < this.maxRetries) {
                const delay = Math.pow(2,retries) * 1000
                await new Promise(res => setTimeout(res, delay));
                return this.sendWithRetry(msg, retries + 1);
            }

            throw error;
        }
    }

    async sendOtpEmail({email,otp,ttlMinutes }: SendEmailParams): Promise<void> {
        const msg = {
            to: email,
            from: this.from,
            subject: "OTP Verification",
            html: getOtpTemplate(otp, ttlMinutes),
        };

        await this.sendWithRetry(msg);
    }

    async sendWelcomeEmail({ email, firstName }: { email: string; firstName: string }): Promise<void> {
        const msg = {
            to: email,
            from: this.from,
            subject: "Welcome to IRCTC!",
            html: getWelcomeEmailTemplate(firstName),
        };

        await this.sendWithRetry(msg);
    }
}

export const emailServices = new EmailServices();