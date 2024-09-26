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
          localField: "userId",
          foreignField: "_id",
          as: "userDetails"
        }
      },
      {
        $unwind: "$userDetails"
      },
      {
        $lookup: {
          from: "shops", // Assuming a collection for products exists
          localField: "items.productId",
          foreignField: "_id",
          as: "productDetails"
        }
      },
      {
        $project: {
          _id: 1,
          adminId: 1,
          userId: 1,
          userDetails: {
            userName: 1,
            contact: 1,
            email: 1
          },
          items: 1,
          productDetails: {
            name: 1,
            price: 1,
            image: 1
          },
          totalPrice: 1,
          orderStatus: 1,
          paymentStatus: 1,
          orderDate: 1
        }
      }
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
