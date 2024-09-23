import PremiumModel from "../../model/premiumSchema.js";
import DiscountModel from "../../model/discountSchema.js";

export const subscription = async (req, res, next) => {
    try {
        const { userId } = req.params;
        const { type, value, time } = req.body;
    
        if (!type || !value || isNaN(value) || value <= 0) {
          return res.status(400).json({ message: 'Invalid subscription data' });
        }
    
        const timestamp = new Date(time).getTime();
    
        let subscription;
        if (type === 'Premium') {
          subscription = await PremiumModel.findOneAndUpdate(
            { createdBy: userId },
            { 
              $push: { 
                premium: { 
                  timestamp, 
                  value: Number(value) 
                } 
              } 
            },
            { new: true, upsert: true }
          );
        } else if (type === 'Discount') {
          subscription = await DiscountModel.findOneAndUpdate(
            { createdBy: userId },
            { 
              $push: { 
                discount: { 
                  timestamp, 
                  value: Number(value) 
                } 
              } 
            },
            { new: true, upsert: true }
          );
        } else {
          return res.status(400).json({ message: 'Invalid subscription type' });
        }
    
        const newSubscription = subscription[type.toLowerCase()].slice(-1)[0];
    
        res.status(201).json({
          message: 'Subscription added successfully',
          subscription: {
            _id: newSubscription._id,
            type,
            value: newSubscription.value,
            time: new Date(newSubscription.timestamp).toLocaleString()
          }
        });
      } catch (error) {
        console.error('Error adding subscription:', error);
        res.status(500).json({ message: 'Server error' });
      }
  };

  export const getSubscription = async (req, res, next) => {
    try {
        const { userId } = req.params;
    
        // Fetch both Premium and Discount subscriptions
        const premiumSubscriptions = await PremiumModel.findOne({ createdBy: userId });
        const discountSubscriptions = await DiscountModel.findOne({ createdBy: userId });
    
        // Combine and format the subscriptions
        let subscriptions = [];
        if (premiumSubscriptions) {
          subscriptions = subscriptions.concat(
            premiumSubscriptions.premium.map(sub => ({
              _id: sub._id,
              type: 'Premium',
              value: sub.value,
              time: new Date(sub.timestamp).toLocaleString()
            }))
          );
        }
        if (discountSubscriptions) {
          subscriptions = subscriptions.concat(
            discountSubscriptions.discount.map(sub => ({
              _id: sub._id,
              type: 'Discount',
              value: sub.value,
              time: new Date(sub.timestamp).toLocaleString()
            }))
          );
        }
    
        // Sort subscriptions by timestamp, newest first
        subscriptions.sort((a, b) => new Date(b.time) - new Date(a.time));
    
        res.json({ subscriptions });
      } catch (error) {
        console.error('Error fetching subscriptions:', error);
        res.status(500).json({ message: 'Server error' });
      }
  };