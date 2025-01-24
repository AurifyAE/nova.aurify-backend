import mongoose from "mongoose";
import { orderModel } from "../../model/orderSchema.js";
import UserFCMTokenModel from "../../model/userFCMToken.js";
import NotificationService from "../../utils/sendPushNotification.js";
export const updateOrderDetails = async (orderId, orderStatus) => {
  try {
    // Find the order by ID and update the orderStatus
    const updatedOrder = await orderModel.findByIdAndUpdate(
      { _id: orderId },
      { orderStatus },
      { new: true, runValidators: true }
    );

    if (!updatedOrder) {
      return {
        success: false,
        message: "Order not found",
      };
    }

    return {
      success: true,
      message: "Order status updated successfully",
      data: updatedOrder,
    };
  } catch (error) {
    return {
      success: false,
      message: "Error updating order: " + error.message,
    };
  }
};

export const updateOrderQuantityHelper = async (orderId, orderDetails) => {
  try {
    let { itemStatus, itemId, quantity } = orderDetails;

    // Determine if the quantity is confirmed by the user
    const isQuantityConfirmedByUser = quantity && quantity >= 1;

    // Set default quantity to 1 if none provided or quantity is invalid (less than 1)
    if (!quantity || quantity < 1) {
      quantity = 1;
    }

    // Find the order by ID
    const order = await orderModel.findById(orderId);

    if (!order) {
      return {
        success: false,
        message: "Order not found",
      };
    }

    // Find the item inside the order's items array
    const itemIndex = order.items.findIndex(
      (item) => item._id.toString() === itemId
    );

    if (itemIndex === -1) {
      return {
        success: false,
        message: "Item not found in the order",
      };
    }

    // Update the specific item's quantity and status immediately
    order.items[itemIndex].quantity = quantity;
    order.items[itemIndex].itemStatus = itemStatus;

    // Check if all items are "Approved"
    const allApproved = order.items.every(
      (item) => item.itemStatus === "Approved"
    );

    // Check if any item has "User Approval Pending"
    const anyUserApprovalPending = order.items.some(
      (item) => item.itemStatus === "User Approval Pending"
    );

    // Update orderStatus based on items' statuses
    if (allApproved) {
      order.orderStatus = "Success";
    } else if (anyUserApprovalPending) {
      order.orderStatus = "User Approval Pending";
      order.notificationSentAt = new Date();
    } else {
      order.orderStatus = "Processing";
    }

    // Save the updated order
    await order.save();

    // Send confirmation notification only if quantity is confirmed by the user
    if (isQuantityConfirmedByUser) {
      // Fetch FCM tokens
      let fcmTokenDoc = await UserFCMTokenModel.findOne({
        createdBy: order.userId,
      });

      if (fcmTokenDoc && fcmTokenDoc.FCMTokens.length > 0) {
        const invalidTokens = [];

        // Send confirmation notifications to all tokens
        for (const tokenObj of fcmTokenDoc.FCMTokens) {
          try {
            await NotificationService.sendQuantityConfirmationNotification(
              tokenObj.token,
              orderId,
              itemId,
              quantity
            );
          } catch (error) {
            console.error(
              `Failed to send confirmation notification to token: ${tokenObj.token}`,
              error
            );
            if (
              error.errorInfo &&
              error.errorInfo.code ===
                "messaging/registration-token-not-registered"
            ) {
              invalidTokens.push(tokenObj.token);
            }
          }
        }

        // Remove invalid tokens if any were found
        if (invalidTokens.length > 0) {
          fcmTokenDoc.FCMTokens = fcmTokenDoc.FCMTokens.filter(
            (tokenObj) => !invalidTokens.includes(tokenObj.token)
          );
          await fcmTokenDoc.save();
        }
      }
    }

    return {
      success: true,
      message: "Order updated successfully",
      data: order,
    };
  } catch (error) {
    return {
      success: false,
      message: "Error updating order: " + error.message,
    };
  }
};

export const fetchBookingDetails = async (adminId) => {
  try {
    // Input validation
    if (!adminId) {
      return {
        success: false,
        message: "Missing admin ID",
      };
    }

    const adminObjectId = new mongoose.Types.ObjectId(adminId);

    // Define the base pipeline stages
    const pipeline = [
      // Match orders for the specific admin
      {
        $match: {
          adminId: adminObjectId,
        },
      },

      // Lookup user details
      {
        $lookup: {
          from: "users",
          let: { userId: "$userId" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$createdBy", adminObjectId] },
                    { $in: ["$$userId", "$users._id"] },
                  ],
                },
              },
            },
            {
              $project: {
                user: {
                  $first: {
                    $filter: {
                      input: "$users",
                      as: "user",
                      cond: { $eq: ["$$user._id", "$$userId"] },
                    },
                  },
                },
              },
            },
          ],
          as: "userDetails",
        },
      },

      // Lookup product details for all items in the order
      {
        $lookup: {
          from: "products",
          let: { orderItems: "$items" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $in: ["$_id", "$$orderItems.productId"],
                },
              },
            },
            {
              $project: {
                _id: 1,
                title: 1,
                price: 1,
                images: 1,
                sku: 1,
                type: 1,
                weight: 1,
                purity: 1,
                makingCharge: 1,
              },
            },
          ],
          as: "productDetails",
        },
      },

      // Final shape of the data
      {
        $project: {
          _id: 1,
          orderNumber: 1,
          orderDate: 1,
          deliveryDate: 1,
          totalPrice: 1,
          orderStatus: 1,
          paymentStatus: 1,
          paymentMethod: 1,
          transactionId: 1,

          // Customer information
          customer: {
            $let: {
              vars: {
                userInfo: { $arrayElemAt: ["$userDetails", 0] },
              },
              in: {
                id: "$userId",
                name: "$$userInfo.user.name",
                contact: "$$userInfo.user.contact",
                location: "$$userInfo.user.location",
              },
            },
          },

          // Products in the order
          items: {
            $map: {
              input: "$items",
              as: "orderItem",
              in: {
                _id: "$$orderItem._id",
                itemStatus: "$$orderItem.itemStatus",
                quantity: "$$orderItem.quantity",
                product: {
                  $let: {
                    vars: {
                      productInfo: {
                        $first: {
                          $filter: {
                            input: "$productDetails",
                            as: "p",
                            cond: { $eq: ["$$p._id", "$$orderItem.productId"] },
                          },
                        },
                      },
                    },
                    in: {
                      id: "$$productInfo._id",
                      title: "$$productInfo.title",
                      sku: "$$productInfo.sku",
                      price: "$$productInfo.price",
                      type: "$$productInfo.type",
                      weight: "$$productInfo.weight",
                      purity: "$$productInfo.purity",
                      makingCharge: "$$productInfo.makingCharge",
                      images: "$$productInfo.images",
                    },
                  },
                },
              },
            },
          },
        },
      },

      // Sort by order date descending
      { $sort: { orderDate: -1 } },
    ];

    const orders = await orderModel.aggregate(pipeline);

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
      message: "Error fetching orders: " + error.message,
    };
  }
};
