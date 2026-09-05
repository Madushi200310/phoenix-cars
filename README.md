# 🔥 Phoenix Cars

A full-featured car dealership web application with real-time chat, 3D model viewing, and vehicle tracking capabilities.

## 🚀 Live Demo

[View Live Application]([https://phoenix-cars-jfw7tf4mg-madushi200310s-projects.vercel.app/])

## 📋 Features

### 🚗 Vehicle Management
- Browse vehicles with search functionality
- View detailed vehicle information
- Interactive 3D model viewer for supported vehicles
- Real-time vehicle location tracking (Sri Lanka)

### 💬 Communication
- Real-time chat between users and admin team
- Instant notifications for new messages
- Admin reply system for customer inquiries

### 👥 User System
- User authentication (Login/Register)
- Role-based access (Admin/User)
- User dashboard with inquiry history
- Admin panel with full CRUD operations

### 📊 Admin Features
- Add/Delete vehicles with image upload
- View and reply to customer messages
- Dashboard statistics and analytics
- Real-time notification system

### 📍 Location Tracking
- Vehicle location tracking in Sri Lanka
- Interactive map integration
- Live location updates

## 🛠️ Technologies Used

### Frontend
- **React** - UI Framework
- **React Router** - Navigation and routing
- **CSS** - Styling

### Backend & Services
- **Firebase**
  - Firestore - Database
  - Authentication - User management
- **Cloudinary** - Image hosting and management
- **Vercel** - Hosting and deployment

### APIs & Integrations
- OpenStreetMap - Location tracking
- Firebase Realtime Database - Real-time features

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- Firebase account
- Cloudinary account

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/Madushi200310/phoenix-cars.git
cd phoenix-cars
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure Firebase**
   - Create a Firebase project
   - Enable Authentication (Email/Password)
   - Set up Firestore Database
   - Copy your Firebase config

4. **Set up environment variables**
   Create a `.env` file in the root directory:
```env
REACT_APP_FIREBASE_API_KEY=your_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_auth_domain
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_storage_bucket
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id
```

5. **Configure Cloudinary**
   - Create a Cloudinary account
   - Get your Cloud Name
   - Create an upload preset
   - Update `firebase.js` with your Cloudinary credentials

6. **Start the development server**
```bash
npm start
```

The app will open at `http://localhost:3000`

## 📁 Project Structure

```
phoenix-cars/
├── src/
│   ├── pages/
│   │   ├── Home.js          # Vehicle listing page
│   │   ├── VehicleDetails.js # Individual vehicle view
│   │   ├── Dashboard.js     # User/Admin dashboard
│   │   ├── Login.js         # Login page
│   │   └── Register.js      # Registration page
│   ├── components/
│   │   └── VehicleCard.js   # Vehicle card component
│   ├── firebase.js          # Firebase configuration
│   └── App.js               # Main application
├── public/
│   └── index.html
├── package.json
└── README.md
```

## 🔧 Available Scripts

In the project directory, you can run:

### `npm start`
Runs the app in development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

### `npm run build`
Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build.

### `npm test`
Launches the test runner in interactive watch mode.

## 🚀 Deployment

### Deploy to Vercel

1. **Install Vercel CLI**
```bash
npm install -g vercel
```

2. **Deploy**
```bash
vercel --prod
```

Or connect your GitHub repository to Vercel for automatic deployments.

### Deploy to Firebase Hosting

```bash
npm install -g firebase-tools
firebase login
firebase init hosting
firebase deploy
```

## 📊 Database Structure

### Firestore Collections

```javascript
vehicles/
  └── {vehicleId}/
      ├── name
      ├── price
      ├── year
      ├── mileage
      ├── color
      ├── description
      ├── image (Cloudinary URL)
      ├── modelUrl (3D model URL)
      └── messages/
          └── {messageId}/
              ├── text
              ├── sender
              ├── role (admin/user)
              ├── time
              └── uid

users/
  └── {uid}/
      ├── name
      ├── email
      └── role (admin/user)
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👥 Authors

- **Madushi200310** - Initial work

## 🙏 Acknowledgments

- Firebase for backend services
- Cloudinary for image hosting
- Vercel for hosting
- OpenStreetMap for mapping services


---

**Made with ❤️ by the Phoenix Cars Team**
