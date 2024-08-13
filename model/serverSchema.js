import mongoose from "mongoose";

const ServerSchema = new mongoose.Schema({
  servers: [
    {
      serverName: { type: String, required: true },
      serverURL: { type: String, required: true },
    },
  ],
  // Array of server URLs
  selectedServerName: { type: String, default: null },
  selectedServerURL: { type: String, default: null }, // The currently selected server URL
});

const serverModel = new mongoose.model("Server", ServerSchema);

export { serverModel };
