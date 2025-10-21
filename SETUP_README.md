# TypeFlow Setup Guide

A comprehensive guide to set up and run the TypeFlow typing practice application.

## 🚀 Quick Start (Frontend Only)

### Method 1: Direct File Access
```bash
# Simply open the HTML file in your browser
open /workspace/index.html
# OR double-click index.html in your file manager
```

### Method 2: Local HTTP Server
```bash
# Navigate to the project directory
cd /workspace

# Start a simple HTTP server
python3 -m http.server 8000

# Open your browser and visit:
# http://localhost:8000
```

## 🔧 Full Setup (With Backend)

### Prerequisites
- Node.js (version 14 or higher)
- Python 3 (for HTTP server)

### Step 1: Install Dependencies
```bash
cd /workspace

# Initialize npm project
npm init -y

# Install required packages
npm install express cors jsonwebtoken body-parser
```

### Step 2: Start the Backend Server
```bash
# Start the Express server
node server.js
```
The server will run on `http://localhost:4000`

### Step 3: Start the Frontend
```bash
# In a new terminal window, start the frontend server
cd /workspace
python3 -m http.server 8000
```

### Step 4: Access the Application
Open your browser and visit: `http://localhost:8000`

## 🎯 Features Overview

### Real-time Visualizations
- **Live Key Stream**: See your keystrokes as animated chips
- **Character Highlighting**: Green for correct, red for errors
- **Live Stats**: WPM, accuracy, errors, and time update in real-time
- **Visual Keyboard**: Shows key performance with color coding

### Adaptive Learning
- **Smart Suggestions**: Identifies your weak characters
- **Drill Mode**: Generates targeted practice from weak keys
- **Error Pattern Analysis**: Tracks confusion pairs (e.g., "e→r")
- **Session History**: Stores and analyzes past performance

### User Interface
- **Theme Toggle**: Switch between dark/light modes
- **Particle Background**: Cyberpunk-style animated background
- **Responsive Design**: Works on desktop and mobile
- **Accessibility**: Screen reader support and keyboard navigation

## 📊 How to Use

1. **Start Typing**: Click in the text area and begin typing
2. **Watch Feedback**: Observe real-time visual feedback
3. **Check Stats**: Monitor your WPM and accuracy
4. **Use Drills**: Click "Start Drill" to practice weak characters
5. **View History**: Check past sessions for improvement tracking

## 🔧 Configuration

### Backend Configuration
Edit `server.js` to customize:
- Port number (default: 4000)
- JWT secret key
- Database connection (currently in-memory)

### Frontend Configuration
Edit `src/app.js` to customize:
- API endpoints
- UI behavior
- Theme settings

## 🐛 Troubleshooting

### Common Issues

**Port Already in Use**
```bash
# Kill process using port 4000
lsof -ti:4000 | xargs kill -9

# Or use a different port
PORT=4001 node server.js
```

**Module Not Found Errors**
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

**CORS Issues**
- Ensure backend is running on port 4000
- Check that frontend is accessing via HTTP (not file://)

### Browser Compatibility
- Chrome/Chromium: Full support
- Firefox: Full support
- Safari: Full support
- Edge: Full support

## 📁 Project Structure

```
/workspace/
├── index.html              # Main HTML file
├── server.js               # Express backend server
├── sw.js                   # Service worker for offline support
├── manifest.json           # PWA manifest
├── src/
│   ├── app.js             # Main application logic
│   ├── engine.js          # Typing engine core
│   └── particles.js       # Background particle effects
├── styles/
│   ├── base.css           # Base styles and variables
│   ├── style.css          # Main styling
│   └── optimized.css      # Optimized styles
└── icons/                 # App icons for PWA
```

## 🚀 Deployment

### Local Development
- Frontend: `http://localhost:8000`
- Backend API: `http://localhost:4000`

### Production Deployment
1. Build optimized assets
2. Deploy frontend to static hosting (Netlify, Vercel, etc.)
3. Deploy backend to cloud provider (Heroku, Railway, etc.)
4. Update API endpoints in frontend code

## 📝 Development Notes

- All data is stored locally in browser localStorage
- No external dependencies required for basic functionality
- Backend is optional but provides user authentication
- Service worker enables offline functionality
- Modular architecture allows easy React/Vue migration

## 🆘 Support

If you encounter issues:
1. Check the browser console for errors
2. Ensure all dependencies are installed
3. Verify ports are not in use
4. Check file permissions

## 📄 License

This is a prototype project. Choose an appropriate license before publishing (MIT recommended).

---

**Happy Typing! 🎯**