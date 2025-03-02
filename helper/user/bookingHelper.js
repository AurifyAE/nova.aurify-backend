import mongoose from "mongoose";
import { Cart } from "../../model/cartSchema.js";
import { orderModel } from "../../model/orderSchema.js";
import Product from "../../model/productSchema.js";

export const orderPlace = async (adminId, userId, bookingData) => {
  try {
    if (
      !userId ||
      !adminId ||
      !bookingData?.paymentMethod 
    ) {
      return {
        success: false,
        message:
          "Missing required fields (adminId, userId, paymentMethod, or deliveryDate).",
      };
    }

    // Fetch the user's cart items
    const cart = await Cart.findOne({ userId }).populate("items.productId");

    // Check if the cart exists and has items
    if (!cart) {
      return {
        success: false,
        message: "No cart found for the user.",
      };
    }

    if (cart.items.length === 0) {
      return {
        success: false,
        message: "Cart is empty, cannot place an order.",
      };
    }

    let totalPrice = 0;
    let totalWeight = 0;
    const orderItems = await Promise.all(
      cart.items.map(async (item) => {
        const product = await Product.findById(item.productId);

        if (!product) {
          return {
            success: false,
            message: `Product with ID ${item.productId} not found.`,
          };
        }

        if (product.price <= 0) {
          return {
            success: false,
            message: `Invalid price for product ID ${item.productId}.`,
          };
        }

        const fixedPrice = product.price;
        const itemTotal = fixedPrice * item.quantity;
        const itemWeight = (Number(product.weight) || 0) * item.quantity; // Assuming product has a weight field
        totalPrice += itemTotal;
        totalWeight += itemWeight;

        return {
          productId: item.productId,
          quantity: item.quantity,
          fixedPrice: fixedPrice || 0, // Store fixed price
          totalPrice: itemTotal, // Store calculated total
          totalWeight: itemWeight, // Store total weight
          addedAt: new Date(),
        };
      })
    );

    // Validate total price
    if (totalPrice <= 0) {
      return {
        success: false,
        message: "Invalid total price calculation.",
      };
    }

    // Create a new order with the fixed price and total weight
    const newOrder = new orderModel({
      adminId: new mongoose.Types.ObjectId(adminId),
      userId: new mongoose.Types.ObjectId(userId),
      items: orderItems,
      totalPrice: totalPrice,
      totalWeight: totalWeight, 
      paymentMethod: bookingData.paymentMethod,
    });

    const savedOrder = await newOrder.save();

    if (savedOrder) {
      // Clear booked items from the cart
      const bookedProductIds = orderItems.map((item) => item.productId);
      await Cart.updateOne(
        { userId },
        {
          $pull: { items: { productId: { $in: bookedProductIds } } },
          $set: { totalWeight: 0 },
        }
      );

      return {
        success: true,
        message: "Order placed successfully.",
        orderDetails: savedOrder,
      };
    }

    return {
      success: false,
      message: "Failed to process the order.",
    };
  } catch (error) {
    console.error("Error placing the order:", error.message);
    return {
      success: false,
      message: "Error placing the order: " + error.message,
    };
  }
};


export const fetchBookingDetails = async (adminId, userId, page, limit, orderStatus) => {
  try {
    if (!adminId || !userId) {
      return { success: false, message: "Admin ID and User ID are required." };
    }

    const adminObjectId = new mongoose.Types.ObjectId(adminId);
    const userObjectId = new mongoose.Types.ObjectId(userId);

    // Create match condition based on orderStatus
    const matchCondition = {
      adminId: adminObjectId,
      userId: userObjectId,
    };

    // Add orderStatus to match condition if provided
    if (orderStatus) {
      matchCondition.orderStatus = orderStatus;
    }

    // Count total orders for pagination with status filter
    const totalOrders = await orderModel.countDocuments(matchCondition);

    if (totalOrders === 0) {
      return {
        success: false,
        message: orderStatus 
          ? `No orders found with status '${orderStatus}' for the given admin and user.`
          : "No orders found for the given admin and user.",
      };
    }

    const pipeline = [
      { $match: matchCondition },

      // Rest of your existing pipeline stages...
      {
        $lookup: {
          from: "users",
          let: { userId: "$userId" },
          pipeline: [
            { $unwind: "$users" },
            { $match: { $expr: { $eq: ["$users._id", "$$userId"] } } },
            {
              $project: {
                _id: "$users._id",
                name: "$users.name",
                contact: "$users.contact",
                address: "$users.address",
                email: "$users.email",
              },
            },
          ],
          as: "userDetails",
        },
      },
      { $unwind: { path: "$userDetails", preserveNullAndEmptyArrays: true } },

      // Lookup product details
      {
        $lookup: {
          from: "products",
          localField: "items.productId",
          foreignField: "_id",
          as: "productDetails",
        },
      },

      // Project required fields
      {
        $project: {
          orderNumber: 1,
          orderDate: 1,
          totalPrice: 1,
          totalWeight: 1,
          orderStatus: 1,
          paymentStatus: 1,
          paymentMethod: 1,
          transactionId: 1,
          customer: {
            id: "$userId",
            name: { $ifNull: ["$userDetails.name", "N/A"] },
            contact: { $ifNull: ["$userDetails.contact", "N/A"] },
            address: { $ifNull: ["$userDetails.address", "N/A"] },
            email: { $ifNull: ["$userDetails.email", "N/A"] },
          },
          items: {
            $map: {
              input: "$items",
              as: "orderItem",
              in: {
                _id: "$$orderItem._id",
                itemStatus: "$$orderItem.itemStatus",
                quantity: "$$orderItem.quantity",
                product: {
                  $arrayElemAt: [
                    {
                      $filter: {
                        input: "$productDetails",
                        as: "p",
                        cond: { $eq: ["$$p._id", "$$orderItem.productId"] },
                      },
                    },
                    0,
                  ],
                },
              },
            },
          },
        },
      },

      { $sort: { orderDate: -1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit },
    ];

    const orders = await orderModel.aggregate(pipeline);

    return {
      success: true,
      message: "Orders fetched successfully.",
      orderDetails: orders,
      pagination: {
        totalOrders,
        totalPages: Math.ceil(totalOrders / limit),
        currentPage: page,
      },
    };
  } catch (error) {
    console.error("Error fetching orders:", error);
    return {
      success: false,
      message: "Error fetching orders: " + error.message,
    };
  }
};

