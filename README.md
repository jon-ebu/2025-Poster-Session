# 2025 Poster Session - Interactive SVG WebMap

A mobile-first, interactive diagrammatic webmap for poster sessions, built with vanilla HTML5, CSS3, and JavaScript using SVG graphics.

## 🚀 Features

- **Mobile-First Design**: Optimized for touch devices with responsive layout
- **Interactive SVG Map**: Pan, zoom, and click/tap poster areas
- **Custom Shapes**: Support for both rectangles and custom SVG paths/polygons
- **Accessibility**: Full keyboard navigation, ARIA labels, and screen reader support
- **Clickable Markers**: Points of interest with different icon types
- **External JSON Data**: Easy content management without code changes
- **Touch & Mouse Support**: Works on all devices
- **Smooth Animations**: CSS transitions and hover effects

## 📁 Project Structure

```
2025-Poster-Session/
├── index.html          # Main HTML file
├── script.js           # JavaScript functionality
├── data.json          # External data configuration
└── README.md          # This file
```

## 🎯 Getting Started

1. **Open the map**: Simply open `index.html` in a web browser
2. **Local server** (recommended for JSON loading):
   ```bash
   # Using Python
   python -m http.server 8000
   
   # Using Node.js
   npx serve .
   
   # Using PHP
   php -S localhost:8000
   ```
3. **Navigate to**: `http://localhost:8000`

## 📊 Data Structure

### Poster Areas

Each poster area follows this structure:

```json
{
    "id": "unique-identifier",
    "name": "Display Name",
    "x": 100,           // X coordinate
    "y": 120,           // Y coordinate  
    "width": 150,       // Width (for rectangles)
    "height": 100,      // Height (for rectangles)
    "path": "M300,250 L450,250...", // Custom SVG path (optional)
    "url": "#anchor",   // Link URL
    "description": "Area description",
    "presenters": ["Dr. Smith", "Prof. Johnson"],
    "time": "9:00 AM - 11:00 AM"
}
```

### Markers

Points of interest use this structure:

```json
{
    "id": "marker-id",
    "name": "Marker Name",
    "x": 80,
    "y": 60,
    "type": "info",     // info, food, facility, social
    "description": "Marker description"
}
```

## 🛠️ Customization Guide

### 1. Adding Custom Shapes

Replace rectangles with custom shapes using SVG paths:

```json
{
    "id": "custom-area",
    "name": "Custom Shape",
    "path": "M200,400 L500,400 L480,520 L220,520 Z",
    "description": "This area uses a custom trapezoid shape"
}
```

### 2. Creating New Marker Types

Add new marker types in the JavaScript:

```javascript
const iconMap = {
    'info': 'i',
    'food': '☕',
    'facility': '🚻',
    'social': '👥',
    'custom': '⭐'  // Add your custom type
};
```

### 3. Styling Areas

Modify CSS classes in `index.html`:

```css
.poster-area {
    fill: #e3f2fd;              /* Background color */
    stroke: #1976d2;            /* Border color */
    stroke-width: 2;            /* Border width */
}

.poster-area:hover {
    fill: #bbdefb;              /* Hover color */
    stroke-width: 3;            /* Hover border */
}
```

### 4. Loading External Data

Use the `loadExternalData()` method:

```javascript
// Load from JSON file
window.posterMap.loadExternalData('data.json');

// Load from API
window.posterMap.loadExternalData('/api/poster-data');
```

### 5. Adding Interaction Callbacks

Extend the map with custom event handlers:

```javascript
// In script.js, modify selectArea method:
selectArea(areaId) {
    // ... existing code ...
    
    // Custom callback
    if (window.onAreaSelected) {
        window.onAreaSelected(area);
    }
}
```

## 🎨 Design System

### Color Palette

- **Primary**: `#1976d2` (Blue)
- **Secondary**: `#e3f2fd` (Light Blue)
- **Accent**: `#ff5722` (Orange - for markers)
- **Background**: `#f5f5f5` (Light Gray)
- **Text**: `#333` (Dark Gray)

### Typography

- **Font Family**: System fonts (`-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto`)
- **Title**: `1.5rem` (mobile), `1.2rem` (small mobile)
- **Labels**: `12px` (desktop), `10px` (tablet), `8px` (mobile)

## 📱 Mobile Optimizations

- Touch-friendly tap targets (44px minimum)
- Responsive font sizes
- Pinch-to-zoom support
- Touch pan gestures
- Auto-hiding info panels
- Optimized for various screen sizes

## ♿ Accessibility Features

- **Keyboard Navigation**: Tab through all interactive elements
- **Screen Readers**: ARIA labels and roles
- **Focus Indicators**: Visual focus states
- **Semantic HTML**: Proper heading structure
- **Color Contrast**: WCAG AA compliant colors

## 🔧 Browser Support

- **Modern Browsers**: Chrome 60+, Firefox 55+, Safari 12+, Edge 79+
- **Mobile**: iOS Safari 12+, Android Chrome 60+
- **Features Used**: SVG, CSS Grid, Flexbox, ES6 Classes

## 🚀 Performance Considerations

- **SVG Rendering**: Efficient for up to ~1000 shapes
- **Large Datasets**: Consider Canvas (Konva) or WebGL (PixiJS) for 1000+ shapes
- **Lazy Loading**: Load data on demand for better initial performance
- **Debounced Events**: Pan/zoom events are optimized

## 🔄 Advanced Usage

### Custom Shape Generator

Create complex shapes programmatically:

```javascript
function createHexagon(centerX, centerY, radius) {
    const points = [];
    for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3;
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);
        points.push(`${x},${y}`);
    }
    return `M${points.join('L')}Z`;
}
```

### Dynamic Data Updates

Update the map in real-time:

```javascript
// Update poster area data
window.posterMap.posterAreas[0].name = "Updated Name";
window.posterMap.renderMap();

// Add new area
window.posterMap.posterAreas.push(newArea);
window.posterMap.renderPosterAreas();
```

### Integration with Backend

```javascript
// Fetch live data
setInterval(async () => {
    const liveData = await fetch('/api/live-updates').then(r => r.json());
    window.posterMap.updateLiveData(liveData);
}, 30000); // Update every 30 seconds
```

## 📄 License

This project is open source and available under the MIT License.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Make your changes
4. Test on multiple devices
5. Submit a pull request

## 📞 Support

For questions or issues, please open an issue in the repository or contact the development team.

---

**Happy mapping! 🗺️**
