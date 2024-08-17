import mongoose from "mongoose";
import { serverModel } from "../../model/serverSchema.js";

export const addNewServer = async ({ serverName, serverURL }) => {
  try {
    let serverDoc = await serverModel.findOne();

    // If no document exists, create a new one
    if (!serverDoc) {
      serverDoc = new serverModel();
    }

    // Add the new server to the servers array
    serverDoc.servers.push({ serverName, serverURL });

    // Save the document, triggering the middleware to set the default selected server if necessary
    await serverDoc.save();

    return { success: true, server: serverDoc };
  } catch (error) {
    throw new Error("Error adding server");
  }
};

export const updateServerSelection = async (
  serverId,
  serverURL,
  serverName
) => {
  try {
    const serverDoc = await serverModel.findOne({
      _id: serverId,
    });
    if (!serverDoc) {
      throw new Error("Server not found");
    }
    serverDoc.selectedServerName = serverName;
    serverDoc.selectedServerURL = serverURL;

    await serverDoc.save();

    return { success: true, server: serverDoc };
  } catch (error) {
    throw new Error("Error updating selected server");
  }
};

export const deleteServer = async (serverId) => {
  try {
    const serverDoc = await serverModel.findOneAndUpdate(
      { "servers._id": serverId },
      { $pull: { servers: { _id: serverId } } },
      { new: true }
    );

    if (!serverDoc) {
      throw new Error("Server not found");
    }

    return {
      success: true,
      message: "Server deleted successfully",
      server: serverDoc,
    };
  } catch (error) {
    throw new Error(`Error deleting server: ${error.message}`);
  }
};

export const editServerDetails = async (serverId, serverName, serverURL) => {
  try {
    const serverDoc = await serverModel.findOneAndUpdate(
      { "servers._id": serverId },
      {
        $set: {
          "servers.$.serverName": serverName,
          "servers.$.serverURL": serverURL,
        },
      },
      { new: true }
    );
    if (!serverDoc) {
      throw new Error("Server not found");
    }
    return { success: true, server: serverDoc };
  } catch (error) {
    throw new Error(`Error editing server details: ${error.message}`);
  }
};

export const fetchServerDetails = async () => {
  try {
    return await serverModel.find({});
  } catch (error) {
    throw new Error("Error fetching server data");
  }
};
