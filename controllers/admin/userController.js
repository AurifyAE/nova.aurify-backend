import { UsersModel } from '../../model/UsersSchema.js';
import { encryptPassword, decryptPassword } from '../../utils/crypto.js'; 


export const addUser = async (req, res) => {
  try {
    const { adminId } = req.params;
    const userData = req.body;

    if (!userData.name || !userData.contact || !userData.location || !userData.category || !userData.password) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    // Encrypt password
    const { iv, encryptedData } = encryptPassword(userData.password);

    const existingAdmin = await UsersModel.findOne({ createdBy: adminId });

    const newUserData = {
      ...userData,
      password: encryptedData,
      passwordAccessKey: iv  // Store IV as passwordAccessKey
    };

    if (existingAdmin) {
      // Check if the contact already exists
      const contactExists = existingAdmin.users.some(user => user.contact === userData.contact);
      if (contactExists) {
        return res.status(409).json({ success: false, message: 'User with this contact already exists' });
      }

      // Add new user to existing document
      existingAdmin.users.push(newUserData);
      await existingAdmin.save();
    } else {
      // Create new document with the first user
      const newUsers = new UsersModel({
        createdBy: adminId,
        users: [newUserData]
      });
      await newUsers.save();
    }

    // Don't send back the encrypted password or IV
    const { password, passwordAccessKey, ...userDataWithoutSensitiveInfo } = newUserData;
    res.status(201).json({ success: true, message: 'User added successfully', user: userDataWithoutSensitiveInfo });
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

    const usersDoc = await UsersModel.findOne({ createdBy: adminId });

    if (!usersDoc) {
      return res.json({ success: true, users: [] });
    }

    // Decrypt passwords for each user
    const usersWithDecryptedPasswords = usersDoc.users.map(user => {
      const userObject = user.toObject();
      try {
        // Check if both password and passwordAccessKey exist
        if (userObject.password && userObject.passwordAccessKey) {
          const decryptedPassword = decryptPassword(userObject.password, userObject.passwordAccessKey);
          return { ...userObject, decryptedPassword };
        } else {
          return { ...userObject, decryptionFailed: true, reason: 'Missing password or passwordAccessKey' };
        }
      } catch (decryptionError) {
        console.error(`Failed to decrypt password for user ${userObject._id}:`, decryptionError);
        return { ...userObject, decryptionFailed: true, reason: decryptionError.message };
      }
    });

    res.json({ success: true, users: usersWithDecryptedPasswords });
  } catch (error) {
    console.error('Error in getUsers:', error);
    res.status(400).json({ success: false, message: 'Error fetching users', error: error.message });
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


