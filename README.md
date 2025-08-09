# Soliman Dawood Family Tree (1795 to Date)

A modern, interactive family tree visualization application built with Material Design 3 principles. This application displays the Soliman Dawood family lineage from 1795 to the present day with advanced search capabilities, Arabic-English transliteration, and responsive design.

## 🌟 Features

- **Interactive 2D Family Tree Visualization**: High-quality SVG-based tree rendering with smooth animations
- **Advanced Search**: Cognitive search with Arabic-English transliteration support
- **Material Design 3**: Modern UI/UX following Google's Material Design 3 guidelines
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- **Theme Support**: Light and dark mode with automatic theme detection
- **Accessibility**: Full keyboard navigation and screen reader support
- **Data Management**: CSV import/export capabilities
- **Real-time Updates**: Live search results with fuzzy matching

## 🚀 Live Demo

Visit the live application: [https://soliman-dawood-family-tree.netlify.app](https://soliman-dawood-family-tree.netlify.app)

## 🛠️ Technology Stack

- **Frontend**: Vanilla JavaScript (ES6+)
- **Visualization**: D3.js v7 for 2D tree rendering
- **Styling**: Material Design 3 CSS with custom theming
- **Data**: CSV format with JSON conversion
- **Deployment**: Netlify (static hosting)
- **Fonts**: Noto Naskh Arabic for Arabic text support

## 📁 Project Structure

```
├── index.html              # Main application entry point
├── js/                     # JavaScript modules
│   ├── main.js            # Main application logic
│   ├── family-tree-gl.js  # WebGL tree visualization using Cytoscape.js
│   ├── data-converter.js  # CSV to JSON conversion
│   ├── ui-controller.js   # UI interactions
│   ├── fuzzy-search.js    # Fuse.js fuzzy search with transliterations
│   └── admin-panel.js     # Admin functionality
├── styles/                 # CSS stylesheets
│   └── main.css           # Material Design 3 styles
├── Family_Tree_with_Birth_Links.csv  # Family data
├── netlify.toml           # Netlify deployment config
└── README.md              # This file
```

## 🎯 Key Features

### Search & Navigation
- **Fuzzy Search**: Fuse.js powered search supporting Arabic/English transliterations
- **Real-time Results**: Instant search results as you type with parent/spouse disambiguation
- **Navigation**: Click search results to focus on specific people

### Visualization
- **WebGL Tree Layout**: Cytoscape.js with ELK layout for large datasets
- **Mini-map**: Quick navigation of large trees
- **Zoom & Pan**: Interactive navigation through the tree
- **Responsive Design**: Adapts to different screen sizes

### Data Management
- **CSV Import**: Load family data from CSV files
- **Data Validation**: Automatic data validation and error handling
- **Export Capabilities**: Export data in various formats
- **Local Storage**: Automatic state persistence

## 🚀 Deployment

### Netlify Deployment

This application is configured for easy deployment on Netlify:

1. **Fork/Clone Repository**:
   ```bash
   git clone https://github.com/yourusername/soliman-dawood-family-tree.git
   cd soliman-dawood-family-tree
   ```

2. **Deploy to Netlify**:
   - Connect your GitHub repository to Netlify
   - Set build settings:
     - Build command: (leave empty)
     - Publish directory: `.`
   - Deploy!

3. **Custom Domain** (Optional):
   - Add your custom domain in Netlify settings
   - Configure DNS records as instructed

### Local Development

1. **Clone Repository**:
   ```bash
   git clone https://github.com/yourusername/soliman-dawood-family-tree.git
   cd soliman-dawood-family-tree
   ```

2. **Start Local Server**:
   ```bash
   # Using Python 3
   python3 server.py --port 8000
   
   # Or using Python's built-in server
   python3 -m http.server 8000
   ```

3. **Open Browser**:
   Navigate to `http://localhost:8000`

## 📊 Data Format

The application expects CSV data in the following format:

```csv
ID,First Name,Middle Name,Last Name,Full Name,Birth Year,Death Year,Father ID,Mother ID,Spouse IDs,Notes/Source Page,Birth_Reference_Link
1,أبو علام,—,—,أبو علام,—,—,—,—,—,P2,
2,حزين,أبو علام,—,حزين أبو علام,—,—,1,—,—,P2,
```

### Required Fields:
- `ID`: Unique identifier for each person
- `First Name`: Person's first name
- `Full Name`: Complete name (used for display)
- `Birth Year`: Year of birth (optional)
- `Death Year`: Year of death (optional)
- `Father ID`: ID of father (optional)
- `Mother ID`: ID of mother (optional)
- `Spouse IDs`: Comma-separated list of spouse IDs (optional)

## 🎨 Customization

### Themes
The application supports Material Design 3 theming:

- **Light Theme**: Clean, modern light interface
- **Dark Theme**: Eye-friendly dark mode
- **Automatic Detection**: Respects system preferences

### Styling
Customize the appearance by modifying `styles/main.css`:

```css
:root {
  --md-sys-color-primary: #6750a4;
  --md-sys-color-background: #ffffff;
  /* Add more custom variables */
}
```

## 🔧 Configuration

### Netlify Configuration
The `netlify.toml` file includes:

- **Security Headers**: XSS protection, content security policy
- **Caching**: Optimized caching for static assets
- **Redirects**: SPA routing support
- **Build Settings**: Automatic deployment configuration

### Performance Optimization
- **Asset Caching**: Long-term caching for JS/CSS files
- **Compression**: Automatic gzip compression
- **CDN**: Global content delivery network
- **Minification**: Automatic asset optimization

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Commit changes: `git commit -am 'Add new feature'`
4. Push to branch: `git push origin feature/new-feature`
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Material Design 3**: Google's design system
- **D3.js**: Data visualization library
- **Noto Naskh Arabic**: Arabic typography support
- **Netlify**: Hosting and deployment platform

## 📞 Support

For support and questions:
- Create an issue on GitHub
- Contact: [your-email@example.com]
- Documentation: [Wiki](https://github.com/yourusername/soliman-dawood-family-tree/wiki)

---

**Built with ❤️ for the Soliman Dawood family**
