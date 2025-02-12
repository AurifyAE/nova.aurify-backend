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
          fixedPrice: fixedPrice || 0, // Store fixed price
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


export const fetchBookingDetails = async (adminId, userId, page, limit) => {
  try {
    if (!adminId || !userId) {
      return { success: false, message: "Admin ID and User ID are required." };
    }

    const adminObjectId = new mongoose.Types.ObjectId(adminId);
    const userObjectId = new mongoose.Types.ObjectId(userId);

    // Count total orders for pagination
    const totalOrders = await orderModel.countDocuments({ adminId: adminObjectId, userId: userObjectId });

    if (totalOrders === 0) {
      return { success: false, message: "No orders found for the given admin and user." };
    }

    const pipeline = [
      { $match: { adminId: adminObjectId, userId: userObjectId } },

      // Lookup user details
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
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
          deliveryDate: 1,
          pricingOption:1,
          premiumAmount:1,
          discountAmount:1,
          totalPrice: 1,
          orderStatus: 1,
          paymentStatus: 1,
          paymentMethod: 1,
          transactionId: 1,
          customer: {
            id: "$userId",
            name: "$userDetails.name",
            contact: "$userDetails.contact",
            location: "$userDetails.location",
            email: "$userDetails.email",
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

      { $sort: { orderDate: -1 } }, // Sort by latest order

      // Pagination
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
    return { success: false, message: "Error fetching orders: " + error.message };
  }
};

export const createOrderDetails = async (adminId, userId, bookingData) => {
  try {
    if (!userId || !adminId || !bookingData?.paymentMethod || !bookingData?.deliveryDate || !bookingData?.bookingData?.length) {
      return {
        success: false,
        message: "Missing required fields (adminId, userId, paymentMethod, deliveryDate, or items).",
      };
    }

    // Validate pricing option and assign the appropriate value
    let discount = 0;
    let premium = 0;

    if (bookingData.pricingOption === "Discount") {
      discount = bookingData.discount || 0;
    } else if (bookingData.pricingOption === "Premium") {
      premium = bookingData.premium || 0;
    }

    // Process order items (without storing fixed prices)
    const orderItems = bookingData.bookingData.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      addedAt: new Date(),
    }));

    // Create a new order (without storing fixed prices)
    const newOrder = new orderModel({
      adminId: new mongoose.Types.ObjectId(adminId),
      userId: new mongoose.Types.ObjectId(userId),
      items: orderItems,
      deliveryDate: new Date(bookingData.deliveryDate),
      paymentMethod: bookingData.paymentMethod,
      pricingOption: bookingData.pricingOption, // Store Discount/Premium option
      discountAmount:discount, // Store discount only if "Discount" is selected
      premiumAmount:premium, // Store premium only if "Premium" is selected
      orderStatus: "Processing",
      paymentStatus: "Pending",
    });

    const savedOrder = await newOrder.save();

    return {
      success: true,
      message: "Order placed successfully.",
      orderDetails: savedOrder,
    };
  } catch (error) {
    console.error("Error placing the order:", error.message);
    return {
      success: false,
      message: "Error placing the order: " + error.message,
    };
  }
};
