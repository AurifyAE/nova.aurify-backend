import mongoose from "mongoose";
import { Cart } from "../../model/cartSchema.js";
import { orderModel } from "../../model/orderSchema.js";
import Product from "../../model/productSchema.js";

export const orderPlace = async (adminId, userId, bookingData) => {
  try {
    if (!userId || !adminId || !bookingData?.paymentMethod || !bookingData?.deliveryDate) {
      return {
        success: false,
        message: "Missing required fields (adminId, userId, paymentMethod, or deliveryDate).",
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
        totalPrice += itemTotal;

        return {
          productId: item.productId,
          quantity: item.quantity,
          fixedPrice: fixedPrice, // Store fixed price
          totalPrice: itemTotal, // Store calculated total
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

    // Create a new order with the fixed price
    const newOrder = new orderModel({
      adminId: new mongoose.Types.ObjectId(adminId),
      userId: new mongoose.Types.ObjectId(userId),
      items: orderItems,
      totalPrice: totalPrice,
      orderStatus: "processing",
      paymentStatus: "pending",
      deliveryDate: new Date(bookingData.deliveryDate),  // Ensure date format
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
          $set: { totalPrice: 0 },
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


export const fetchBookingDetails = async (adminId, userId) => {
  try {
    if (!adminId || !userId) {
      return {
        success: false,
        message: "Admin ID and User ID are required.",
      };
    }

    const adminObjectId = new mongoose.Types.ObjectId(adminId);
    const userObjectId = new mongoose.Types.ObjectId(userId);

    const pipeline = [
      // Match orders for the specific admin
      {
        $match: {
          adminId: adminObjectId,
          userId: userObjectId,
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
        message: "No orders found for the given admin and user.",
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
