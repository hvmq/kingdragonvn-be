require('dotenv').config();
const mongoose = require('mongoose');

async function removeEmailIndex() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Get the users collection
        const collection = mongoose.connection.collection('users');

        // Drop the email index
        await collection.dropIndex('email_1');
        console.log('Successfully removed email index');

        // List remaining indexes
        const indexes = await collection.indexes();
        console.log('Remaining indexes:', indexes);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        // Close the connection
        await mongoose.connection.close();
        console.log('Disconnected from MongoDB');
    }
}

removeEmailIndex(); 