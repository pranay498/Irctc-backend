import winston from "winston";
import path from "path";
import fs from "fs";

// ─── Ensure logs directory exists ─────────────────────────────────────────────
const logsDir = path.join(process.cwd(), "logs");
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// ─── Custom Log Format ────────────────────────────────────────────────────────
const customFormat = winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.errors({ stack: true }),        // captures full error stack trace
    winston.format.splat(),                         // enables string interpolation e.g. logger.info('Hello %s', 'world')
    winston.format.json()
);

const consoleFormat = winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.errors({ stack: true }),
    winston.format.colorize({ all: true }),
    winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
        let log = `[${timestamp}] ${level}: ${message}`;

        // print stack trace if available
        if (stack) {
            log += `\n${stack}`;
        }

        // print extra metadata if available
        if (Object.keys(meta).length > 0) {
            log += `\n${JSON.stringify(meta, null, 2)}`;
        }

        return log;
    })
);

// ─── Transports ───────────────────────────────────────────────────────────────
const transports: winston.transport[] = [

    // Console — pretty output for local development
    new winston.transports.Console({
        format: consoleFormat,
        silent: process.env.NODE_ENV === "test",   // suppress logs during tests
    }),

    // error.log — only errors
    new winston.transports.File({
        filename: path.join(logsDir, "error.log"),
        level: "error",
        format: customFormat,
        maxsize: 10 * 1024 * 1024,   // 10MB per file
        maxFiles: 5,                  // keep last 5 rotated files
        tailable: true,
    }),

    // combined.log — all logs
    new winston.transports.File({
        filename: path.join(logsDir, "combined.log"),
        format: customFormat,
        maxsize: 10 * 1024 * 1024,   // 10MB per file
        maxFiles: 10,                 // keep last 10 rotated files
        tailable: true,
    }),
];

// ─── Logger Instance ──────────────────────────────────────────────────────────
export const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || "info",   // override via env var
    levels: winston.config.npm.levels,         // error, warn, info, http, verbose, debug, silly
    format: customFormat,
    transports,
    exitOnError: false,                        // don't crash on logger errors
});

// ─── Stream for Morgan (HTTP request logging) ─────────────────────────────────
export const morganStream = {
    write: (message: string) => {
        logger.http(message.trim());
    },
};

// ─── Helper: log with service context ────────────────────────────────────────
export const createServiceLogger = (serviceName: string) => {
    return logger.child({ service: serviceName });
};

export default logger;