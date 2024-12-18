//UserController.js
const mongoose = require('mongoose');
const User = require('../models/User');

class UserController {
  static async createUser(req, res) {
    const session = await mongoose.startSession();
    session.startTransaction();
  
    try {
      const { telegramId, username, firstName, lastName, referredBy } = req.body;
      console.log('Creating/updating user:', { telegramId, username, referredBy });
  
      let user = await User.findOne({ telegramId });
  
      if (user) {
        // Update existing user
        user.username = username || user.username;
        user.firstName = firstName || user.firstName;
        user.lastName = lastName || user.lastName;
      } else {
        // Create new user
        user = new User({
          telegramId,
          username: username || `user${telegramId.slice(-4)}`,
          firstName,
          lastName,
          totalPoints: 0,
          pointsBreakdown: {
            likes: 0,
            dislikes: 0,
            superLikes: 0,
            tasks: 0,
            referrals: 0
          }
        });
      }
  
      // Handle referral if provided
    if (referredBy && !user.referredBy) {
      try {
        await ReferralController.redeemReferral({
          body: {
            referralCode: referredBy,
            newUserTelegramId: telegramId
          }
        }, {
          json: (data) => console.log('Referral processed:', data),
          status: () => ({
            json: (data) => console.log('Referral error:', data)
          })
        });
      } catch (error) {
        console.error('Referral processing error:', error);
      }
    }

    await user.save({ session });
    await session.commitTransaction();

    res.status(201).json({
      success: true,
      data: user
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  } finally {
    session.endSession();
  }
}

  static async getUser(req, res) {
    try {
      const { telegramId } = req.params;
      console.log('Getting user:', telegramId);

      let user = await User.findOne({ telegramId });
      console.log('Found user:', user);

      if (!user) {
        console.log('User not found, creating new user');
        user = new User({
          telegramId,
          username: req.query.username || `user${telegramId.slice(-4)}`,
          totalPoints: 0,
          pointsBreakdown: {
            likes: 0,
            dislikes: 0,
            superLikes: 0,
            tasks: 0,
            referrals: 0
          }
        });
        await user.save();
        console.log('Created new user:', user);
      }

      res.json({
        success: true,
        data: user
      });
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async getUserStats(req, res) {
    try {
      const { telegramId } = req.params;
      console.log('Getting stats for user:', telegramId);

      const user = await User.findOne({ telegramId })
        .select('telegramId username totalPoints pointsBreakdown completedTasks');

      if (!user) {
        console.log('User not found for stats:', telegramId);
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      // Get user's rank
      const rank = await User.countDocuments({
        totalPoints: { $gt: user.totalPoints }
      }) + 1;

      console.log('User stats:', {
        telegramId: user.telegramId,
        username: user.username,
        rank,
        totalPoints: user.totalPoints
      });

      res.json({
        success: true,
        data: {
          user: {
            telegramId: user.telegramId,
            username: user.username,
            rank,
            totalPoints: user.totalPoints,
            pointsBreakdown: user.pointsBreakdown,
            completedTasks: user.completedTasks?.length || 0
          }
        }
      });
    } catch (error) {
      console.error('Get user stats error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = UserController;