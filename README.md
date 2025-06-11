# KingDragonVN Backend API

A Node.js backend API with authentication features including user registration and login.

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn

## Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/kingdragonvn-be.git
cd kingdragonvn-be
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory with the following content:
```
PORT=3000
MONGODB_URI=mongodb://localhost:27017/kingdragonvn
JWT_SECRET=your-super-secret-key-here
JWT_EXPIRE=24h
```

4. Start the development server:
```bash
npm run dev
```

## API Endpoints

### Authentication

#### Register a new user
- **POST** `/api/auth/register`
- **Body:**
```json
{
  "username": "example",
  "email": "example@email.com",
  "password": "password123"
}
```

#### Login
- **POST** `/api/auth/login`
- **Body:**
```json
{
  "email": "example@email.com",
  "password": "password123"
}
```

### Protected Routes
To access protected routes, include the JWT token in the Authorization header:
```
Authorization: Bearer your-token-here
```

## Error Handling

The API returns appropriate HTTP status codes and error messages:

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `500` - Server Error

## Security Features

- Password hashing using bcrypt
- JWT-based authentication
- Input validation
- Protected routes middleware
- CORS enabled 