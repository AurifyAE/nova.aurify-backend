import { fetchServer } from "../../helper/admin/serverHelper.js";

export const getServerController = async (req, res, next) => {
    try {
      const server = await fetchServer();
      if (server) {
        res.status(200).json({ selectedServerURL: server.selectedServerURL });
      } else {
        res.status(404).json({ message: 'Server not found' });
      }
    } catch (error) {
      res.status(500).json({ error: 'Server error' });
    }
  };
  