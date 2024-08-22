import {
  addNewServer,
  updateServerSelection,
  deleteServer,
  editServerDetails,
  fetchServerDetails
} from "../../helper/superAdmin/serverHelper.js";

// Controller to handle adding a new server
export const addServer = async (req, res, next) => {
  try {
    await addNewServer(req.body);
    res.status(201).json({ message: "Server added successfully" });
  } catch (error) {
    next(error); // Passes the error to the next middleware
  }
};

// Controller to handle updating the selected server
export const updateSelectedServer = async (req, res, next) => {
  try {
    const { serverId } = req.params;
    const result = await updateServerSelection(
      serverId,
      req.body.serverURL,
      req.body.serverName
    );
    res.status(200).json(result);

  } catch (error) {
    next(error); // Passes the error to the next middleware
  }
};

export const deleteSelectedServer = async (req, res, next) => {
  try {
    const { serverId } = req.params;
    try {
      const result = await deleteServer(serverId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  } catch (error) {
    next(error);
  }
};

export const editServer = async (req, res, next) => {
  try {
    const { serverId } = req.params;
    const { serverName, serverURL } = req.body;
    const result = await editServerDetails(serverId, serverName, serverURL);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};


export const fetchServerData = async (req, res, next) => {
  try {
    const server = await fetchServerDetails();
    res.status(200).json({info:server});
  } catch (error) {
    next(error);
  }
};
