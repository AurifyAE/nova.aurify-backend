import mongoose from "mongoose";
import { orderModel } from "../../model/orderSchema.js";

export const fetchBookingDetails = async (adminId) => {
  try {
    if (!adminId) {
      return {
        success: false,
        message: "Missing required fields",
      };
    }

    const adminObjectId = new mongoose.Types.ObjectId(adminId);

    const orders = await orderModel.aggregate([
      { $match: { adminId: adminObjectId } },
      {
        $lookup: {
          from: "users", // Collection name for users
          let: { userId: "$userId" }, // Pass the `userId` from the order document
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$createdBy", adminObjectId] }, // Match adminId
                    {
                      $in: ["$$userId", "$users._id"], // Check if userId matches any `users._id`
                    },
                  ],
                },
              },
            },
            {
              $project: {
                users: {
                  $filter: {
                    input: "$users",
                    as: "user",
                    cond: { $eq: ["$$user._id", "$$userId"] }, // Filter for the matching user
                  },
                },
              },
            },
          ],
          as: "userDetails", // Output the user details
        },
      },
      {
        $unwind: {
          path: "$userDetails",
          preserveNullAndEmptyArrays: true, // Allow orders without matching user details
        },
      },
      {
        $unwind: {
          path: "$userDetails.users",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "products", // Assuming a collection for products exists
          localField: "items.productId",
          foreignField: "_id",
          as: "productDetails",
        },
      },
      {
        $project: {
          _id: 1,
          adminId: 1,
          userId: 1,
          "userDetails.users.name": 1,
          "userDetails.users.contact": 1,
          "userDetails.users.location": 1,
          productDetails: {
            title: 1,
            price: 1,
            images: 1,
            sku: 1,
            type: 1,
            weight: 1,
            purity: 1,
            makingCharge: 1,
          },
          totalPrice: 1,
          transactionId: 1,
          orderStatus: 1,
          paymentStatus: 1,
          paymentMethod: 1,
          deliveryDate: 1,
          orderDate: 1,
        },
      },
    ]);

    if (orders.length === 0) {
      return {
        success: false,
        message: "No orders found for this admin.",
      };
    }

    return {
      success: true,
      message: "Orders fetched successfully.",
      orderDetails: orders,
    };
  } catch (error) {
    return {
      success: false,
      message: "Error fetching the orders: " + error.message,
    };
  }
};
