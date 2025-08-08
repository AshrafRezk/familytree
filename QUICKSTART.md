# 🚀 Quick Start Guide

## ⚠️ Important: You Need a Local Server

The family tree application **cannot run directly from the file system** due to browser security restrictions. You must use a local HTTP server.

## 🎯 Choose Your Method

### Method 1: Python Server (Recommended)
```bash
# Navigate to the project directory
cd "path/to/your/family-tree-project"

# Run the included server script
python3 server.py
```

### Method 2: Python Built-in Server
```bash
# Navigate to the project directory
cd "path/to/your/family-tree-project"

# Start Python server
python3 -m http.server 8000
```

### Method 3: Node.js Server
```bash
# Install serve globally (if not already installed)
npm install -g serve

# Navigate to the project directory
cd "path/to/your/family-tree-project"

# Start server
serve .
```

### Method 4: PHP Server
```bash
# Navigate to the project directory
cd "path/to/your/family-tree-project"

# Start PHP server
php -S localhost:8000
```

## 🌐 Access the Application

Once your server is running:

1. **Open your browser**
2. **Go to**: `http://localhost:8000`
3. **The application will load automatically**

## 📱 Mobile Testing

To test on mobile devices:

1. **Find your computer's IP address**:
   - **Mac/Linux**: `ifconfig` or `ip addr`
   - **Windows**: `ipconfig`

2. **On your mobile device**, go to: `http://[your-ip]:8000`
   - Example: `http://192.168.1.100:8000`

## 🔧 Troubleshooting

### "Failed to load resource" Error
- ✅ **Solution**: Use a local server (see methods above)
- ❌ **Don't**: Open `index.html` directly in the browser

### "Service Worker registration failed"
- ✅ **Normal**: This only works on HTTP/HTTPS, not file://
- ✅ **Solution**: Use a local server

### "Could not load CSV file"
- ✅ **Normal**: CSV loading only works on HTTP/HTTPS
- ✅ **Solution**: Use a local server
- ✅ **Fallback**: The app will use sample data

### "Material Design Components not loaded"
- ✅ **Normal**: Components will still work with basic styling
- ✅ **Solution**: Use a local server for full functionality

### Port Already in Use
```bash
# Try a different port
python3 server.py --port 8001
# Then go to: http://localhost:8001
```

## 📊 What You'll See

1. **Loading Screen**: Brief loading indicator
2. **Family Tree**: Interactive 3D visualization
3. **Sample Data**: If no CSV is loaded, you'll see sample family members
4. **Controls**: Navigation buttons on the right
5. **Search**: Click the search icon to find people
6. **Admin**: Click the admin icon (password: `admin123`)

## 🎮 How to Use

### Navigation
- **Pan**: Click and drag
- **Zoom**: Mouse wheel or zoom buttons
- **Search**: Click search icon (🔍)
- **Details**: Click on any person

### Admin Panel
1. Click the admin icon (⚙️)
2. Enter password: `admin123`
3. Add/edit people and relationships

### Keyboard Shortcuts
- `Ctrl/Cmd + F`: Search
- `Ctrl/Cmd + H`: Help
- `Ctrl/Cmd + 0`: Reset view
- `Escape`: Close panels

## 🆘 Still Having Issues?

1. **Check the console** (F12) for error messages
2. **Ensure you're using a local server** (not file://)
3. **Try a different browser** (Chrome, Firefox, Safari)
4. **Check the README.md** for detailed documentation

## 📞 Need Help?

- Check the main `README.md` for comprehensive documentation
- Look at the browser console (F12) for specific error messages
- Ensure all files are in the same directory

---

**Happy exploring your family tree! 🌳**
