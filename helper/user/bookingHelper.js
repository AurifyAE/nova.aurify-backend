import mongoose from "mongoose";
import { Cart } from "../../model/cartSchema.js";
import { orderModel } from "../../model/orderSchema.js";

export const orderPlace = async (adminId, userId, bookingData) => {
  try {
    if (!userId || !adminId) {
      return {
        success: false,
        message: "Missing required fields",
      };
    }
    // Fetch the user's cart items
    const cart = await Cart.findOne({ userId }).populate("items.productId");
  
    // Check if the cart exists and has items
    if (!cart || cart.items.length === 0) {
      return {
        success: false,
        message: "Cart is empty, cannot place an order.",
      };
    }
    // Prepare order items
    const orderItems = cart.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      addedAt: new Date(),
    }));

    // Check if an existing order exists for the user
    const existingOrder = await orderModel.findOne({ userId, adminId });
    if (existingOrder) {
      // Update the existing order by adding new items and adjusting the total price
      existingOrder.items.push(...orderItems);
      existingOrder.totalPrice += cart.totalPrice;
      const updatedOrder = await existingOrder.save();
      // Clear booked items from the cart
      const bookedProductIds = orderItems.map((item) => item.productId);
      await Cart.updateOne(
        { userId },
        {
          $pull: { items: { productId: { $in: bookedProductIds } } },
          $set: { totalPrice: 0 },
        }
      );
      return {
        success: true,
        message: "Order updated successfully.",
        orderDetails: updatedOrder,
      };
    } else {
      // Create a new order
      const newOrder = new orderModel({
        adminId: new mongoose.Types.ObjectId(adminId),
        userId: new mongoose.Types.ObjectId(userId),
        items: orderItems,
        totalPrice: cart.totalPrice,
        orderStatus: "processing",
        paymentStatus: "pending",
        deliveryDate:bookingData.deliveryDate,
        paymentMethod:bookingData.paymentMethod
      });
      const savedOrder = await newOrder.save();
      if (savedOrder) {
        // Clear booked items from the cart
        const bookedProductIds = orderItems.map((item) => item.productId);
        await Cart.updateOne(
          { userId },
          {
            $pull: { items: { productId: { $in: bookedProductIds } } },
            $set: { totalPrice: 0 },
          }
        );
        return {
          success: true,
          message: "Order placed successfully.",
          orderDetails: savedOrder,
        };
      }
    }
    return {
      success: false,
      message: "Failed to process the order.",
    };
  } catch (error) {
    return {
      success: false,
      message: "Error placing the order: " + error.message,
    };
  }
};
