import { createLogger, transports, format, Logger } from "winston";
import chalk from "chalk";

export const gameLoggerFactory = (roomId: string) =>
	createLogger({
		transports: [
			new transports.Console({
				format: format.combine(
					format.label({ label: "Game" }),
					format.timestamp({
						format: "YYYY-MM-DD HH:mm:ss",
					}),
					gamePrintFormat
				),
			}),
			new transports.File({
				filename: `public/logs/game/${new Date().getTime()}#${roomId}.log`,
				format: format.combine(
					format.timestamp({
						format: "YYYY-MM-DD HH:mm:ss",
					}),
					format.prettyPrint()
				),
			}),
		],
	});

let serverLogger: Logger;

function getServerLogger(){
	if (!serverLogger) {
		serverLogger = createLogger({
			transports: [
				new transports.Console({
					format: format.combine(
						format.label({ label: "SERVER" }),
						format.timestamp({
							format: "YYYY-MM-DD HH:mm:ss",
						}),
						serverPrintFormat
					),
				}),
				new transports.File({
					filename: `public/logs/server/log.log`,
					format: format.combine(
						format.timestamp({
							format: "YYYY-MM-DD HH:mm:ss",
						}),
						format.prettyPrint(),
						format.json()
					),
				}),
			],
		});
	}
	return serverLogger;
};

export const serverLog = (
	message: string,
	level: "error" | "warn" | "info" | "http" | "verbose" | "debug" | "silly" = "info"
) => {
	getServerLogger().log(level, message);
};

const gamePrintFormat = format.printf(({ level, message, label, timestamp }) => {
	return `${chalk.bold.bgGray(` ${timestamp} `)}${chalk.bold.bgMagenta(` ${label} `)}${colorizer(level)}: ${message}`;
});

const serverPrintFormat = format.printf(({ level, message, label, timestamp }) => {
	return `${chalk.bold.bgGray(` ${timestamp} `)}${chalk.bold.bgMagenta(` ${label} `)}${colorizer(level)}: ${message}`;
});

function colorizer(level: string){
	switch (level) {
		case "error":
			return chalk.bold.bgRed(` ${level.toUpperCase()} `);
		case "warn":
			return chalk.bold.bgYellow(` ${level.toUpperCase()} `);
		case "info":
			return chalk.bold.bgCyan(` ${level.toUpperCase()} `);
		case "http":
			return chalk.bold.bgMagenta(` ${level.toUpperCase()} `);
		case "verbose":
			return chalk.bold.bgBlue(` ${level.toUpperCase()} `);
		case "debug":
			return chalk.bold.bgWhite(` ${level.toUpperCase()} `);
		case "silly":
			return chalk.bold.bgGray(` ${level.toUpperCase()} `);
		default:
			return chalk.bold.bgGreen(` ${level.toUpperCase()} `);
	}
};
