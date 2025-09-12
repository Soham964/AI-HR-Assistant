# 🤖 AI-HR-Assistant

An intelligent HR management system that revolutionizes employee data processing and document management using AI technology.

## 🌟 Features

- **AI-Powered Document Processing**: Automatic extraction of data from resumes and HR documents using OCR
- **Intelligent Analytics**: AI-driven insights for better hiring decisions and workforce management
- **Secure Authentication**: Firebase-based authentication system
- **Real-time Dashboard**: Live analytics and employee data visualization
- **Document Management**: Upload, process, and organize HR documents efficiently
- **Employee Database**: Centralized employee information with smart search capabilities

## 🛠️ Technology Stack

### Frontend
- **React** 18.3.1 - Modern UI library
- **TypeScript** 5.6.3 - Type-safe development
- **Vite** 6.3.5 - Fast build tool and dev server
- **TailwindCSS** 3.4.13 - Utility-first CSS framework
- **Lucide React** - Beautiful icon library
- **Axios** - HTTP client for API requests

### Backend
- **Node.js** v22.12.0 - JavaScript runtime
- **Express.js** 5.1.0 - Web framework
- **MongoDB** - NoSQL database
- **Mongoose** 8.15.1 - MongoDB ODM

### AI & Document Processing
- **Google Generative AI** 0.24.1 - Gemini API for AI insights
- **Tesseract.js** 6.0.1 - OCR for document text extraction
- **PDF-lib** 1.17.1 - PDF manipulation
- **PDF-parse** 1.1.1 - PDF text extraction

### Authentication & Security
- **Firebase Admin SDK** 13.4.0 - Authentication and security
- **JSON Web Tokens** 9.0.2 - Secure token management
- **bcryptjs** 3.0.2 - Password hashing

## 🚀 Quick Start

### Prerequisites
- Node.js v22.12.0
- npm v10.9.0
- MongoDB database
- Firebase project setup
- Google AI API key

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Soham964/AI-HR-Assistant.git
   cd AI-HR-Assistant
   ```

2. **Install Frontend Dependencies**
   ```bash
   cd project_frontend
   npm install
   ```

3. **Install Backend Dependencies**
   ```bash
   cd backend
   npm install
   ```

4. **Environment Setup**
   
   Create `.env` file in the backend directory with your configurations.

5. **Start the Development Servers**
   
   **Backend:**
   ```bash
   cd backend
   npm run dev
   ```
   
   **Frontend:**
   ```bash
   cd project_frontend
   npm run dev
   ```

6. **Access the Application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:5000

## 📁 Project Structure

```
AI-HR-Assistant/
├── backend/                 # Node.js Express backend
│   ├── models/             # Database models
│   ├── routes/             # API routes
│   ├── middleware/         # Custom middleware
│   ├── utils/              # Utility functions
│   └── server.js           # Entry point
├── project_frontend/       # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── services/       # API services
│   │   └── utils/          # Helper functions
│   └── public/            # Static assets
├── last/                   # Python backend alternative
└── README.md
```

## 🔧 Development

### Available Scripts

**Frontend:**
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

**Backend:**
- `npm run dev` - Start development server with nodemon
- `npm start` - Start production server

## 🎯 Core Functionality

### Document Processing Pipeline
1. **Upload**: Users upload resumes/documents
2. **OCR Processing**: Tesseract.js extracts text
3. **AI Analysis**: Gemini AI analyzes and categorizes data
4. **Storage**: Processed data stored in MongoDB
5. **Dashboard**: Real-time analytics and insights

### AI Features
- Automatic resume parsing and data extraction
- Skill matching and candidate ranking
- Workforce analytics and insights
- Intelligent search and filtering

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the ISC License.

## 👨‍💻 Author

**Soham** - [GitHub Profile](https://github.com/Soham964)

---

⭐ If you found this project helpful, please give it a star!