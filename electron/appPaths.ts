import path from "node:path";
import { app } from "electron";
import { APP_NAME } from "../src/lib/appInfo";

if (process.env["VITE_DEV_SERVER_URL"]) {
	const devUserDataPath = path.join(app.getPath("appData"), `${APP_NAME}-dev`);
	app.setPath("userData", devUserDataPath);
	app.setPath("sessionData", path.join(devUserDataPath, "session"));
}

export const USER_DATA_PATH = app.getPath("userData");
export const RECORDINGS_DIR = path.join(USER_DATA_PATH, "recordings");
