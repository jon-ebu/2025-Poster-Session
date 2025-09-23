// Poster Session Interactive Map
class PosterSessionMap {
    constructor() {
        this.svg = document.getElementById('posterMap');
        this.posterAreasGroup = document.getElementById('poster-areas');
        this.markersGroup = document.getElementById('markers');
        this.infoPanel = document.getElementById('infoPanel');
        this.infoTitle = document.getElementById('infoTitle');
        this.infoDescription = document.getElementById('infoDescription');
        
        this.currentZoom = 1;
        this.minZoom = 1;
        this.maxZoom = 8;
        this.panX = 0;
        this.panY = 0;
        this.panVelocityX = 0;
        this.panVelocityY = 0;
        this.panInertiaFrame = null;
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
        let lastPointerX = 0;
        let lastPointerY = 0;
        let lastPointerTime = 0;

        const recordVelocity = (clientX, clientY) => {
            const now = performance.now();
            if (lastPointerTime) {
                const deltaTime = now - lastPointerTime;
                if (deltaTime > 0) {
                    const deltaPanX = (clientX - lastPointerX) / this.currentZoom;
                    const deltaPanY = (clientY - lastPointerY) / this.currentZoom;
                    const vx = deltaPanX / deltaTime;
                    const vy = deltaPanY / deltaTime;
                    const maxVelocity = 0.5;
                    this.panVelocityX = Math.max(-maxVelocity, Math.min(maxVelocity, vx));
                    this.panVelocityY = Math.max(-maxVelocity, Math.min(maxVelocity, vy));
                }
            }
            lastPointerX = clientX;
            lastPointerY = clientY;
            lastPointerTime = now;
        };

        const beginPan = (clientX, clientY) => {
            isPanning = true;
            startX = clientX;
            startY = clientY;
            initialPanX = this.panX;
            initialPanY = this.panY;
            this.stopPanInertia(true);
            lastPointerTime = 0;
            lastPointerX = clientX;
            lastPointerY = clientY;
            recordVelocity(clientX, clientY);
            this.svg.style.cursor = 'grabbing';
        };

        const updatePan = (clientX, clientY) => {
            const dx = (clientX - startX) / this.currentZoom;
            const dy = (clientY - startY) / this.currentZoom;
            this.panX = initialPanX + dx;
            this.panY = initialPanY + dy;
            this.updateViewBox();
            recordVelocity(clientX, clientY);
        };

        const endPan = () => {
            if (!isPanning) {
                return;
            }
            isPanning = false;
            this.svg.style.cursor = 'grab';
            this.startPanInertia();
        };

        this.svg.style.cursor = 'grab';

        this.svg.addEventListener('mousedown', (e) => {
            const isInteractiveElement = e.target.closest('[data-side]') || 
                                       e.target.closest('.color-marker') ||
                                       e.target.closest('[data-point-id]') ||
                                       e.target.classList.contains('color-marker');
            if (!isInteractiveElement) {
                e.preventDefault();
                beginPan(e.clientX, e.clientY);
            }
        });

        document.addEventListener('mousemove', (e) => {
            if (!isPanning) {
                return;
            }
            updatePan(e.clientX, e.clientY);
        });

        document.addEventListener('mouseup', () => {
            endPan();
        });

        // Global click handler to close info panel when clicking empty map space
        this.svg.addEventListener('click', (e) => {
            const clickedMarker = e.target.closest('[data-side]') || e.target.closest('.color-marker');
            if (!clickedMarker) {
                this.hideInfo();
            }
        });

        // Touch support
        const touchStartHandler = (e) => {
            const touch = e.touches[0];
            const touchTarget = document.elementFromPoint(touch.clientX, touch.clientY);
            const isInteractiveElement = touchTarget?.closest('[data-side]') || 
                                       touchTarget?.closest('.color-marker') ||
                                       touchTarget?.closest('[data-point-id]') ||
                                       touchTarget?.classList.contains('color-marker');
            if (!isInteractiveElement) {
                e.preventDefault();
                beginPan(touch.clientX, touch.clientY);
            }
        };

        try {
            this.svg.addEventListener('touchstart', touchStartHandler, { passive: false });
        } catch (err) {
            this.svg.addEventListener('touchstart', touchStartHandler);
        }

        const touchMoveHandler = (e) => {
            if (!isPanning || e.touches.length !== 1) {
                return;
            }
            e.preventDefault();
            const touch = e.touches[0];
            updatePan(touch.clientX, touch.clientY);
        };

        try {
            document.addEventListener('touchmove', touchMoveHandler, { passive: false });
        } catch (err) {
            document.addEventListener('touchmove', touchMoveHandler);
        }

        document.addEventListener('touchend', (e) => {
            if (e.touches.length === 0) {
                endPan();
            }
        });


        // Mouse wheel zoom
        this.svg.addEventListener('wheel', (e) => {
            e.preventDefault();
            this.stopPanInertia(true);
            
            // Simpler wheel zoom - just zoom in/out from center
            const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
            const newZoom = Math.min(this.maxZoom, Math.max(this.minZoom, this.currentZoom * zoomFactor));
            
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
        this.stopPanInertia(true);
        this.currentZoom = Math.min(this.maxZoom, this.currentZoom * 1.2);
        this.updateViewBox();
    }

    zoomOut() {
        this.stopPanInertia(true);
        const nextZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.currentZoom / 1.2));
        this.currentZoom = nextZoom;
        this.updateViewBox();
    }

    resetView() {
        this.stopPanInertia(true);
        this.currentZoom = 1;
        this.panX = 0;
        this.panY = 0;
        this.updateViewBox();
        this.hideInfo();
    }

    updateViewBox() {
        const baseWidth = 1150;
        const baseHeight = 1360;
        const width = baseWidth / this.currentZoom;
        const height = baseHeight / this.currentZoom;
        const x = -this.panX + (baseWidth - width) / 2;
        const y = -this.panY + (baseHeight - height) / 2;
        
        this.svg.setAttribute('viewBox', `${x} ${y} ${width} ${height}`);
    }

    stopPanInertia(resetVelocity = false) {
        if (this.panInertiaFrame) {
            cancelAnimationFrame(this.panInertiaFrame);
            this.panInertiaFrame = null;
        }
        if (resetVelocity) {
            this.panVelocityX = 0;
            this.panVelocityY = 0;
        }
    }

    startPanInertia() {
        const minVelocity = 0.002;
        const currentVelocity = Math.hypot(this.panVelocityX, this.panVelocityY);
        if (currentVelocity < minVelocity) {
            this.stopPanInertia(true);
            return;
        }

        this.stopPanInertia();

        const decay = 0.92;
        let lastTime = performance.now();

        const step = (time) => {
            const dt = time - lastTime;
            lastTime = time;

            this.panX += this.panVelocityX * dt;
            this.panY += this.panVelocityY * dt;
            this.updateViewBox();

            const decayFactor = Math.pow(decay, dt / 16);
            this.panVelocityX *= decayFactor;
            this.panVelocityY *= decayFactor;

            if (Math.hypot(this.panVelocityX, this.panVelocityY) < minVelocity) {
                this.stopPanInertia(true);
                return;
            }

            this.panInertiaFrame = requestAnimationFrame(step);
        };

        this.panInertiaFrame = requestAnimationFrame(step);
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
