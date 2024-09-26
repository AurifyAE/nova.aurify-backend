import mongoose from "mongoose";
import { Cart } from "../../model/cartSchema.js";
import { orderModel } from "../../model/orderSchema.js";

export const orderPlace = async (adminId, userId) => {
  try {
    if (!userId || !adminId) {
      return {
        success: false,
        message: "Missing required fields",
      };
    }

    // Fetch the user's cart items
    const cart = await Cart.findOne({ userId }).populate("items.$.productId");

    // Check if the cart exists and has items
    if (!cart || cart.items.length === 0) {
      return {
        success: false,
        message: "Cart is empty, cannot place an order.",
      };
    }

  
    const orderItems = cart.items.map((item) => {
      return {
        productId: item.productId, // Store the product ID
        quantity: item.quantity,
      };
    });
   
    // Create new order
    const newOrder = new orderModel({
      adminId: new mongoose.Types.ObjectId(adminId),
      userId: new mongoose.Types.ObjectId(userId),
      items: orderItems,
      totalPrice : cart.totalPrice,
      orderStatus: "processing",
      paymentStatus: "pending",
    });

    // Save the order to the database
    const savedOrder = await newOrder.save();

    // Clear the cart after placing the order
    await Cart.findOneAndUpdate({ userId }, { items: [] }); // Clear cart after placing order

    return {
      success: true,
      message: "Order placed successfully.",
      orderDetails: savedOrder,
    };
  } catch (error) {
    return {
      success: false,
      message: "Error placing the order: " + error.message,
    };
  }
};
