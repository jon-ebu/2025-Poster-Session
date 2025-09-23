# 2025 Poster Session Interactive Map

A mobile-first, interactive SVG-based map for poster sessions with color-coded poster mounts and hover-based information display.

## 📁 File Organization

```
2025-Poster-Session/
├── index.html              # Main application file
├── README.md              # This documentation
├── assets/                # Static assets
│   ├── css/              # Stylesheets
│   │   └── table.css     # Table styling (if used)
│   ├── js/               # JavaScript files
│   │   ├── script.js     # Core PosterSessionMap class
│   │   ├── layout-api.js # Layout API for SVG management
│   │   └── unified-app.js # Additional app functionality
│   └── svg/              # SVG building/map files
│       ├── Parsons.svg
│       ├── Garden Boxes.svg
│       ├── Strauss Plaza.svg
│       └── Sprague.svg
├── data/                 # Data files
│   ├── Poster_Research_Scholarships.tsv  # Poster information
│   └── Mounts.tsv        # Physical mount positions & orientations
└── docs/                 # Documentation
    └── LAYOUT-API.md     # Layout API documentation
```

## 🚀 Quick Start

1. Open `index.html` in a web browser
2. The map will automatically load poster mounts from the TSV files
3. Hover over colored circles to view poster information
4. Use mouse wheel or touch gestures to zoom and pan

## 📊 Data Structure

### Poster Data (`data/Poster_Research_Scholarships.tsv`)
- **Poster Category**: Subject area (Biology, Chemistry, etc.)
- **Easel Board**: Unique poster identifier (B-1, C-3, etc.)
- **Poster Title**: Full poster title
- **Student(s)**: Student authors
- **Faculty/Mentor**: Faculty advisor
- **Mount ID**: References physical mount (links to Mounts.tsv)
- **Side**: North/South (horizontal) or East/West (vertical) positioning

### Mount Data (`data/Mounts.tsv`)
- **Mount ID**: Unique mount identifier
- **X Coordinate**: Pixel position from left (0-1200)
- **Y Coordinate**: Pixel position from top (0-1600)
- **Orientation**: 'horizontal' or 'vertical'

## 🎨 Color Coding

Poster circles are automatically color-coded by subject:
- **Biology (B)**: Green `#008000`
- **Chemistry (C)**: Red `#FF0000`
- **Computer Science (CS)**: Light Blue `#87CEEB`
- **Engineering (E)**: Black `#000000`
- **Physics (P)**: Purple `#800080`
- **Mathematics (M)**: Deep Orange `#FF8C00`
- **And more...** (see `getColorByEaselBoardId()` in layout-api.js)

## 🛠️ Technical Features

- **Mobile-first responsive design**
- **Hover-based information display**
- **SVG-based scalable graphics**
- **Touch-friendly interactions**
- **Keyboard accessibility**
- **Directional poster positioning**
- **Layer management** (posters always visible above buildings)

## 📝 Adding New Content

### Add a New Poster:
1. Add row to `data/Poster_Research_Scholarships.tsv`
2. Specify existing Mount ID or create new mount in `data/Mounts.tsv`

### Add a New Mount:
1. Add row to `data/Mounts.tsv` with coordinates and orientation
2. Reference the Mount ID in poster data

### Add a New Building:
1. Add SVG file to `assets/svg/`
2. Use Layout API in `index.html` to position it

## 🎯 Browser Support

Modern browsers with SVG and ES6+ support:
- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+