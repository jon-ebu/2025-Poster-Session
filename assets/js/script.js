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
        this.tablePanel = document.getElementById('tablePanel');
        this.fullscreenEnterIcon = this.fullscreenBtn ? this.fullscreenBtn.querySelector('.fullscreen-enter') : null;
        this.fullscreenExitIcon = this.fullscreenBtn ? this.fullscreenBtn.querySelector('.fullscreen-exit') : null;
        this.isFullScreen = document.body.classList.contains('map-fullscreen');
        this.handleGlobalKeydown = (event) => {
            if (event.key !== 'Escape') {
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
        this.defaultPanX = -60; // Shift initial view slightly left so controls don't cover content
        this.defaultPanY = 0;
        this.panX = this.defaultPanX;
        this.panY = this.defaultPanY;
        this.panVelocityX = 0;
        this.panVelocityY = 0;
        this.panInertiaFrame = null;
        this.selectedArea = null;
        this.panAnimationFrame = null;
        this.panAnimationComplete = null;

        this.isMultiTouchGesture = false;
        this.infoAutoHideTimer = null;
        this.lastClosedAreaId = null;
        this.lastClosedTime = 0;
        this.lastClosedInteractionType = null;

        this.baseWidth = 1150;
        this.baseHeight = 1360;
        
        this.initializeData();
        this.initializeEventListeners();
        this.updateFullScreenUI();
        this.renderMap();
        this.updateViewBox();
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

        document.addEventListener('keydown', this.handleGlobalKeydown);

        const getClosest = (element, selector) => {
            return element ? element.closest(selector) : null;
        };

        const handleGlobalTouchStart = (event) => {
            if (!event || !event.touches) {
                return;
            }

            if (event.touches.length > 1) {
                return;
            }

            const touchTarget = event.target;
            if (!touchTarget) {
                return;
            }

            const touchedMarker = getClosest(touchTarget, '[data-side]') ||
                                  getClosest(touchTarget, '.color-marker');
            if (touchedMarker) {
                return;
            }

            const touchedPosterArea = getClosest(touchTarget, '.poster-area') ||
                                      getClosest(touchTarget, '[data-area-id]');
            if (touchedPosterArea) {
                return;
            }

            const touchedInfoPanel = getClosest(touchTarget, '.info-panel');
            if (touchedInfoPanel) {
                return;
            }

            this.hideInfo();
        };

        document.addEventListener('touchstart', handleGlobalTouchStart, { passive: true });

        if (this.infoPanel) {
            const closeInfoOnPanelInteraction = (event) => {
                if (!this.infoPanel.classList.contains('active')) {
                    return;
                }
                event.stopPropagation();
                this.hideInfo();
            };

            if (window.PointerEvent) {
                this.infoPanel.addEventListener('pointerdown', closeInfoOnPanelInteraction);
            } else {
                this.infoPanel.addEventListener('touchstart', closeInfoOnPanelInteraction, { passive: true });
                this.infoPanel.addEventListener('mousedown', closeInfoOnPanelInteraction);
            }

            this.infoPanel.addEventListener('click', closeInfoOnPanelInteraction);
        }

        // Pan functionality (touch and mouse)
let isPanning = false;
        let startX, startY, initialPanX, initialPanY;
        let lastPointerX = 0;
        let lastPointerY = 0;
        let lastPointerTime = 0;
        let pinchActive = false;
        let pinchStartDistance = 0;
        let pinchStartZoom = this.currentZoom;
        let lastTouchEndTime = 0;
        const doubleTapThresholdMs = 350;
        const velocityConfig = {
            max: 0.75,
            smoothing: 0.22,
            flickMultiplier: 1.1,
            flickWindowMs: 35,
            flickMax: 0.9
        };
        const TOUCH_PAN_MULTIPLIER = 1.4;
        let panInputType = 'mouse';
        let currentPanMultiplier = 1;

        const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

        const getTouchDistance = (touchA, touchB) => {
            const dx = touchA.clientX - touchB.clientX;
            const dy = touchA.clientY - touchB.clientY;
            return Math.hypot(dx, dy);
        };

        const getTouchMidpoint = (touchA, touchB) => ({
            x: (touchA.clientX + touchB.clientX) / 2,
            y: (touchA.clientY + touchB.clientY) / 2
        });

        const updatePanForPinch = (targetZoom, centerClientX, centerClientY) => {
            const rect = this.svg.getBoundingClientRect();
            if (!rect || rect.width === 0 || rect.height === 0) {
                this.currentZoom = targetZoom;
                this.updateViewBox();
                return;
            }

            const { x: viewX, y: viewY, width: viewWidth, height: viewHeight } = this.getViewBox();
            const fractionX = clamp((centerClientX - rect.left) / rect.width, 0, 1);
            const fractionY = clamp((centerClientY - rect.top) / rect.height, 0, 1);

            const mapCenterX = viewX + viewWidth * fractionX;
            const mapCenterY = viewY + viewHeight * fractionY;

            const nextViewWidth = this.baseWidth / targetZoom;
            const nextViewHeight = this.baseHeight / targetZoom;

            const minViewX = 0;
            const minViewY = 0;
            const maxViewX = Math.max(minViewX, this.baseWidth - nextViewWidth);
            const maxViewY = Math.max(minViewY, this.baseHeight - nextViewHeight);

            const desiredViewX = mapCenterX - fractionX * nextViewWidth;
            const desiredViewY = mapCenterY - fractionY * nextViewHeight;

            const clampedViewX = clamp(desiredViewX, minViewX, maxViewX);
            const clampedViewY = clamp(desiredViewY, minViewY, maxViewY);

            this.currentZoom = targetZoom;
            this.panX = (this.baseWidth - nextViewWidth) / 2 - clampedViewX;
            this.panY = (this.baseHeight - nextViewHeight) / 2 - clampedViewY;
            this.updateViewBox();
        };

        const startPinch = (touches) => {
            if (!touches || touches.length < 2) {
                return;
            }

            this.stopPanInertia(true);
            this.stopPanAnimation();
            isPanning = false;
            pinchActive = true;
            pinchStartDistance = getTouchDistance(touches[0], touches[1]) || 0.0001;
            pinchStartZoom = this.currentZoom;
            this.isMultiTouchGesture = true;
        };

        const resetPinchState = () => {
            pinchActive = false;
            pinchStartDistance = 0;
            pinchStartZoom = this.currentZoom;
            this.isMultiTouchGesture = false;
        };

        const handlePinchMove = (touches) => {
            if (!pinchActive || !touches || touches.length < 2 || pinchStartDistance === 0) {
                return;
            }

            const distance = getTouchDistance(touches[0], touches[1]);
            if (!distance) {
                return;
            }

            const midpoint = getTouchMidpoint(touches[0], touches[1]);
            const scale = distance / pinchStartDistance;
            const adjustedScale = 1 + (scale - 1) * 2;
            const targetZoom = clamp(pinchStartZoom * adjustedScale, this.minZoom, this.maxZoom);
            updatePanForPinch(targetZoom, midpoint.x, midpoint.y);
        };

        const recordVelocity = (clientX, clientY) => {
            const now = performance.now();
            if (lastPointerTime) {
                const deltaTime = now - lastPointerTime;
                if (deltaTime > 0) {
                    const appliedMultiplier = this.getPanSpeedMultiplier() * currentPanMultiplier;
                    const deltaPanX = ((clientX - lastPointerX) / this.currentZoom) * appliedMultiplier;
                    const deltaPanY = ((clientY - lastPointerY) / this.currentZoom) * appliedMultiplier;
                    const vx = deltaPanX / deltaTime;
                    const vy = deltaPanY / deltaTime;
                    const { max, smoothing } = velocityConfig;
                    this.panVelocityX = (1 - smoothing) * this.panVelocityX + smoothing * Math.max(-max, Math.min(max, vx));
                    this.panVelocityY = (1 - smoothing) * this.panVelocityY + smoothing * Math.max(-max, Math.min(max, vy));
                }
            }
            lastPointerX = clientX;
            lastPointerY = clientY;
            lastPointerTime = now;
        };

        const beginPan = (clientX, clientY, inputType = 'mouse') => {
            isPanning = true;
            panInputType = inputType;
            currentPanMultiplier = panInputType === 'touch' ? TOUCH_PAN_MULTIPLIER : 1;
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
            const appliedMultiplier = this.getPanSpeedMultiplier() * currentPanMultiplier;
            const dx = ((clientX - startX) / this.currentZoom) * appliedMultiplier;
            const dy = ((clientY - startY) / this.currentZoom) * appliedMultiplier;
            this.panX = initialPanX + dx;
            this.panY = initialPanY + dy;
            this.updateViewBox();
            recordVelocity(clientX, clientY);
        };

        const endPan = (options = {}) => {
            if (!isPanning) {
                return;
            }
            isPanning = false;
            panInputType = 'mouse';
            currentPanMultiplier = 1;
            this.svg.style.cursor = 'grab';
            if (!options.skipInertia) {
                const sinceLastSample = lastPointerTime ? performance.now() - lastPointerTime : Infinity;
                if (sinceLastSample <= velocityConfig.flickWindowMs) {
                    const boost = velocityConfig.flickMultiplier;
                    const maxBoosted = velocityConfig.flickMax;
                    this.panVelocityX = Math.max(-maxBoosted, Math.min(maxBoosted, this.panVelocityX * boost));
                    this.panVelocityY = Math.max(-maxBoosted, Math.min(maxBoosted, this.panVelocityY * boost));
                }
                this.startPanInertia();
            }
        };

        this.svg.style.cursor = 'grab';

        this.svg.addEventListener('mousedown', (e) => {
            const isInteractiveElement = e.target.closest('[data-side]') || 
                                       e.target.closest('.color-marker') ||
                                       e.target.closest('[data-point-id]') ||
                                       e.target.classList.contains('color-marker') ||
                                       e.target.closest('#tablePanel');
            if (!isInteractiveElement) {
                e.preventDefault();
                beginPan(e.clientX, e.clientY, 'mouse');
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
            const touches = e.touches;
            const touchCount = touches ? touches.length : 0;

            if (touchCount >= 2) {
                e.preventDefault();
                this.isMultiTouchGesture = true;
                startPinch(touches);
                this.svg.style.cursor = 'grab';
                return;
            }

            if (touchCount !== 1) {
                return;
            }

            const touch = touches[0];
            const touchTarget = document.elementFromPoint(touch.clientX, touch.clientY);

            if (touchTarget && touchTarget.closest('#tablePanel')) {
                this.stopPanInertia(true);
                isPanning = false;
                return;
            }

            const isInteractiveElement = getClosest(touchTarget, '[data-side]') ||
                                       getClosest(touchTarget, '.color-marker') ||
                                       getClosest(touchTarget, '[data-point-id]') ||
                                       (touchTarget && touchTarget.classList && touchTarget.classList.contains('color-marker'));
            if (!isInteractiveElement) {
                e.preventDefault();
                resetPinchState();
                beginPan(touch.clientX, touch.clientY, 'touch');
            }
        };

        try {
            this.svg.addEventListener('touchstart', touchStartHandler, { passive: false });
        } catch (err) {
            this.svg.addEventListener('touchstart', touchStartHandler);
        }

        const touchMoveHandler = (e) => {
            const touches = e.touches;
            const touchCount = touches ? touches.length : 0;

            if (touchCount >= 2) {
                if (!pinchActive) {
                    startPinch(touches);
                }
                this.isMultiTouchGesture = true;
                e.preventDefault();
                handlePinchMove(touches);
                return;
            }

            if (pinchActive && touchCount < 2) {
                resetPinchState();
            }

            if (touchCount !== 1) {
                if (isPanning) {
                    this.stopPanInertia(true);
                    this.stopPanAnimation();
                    endPan({ skipInertia: true });
                }
                return;
            }

            const touch = touches[0];
            const moveTarget = document.elementFromPoint(touch.clientX, touch.clientY);
            if (moveTarget && moveTarget.closest('#tablePanel')) {
                if (isPanning) {
                    this.stopPanInertia(true);
                    this.stopPanAnimation();
                    endPan({ skipInertia: true });
                }
                return;
            }

            if (!isPanning) {
                return;
            }

            e.preventDefault();
            updatePan(touch.clientX, touch.clientY);
        };

        try {
            document.addEventListener('touchmove', touchMoveHandler, { passive: false });
        } catch (err) {
            document.addEventListener('touchmove', touchMoveHandler);
        }

        const handleTouchEnd = (e) => {
            const touches = e.touches;
            const touchCount = touches ? touches.length : 0;
            const now = Date.now();
            const changedTouchCount = e.changedTouches ? e.changedTouches.length : 0;
            const endedAllTouches = touchCount === 0;
            const isSingleFingerRelease = !pinchActive && endedAllTouches && changedTouchCount === 1;

            if (isSingleFingerRelease) {
                if (now - lastTouchEndTime <= doubleTapThresholdMs) {
                    e.preventDefault();
                }
                lastTouchEndTime = now;
            } else if (endedAllTouches) {
                lastTouchEndTime = now;
            }

            if (pinchActive && touchCount < 2) {
                resetPinchState();
                if (touchCount === 1) {
                    const remainingTouch = touches[0];
                    const remainingTarget = document.elementFromPoint(remainingTouch.clientX, remainingTouch.clientY);
                    if (remainingTarget && remainingTarget.closest('#tablePanel')) {
                        this.stopPanInertia(true);
                        isPanning = false;
                        return;
                    }

                    const isInteractiveElement = getClosest(remainingTarget, '[data-side]') ||
                                                getClosest(remainingTarget, '.color-marker') ||
                                                getClosest(remainingTarget, '[data-point-id]') ||
                                                (remainingTarget && remainingTarget.classList && remainingTarget.classList.contains('color-marker'));

                    if (!isInteractiveElement) {
                        beginPan(remainingTouch.clientX, remainingTouch.clientY, 'touch');
                    }
                }
            }

            if (endedAllTouches) {
                this.isMultiTouchGesture = false;
                endPan();
            }
        };

        try {
            document.addEventListener('touchend', handleTouchEnd, { passive: false });
        } catch (err) {
            document.addEventListener('touchend', handleTouchEnd);
        }

        try {
            document.addEventListener('touchcancel', handleTouchEnd, { passive: false });
        } catch (err) {
            document.addEventListener('touchcancel', handleTouchEnd);
        }

        const preventGestureZoom = (event) => {
            event.preventDefault();
        };

        ['gesturestart', 'gesturechange', 'gestureend'].forEach((eventName) => {
            try {
                document.addEventListener(eventName, preventGestureZoom, { passive: false });
            } catch (err) {
                document.addEventListener(eventName, preventGestureZoom);
            }
        });


        // Mouse wheel zoom
        this.svg.addEventListener('wheel', (e) => {
            e.preventDefault();
            this.stopPanInertia(true);

            const modeMultiplier = e.deltaMode === 1 ? 20 : e.deltaMode === 2 ? 60 : 1;
            const normalizedDelta = e.deltaY * modeMultiplier;
            if (!normalizedDelta) {
                return;
            }

            // Dial desktop trackpad pinch separate from regular wheel scrolling with adaptive gain
            const WHEEL_INTENSITY = 0.0012;
            const PINCH_BASE_INTENSITY = 0.0035;
            const PINCH_GAIN = 2;

            let intensity = WHEEL_INTENSITY;

            if (e.ctrlKey) {
                const absDelta = Math.min(240, Math.abs(normalizedDelta));
                const deltaFactor = 1 + (absDelta / 120); // 1 → 3 range based on gesture size
                const zoomRange = Math.max(this.maxZoom - this.minZoom, 0.0001);
                const zoomNormalized = (this.currentZoom - this.minZoom) / zoomRange;
                const zoomFactor = 0.9 + zoomNormalized * 1.2; // 0.9 → 2.1 range based on current zoom

                intensity = PINCH_BASE_INTENSITY * PINCH_GAIN * deltaFactor * zoomFactor;
            }
            const zoomFactor = Math.exp(-normalizedDelta * intensity);
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
                    this.selectArea(e.target.dataset.areaId, { interactionType: 'keyboard' });
                }
            }
        });
    }

    getPanSpeedMultiplier() {
        const zoomRange = Math.max(this.maxZoom - this.minZoom, 0.0001);
        const normalized = (this.currentZoom - this.minZoom) / zoomRange;
        const minMultiplier = 1;
        const maxMultiplier = 3;

        return minMultiplier + normalized * (maxMultiplier - minMultiplier);
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
            shape.addEventListener('click', () => this.selectArea(area.id, { interactionType: 'mouse' }));
            shape.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.selectArea(area.id, { interactionType: 'touch' });
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

    selectArea(areaId, options = {}) {
        const { interactionType = 'mouse' } = options;
        const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();

        if (this.lastClosedAreaId === areaId) {
            if (this.lastClosedInteractionType === 'touch' && (now - this.lastClosedTime) < 350) {
                return;
            }
            this.lastClosedAreaId = null;
            this.lastClosedInteractionType = null;
        }

        if (this.selectedArea && this.selectedArea.id === areaId && this.infoPanel && this.infoPanel.classList && this.infoPanel.classList.contains('active')) {
            this.hideInfo();
            this.lastClosedAreaId = areaId;
            this.lastClosedTime = now;
            this.lastClosedInteractionType = interactionType;
            return;
        }
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
            this.showAreaInfo(area, interactionType);
        }
    }

    showAreaInfo(area, interactionType = 'mouse') {
        if (this.infoAutoHideTimer) {
            clearTimeout(this.infoAutoHideTimer);
            this.infoAutoHideTimer = null;
        }

        this.infoTitle.textContent = area.name;
        this.infoDescription.innerHTML = `
            <p><strong>Focus:</strong> ${area.description}</p>
            <p><strong>Time:</strong> ${area.time}</p>
            <p><strong>Presenters:</strong> ${area.presenters.join(', ')}</p>
        `;
        this.infoPanel.classList.add('active');

        // Auto-hide after 10 seconds except for touch interactions
        if (interactionType !== 'touch') {
            this.infoAutoHideTimer = setTimeout(() => {
                if (this.infoPanel.classList.contains('active')) {
                    this.hideInfo();
                }
            }, 10000);
        }
    }

    // Marker info functionality disabled
    showMarkerInfo(markerId) {
        // No marker info will be shown
        return;
    }

    hideInfo() {
        if (this.infoAutoHideTimer) {
            clearTimeout(this.infoAutoHideTimer);
            this.infoAutoHideTimer = null;
        }
        if (window.posterInfoTimer) {
            clearTimeout(window.posterInfoTimer);
            window.posterInfoTimer = null;
        }
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
        this.panX = this.defaultPanX;
        this.panY = this.defaultPanY;
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
        this.updateFullScreenUI();
    }

    updateFullScreenUI() {
        if (!this.fullscreenBtn) {
            return;
        }

        const pressed = this.isFullScreen ? 'true' : 'false';
        this.fullscreenBtn.setAttribute('aria-pressed', pressed);
        this.fullscreenBtn.setAttribute('aria-label', this.isFullScreen ? 'Exit full screen view' : 'View map full screen');
        this.fullscreenBtn.setAttribute('title', this.isFullScreen ? 'Exit Full Screen' : 'View map full screen');
        this.fullscreenBtn.setAttribute('data-state', this.isFullScreen ? 'exit' : 'enter');

        if (this.fullscreenEnterIcon) {
            this.fullscreenEnterIcon.setAttribute('aria-hidden', this.isFullScreen ? 'true' : 'false');
        }

        if (this.fullscreenExitIcon) {
            this.fullscreenExitIcon.setAttribute('aria-hidden', this.isFullScreen ? 'false' : 'true');
        }
    }

    getViewBox() {
        const width = this.baseWidth / this.currentZoom;
        const height = this.baseHeight / this.currentZoom;
        const x = -this.panX + (this.baseWidth - width) / 2;
        const y = -this.panY + (this.baseHeight - height) / 2;

        return { x, y, width, height };
    }

    updateViewBox() {
        const { x, y, width, height } = this.getViewBox();
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

        const { animate = true, duration = 300, onComplete, minZoom, focus } = options;

        const mobileQuery = typeof window !== 'undefined'
            ? window.matchMedia('(max-width: 768px)')
            : null;
        if (typeof minZoom === 'number' && Number.isFinite(minZoom)) {
            this.currentZoom = Math.min(this.maxZoom, Math.max(this.currentZoom, minZoom));
        } else if (mobileQuery && mobileQuery.matches) {
            const defaultMobileFocusZoom = 2.1;
            if (this.currentZoom < defaultMobileFocusZoom) {
                this.currentZoom = Math.min(this.maxZoom, defaultMobileFocusZoom);
            }
        }

        this.stopPanInertia(true);
        this.stopPanAnimation();

        // Allow callers to bias where the target coordinate sits within the viewport (e.g., mobile left offset)
        const targetPan = this.calculatePanForCoordinates(x, y, focus);

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

    calculatePanForCoordinates(x, y, focus = {}) {
        const focusConfig = (focus && typeof focus === 'object') ? focus : {};
        const width = this.baseWidth / this.currentZoom;
        const height = this.baseHeight / this.currentZoom;

        const minX = 0;
        const minY = 0;
        const maxX = Math.max(minX, this.baseWidth - width);
        const maxY = Math.max(minY, this.baseHeight - height);

        const clampFraction = (value) => {
            if (!Number.isFinite(value)) {
                return 0.5;
            }
            return Math.min(Math.max(value, 0), 1);
        };

        const focusX = clampFraction(typeof focusConfig.x === 'number' ? focusConfig.x : 0.5);
        const focusY = clampFraction(typeof focusConfig.y === 'number' ? focusConfig.y : 0.5);

        const desiredX = x - width * focusX;
        const desiredY = y - height * focusY;

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
        const minVelocity = 0.0012;
        const currentVelocity = Math.hypot(this.panVelocityX, this.panVelocityY);
        if (currentVelocity < minVelocity) {
            this.stopPanInertia(true);
            return;
        }

        this.stopPanInertia();

        const decay = 0.93;
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

function initializeMobileTableScrollFix() {
    const tablePanel = document.getElementById('tablePanel');
    if (!tablePanel) {
        return;
    }

    const tableWrapper = tablePanel.querySelector('.table-responsive');
    if (!tableWrapper) {
        return;
    }

    tableWrapper.addEventListener('touchstart', (ev) => {
        ev.stopPropagation();
    }, { passive: true });

    tableWrapper.addEventListener('touchmove', (ev) => {
        ev.stopPropagation();
    }, { passive: true });

    const mobileQuery = window.matchMedia('(max-width: 900px), (max-height: 600px) and (orientation: landscape)');
    const ensureMomentumScroll = () => {
        if (!mobileQuery.matches) {
            return;
        }

        if (tableWrapper.dataset.momentumScrollEnabled === 'true') {
            return;
        }

        tableWrapper.dataset.momentumScrollEnabled = 'true';
        tableWrapper.style.setProperty('-webkit-overflow-scrolling', 'touch');
        tableWrapper.style.setProperty('overscroll-behavior-y', 'contain');
    };

    let scheduled = false;
    let lastHeight = null;

    const computeHeight = () => {
        if (!mobileQuery.matches) {
            lastHeight = null;
            tableWrapper.style.removeProperty('--table-scroll-max-height');
            tableWrapper.style.removeProperty('height');
            tableWrapper.style.removeProperty('max-height');
            return;
        }

        const isFullscreen = document.body.classList.contains('map-fullscreen');

        if (isFullscreen) {
            if (lastHeight !== null) {
                tableWrapper.style.setProperty('--table-scroll-max-height', `${lastHeight}px`);
            }
            return;
        }

        const viewportHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
        const tableRect = tableWrapper.getBoundingClientRect();
        const marginBottom = 12;
        const minHeight = 180;
        const available = viewportHeight - tableRect.top - marginBottom;

        if (!Number.isFinite(available)) {
            return;
        }

        const nextHeight = Math.max(minHeight, Math.floor(available));

        if (nextHeight === lastHeight) {
            return;
        }

        lastHeight = nextHeight;
        const heightValue = `${nextHeight}px`;
        tableWrapper.style.setProperty('--table-scroll-max-height', heightValue);
    };

    const scheduleUpdate = () => {
        if (scheduled) {
            return;
        }
        scheduled = true;
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                scheduled = false;
                computeHeight();
                ensureMomentumScroll();
            });
        });
    };

    const attachMediaListener = () => {
        if (typeof mobileQuery.addEventListener === 'function') {
            mobileQuery.addEventListener('change', scheduleUpdate);
        } else if (typeof mobileQuery.addListener === 'function') {
            mobileQuery.addListener(scheduleUpdate);
        }
    };

    attachMediaListener();

    window.addEventListener('resize', scheduleUpdate);
    window.addEventListener('orientationchange', scheduleUpdate);

    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', scheduleUpdate);
        window.visualViewport.addEventListener('scroll', scheduleUpdate);
    }

    const classObserver = new MutationObserver(scheduleUpdate);
    classObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });

    tablePanel.addEventListener('transitionend', (event) => {
        if (event.target === tablePanel) {
            scheduleUpdate();
        }
    });

    if (typeof ResizeObserver === 'function') {
        const resizeObserver = new ResizeObserver(() => {
            scheduleUpdate();
        });
        resizeObserver.observe(tablePanel);
    }

    ensureMomentumScroll();
    scheduleUpdate();
}

function initializeTableOnlyToggle(mapInstance) {
    const toggleBtn = document.getElementById('toggleTableView');
    if (!toggleBtn) {
        return;
    }

    const updateToggleState = () => {
        const tableOnlyActive = document.body.classList.contains('table-only');
        toggleBtn.setAttribute('aria-pressed', tableOnlyActive ? 'true' : 'false');
        toggleBtn.setAttribute('aria-label', tableOnlyActive ? 'Show map with table' : 'View table only');
        toggleBtn.textContent = tableOnlyActive ? 'Show Map & Table' : 'Table Only';
        toggleBtn.title = tableOnlyActive ? 'Show map with table' : 'View table only';
    };

    const applyTableOnlyState = (nextState) => {
        if (nextState && mapInstance && mapInstance.isFullScreen) {
            mapInstance.toggleFullScreen(false);
        }

        document.body.classList.toggle('table-only', nextState);

        if (mapInstance) {
            if (typeof mapInstance.stopPanInertia === 'function') {
                mapInstance.stopPanInertia(true);
            }
            if (typeof mapInstance.stopPanAnimation === 'function') {
                mapInstance.stopPanAnimation();
            }
        }

        updateToggleState();

        requestAnimationFrame(() => {
            window.dispatchEvent(new Event('resize'));
        });
    };

    const handleToggle = () => {
        const nextState = !document.body.classList.contains('table-only');
        applyTableOnlyState(nextState);
    };

    let lastTouchToggle = 0;
    let activeTouchPointerId = null;

    const handleDirectToggle = (event) => {
        lastTouchToggle = Date.now();
        if (event && event.cancelable !== false) {
            event.preventDefault();
        }
        handleToggle();
    };

    toggleBtn.addEventListener('click', (event) => {
        if (Date.now() - lastTouchToggle < 350) {
            return;
        }
        if (event && event.cancelable !== false) {
            event.preventDefault();
        }
        handleToggle();
    });

    if ('PointerEvent' in window) {
        toggleBtn.addEventListener('pointerdown', (event) => {
            if (event.pointerType !== 'touch' && event.pointerType !== 'pen') {
                return;
            }
            activeTouchPointerId = event.pointerId;
            if (typeof toggleBtn.setPointerCapture === 'function' && typeof event.pointerId === 'number') {
                try {
                    toggleBtn.setPointerCapture(event.pointerId);
                } catch (_) {
                    // Ignore errors from pointer capture
                }
            }
        });

        toggleBtn.addEventListener('pointerup', (event) => {
            const isTouchLike = event.pointerType === 'touch' || event.pointerType === 'pen';
            if (!isTouchLike || (activeTouchPointerId !== null && event.pointerId !== activeTouchPointerId)) {
                return;
            }
            if (typeof toggleBtn.releasePointerCapture === 'function' && typeof event.pointerId === 'number') {
                try {
                    toggleBtn.releasePointerCapture(event.pointerId);
                } catch (_) {
                    // Ignore errors from pointer release
                }
            }
            activeTouchPointerId = null;
            handleDirectToggle(event);
        });

        toggleBtn.addEventListener('pointercancel', (event) => {
            if (activeTouchPointerId !== null && event.pointerId === activeTouchPointerId) {
                if (typeof toggleBtn.releasePointerCapture === 'function' && typeof event.pointerId === 'number') {
                    try {
                        toggleBtn.releasePointerCapture(event.pointerId);
                    } catch (_) {
                        // Ignore errors from pointer release
                    }
                }
                activeTouchPointerId = null;
            }
        });
    } else {
        toggleBtn.addEventListener('touchend', handleDirectToggle, { passive: false });
        toggleBtn.addEventListener('touchcancel', () => {
            lastTouchToggle = Date.now();
        }, { passive: true });
    }

    updateToggleState();
}

// Initialize the map when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.posterMap = new PosterSessionMap();
    initializeTableOnlyToggle(window.posterMap);
    initializeMobileTableScrollFix();
});

// Export for potential external use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PosterSessionMap;
}
