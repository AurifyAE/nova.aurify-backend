import userHelper from "../../helper/admin/userHelper.js";

export const addUser = async (req, res) => {
  try {
    const { adminId } = req.params;
    const userData = req.body;

    // Validate required fields
    const validationResult = userHelper.validateUserData(userData);
    if (validationResult !== true) {
      return res.status(400).json({
        success: false,
        message: validationResult,
      });
    }

    // Check if user with the same contact or email already exists
    const existingUser = await userHelper.checkUserExists(adminId, userData);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "A user with this contact or email already exists",
      });
    }

    // Add the user to the database
    const user = await userHelper.addUser(adminId, userData);

    res.status(201).json({
      success: true,
      message: "User added successfully",
      user,
    });
  } catch (error) {
    console.error("Error adding user:", error);
    res.status(500).json({
      success: false,
      message: "Error adding user",
      error: error.message,
    });
  }
};

export const editUser = async (req, res) => {
  try {
    const { adminId, userId } = req.params;
    const updatedUserData = req.body;

    // Check if there are fields to update
    if (Object.keys(updatedUserData).length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one field must be updated",
      });
    }

    // Check if another user has the same contact or email
    if (updatedUserData.contact || updatedUserData.email) {
      const existingUser = await userHelper.checkUserExists(
        adminId,
        updatedUserData,
        userId
      );
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "Another user already has this contact or email",
        });
      }
    }

    // Update the user
    const updatedUser = await userHelper.updateUser(
      adminId,
      userId,
      updatedUserData
    );

    res.json({
      success: true,
      message: "User updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(error.message === "User not found" ? 404 : 400).json({
      success: false,
      message:
        error.message === "User not found"
          ? "User not found"
          : "Error updating user",
      error: error.message,
    });
  }
};

export const getUsers = async (req, res) => {
  try {
    const { adminId } = req.params;

    // Get all users
    const users = await userHelper.getAllUsers(adminId);

    res.json({ success: true, users });
  } catch (error) {
    console.error("Error in getUsers:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching users",
      error: error.message,
    });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const { adminId, userId } = req.params;

    // Delete the user
    await userHelper.deleteUser(adminId, userId);

    res.json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    res.status(error.message === "User not found" ? 404 : 400).json({
      success: false,
      message:
        error.message === "User not found"
          ? "User not found"
          : "Error deleting user",
      error: error.message,
    });
  }
};
