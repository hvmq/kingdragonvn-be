require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/user.model');

async function createAdmin() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Admin user data
        const adminData = {
            username: 'admin',
            phoneNumber: '0987654321',  // Change this to your desired admin phone number
            password: 'admin123456',    // Change this to your desired admin password
            role: 'admin',
            isVerified: true
        };

        // Check if admin already exists
        let admin = await User.findOne({ role: 'admin' });

        if (admin) {
            console.log('Admin user already exists:', {
                username: admin.username,
                phoneNumber: admin.phoneNumber,
                refId: admin.refId
            });
        } else {
            // Create new admin user
            admin = new User(adminData);
            await admin.save();

            console.log('Admin user created successfully:', {
                username: admin.username,
                phoneNumber: admin.phoneNumber,
                refId: admin.refId
            });
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        // Close the connection
        await mongoose.connection.close();
        console.log('Disconnected from MongoDB');
    }
}

createAdmin(); 