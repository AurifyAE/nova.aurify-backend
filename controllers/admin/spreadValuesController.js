import { addSpreadValue, deleteSpreadValue, getSpreadValues } from "../../helper/admin/spreadValuesHelper.js";
export const addCustomSpread = async (req, res, next) => {
    try {
      const { adminId } = req.params;
      const { spreadValue, title } = req.body;
      const response = await addSpreadValue(adminId, spreadValue, title);
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };
export const fetchSpreadValues = async (req, res, next) => {
    try {
      const { adminId } = req.params;
      const response = await getSpreadValues(adminId);
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };
  
  export const deleteSpreadValueController = async (req, res, next) => {
    try {
      const { spreadValueId, email } = req.params;
      const result = await deleteSpreadValue(email, spreadValueId);
      if (result.success) {
        res.status(200).json({
          success: true,
          message: result.message,
        });
      } else {
        res.status(404).json({
          success: false,
          message: result.message,
        });
      }
    } catch (error) {
      next(error);
    }
  };
  