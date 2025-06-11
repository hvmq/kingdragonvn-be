require('dotenv').config();
const mongoose = require('mongoose');
const VipPackage = require('../models/vip-package.model');

const vipPackages = [
    {
        name: 'VIP 1',
        price: 10000,
        duration: 7, // 1 week in days
        description: 'Premium benefits for 1 week',
        benefits: [
            'Premium access for 1 week',
            'Priority support',
            'Special features access'
        ]
    },
    {
        name: 'VIP 2',
        price: 100000,
        duration: 30, // 1 month in days
        description: 'Premium benefits for 1 month',
        benefits: [
            'Premium access for 1 month',
            'Priority support',
            'Special features access',
            'Extended benefits'
        ]
    },
    {
        name: 'VIP 3',
        price: 1000000,
        duration: 365, // 1 year in days
        description: 'Premium benefits for 1 year',
        benefits: [
            'Premium access for 1 year',
            'Priority support',
            'Special features access',
            'Extended benefits',
            'Exclusive yearly rewards'
        ]
    }
];

async function initVipPackages() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Delete existing packages
        await VipPackage.deleteMany({});
        console.log('Cleared existing VIP packages');

        // Create new packages
        const created = await VipPackage.create(vipPackages);
        console.log('Created VIP packages:', created.map(pkg => ({
            name: pkg.name,
            price: pkg.price,
            duration: pkg.duration
        })));

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.connection.close();
        console.log('Disconnected from MongoDB');
    }
}

initVipPackages(); 