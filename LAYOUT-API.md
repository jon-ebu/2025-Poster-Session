# Layout API Documentation

A powerful and flexible API for placing SVGs and shapes on your interactive poster session map.

## 🚀 Quick Start

The Layout API is automatically initialized when you load the page. Access it via:

```javascript
// In browser console or your scripts
const layout = window.layout;
```

## 📍 Core Methods

### 1. Adding SVG Files

```javascript
await layout.addSVG({
    id: 'my-element',
    svgFile: 'path/to/file.svg',  // or inline SVG string
    position: { x: 100, y: 200 },
    transform: { scale: 1.5, rotate: 45 },
    style: { fill: '#4CAF50', opacity: 0.8 },
    interactive: true,
    onClick: () => console.log('Clicked!')
});
```

### 2. Adding Simple Shapes

```javascript
layout.addShape({
    id: 'rectangle',
    type: 'rect',
    geometry: { width: 100, height: 50, rx: 5 },
    position: { x: 300, y: 400 },
    style: { fill: '#2196F3', stroke: '#1976D2' },
    interactive: true,
    onClick: () => alert('Rectangle clicked!')
});
```

### 3. Relative Positioning

```javascript
// Position element relative to another
layout.positionRelativeTo({
    id: 'element-to-move',
    relativeTo: 'reference-element',
    position: 'below',  // above, below, left, right, inside-center
    offset: 20
});
```

### 4. Grid Layouts

```javascript
// Create a 3x2 grid of elements
layout.createGrid({
    elements: ['poster1', 'poster2', 'poster3', 'poster4', 'poster5', 'poster6'],
    grid: { cols: 3, rows: 2 },
    area: { x: 200, y: 600, width: 800, height: 300 },
    spacing: 20
});
```

## 🎯 Complete Examples

### Example 1: Add Your SVG Files

```javascript
// Add Parsons building (already done in HTML)
// Add Garden Boxes below it
await layout.addSVG({
    id: 'garden-boxes',
    svgFile: 'Garden Boxes.svg',
    position: { x: 400, y: 500 },
    transform: { scale: 1.2 },
    style: { fill: '#4CAF50' },
    interactive: true,
    onClick: () => {
        console.log('Garden area selected');
        // You could show poster information here
    }
});
```

### Example 2: Create Poster Areas

```javascript
// Create a poster area as a rounded rectangle
layout.addShape({
    id: 'poster-area-1',
    type: 'rect',
    geometry: { width: 200, height: 150, rx: 10 },
    position: { x: 100, y: 600 },
    style: { 
        fill: '#e3f2fd', 
        stroke: '#1976d2', 
        strokeWidth: 2 
    },
    interactive: true,
    onClick: function() {
        // Show poster details
        window.posterMap.infoTitle.textContent = 'Computer Science Posters';
        window.posterMap.infoDescription.innerHTML = 'Latest research in AI and ML';
        window.posterMap.infoPanel.classList.add('active');
    }
});
```

### Example 3: Complex Layout

```javascript
// Create a complete poster session layout
async function setupPosterSession() {
    const layout = window.layout;
    
    // 1. Add building elements
    await layout.addSVG({
        id: 'garden-boxes',
        svgFile: 'Garden Boxes.svg',
        position: { x: 400, y: 500 },
        style: { fill: '#4CAF50' }
    });
    
    // 2. Create poster areas in a grid
    const posterIds = [];
    for (let i = 1; i <= 6; i++) {
        const id = `poster-${i}`;
        layout.addShape({
            id: id,
            type: 'rect',
            geometry: { width: 180, height: 120, rx: 8 },
            position: { x: 0, y: 0 }, // Will be positioned by grid
            style: { fill: '#bbdefb', stroke: '#1976d2', strokeWidth: 2 },
            interactive: true,
            onClick: () => showPosterInfo(i)
        });
        posterIds.push(id);
    }
    
    // 3. Arrange posters in grid
    layout.createGrid({
        elements: posterIds,
        grid: { cols: 3, rows: 2 },
        area: { x: 200, y: 700, width: 800, height: 280 },
        spacing: 30
    });
    
    // 4. Add markers
    layout.addShape({
        id: 'info-desk',
        type: 'circle',
        geometry: { radius: 15 },
        position: { x: 100, y: 550 },
        style: { fill: '#ff5722', stroke: 'white', strokeWidth: 2 },
        interactive: true,
        onClick: () => alert('Information Desk')
    });
}

function showPosterInfo(posterNumber) {
    const titles = [
        'Machine Learning Applications',
        'Computer Vision Research', 
        'Natural Language Processing',
        'Robotics and AI',
        'Data Science Projects',
        'Software Engineering'
    ];
    
    window.posterMap.infoTitle.textContent = `Poster ${posterNumber}`;
    window.posterMap.infoDescription.innerHTML = `
        <h4>${titles[posterNumber - 1]}</h4>
        <p>Click to learn more about this research area.</p>
    `;
    window.posterMap.infoPanel.classList.add('active');
}

// Run the setup
setupPosterSession();
```

## 🛠️ Shape Types

### Rectangle
```javascript
{
    type: 'rect',
    geometry: { width: 100, height: 50, rx: 5 },  // rx is border radius
    position: { x: 100, y: 100 }
}
```

### Circle
```javascript
{
    type: 'circle',
    geometry: { radius: 25 },
    position: { x: 200, y: 200 }  // center point
}
```

### Polygon
```javascript
{
    type: 'polygon',
    geometry: { points: '100,100 150,50 200,100 150,150' },
    position: { x: 0, y: 0 }  // Additional offset
}
```

### Custom Path
```javascript
{
    type: 'path',
    geometry: { d: 'M100,100 L200,100 L150,150 Z' },
    position: { x: 0, y: 0 }
}
```

## 🎨 Styling Options

```javascript
style: {
    fill: '#4CAF50',           // Fill color
    stroke: '#388E3C',         // Border color  
    strokeWidth: 2,            // Border width
    opacity: 0.8,              // Transparency (0-1)
}
```

## 🔄 Transform Options

```javascript
transform: {
    scale: 1.5,                // Scale factor
    rotate: 45,                // Rotation in degrees
    anchor: 'center'           // Transform origin (future feature)
}
```

## 📱 Interactive Features

```javascript
interactive: true,
onClick: function(event) {
    // Handle click
    console.log('Element clicked!', event);
    
    // Access the poster map instance
    const map = window.posterMap;
    
    // Show information panel
    map.infoTitle.textContent = 'Custom Title';
    map.infoDescription.innerHTML = '<p>Custom description</p>';
    map.infoPanel.classList.add('active');
}
```

## 🔧 Management Methods

```javascript
// Remove an element
layout.removeElement('my-element-id');

// Update position
layout.updatePosition('my-element', { x: 300, y: 400 });

// Get all element IDs
const allElements = layout.getAllElements();

// Export current layout
const layoutConfig = layout.exportLayout();

// Clear everything
layout.clear();
```

## 🚀 Advanced Usage

### Loading Multiple SVGs

```javascript
const svgFiles = ['building1.svg', 'building2.svg', 'garden.svg'];
const positions = [
    { x: 100, y: 200 },
    { x: 300, y: 200 },
    { x: 500, y: 400 }
];

for (let i = 0; i < svgFiles.length; i++) {
    await layout.addSVG({
        id: `building-${i}`,
        svgFile: svgFiles[i],
        position: positions[i],
        interactive: true,
        onClick: () => console.log(`Building ${i} clicked`)
    });
}
```

### Dynamic Layouts

```javascript
// Create elements that respond to data
const posterData = [
    { id: 'cs-1', title: 'AI Research', track: 'Computer Science' },
    { id: 'math-1', title: 'Statistics', track: 'Mathematics' },
    // ... more data
];

posterData.forEach((poster, index) => {
    layout.addShape({
        id: poster.id,
        type: 'rect',
        geometry: { width: 160, height: 100, rx: 8 },
        position: { x: 100 + (index * 180), y: 600 },
        style: { 
            fill: poster.track === 'Computer Science' ? '#e3f2fd' : '#f3e5f5',
            stroke: poster.track === 'Computer Science' ? '#1976d2' : '#7b1fa2'
        },
        interactive: true,
        onClick: () => showPosterDetails(poster)
    });
});
```

## 💡 Tips

1. **Use meaningful IDs**: Makes debugging and management easier
2. **Group related elements**: Use consistent naming (e.g., `poster-1`, `poster-2`)
3. **Test interactivity**: Always test click handlers on mobile devices
4. **Consider performance**: For 100+ elements, consider using shape objects instead of SVG files
5. **Export layouts**: Use `exportLayout()` to save configurations
6. **Relative positioning**: Use `positionRelativeTo()` for responsive layouts

## 🐛 Troubleshooting

**SVG not loading?**
- Check file path is correct
- Ensure SVG file is valid
- Use browser dev tools to check for network errors

**Click not working?**
- Ensure `interactive: true` is set
- Check that elements aren't overlapping
- Verify onClick function is defined

**Position seems wrong?**
- Remember SVG coordinates start at top-left (0,0)
- Check transform properties
- Use browser inspector to check actual element positions

---

Happy mapping! 🗺️ Use the Layout API to create amazing interactive poster session maps!
