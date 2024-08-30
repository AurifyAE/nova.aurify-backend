import admin  from "firebase-admin"
import serviceAccount from "./pushnotifaction.json" assert { type: "json" };
import dotenv from "dotenv";
dotenv.config();
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId:process.env.PROJECTID
})

export default admin;