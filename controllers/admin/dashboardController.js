import { UsersModel } from '../../model/usersSchema.js';
import { orderModel } from '../../model/orderSchema.js';
import mongoose from 'mongoose';

// Helper function to get date range based on time period
const getDateRange = (timePeriod) => {
  const now = new Date();
  const startDate = new Date();
  
  switch(timePeriod) {
    case 'day':
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'week':
      // Set to beginning of current week (Sunday)
      const day = startDate.getDay();
      startDate.setDate(startDate.getDate() - day);
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'month':
      // Set to first day of current month
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'year':
      // Set to first day of current year
      startDate.setMonth(0, 1);
      startDate.setHours(0, 0, 0, 0);
      break;
    default:
      // Default to all time - set to far past date
      startDate.setFullYear(2000, 0, 1);
  }
  
  return { startDate, endDate: now };
};

// Get all dashboard statistics in a single request for efficiency
export const getDashboardOverview = async (req, res) => {
  try {
    const { timePeriod = 'all' } = req.query;
    const {adminId} = req.params; // Assuming auth middleware adds user to req
    const { startDate, endDate } = getDateRange(timePeriod);

    // Parallel execution of all queries for better performance
    const [userCount, orderStats, revenueData] = await Promise.all([
      // Count users created in time period
      UsersModel.aggregate([
        { $match: { createdBy: new mongoose.Types.ObjectId(adminId) } },
        { $unwind: '$users' },
        { $match: { 'users.createdAt': { $gte: startDate, $lte: endDate } } },
        { $count: 'count' }
      ]),
      
      // Get completed order count and details
      orderModel.aggregate([
        { 
          $match: { 
            adminId: new mongoose.Types.ObjectId(adminId),
            orderStatus: "Success",
            orderDate: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            totalValue: { $sum: '$totalPrice' }
          }
        }
      ]),
      
      // Get revenue data by day/month for charts
      orderModel.aggregate([
        {
          $match: {
            adminId: new mongoose.Types.ObjectId(adminId),
            orderStatus: "Success",
            orderDate: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$orderDate' },
              month: { $month: '$orderDate' },
              day: { $dayOfMonth: '$orderDate' }
            },
            revenue: { $sum: '$totalPrice' },
            orders: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
      ])
    ]);

    // Format the response
    const formattedResponse = {
      userCount: userCount.length > 0 ? userCount[0].count : 0,
      completedOrders: orderStats.length > 0 ? orderStats[0].count : 0,
      totalRevenue: orderStats.length > 0 ? orderStats[0].totalValue : 0,
      timeline: revenueData.map(day => ({
        date: `${day._id.year}-${day._id.month}-${day._id.day}`,
        revenue: day.revenue,
        orders: day.orders
      }))
    };

    return res.status(200).json({
      success: true,
      data: formattedResponse
    });
  } catch (error) {
    console.error('Dashboard overview error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard overview',
      error: error.message
    });
  }
};

// Individual endpoint for user count
export const getUserCount = async (req, res) => {
  try {
    const { timePeriod = 'all' } = req.query;
    const {adminId} = req.params;
    const { startDate, endDate } = getDateRange(timePeriod);

    const result = await UsersModel.aggregate([
      { $match: { createdBy: new mongoose.Types.ObjectId(adminId) } },
      { $unwind: '$users' },
      { $match: { 'users.createdAt': { $gte: startDate, $lte: endDate } } },
      { 
        $group: {
          _id: null,
          count: { $sum: 1 },
          // Group by day for timeline data
          timeline: {
            $push: {
              date: { $dateToString: { format: "%Y-%m-%d", date: "$users.createdAt" } },
            }
          }
        }
      }
    ]);

    // Process timeline data to count users per day
    let timelineData = [];
    if (result.length > 0) {
      const dateCount = {};
      result[0].timeline.forEach(item => {
        dateCount[item.date] = (dateCount[item.date] || 0) + 1;
      });
      
      timelineData = Object.entries(dateCount).map(([date, count]) => ({
        date,
        count
      })).sort((a, b) => new Date(a.date) - new Date(b.date));
    }

    return res.status(200).json({
      success: true,
      data: {
        count: result.length > 0 ? result[0].count : 0,
        timeline: timelineData
      }
    });
  } catch (error) {
    console.error('User count error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch user count',
      error: error.message
    });
  }
};

// Individual endpoint for completed orders
export const getCompletedOrders = async (req, res) => {
  try {
    const { timePeriod = 'all' } = req.query;
    const {adminId} = req.params;
    const { startDate, endDate } = getDateRange(timePeriod);

    const result = await orderModel.aggregate([
      {
        $match: {
          adminId: new mongoose.Types.ObjectId(adminId),
          orderStatus: "Success",
          orderDate: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$orderDate" }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id": 1 } }
    ]);

    const totalCount = await orderModel.countDocuments({
      adminId: new mongoose.Types.ObjectId(adminId),
      orderStatus: "Success",
      orderDate: { $gte: startDate, $lte: endDate }
    });

    return res.status(200).json({
      success: true,
      data: {
        count: totalCount,
        timeline: result.map(item => ({
          date: item._id,
          count: item.count
        }))
      }
    });
  } catch (error) {
    console.error('Completed orders error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch completed orders',
      error: error.message
    });
  }
};

// Individual endpoint for total revenue
export const getTotalRevenue = async (req, res) => {
  try {
    const { timePeriod = 'all' } = req.query;
    const {adminId} = req.params;
    const { startDate, endDate } = getDateRange(timePeriod);

    const result = await orderModel.aggregate([
      {
        $match: {
          adminId: new mongoose.Types.ObjectId(adminId),
          orderStatus: "Success",
          orderDate: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$orderDate" }
          },
          revenue: { $sum: "$totalPrice" }
        }
      },
      { $sort: { "_id": 1 } }
    ]);

    const totalRevenue = await orderModel.aggregate([
      {
        $match: {
          adminId: new mongoose.Types.ObjectId(adminId),
          orderStatus: "Success",
          orderDate: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$totalPrice" }
        }
      }
    ]);

    return res.status(200).json({
      success: true,
      data: {
        total: totalRevenue.length > 0 ? totalRevenue[0].total : 0,
        timeline: result.map(item => ({
          date: item._id,
          revenue: item.revenue
        }))
      }
    });
  } catch (error) {
    console.error('Revenue error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch revenue data',
      error: error.message
    });
  }
};