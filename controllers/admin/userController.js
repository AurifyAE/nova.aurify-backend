import { UsersModel } from '../../model/UsersSchema.js';
import { encryptPassword, decryptPassword } from '../../utils/crypto.js'; 
import mongoose from 'mongoose';


export const addUser = async (req, res) => {
  try {
    const { adminId } = req.params;
    const userData = req.body;

    if (!userData.name || !userData.contact || !userData.location || !userData.categoryId || !userData.password) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    // Check if user with the same contact already exists
    const existingUser = await UsersModel.findOne({
      createdBy: adminId,
      'users.contact': userData.contact
    });

    if (existingUser) {
      return res.status(400).json({ success: false, message: 'A user with this contact number already exists' });
    }

    // Encrypt password
    const { iv, encryptedData } = encryptPassword(userData.password);

    const newUserData = {
      ...userData,
      password: encryptedData,
      passwordAccessKey: iv
    };

    const result = await UsersModel.findOneAndUpdate(
      { createdBy: adminId },
      { $push: { users: newUserData } },
      { new: true, upsert: true }
    );

    const addedUser = result.users[result.users.length - 1];

    // Populate the category name
    const populatedUser = await UsersModel.aggregate([
      { $match: { 'users._id': addedUser._id } },
      { $unwind: '$users' },
      { $match: { 'users._id': addedUser._id } },
      {
        $lookup: {
          from: 'categories',
          localField: 'users.categoryId',
          foreignField: '_id',
          as: 'categoryInfo'
        }
      },
      { $unwind: '$categoryInfo' },
      {
        $project: {
          _id: '$users._id',
          name: '$users.name',
          contact: '$users.contact',
          location: '$users.location',
          categoryId: '$users.categoryId',
          categoryName: '$categoryInfo.name'
        }
      }
    ]);

    res.status(201).json({ success: true, message: 'User added successfully', user: populatedUser[0] });
  } catch (error) {
    console.error('Error adding user:', error);
    res.status(500).json({ success: false, message: 'Error adding user', error: error.message });
  }
};

export const editUser = async (req, res) => {
  try {
    const { adminId, userId } = req.params;
    const updatedUserData = req.body;

    let updateObject = {
      'users.$.name': updatedUserData.name,
      'users.$.contact': updatedUserData.contact,
      'users.$.location': updatedUserData.location,
      'users.$.category': updatedUserData.category,
    };

    // If password is being updated, encrypt it
    if (updatedUserData.password) {
      const { iv, encryptedData } = encryptPassword(updatedUserData.password);
      updateObject['users.$.password'] = encryptedData;
      updateObject['users.$.passwordAccessKey'] = iv;  // Store IV as passwordAccessKey
    }

    const result = await UsersModel.findOneAndUpdate(
      { createdBy: adminId, 'users._id': userId },
      { $set: updateObject },
      { new: true }
    );

    if (!result) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const updatedUser = result.users.find(user => user._id.toString() === userId);
    
    // Remove password and passwordAccessKey from the response
    const { password, passwordAccessKey, ...userWithoutSensitiveInfo } = updatedUser.toObject();
    
    res.json({ success: true, message: 'User updated successfully', user: userWithoutSensitiveInfo });
  } catch (error) {
    res.status(400).json({ success: false, message: 'Error updating user', error: error.message });
  }
};

export const getUsers = async (req, res) => {
  try {
    const { adminId } = req.params;

    // Convert adminId to ObjectId
    const objectIdAdminId = new mongoose.Types.ObjectId(adminId);

    const users = await UsersModel.aggregate([
      { $match: { createdBy: objectIdAdminId } },
      { $unwind: '$users' },
      {
        $lookup: {
          from: 'categories',
          localField: 'users.categoryId',
          foreignField: '_id',
          as: 'categoryInfo'
        }
      },
      { $unwind: '$categoryInfo' },
      {
        $project: {
          _id: '$users._id',
          name: '$users.name',
          contact: '$users.contact',
          location: '$users.location',
          categoryId: '$users.categoryId',
          categoryName: '$categoryInfo.name',
          encryptedPassword: '$users.password',
          passwordAccessKey: '$users.passwordAccessKey'
        }
      }
    ]);

    // Decrypt passwords and remove sensitive information
    const sanitizedUsers = users.map(user => {
      try {
        if (user.encryptedPassword && user.passwordAccessKey) {
          const decryptedPassword = decryptPassword(user.encryptedPassword, user.passwordAccessKey);
          const { encryptedPassword, passwordAccessKey, ...sanitizedUser } = user;
          return { ...sanitizedUser, decryptedPassword };
        } else {
          const { encryptedPassword, passwordAccessKey, ...sanitizedUser } = user;
          return { ...sanitizedUser, decryptionFailed: true, reason: 'Missing password or passwordAccessKey' };
        }
      } catch (decryptionError) {
        console.error(`Failed to decrypt password for user ${user._id}:`, decryptionError);
        const { encryptedPassword, passwordAccessKey, ...sanitizedUser } = user;
        return { ...sanitizedUser, decryptionFailed: true, reason: 'Decryption error' };
      }
    });

    res.json({ success: true, users: sanitizedUsers });
  } catch (error) {
    console.error('Error in getUsers:', error);
    res.status(500).json({ success: false, message: 'Error fetching users', error: error.message });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const { adminId, userId } = req.params;

    const result = await UsersModel.findOneAndUpdate(
      { createdBy: adminId },
      { $pull: { users: { _id: userId } } },
      { new: true }
    );

    if (!result) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    res.status(400).json({ success: false, message: 'Error deleting user', error: error.message });
  }
};


