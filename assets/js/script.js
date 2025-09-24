// Poster Session Interactive Map
class PosterSessionMap {
    constructor() {
        this.svg = document.getElementById('posterMap');
        this.posterAreasGroup = document.getElementById('poster-areas');
        this.markersGroup = document.getElementById('markers');
        this.infoPanel = document.getElementById('infoPanel');
        this.infoTitle = document.getElementById('infoTitle');
        this.infoDescription = document.getElementById('infoDescription');
        this.fullscreenBtn = document.getElementById('toggleFullscreen');
        this.tableToggleBtn = document.getElementById('tableToggle');
        this.tablePanel = document.getElementById('tablePanel');
        this.isFullScreen = document.body.classList.contains('map-fullscreen');
        this.isTableOpen = document.body.classList.contains('map-table-open');
        this.handleGlobalKeydown = (event) => {
            if (event.key !== 'Escape') {
                return;
            }

            if (this.isFullScreen && this.isTableOpen) {
                event.preventDefault();
                this.toggleTable(false);
                return;
            }

            if (this.isFullScreen) {
                event.preventDefault();
                this.toggleFullScreen(false);
            }
        };
        
        this.currentZoom = 1;
        this.minZoom = 1;
        this.maxZoom = 8;
        this.panX = 0;
        this.panY = 0;
        this.panVelocityX = 0;
        this.panVelocityY = 0;
        this.panInertiaFrame = null;
        this.selectedArea = null;
        this.panAnimationFrame = null;
        this.panAnimationComplete = null;

        this.baseWidth = 1150;
        this.baseHeight = 1360;
        
        this.initializeData();
        this.initializeEventListeners();
        this.updateFullScreenUI();
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

        if (this.fullscreenBtn) {
            this.fullscreenBtn.addEventListener('click', () => this.toggleFullScreen());
        }

        if (this.tableToggleBtn) {
            this.tableToggleBtn.addEventListener('click', () => this.toggleTable());
        }

        document.addEventListener('keydown', this.handleGlobalKeydown);

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
            this.stopPanAnimation();
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
        this.stopPanAnimation();
        this.currentZoom = Math.min(this.maxZoom, this.currentZoom * 1.2);
        this.updateViewBox();
    }

    zoomOut() {
        this.stopPanInertia(true);
        this.stopPanAnimation();
        const nextZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.currentZoom / 1.2));
        this.currentZoom = nextZoom;
        this.updateViewBox();
    }

    resetView() {
        this.stopPanInertia(true);
       this.stopPanAnimation();
       this.currentZoom = 1;
       this.panX = 0;
       this.panY = 0;
       this.updateViewBox();
       this.hideInfo();
    }

    toggleFullScreen(forceState) {
        const shouldEnable = typeof forceState === 'boolean' ? forceState : !this.isFullScreen;

        if (shouldEnable === this.isFullScreen) {
            return;
        }

        this.isFullScreen = shouldEnable;
        document.body.classList.toggle('map-fullscreen', this.isFullScreen);
        this.setTableOpen(false);
        this.updateFullScreenUI();
    }

    toggleTable(forceOpen) {
        const desiredState = typeof forceOpen === 'boolean' ? forceOpen : !this.isTableOpen;
        this.setTableOpen(desiredState);
    }

    setTableOpen(shouldOpen) {
        const normalized = Boolean(shouldOpen);

        if (!this.isFullScreen) {
            this.isTableOpen = false;
            document.body.classList.remove('map-table-open');
            this.updateTableToggleUI();
            this.releaseTemporaryTableFocus();
            return;
        }

        if (normalized === this.isTableOpen) {
            this.updateTableToggleUI();
            return;
        }

        this.isTableOpen = normalized;
        document.body.classList.toggle('map-table-open', this.isTableOpen);
        this.updateTableToggleUI();

        if (this.isTableOpen) {
            this.focusTablePanel();
        } else {
            this.releaseTemporaryTableFocus();
        }
    }

    updateFullScreenUI() {
        if (this.fullscreenBtn) {
            const pressed = this.isFullScreen ? 'true' : 'false';
            this.fullscreenBtn.setAttribute('aria-pressed', pressed);
            this.fullscreenBtn.setAttribute('aria-label', this.isFullScreen ? 'Exit full screen view' : 'View map full screen');
            this.fullscreenBtn.setAttribute('title', this.isFullScreen ? 'Exit Full Screen' : 'Full Screen Map');
        }

        if (!this.isFullScreen) {
            this.releaseTemporaryTableFocus();
        }

        this.updateTableToggleUI();
    }

    updateTableToggleUI() {
        if (!this.tableToggleBtn) {
            return;
        }

        const expanded = this.isFullScreen && this.isTableOpen;
        this.tableToggleBtn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
        this.tableToggleBtn.setAttribute('aria-label', expanded ? 'Hide poster table' : 'Show poster table');
        this.tableToggleBtn.setAttribute('title', expanded ? 'Hide poster table' : 'Show poster table');
        this.tableToggleBtn.textContent = expanded ? 'Hide Table' : 'Show Table';
    }

    focusTablePanel() {
        if (!this.tablePanel) {
            return;
        }

        const hadTabIndex = this.tablePanel.hasAttribute('tabindex');
        if (!hadTabIndex) {
            this.tablePanel.setAttribute('tabindex', '-1');
            this.tablePanel.dataset.tempTabindex = 'true';
        }

        try {
            this.tablePanel.focus({ preventScroll: true });
        } catch (err) {
            this.tablePanel.focus();
        }

        if (!hadTabIndex) {
            requestAnimationFrame(() => {
                this.releaseTemporaryTableFocus();
            });
        }
    }

    releaseTemporaryTableFocus() {
        if (!this.tablePanel) {
            return;
        }

        if (this.tablePanel.dataset && this.tablePanel.dataset.tempTabindex === 'true') {
            this.tablePanel.removeAttribute('tabindex');
            delete this.tablePanel.dataset.tempTabindex;
        }
    }

    updateViewBox() {
        const width = this.baseWidth / this.currentZoom;
        const height = this.baseHeight / this.currentZoom;
        const x = -this.panX + (this.baseWidth - width) / 2;
        const y = -this.panY + (this.baseHeight - height) / 2;

        this.svg.setAttribute('viewBox', `${x} ${y} ${width} ${height}`);
    }

    stopPanAnimation() {
        if (this.panAnimationFrame) {
            cancelAnimationFrame(this.panAnimationFrame);
            this.panAnimationFrame = null;
        }
        this.panAnimationComplete = null;
    }

    centerOnCoordinates(x, y, options = {}) {
        if (!Number.isFinite(x) || !Number.isFinite(y)) {
            return;
        }

        const { animate = true, duration = 300, onComplete } = options;

        this.stopPanInertia(true);
        this.stopPanAnimation();

        const targetPan = this.calculatePanForCoordinates(x, y);

        if (animate && duration > 0) {
            this.animatePan(targetPan.panX, targetPan.panY, duration, onComplete);
        } else {
            this.panX = targetPan.panX;
            this.panY = targetPan.panY;
            this.updateViewBox();
            if (typeof onComplete === 'function') {
                onComplete();
            }
        }
    }

    calculatePanForCoordinates(x, y) {
        const width = this.baseWidth / this.currentZoom;
        const height = this.baseHeight / this.currentZoom;

        const minX = 0;
        const minY = 0;
        const maxX = Math.max(minX, this.baseWidth - width);
        const maxY = Math.max(minY, this.baseHeight - height);

        const desiredX = x - width / 2;
        const desiredY = y - height / 2;

        const clampedX = Math.min(Math.max(desiredX, minX), maxX);
        const clampedY = Math.min(Math.max(desiredY, minY), maxY);

        return {
            panX: (this.baseWidth - width) / 2 - clampedX,
            panY: (this.baseHeight - height) / 2 - clampedY
        };
    }

    animatePan(targetPanX, targetPanY, duration = 300, onComplete) {
        const startPanX = this.panX;
        const startPanY = this.panY;
        const startTime = performance.now();
        this.panAnimationComplete = typeof onComplete === 'function' ? onComplete : null;

        const step = (now) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = progress < 0.5
                ? 2 * progress * progress
                : -1 + (4 - 2 * progress) * progress;

            this.panX = startPanX + (targetPanX - startPanX) * eased;
            this.panY = startPanY + (targetPanY - startPanY) * eased;
            this.updateViewBox();

            if (progress < 1) {
                this.panAnimationFrame = requestAnimationFrame(step);
            } else {
                this.panAnimationFrame = null;
                if (this.panAnimationComplete) {
                    const callback = this.panAnimationComplete;
                    this.panAnimationComplete = null;
                    callback();
                }
            }
        };

        this.panAnimationFrame = requestAnimationFrame(step);
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
