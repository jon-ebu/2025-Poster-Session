// Poster Session Interactive Map
class PosterSessionMap {
    constructor() {
        this.svg = document.getElementById('posterMap');
        this.posterAreasGroup = document.getElementById('poster-areas');
        this.markersGroup = document.getElementById('markers');
        this.infoPanel = document.getElementById('infoPanel');
        this.infoTitle = document.getElementById('infoTitle');
        this.infoDescription = document.getElementById('infoDescription');
        this.coordinateDisplay = document.getElementById('coordinateDisplay');
        
        this.currentZoom = 1;
        this.minZoom = 0.25;
        this.maxZoom = 8;
        this.panX = 0;
        this.panY = 0;
        this.selectedArea = null;
        
        this.initializeData();
        this.initializeEventListeners();
        this.renderMap();
    }

    initializeData() {
        // Data structure for poster areas - easily extensible and can be loaded from JSON
        // Currently empty - geometry will be added later
        this.posterAreas = [];

        // Points of interest markers
        // Currently empty - markers will be added later
        this.markers = [];
    }

    initializeEventListeners() {
        // Zoom controls
        document.getElementById('zoomIn').addEventListener('click', () => this.zoomIn());
        document.getElementById('zoomOut').addEventListener('click', () => this.zoomOut());
        document.getElementById('resetView').addEventListener('click', () => this.resetView());

        // Pan functionality (touch and mouse)
        let isPanning = false;
        let startX, startY, initialPanX, initialPanY;

        this.svg.addEventListener('mousedown', (e) => {
            if (e.target === this.svg || e.target.tagName === 'rect') {
                isPanning = true;
                startX = e.clientX;
                startY = e.clientY;
                initialPanX = this.panX;
                initialPanY = this.panY;
                this.svg.style.cursor = 'grabbing';
            }
        });

        document.addEventListener('mousemove', (e) => {
            if (isPanning) {
                const dx = (e.clientX - startX) / this.currentZoom;
                const dy = (e.clientY - startY) / this.currentZoom;
                this.panX = initialPanX + dx;
                this.panY = initialPanY + dy;
                this.updateViewBox();
            }
        });

        document.addEventListener('mouseup', () => {
            isPanning = false;
            this.svg.style.cursor = 'grab';
        });

        // Touch support
        this.svg.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            isPanning = true;
            startX = touch.clientX;
            startY = touch.clientY;
            initialPanX = this.panX;
            initialPanY = this.panY;
        });

        document.addEventListener('touchmove', (e) => {
            if (isPanning && e.touches.length === 1) {
                e.preventDefault();
                const touch = e.touches[0];
                const dx = (touch.clientX - startX) / this.currentZoom;
                const dy = (touch.clientY - startY) / this.currentZoom;
                this.panX = initialPanX + dx;
                this.panY = initialPanY + dy;
                this.updateViewBox();
            }
        });

        document.addEventListener('touchend', () => {
            isPanning = false;
        });

        // Coordinate tracking
        this.svg.addEventListener('mousemove', (e) => {
            const rect = this.svg.getBoundingClientRect();
            const viewBox = this.svg.viewBox.baseVal;
            
            // Calculate SVG coordinates
            const scaleX = viewBox.width / rect.width;
            const scaleY = viewBox.height / rect.height;
            
            const x = Math.round((e.clientX - rect.left) * scaleX + viewBox.x);
            const y = Math.round((e.clientY - rect.top) * scaleY + viewBox.y);
            
            this.coordinateDisplay.textContent = `x: ${x}, y: ${y}`;
            this.coordinateDisplay.classList.add('active');
        });

        this.svg.addEventListener('mouseleave', () => {
            this.coordinateDisplay.classList.remove('active');
        });

        // Mouse wheel zoom
        this.svg.addEventListener('wheel', (e) => {
            e.preventDefault();
            
            // Simpler wheel zoom - just zoom in/out from center
            const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
            const newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.currentZoom * zoomFactor));
            
            if (newZoom !== this.currentZoom) {
                this.currentZoom = newZoom;
                this.updateViewBox();
            }
        });

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.target.classList.contains('poster-area')) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.selectArea(e.target.dataset.areaId);
                }
            }
        });
    }

    renderMap() {
        this.renderPosterAreas();
        this.renderMarkers();
    }

    renderPosterAreas() {
        this.posterAreasGroup.innerHTML = '';

        this.posterAreas.forEach(area => {
            const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            
            let shape;
            if (area.path) {
                // Custom path/polygon
                shape = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                shape.setAttribute('d', area.path);
            } else {
                // Rectangle
                shape = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                shape.setAttribute('x', area.x);
                shape.setAttribute('y', area.y);
                shape.setAttribute('width', area.width);
                shape.setAttribute('height', area.height);
                shape.setAttribute('rx', '5');
            }

            shape.classList.add('poster-area');
            shape.setAttribute('data-area-id', area.id);
            shape.setAttribute('tabindex', '0');
            shape.setAttribute('role', 'button');
            shape.setAttribute('aria-label', `${area.name} - ${area.description}`);

            // Calculate label position
            let labelX, labelY;
            if (area.path) {
                // For custom paths, use area x,y as approximation
                labelX = area.x + (area.width || 75);
                labelY = area.y + (area.height || 50);
            } else {
                labelX = area.x + area.width / 2;
                labelY = area.y + area.height / 2;
            }

            const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            label.setAttribute('x', labelX);
            label.setAttribute('y', labelY);
            label.classList.add('area-label');
            label.textContent = area.name;

            // Event listeners
            shape.addEventListener('click', () => this.selectArea(area.id));
            shape.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.selectArea(area.id);
            });

            group.appendChild(shape);
            group.appendChild(label);
            this.posterAreasGroup.appendChild(group);
        });
    }

    renderMarkers() {
        // Markers disabled - no clickable markers will be rendered
        this.markersGroup.innerHTML = '';
    }

    selectArea(areaId) {
        // Clear previous selection
        document.querySelectorAll('.poster-area').forEach(area => {
            area.classList.remove('selected');
        });

        const area = this.posterAreas.find(a => a.id === areaId);
        if (area) {
            // Mark as selected
            const areaElement = document.querySelector(`[data-area-id="${areaId}"]`);
            areaElement.classList.add('selected');
            areaElement.focus();

            this.selectedArea = area;
            this.showAreaInfo(area);
        }
    }

    showAreaInfo(area) {
        this.infoTitle.textContent = area.name;
        this.infoDescription.innerHTML = `
            <p><strong>Focus:</strong> ${area.description}</p>
            <p><strong>Time:</strong> ${area.time}</p>
            <p><strong>Presenters:</strong> ${area.presenters.join(', ')}</p>
        `;
        this.infoPanel.classList.add('active');

        // Auto-hide after 10 seconds
        setTimeout(() => {
            if (this.infoPanel.classList.contains('active')) {
                this.hideInfo();
            }
        }, 10000);
    }

    // Marker info functionality disabled
    showMarkerInfo(markerId) {
        // No marker info will be shown
        return;
    }

    hideInfo() {
        this.infoPanel.classList.remove('active');
        if (this.selectedArea) {
            document.querySelectorAll('.poster-area').forEach(area => {
                area.classList.remove('selected');
            });
            this.selectedArea = null;
        }
    }

    zoomIn() {
        this.currentZoom = Math.min(this.maxZoom, this.currentZoom * 1.2);
        this.updateViewBox();
    }

    zoomOut() {
        this.currentZoom = Math.max(this.minZoom, this.currentZoom / 1.2);
        this.updateViewBox();
    }

    resetView() {
        this.currentZoom = 1;
        this.panX = 0;
        this.panY = 0;
        this.updateViewBox();
        this.hideInfo();
    }

    updateViewBox() {
        const baseWidth = 1200;
        const baseHeight = 1600;
        const width = baseWidth / this.currentZoom;
        const height = baseHeight / this.currentZoom;
        const x = -this.panX + (baseWidth - width) / 2;
        const y = -this.panY + (baseHeight - height) / 2;
        
        this.svg.setAttribute('viewBox', `${x} ${y} ${width} ${height}`);
    }

    // Method to load external JSON data
    async loadExternalData(jsonUrl) {
        try {
            const response = await fetch(jsonUrl);
            const data = await response.json();
            
            if (data.posterAreas) {
                this.posterAreas = data.posterAreas;
            }
            if (data.markers) {
                this.markers = data.markers;
            }
            
            this.renderMap();
        } catch (error) {
            console.error('Error loading external data:', error);
        }
    }
}

// Make the class available globally
window.PosterSessionMap = PosterSessionMap;

// Initialize the map when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.posterMap = new PosterSessionMap();
});

// Export for potential external use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PosterSessionMap;
}
