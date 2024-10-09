import admin  from "firebase-admin"
import serviceAccount from "./pushnotifaction.json" assert { type: "json" };
import dotenv from "dotenv";
dotenv.config();
const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS);
admin.initializeApp({
  credential: admin.credential.cert(credentials),
  projectId:process.env.PROJECTID
})

export default admin;