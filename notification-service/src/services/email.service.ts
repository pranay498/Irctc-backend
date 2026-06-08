import nodemailer from "nodemailer";
import { config } from "../config";
import logger from "../config/logger";

interface SendEmailParams {
    to: string;
    subject: string;
    text: string;
    html?: string;
}

const transporter = nodemailer.createTransport({
    host: config.SMTP_HOST,
    port: config.SMTP_PORT,
    auth: {
        user: config.SMTP_USER,
        pass: config.SMTP_PASS,
    },
});

export const sendEmail = async ({ to, subject, text, html }: SendEmailParams): Promise<void> => {
    try {
        const info = await transporter.sendMail({
            from: `"IRCTC Backend" <no-reply@irctc.com>`,
            to,
            subject,
            text,
            html,
        });
        logger.info(`Email sent successfully: ${info.messageId}`);
    } catch (error) {
        logger.error(`Failed to send email to ${to}: ${error}`);
        throw error;
    }
};
