// Layout API for SVG Placement and Management
class LayoutAPI {
    constructor(mapInstance) {
        this.map = mapInstance;
        this.layoutElements = new Map();
        this.svgCache = new Map();
        this.loneMarkerBoards = new Set(['HC-1', 'P-13']);
        
        // Create a dedicated layer for poster mounts to ensure they're always on top
        this.posterLayer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        this.posterLayer.setAttribute('id', 'poster-mounts-layer');
        this.posterLayer.style.pointerEvents = 'all'; // Ensure interactions work
        this.map.svg.appendChild(this.posterLayer);
    }

    /**
     * Function to get the color corresponding to the easel easelBoardId value
     * @param {*} value The value to extract the easelBoardId from, e.g. 'B-01' or 'BC-02'
     * @returns color The color corresponding to the easelBoardId value
     */
    getColorByEaselBoardId(value) {
        if (!value) return "#404040"; // Default gray for missing values
        
        let easelBoardId = value.split("-")[0]; // Extract the easelBoardId
        let color;
        switch (easelBoardId) {
            case "B":
                color = "#008000"; // green (B-1 through B-7)
                break;
            case "BCS":
                color = "#FFA500"; // orange (BCS-1, BCS-2, BCS-3)
                break;
            case "C":
                color = "#FF0000"; // red (C-1 through C-17)
                break;
            case "CEP":
                color = "#FFA500"; // orange (CEP1 & CEP2)
                break;
            case "CHC":
                color = "#FFA500"; // orange (CHC1, CHC2, CHC3)
                break;
            case "CP":
                color = "#FFA500"; // orange (CP1)
                break;
            case "CS":
                color = "#87CEEB"; // light blue (CS-1 through CS-22)
                break;
            case "CSE":
                color = "#FFA500"; // orange (CSE-1, CSE-2)
                break;
            case "CSEM":
                color = "#FFA500"; // orange (CSEM-1)
                break;
            case "CSEP":
                color = "#FFA500"; // orange (CSEP-1, CSEP-2)
                break;
            case "CSHC":
                color = "#FFA500"; // orange (CSHC-1, CSHC-2)
                break;
            case "CSM":
                color = "#FFA500"; // orange (CSM-1)
                break;
            case "E":
                color = "#000000"; // black (E-1 through E-26)
                break;
            case "EP":
                color = "#FFA500"; // orange (EP-1)
                break;
            case "HC":
                color = "#FFD700"; // gold (HC-1)
                break;
            case "BHC":
                color = "#FFD700"; // gold (BHC-1 matches HC color)
                break;
            case "HSA":
                color = "#20B2AA"; // light teal (HSA-1)
                break;
            case "HSAM":
                color = "#FFA500"; // orange (HSAM-1)
                break;
            case "M":
                color = "#FF8C00"; // dark orange (M-1 through M-5)
                break;
            case "P":
                color = "#800080"; // purple (P-1 through P-13)
                break;
            default:
                color = "#404040"; // gray for unrecognized easelBoardId
        }

        return color;
    }

    isLoneMarkerBoard(easelBoard) {
        return easelBoard ? this.loneMarkerBoards.has(easelBoard) : false;
    }

    /**
     * Calculate appropriate font size based on text length to prevent overflow
     * @param {string} text - The text to size
     * @returns {string} Font size in px
     */
    calculateFontSize(text) {
        if (!text) return '8';
        
        const textLength = text.length;
        
        // Scale font size based on text length to fit in 12px radius circle
        if (textLength <= 2) {
            return '8';  // Default size for short text like "B1", "C5"
        } else if (textLength <= 4) {
            return '6';  // Smaller for medium text like "CS-1", "BCS1"
        } else if (textLength <= 6) {
            return '5';  // Even smaller for longer text like "CSEM-1"
        } else {
            return '4';  // Smallest for very long text
        }
    }

    /**
     * Get appropriate text color based on background color for better contrast
     * @param {string} backgroundColor - The background color hex value
     * @returns {string} Text color (white or black)
     */
    getTextColorForBackground(backgroundColor) {
        // Light/bright colors that need black text for better contrast
        const lightColors = ['#87CEEB', '#20B2AA', '#FFA500', '#FFD700']; // Light blue, light teal, bright orange, gold
        
        if (lightColors.includes(backgroundColor)) {
            return 'black';
        }
        
        // Default to white for all other colors
        return 'white';
    }

    /**
     * Add an SVG element to the layout
     * @param {Object} config - Layout configuration
     * @param {string} config.id - Unique identifier
     * @param {string} config.svgFile - Path to SVG file or inline SVG content
     * @param {Object} config.position - Position configuration
     * @param {number} config.position.x - X coordinate
     * @param {number} config.position.y - Y coordinate
     * @param {Object} [config.transform] - Transform options
     * @param {number} [config.transform.scale] - Scale factor (default: 1)
     * @param {number} [config.transform.rotate] - Rotation in degrees
     * @param {string} [config.transform.anchor] - Transform origin (center, top-left, etc.)
     * @param {Object} [config.style] - Style overrides
     * @param {string} [config.style.fill] - Fill color
     * @param {string} [config.style.stroke] - Stroke color
     * @param {number} [config.style.opacity] - Opacity (0-1)
     * @param {number} [config.zIndex] - Z-index for layering
     * @param {boolean} [config.interactive] - Whether element should be clickable
     * @param {Function} [config.onClick] - Click handler function
     */
    async addSVG(config) {
        try {
            const svgContent = await this.loadSVG(config.svgFile);
            const element = this.createSVGElement(config, svgContent);
            
            this.layoutElements.set(config.id, {
                ...config,
                element: element,
                type: 'svg'
            });

            this.renderElement(config.id);
            return config.id;
        } catch (error) {
            console.error(`Error adding SVG ${config.id}:`, error);
            throw error;
        }
    }

    /**
     * Add a simple shape to the layout
     * @param {Object} config - Shape configuration
     * @param {string} config.id - Unique identifier
     * @param {string} config.type - Shape type (rect, circle, polygon, path)
     * @param {Object} config.geometry - Shape-specific geometry
     * @param {Object} config.position - Position configuration
     * @param {Object} [config.style] - Style configuration
     * @param {boolean} [config.interactive] - Whether element should be clickable
     */
    addShape(config) {
        const element = this.createShapeElement(config);
        
        this.layoutElements.set(config.id, {
            ...config,
            element: element,
            type: 'shape'
        });

        this.renderElement(config.id);
        return config.id;
    }

    /**
     * Position elements relative to other elements
     * @param {Object} config - Relative positioning configuration
     * @param {string} config.id - Element to position
     * @param {string} config.relativeTo - ID of reference element
     * @param {string} config.position - Relative position (above, below, left, right, inside)
     * @param {number} [config.offset] - Distance from reference element
     */
    positionRelativeTo(config) {
        const element = this.layoutElements.get(config.id);
        const reference = this.layoutElements.get(config.relativeTo);
        
        if (!element || !reference) {
            throw new Error(`Element not found: ${config.id} or ${config.relativeTo}`);
        }

        const newPosition = this.calculateRelativePosition(
            reference.position,
            reference.geometry || this.getSVGDimensions(reference.element),
            config.position,
            config.offset || 0
        );

        this.updatePosition(config.id, newPosition);
    }

    /**
     * Create a grid layout for multiple elements
     * @param {Object} config - Grid configuration
     * @param {Array} config.elements - Array of element IDs
     * @param {Object} config.grid - Grid configuration
     * @param {number} config.grid.cols - Number of columns
     * @param {number} config.grid.rows - Number of rows
     * @param {Object} config.area - Area to place grid in
     * @param {number} config.spacing - Spacing between elements
     */
    createGrid(config) {
        const { elements, grid, area, spacing = 20 } = config;
        const cellWidth = (area.width - (spacing * (grid.cols - 1))) / grid.cols;
        const cellHeight = (area.height - (spacing * (grid.rows - 1))) / grid.rows;

        elements.forEach((elementId, index) => {
            const row = Math.floor(index / grid.cols);
            const col = index % grid.cols;
            
            const x = area.x + (col * (cellWidth + spacing));
            const y = area.y + (row * (cellHeight + spacing));
            
            this.updatePosition(elementId, { x, y });
        });
    }

    /**
     * Load SVG content from file or return inline content
     */
    async loadSVG(svgSource) {
        if (svgSource.startsWith('<svg')) {
            return svgSource; // Inline SVG
        }

        if (this.svgCache.has(svgSource)) {
            return this.svgCache.get(svgSource);
        }

        try {
            const response = await fetch(svgSource);
            const svgText = await response.text();
            this.svgCache.set(svgSource, svgText);
            return svgText;
        } catch (error) {
            throw new Error(`Failed to load SVG: ${svgSource}`);
        }
    }

    /**
     * Create SVG element from configuration
     */
    createSVGElement(config, svgContent) {
        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(svgContent, 'image/svg+xml');
        const svgElement = svgDoc.documentElement;

        // Extract path data from the SVG
        const paths = svgElement.querySelectorAll('path, rect, circle, polygon');
        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        group.setAttribute('id', config.id);

        // Apply transform
        const transform = this.buildTransform(config);
        if (transform) {
            group.setAttribute('transform', transform);
        }

        // Copy all paths/shapes to the group
        paths.forEach(path => {
            const clonedPath = path.cloneNode(true);
            
            // Apply style overrides (force override existing fills)
            if (config.style) {
                if (config.style.fill) {
                    clonedPath.setAttribute('fill', config.style.fill);
                    clonedPath.style.fill = config.style.fill; // Force override
                }
                if (config.style.stroke) {
                    clonedPath.setAttribute('stroke', config.style.stroke);
                    clonedPath.style.stroke = config.style.stroke;
                }
                if (config.style.strokeWidth) {
                    clonedPath.setAttribute('stroke-width', config.style.strokeWidth);
                    clonedPath.style.strokeWidth = config.style.strokeWidth;
                }
                if (config.style.opacity) {
                    clonedPath.setAttribute('opacity', config.style.opacity);
                    clonedPath.style.opacity = config.style.opacity;
                }
            }

            // Add interactivity
            if (config.interactive) {
                clonedPath.style.cursor = 'pointer';
                clonedPath.setAttribute('tabindex', '0');
                clonedPath.setAttribute('role', 'button');
                
                if (config.onClick) {
                    clonedPath.addEventListener('click', config.onClick);
                    clonedPath.addEventListener('touchend', (e) => {
                        e.preventDefault();
                        config.onClick(e);
                    });
                }
            }

            group.appendChild(clonedPath);
        });

        return group;
    }

    /**
     * Create shape element from configuration
     */
    createShapeElement(config) {
        let element;
        const { type, geometry, position, style = {} } = config;

        switch (type) {
            case 'rect':
                element = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                element.setAttribute('x', position.x);
                element.setAttribute('y', position.y);
                element.setAttribute('width', geometry.width);
                element.setAttribute('height', geometry.height);
                if (geometry.rx) element.setAttribute('rx', geometry.rx);
                break;

            case 'circle':
                element = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                element.setAttribute('cx', position.x);
                element.setAttribute('cy', position.y);
                element.setAttribute('r', geometry.radius);
                break;

            case 'polygon':
                element = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
                element.setAttribute('points', geometry.points);
                break;

            case 'path':
                element = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                element.setAttribute('d', geometry.d);
                break;

            default:
                throw new Error(`Unknown shape type: ${type}`);
        }

        // Apply styles
        element.setAttribute('fill', style.fill || '#D9D9D9');
        if (style.stroke) element.setAttribute('stroke', style.stroke);
        if (style.strokeWidth) element.setAttribute('stroke-width', style.strokeWidth);
        if (style.opacity) element.setAttribute('opacity', style.opacity);

        // Add interactivity
        if (config.interactive && config.onClick) {
            element.style.cursor = 'pointer';
            element.addEventListener('click', config.onClick);
            element.addEventListener('touchend', (e) => {
                e.preventDefault();
                config.onClick(e);
            });
        }

        element.setAttribute('id', config.id);
        return element;
    }

    /**
     * Build transform string from configuration
     */
    buildTransform(config) {
        const transforms = [];
        
        // Position
        if (config.position) {
            transforms.push(`translate(${config.position.x}, ${config.position.y})`);
        }

        // Additional transforms
        if (config.transform) {
            if (config.transform.scale && config.transform.scale !== 1) {
                transforms.push(`scale(${config.transform.scale})`);
            }
            if (config.transform.scaleY && config.transform.scaleY === -1) {
                // For vertical flip, use scale(1, -1) which flips around the center
                transforms.push(`scale(1, -1)`);
            } else if (config.transform.scaleY && config.transform.scaleY !== 1) {
                transforms.push(`scale(1, ${config.transform.scaleY})`);
            }
            if (config.transform.rotate) {
                const anchor = config.transform.anchor || 'center';
                // You can extend this to calculate actual anchor points
                transforms.push(`rotate(${config.transform.rotate})`);
            }
        }

        return transforms.length > 0 ? transforms.join(' ') : null;
    }

    /**
     * Calculate relative position
     */
    calculateRelativePosition(refPosition, refGeometry, position, offset) {
        const newPos = { ...refPosition };
        
        switch (position) {
            case 'above':
                newPos.y = refPosition.y - offset;
                break;
            case 'below':
                newPos.y = refPosition.y + refGeometry.height + offset;
                break;
            case 'left':
                newPos.x = refPosition.x - offset;
                break;
            case 'right':
                newPos.x = refPosition.x + refGeometry.width + offset;
                break;
            case 'inside-center':
                newPos.x = refPosition.x + refGeometry.width / 2;
                newPos.y = refPosition.y + refGeometry.height / 2;
                break;
        }
        
        return newPos;
    }

    /**
     * Update element position
     */
    updatePosition(elementId, newPosition) {
        const layoutElement = this.layoutElements.get(elementId);
        if (!layoutElement) return;

        layoutElement.position = newPosition;
        
        // Update the actual SVG element
        const currentTransform = layoutElement.element.getAttribute('transform') || '';
        const newTransform = currentTransform.replace(
            /translate\([^)]+\)/,
            `translate(${newPosition.x}, ${newPosition.y})`
        ) || `translate(${newPosition.x}, ${newPosition.y})`;
        
        layoutElement.element.setAttribute('transform', newTransform);
    }

    /**
     * Render element to the map
     */
    renderElement(elementId) {
        const layoutElement = this.layoutElements.get(elementId);
        if (!layoutElement) return;

        // Determine which group to add to based on element type
        let targetGroup;
        if (layoutElement.type === 'poster-mount' || layoutElement.type === 'lone-marker') {
            // Poster mounts and lone markers always go to the top layer
            targetGroup = this.posterLayer;
        } else if (layoutElement.zIndex && layoutElement.zIndex > 100) {
            targetGroup = this.map.markersGroup;
        } else {
            targetGroup = this.map.posterAreasGroup;
        }

        targetGroup.appendChild(layoutElement.element);
        
        // Ensure poster layer stays on top after any element is added
        this.ensurePosterLayerOnTop();
    }

    /**
     * Ensure the poster layer is always rendered on top of other elements
     */
    ensurePosterLayerOnTop() {
        // Move the poster layer to the end of the SVG (renders last = on top)
        if (this.posterLayer.parentNode) {
            this.posterLayer.parentNode.appendChild(this.posterLayer);
        }
    }

    /**
     * Remove element from layout
     */
    removeElement(elementId) {
        const layoutElement = this.layoutElements.get(elementId);
        if (layoutElement && layoutElement.element.parentNode) {
            layoutElement.element.parentNode.removeChild(layoutElement.element);
        }
        this.layoutElements.delete(elementId);
    }

    /**
     * Get all elements in the layout
     */
    getAllElements() {
        return Array.from(this.layoutElements.keys());
    }

    /**
     * Export layout configuration
     */
    exportLayout() {
        const layout = {};
        this.layoutElements.forEach((element, id) => {
            layout[id] = {
                id: element.id,
                type: element.type,
                position: element.position,
                transform: element.transform,
                style: element.style,
                interactive: element.interactive
            };
        });
        return layout;
    }

    /**
     * Add a lone marker for a single poster (not on a mount)
     * @param {Object} config - Lone marker configuration
     * @param {string} config.id - Unique identifier
     * @param {Object} config.position - Position configuration
     * @param {number} config.position.x - X coordinate
     * @param {number} config.position.y - Y coordinate
     * @param {string} [config.orientation] - 'vertical' or 'horizontal' board orientation
     * @param {Object} config.poster - Poster information
     * @param {Object} [config.style] - Style overrides
     */
    addLoneMarker(config) {
        const orientation = (config.orientation || 'vertical').toLowerCase();
        const element = this.createLoneMarkerElement({ ...config, orientation });
        
        this.layoutElements.set(config.id, {
            ...config,
            orientation,
            element: element,
            type: 'lone-marker'
        });

        this.renderElement(config.id);
        return config.id;
    }

    /**
     * Create lone marker SVG element
     */
    createLoneMarkerElement(config) {
        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        group.setAttribute('id', config.id);

        // Apply transform
        const transform = this.buildTransform(config);
        if (transform) {
            group.setAttribute('transform', transform);
        }

        const orientation = (config.orientation || 'vertical').toLowerCase();
        const isVertical = orientation === 'vertical';
        const boardWidth = isVertical ? 16 : 60;
        const boardHeight = isVertical ? 60 : 16;

        const board = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        board.setAttribute('x', -boardWidth / 2);
        board.setAttribute('y', -boardHeight / 2);
        board.setAttribute('width', boardWidth);
        board.setAttribute('height', boardHeight);
        board.setAttribute('rx', 2);
        board.setAttribute('fill', config.style?.boardFill || '#404040');
        board.setAttribute('stroke', config.style?.boardStroke || '#202020');
        board.setAttribute('stroke-width', config.style?.boardStrokeWidth || 1);
        board.setAttribute('pointer-events', 'none');
        group.appendChild(board);

        // Create the marker circle
        const marker = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        marker.setAttribute('cx', 0);
        marker.setAttribute('cy', 0);
        marker.setAttribute('r', 12);
        marker.setAttribute('fill', this.getColorByEaselBoardId(config.poster.easelBoard));
        marker.setAttribute('stroke', 'white');
        marker.setAttribute('stroke-width', 2);
        marker.style.cursor = 'pointer';
        marker.style.transition = 'r 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), filter 0.2s ease-out';
        marker.setAttribute('tabindex', '0');
        marker.setAttribute('role', 'button');
        marker.setAttribute('aria-label', `Poster: ${config.poster.title}`);
        marker.setAttribute('data-easel', config.poster?.easelBoard || '');
        marker.classList.add('color-marker');

        // Add text for the marker showing easel ID with dynamic sizing
        const markerText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        markerText.setAttribute('x', 0);
        markerText.setAttribute('y', 1); // Slight vertical offset for better centering
        markerText.setAttribute('text-anchor', 'middle');
        markerText.setAttribute('dominant-baseline', 'central');
        markerText.setAttribute('font-family', 'Arial, sans-serif');
        
        // Dynamic font sizing based on text length
        const easelBoard = config.poster.easelBoard || '';
        const fontSize = this.calculateFontSize(easelBoard);
        markerText.setAttribute('font-size', fontSize);
        
        // Store original font size for hover effect
        markerText.setAttribute('data-original-font-size', fontSize);
        
        markerText.setAttribute('font-weight', 'bold');
        // Use dynamic text color based on background color for better contrast
        const backgroundColor = this.getColorByEaselBoardId(config.poster.easelBoard);
        const textColor = this.getTextColorForBackground(backgroundColor);
        markerText.setAttribute('fill', textColor);
        markerText.setAttribute('pointer-events', 'none'); // Make text non-interactive to prevent hover conflicts
        markerText.style.transition = 'font-size 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)';
        markerText.textContent = easelBoard;

        // Add invisible touch area for easier mobile interaction
        const touchArea = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        touchArea.setAttribute('cx', 0);
        touchArea.setAttribute('cy', 0);
        touchArea.setAttribute('r', 26); // Slightly larger to accommodate expanded circle
        touchArea.setAttribute('fill', 'transparent');
        touchArea.style.cursor = 'pointer';

        // Create a shared timer for all markers to prevent conflicts
        if (!window.posterInfoTimer) {
            window.posterInfoTimer = null;
        }
        
        // Mouse velocity tracking to disable tooltips during fast movement
        if (!window.mouseVelocityTracker) {
            window.mouseVelocityTracker = {
                lastX: 0,
                lastY: 0,
                lastTime: 0,
                velocity: 0,
                updateVelocity: function(x, y) {
                    const now = Date.now();
                    const deltaTime = now - this.lastTime;
                    
                    if (deltaTime > 0 && this.lastTime > 0) {
                        const deltaX = x - this.lastX;
                        const deltaY = y - this.lastY;
                        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
                        this.velocity = distance / deltaTime; // pixels per millisecond
                    }
                    
                    this.lastX = x;
                    this.lastY = y;
                    this.lastTime = now;
                }
            };
            
            // Global mouse move tracking
            document.addEventListener('mousemove', (e) => {
                window.mouseVelocityTracker.updateVelocity(e.clientX, e.clientY);
            });
        }
        
        const showPosterInfo = () => {
            // Always cancel any pending hide timer first
            if (window.posterInfoTimer) {
                clearTimeout(window.posterInfoTimer);
                window.posterInfoTimer = null;
            }
            
            // Reduced delay for faster switching between markers
            const showDelay = 50; // Reduced from 150ms to 50ms
            window.posterInfoTimer = setTimeout(() => {
                // Only check velocity if mouse is moving very fast (increased threshold)
                const velocityThreshold = 2.0; // Increased from 0.8 to 2.0
                if (window.mouseVelocityTracker && window.mouseVelocityTracker.velocity > velocityThreshold) {
                    return; // Only skip if moving extremely fast
                }
                
                if (window.posterMap) {
                    const easel = config.poster.easelBoard || 'N/A';
                    const title = config.poster.title || 'Poster Information';
                    const bgColor = window.layout?.getColorByEaselBoardId?.(easel) || '#404040';
                    const textColor = window.layout?.getTextColorForBackground?.(bgColor) || 'white';
                    const fontSize = easel.length <= 2 ? 12 : easel.length <= 4 ? 10 : easel.length <= 6 ? 9 : 8;
                    window.posterMap.infoTitle.innerHTML = `
                        <span class="easel-pill" data-easel="${easel}">
                            <svg class="easel-pill__svg" viewBox="0 0 36 36" role="presentation">
                                <circle cx="18" cy="18" r="16" fill="${bgColor}" stroke="white" stroke-width="2"></circle>
                                <text x="18" y="18" fill="${textColor}" font-size="${fontSize}" dominant-baseline="middle" text-anchor="middle">${easel}</text>
                            </svg>
                        </span>
                        <span class="title-text">${title}</span>
                    `;
                    window.posterMap.infoDescription.innerHTML = `
                        <p><strong>Student(s):</strong> ${config.poster.students || 'N/A'}</p>
                        <p><strong>Faculty/Mentor:</strong> ${config.poster.facultyMentor || 'N/A'}</p>
                        <p><strong>Poster Category:</strong> ${config.poster.category || 'N/A'}</p>
                    `;
                    
                    // Position based on marker location and content length
                    positionInfoPanelSmart(marker, config.poster);
                    
                    window.posterMap.infoPanel.classList.add('active');
                }
                window.posterInfoTimer = null;
            }, showDelay);
        };
        
        const positionInfoPanelSmart = (markerElement, poster) => {
            const panel = window.posterMap.infoPanel;
            
            // Calculate content length to determine tooltip size
            const totalContentLength = (poster.title || '').length + 
                                     (poster.students || '').length + 
                                     (poster.facultyMentor || '').length + 
                                     (poster.category || '').length;
            
            // Dynamic sizing based on content length
            const isMobile = window.innerWidth <= 768;
            const basePanelWidth = isMobile ? 220 : 280;
            const basePanelHeight = isMobile ? 120 : 160;
            
            // Adjust dimensions for longer content
            const contentFactor = Math.min(totalContentLength / 200, 1.5); // Cap at 1.5x size
            const panelWidth = Math.floor(basePanelWidth * (1 + contentFactor * 0.3)); // Up to 30% wider
            const panelHeight = Math.floor(basePanelHeight * (1 + contentFactor * 0.4)); // Up to 40% taller
            
            // Calculate dynamic arrow size early for use in positioning
            const baseArrowSize = isMobile ? 9 : 12;
            const sizeMultiplier = Math.min(contentFactor, 1.3); // Cap multiplier
            const dynamicArrowSize = Math.floor(baseArrowSize * (1 + sizeMultiplier * 0.4)); // Up to 40% larger
            
            // Dynamic gap based on tooltip size - closer by default but still hover-safe
            const baseGap = isMobile ? 18 : 24; // Bring tooltip nearer to marker
            const hoverBuffer = dynamicArrowSize + (isMobile ? 6 : 9); // Leave room for cursor between marker and panel
            const dynamicGap = baseGap + Math.max(panelHeight - basePanelHeight, 0) * 0.15;
            const gap = Math.max(hoverBuffer, Math.floor(dynamicGap));
            const margin = isMobile ? 15 : 20;
            
            // Get marker position relative to viewport
            const markerRect = markerElement.getBoundingClientRect();
            const markerCenterX = markerRect.left + markerRect.width / 2;
            const markerCenterY = markerRect.top + markerRect.height / 2;
            
            // Check if marker is actually visible in viewport
            if (markerRect.left < -50 || markerRect.top < -50 || 
                markerRect.left > window.innerWidth + 50 || 
                markerRect.top > window.innerHeight + 50) {
                // Marker is off-screen, use fallback positioning
                panel.style.position = 'fixed';
                panel.style.top = '80px';
                panel.style.right = '20px';
                panel.style.left = 'auto';
                panel.style.bottom = 'auto';
                panel.style.removeProperty('--arrow-side');
                panel.style.removeProperty('--arrow-position');
                return;
            }
            
            const viewWidth = window.innerWidth;
            const viewHeight = window.innerHeight;
            
            let panelX, panelY, arrowSide, arrowPosition;
            
            // Adjust zones based on zoom level for better positioning when zoomed in
            const currentZoom = window.posterMap ? window.posterMap.currentZoom : 1;
            const zoomFactor = Math.min(currentZoom / 4, 1); // Reduce zone sensitivity when zoomed in
            
            // More conservative zones when zoomed in to prevent tooltips going off-screen
            const topZone = viewHeight * (0.25 + 0.1 * zoomFactor);
            const bottomZone = viewHeight * (0.75 - 0.1 * zoomFactor);
            const leftZone = viewWidth * (0.4 + 0.1 * zoomFactor);
            const rightZone = viewWidth * (0.6 - 0.1 * zoomFactor);
            
            if (markerCenterY < topZone) {
                // Top zone - position below marker
                panelX = Math.max(margin, Math.min(viewWidth - panelWidth - margin, markerCenterX - panelWidth/2));
                panelY = Math.min(viewHeight - panelHeight - margin, markerCenterY + gap);
                arrowSide = 'top';
                // Better arrow position constraints - ensure arrow stays well within bounds
                const arrowBuffer = dynamicArrowSize + 3; // Extra buffer based on arrow size
                arrowPosition = Math.max(arrowBuffer, Math.min(panelWidth - arrowBuffer, markerCenterX - panelX));
                
            } else if (markerCenterY > bottomZone) {
                // Bottom zone - position well above marker
                panelX = Math.max(margin, Math.min(viewWidth - panelWidth - margin, markerCenterX - panelWidth/2));
                panelY = Math.max(margin, markerCenterY - panelHeight - gap - 50); // Much larger buffer
                arrowSide = 'bottom';
                // Better arrow position constraints - ensure arrow stays well within bounds
                const arrowBuffer = dynamicArrowSize + 5; // Extra buffer based on arrow size
                arrowPosition = Math.max(arrowBuffer, Math.min(panelWidth - arrowBuffer, markerCenterX - panelX));
                
            } else {
                // Middle zone - position to the side, but check space available
                const spaceLeft = markerCenterX - margin;
                const spaceRight = viewWidth - markerCenterX - margin;
                const spaceTop = markerCenterY - margin;
                const spaceBottom = viewHeight - markerCenterY - margin;
                
                // Choose the side with more space, preferring horizontal positioning
                if (spaceRight > panelWidth + gap && spaceRight > spaceLeft) {
                    // Position to the right
                    panelX = Math.min(viewWidth - panelWidth - margin, markerCenterX + gap);
                    panelY = Math.max(margin, Math.min(viewHeight - panelHeight - margin, markerCenterY - panelHeight/2));
                    arrowSide = 'left';
                    // Better arrow position constraints for vertical arrows
                const arrowBuffer = dynamicArrowSize + 3;
                    arrowPosition = Math.max(arrowBuffer, Math.min(panelHeight - arrowBuffer, markerCenterY - panelY));
                } else if (spaceLeft > panelWidth + gap) {
                    // Position to the left
                    panelX = Math.max(margin, markerCenterX - panelWidth - gap);
                    panelY = Math.max(margin, Math.min(viewHeight - panelHeight - margin, markerCenterY - panelHeight/2));
                    arrowSide = 'right';
                    // Better arrow position constraints for vertical arrows
                const arrowBuffer = dynamicArrowSize + 3;
                    arrowPosition = Math.max(arrowBuffer, Math.min(panelHeight - arrowBuffer, markerCenterY - panelY));
                } else if (spaceBottom > panelHeight + gap) {
                    // Fall back to below
                    panelX = Math.max(margin, Math.min(viewWidth - panelWidth - margin, markerCenterX - panelWidth/2));
                    panelY = Math.min(viewHeight - panelHeight - margin, markerCenterY + gap);
                    arrowSide = 'top';
                    const arrowBuffer = dynamicArrowSize + 5;
                    arrowPosition = Math.max(arrowBuffer, Math.min(panelWidth - arrowBuffer, markerCenterX - panelX));
                } else {
                    // Fall back to above (tooltip should be clearly above marker)
                    panelX = Math.max(margin, Math.min(viewWidth - panelWidth - margin, markerCenterX - panelWidth/2));
                    panelY = Math.max(margin, markerCenterY - panelHeight - gap - 50); // Much larger buffer
                    arrowSide = 'bottom';
                    const arrowBuffer = dynamicArrowSize + 5;
                    arrowPosition = Math.max(arrowBuffer, Math.min(panelWidth - arrowBuffer, markerCenterX - panelX));
                }
            }
            
            // Apply positioning and dynamic sizing
            panel.style.position = 'fixed';
            panel.style.left = `${panelX}px`;
            panel.style.top = `${panelY}px`;
            panel.style.right = 'auto';
            panel.style.bottom = 'auto';
            panel.style.width = `${panelWidth}px`;
            panel.style.height = 'auto'; // Let height adjust to content
            panel.style.minHeight = `${panelHeight}px`;
            
            // Set arrow properties
            panel.style.setProperty('--arrow-side', arrowSide);
            panel.style.setProperty('--arrow-position', `${arrowPosition}px`);
            panel.style.setProperty('--arrow-size', `${dynamicArrowSize}px`);
        };

        const hidePosterInfo = () => {
            // Use the global timer to prevent conflicts between markers
            if (window.posterInfoTimer) {
                clearTimeout(window.posterInfoTimer);
            }
            
            window.posterInfoTimer = setTimeout(() => {
                if (window.posterMap && window.posterMap.infoPanel) {
                    window.posterMap.infoPanel.classList.remove('active');
                }
                window.posterInfoTimer = null;
            }, 200); // Increased delay to prevent flickering
        };

        // Add hover effects for balloon animation and info display
        marker.addEventListener('mouseenter', () => {
            marker.setAttribute('r', '14'); // Increase radius from 12 to 14
            marker.style.filter = 'drop-shadow(0 3px 8px rgba(0,0,0,0.3))';
            
            // Scale up the text font size
            const originalFontSize = parseFloat(markerText.getAttribute('data-original-font-size'));
            markerText.setAttribute('font-size', originalFontSize * 1.2); // 20% larger
            
            // Show mount ID in console for dev debugging
            console.log(`Mount ID: ${config.id}`);
            
            showPosterInfo();
        });
        
        marker.addEventListener('mouseleave', () => {
            marker.setAttribute('r', '12'); // Reset radius back to 12
            marker.style.filter = 'none';
            
            // Reset text font size
            const originalFontSize = markerText.getAttribute('data-original-font-size');
            markerText.setAttribute('font-size', originalFontSize);
            
            hidePosterInfo();
        });

        // Touch events
        marker.addEventListener('touchstart', (e) => {
            e.preventDefault();
            showPosterInfo();
        });

        // Keyboard support
        marker.addEventListener('focus', () => {
            showPosterInfo();
        });
        
        marker.addEventListener('blur', () => {
            hidePosterInfo();
        });

        marker.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                showPosterInfo();
            }
        });

        // Append all elements
        group.appendChild(marker);
        group.appendChild(markerText);

        return group;
    }

    /**
     * Add a poster mount with two-sided poster display
     * @param {Object} config - Poster mount configuration
     * @param {string} config.id - Unique identifier
     * @param {Object} config.position - Position configuration
     * @param {number} config.position.x - X coordinate
     * @param {number} config.position.y - Y coordinate
     * @param {string} config.orientation - 'vertical' or 'horizontal'
     * @param {Object} config.sideA - Poster A information
     * @param {Object} config.sideB - Poster B information
     * @param {Object} [config.style] - Style overrides
     */
    addPosterMount(config) {
        const element = this.createPosterMountElement(config);
        
        this.layoutElements.set(config.id, {
            ...config,
            element: element,
            type: 'poster-mount'
        });

        this.renderElement(config.id);
        return config.id;
    }

    /**
     * Create poster mount SVG element
     */
    createPosterMountElement(config) {
        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        group.setAttribute('id', config.id);

        // Apply transform
        const transform = this.buildTransform(config);
        if (transform) {
            group.setAttribute('transform', transform);
        }

        // Determine mount dimensions based on orientation - made larger and more proportional
        const isVertical = config.orientation === 'vertical';
        const width = isVertical ? 16 : 60;
        const height = isVertical ? 60 : 16;

        // Create the mount base (thin rectangle)
        const mount = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        mount.setAttribute('x', -width/2);
        mount.setAttribute('y', -height/2);
        mount.setAttribute('width', width);
        mount.setAttribute('height', height);
        mount.setAttribute('rx', 2);
        mount.setAttribute('fill', config.style?.fill || '#404040');
        mount.setAttribute('stroke', config.style?.stroke || '#202020');
        mount.setAttribute('stroke-width', config.style?.strokeWidth || 1);

        // Create side A indicator (left or top side) - Mobile-friendly touch target
        const sideAIndicator = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        const offsetA = isVertical ? { x: -width/1.5, y: -height/2.8 } : { x: -width/3, y: -height/2.5 };
        sideAIndicator.setAttribute('cx', offsetA.x);
        sideAIndicator.setAttribute('cy', offsetA.y);
        sideAIndicator.setAttribute('r', 12); // Same size for all mounts
        sideAIndicator.setAttribute('fill', this.getColorByEaselBoardId(config.sideA.easelBoard));
        sideAIndicator.setAttribute('stroke', 'white');
        sideAIndicator.setAttribute('stroke-width', 2);
        sideAIndicator.style.cursor = 'pointer';
        sideAIndicator.style.transition = 'r 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), filter 0.2s ease-out';
        sideAIndicator.setAttribute('data-side', 'A');
        sideAIndicator.setAttribute('data-easel', config.sideA?.easelBoard || '');
        sideAIndicator.setAttribute('tabindex', '0');
        sideAIndicator.setAttribute('role', 'button');
        sideAIndicator.setAttribute('aria-label', `Poster A: ${config.sideA.title}`);
        sideAIndicator.classList.add('color-marker');
        
        // Add smooth balloon hover effect with info display
        sideAIndicator.addEventListener('mouseenter', () => {
            sideAIndicator.setAttribute('r', '14'); // Increase radius from 12 to 14
            sideAIndicator.style.filter = 'drop-shadow(0 3px 8px rgba(0,0,0,0.3))';
            
            // Scale up the text font size
            const originalFontSize = parseFloat(sideAText.getAttribute('data-original-font-size'));
            sideAText.setAttribute('font-size', originalFontSize * 1.2); // 20% larger
            
            // Show mount ID in console for dev debugging
            console.log(`Mount ID: ${config.id}`);
            
            showPosterInfo('A');
        });
        
        sideAIndicator.addEventListener('mouseleave', () => {
            sideAIndicator.setAttribute('r', '12'); // Reset radius back to 12
            sideAIndicator.style.filter = 'none';
            
            // Reset text font size
            const originalFontSize = sideAText.getAttribute('data-original-font-size');
            sideAText.setAttribute('font-size', originalFontSize);
            
            hidePosterInfo();
        });

        // Add text for side A showing easel ID with dynamic sizing
        const sideAText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        sideAText.setAttribute('x', offsetA.x);
        sideAText.setAttribute('y', offsetA.y + 1); // Slight vertical offset for better centering
        sideAText.setAttribute('text-anchor', 'middle');
        sideAText.setAttribute('dominant-baseline', 'central');
        sideAText.setAttribute('font-family', 'Arial, sans-serif');
        
        // Dynamic font sizing based on text length
        const sideAEaselBoard = config.sideA.easelBoard || '';
        const sideAFontSize = this.calculateFontSize(sideAEaselBoard);
        sideAText.setAttribute('font-size', sideAFontSize);
        
        // Store original font size for hover effect
        sideAText.setAttribute('data-original-font-size', sideAFontSize);
        
        sideAText.setAttribute('font-weight', 'bold');
        // Use dynamic text color based on background color for better contrast
        const sideABackgroundColor = this.getColorByEaselBoardId(config.sideA.easelBoard);
        const sideATextColor = this.getTextColorForBackground(sideABackgroundColor);
        sideAText.setAttribute('fill', sideATextColor);
        sideAText.setAttribute('pointer-events', 'none'); // Make text non-interactive to prevent hover conflicts
        sideAText.style.transition = 'font-size 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)';
        sideAText.textContent = sideAEaselBoard;
        
        // Add invisible touch area for easier mobile interaction
        const sideATouchArea = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        sideATouchArea.setAttribute('cx', offsetA.x);
        sideATouchArea.setAttribute('cy', offsetA.y);
        sideATouchArea.setAttribute('r', 26); // Slightly larger to accommodate expanded circle
        sideATouchArea.setAttribute('fill', 'transparent');
        sideATouchArea.style.cursor = 'pointer';
        sideATouchArea.setAttribute('data-side', 'A');

        // Create side B indicator (right or bottom side) - Mobile-friendly touch target
        const sideBIndicator = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        const offsetB = isVertical ? { x: width/1.5, y: height/2.8 } : { x: width/3, y: height/2.5 };
        sideBIndicator.setAttribute('cx', offsetB.x);
        sideBIndicator.setAttribute('cy', offsetB.y);
        sideBIndicator.setAttribute('r', 12); // Same size for all mounts
        sideBIndicator.setAttribute('fill', this.getColorByEaselBoardId(config.sideB.easelBoard));
        sideBIndicator.setAttribute('stroke', 'white');
        sideBIndicator.setAttribute('stroke-width', 2);
        sideBIndicator.style.cursor = 'pointer';
        sideBIndicator.style.transition = 'r 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), filter 0.2s ease-out';
        sideBIndicator.setAttribute('data-side', 'B');
        sideBIndicator.setAttribute('data-easel', config.sideB?.easelBoard || '');
        sideBIndicator.setAttribute('tabindex', '0');
        sideBIndicator.setAttribute('role', 'button');
        sideBIndicator.setAttribute('aria-label', `Poster B: ${config.sideB.title}`);
        sideBIndicator.classList.add('color-marker');
        
        // Add smooth balloon hover effect with info display
        sideBIndicator.addEventListener('mouseenter', () => {
            sideBIndicator.setAttribute('r', '14'); // Increase radius from 12 to 14
            sideBIndicator.style.filter = 'drop-shadow(0 3px 8px rgba(0,0,0,0.3))';
            
            // Scale up the text font size
            const originalFontSize = parseFloat(sideBText.getAttribute('data-original-font-size'));
            sideBText.setAttribute('font-size', originalFontSize * 1.2); // 20% larger
            
            // Show mount ID in console for dev debugging
            console.log(`Mount ID: ${config.id}`);
            
            showPosterInfo('B');
        });
        
        sideBIndicator.addEventListener('mouseleave', () => {
            sideBIndicator.setAttribute('r', '12'); // Reset radius back to 12
            sideBIndicator.style.filter = 'none';
            
            // Reset text font size
            const originalFontSize = sideBText.getAttribute('data-original-font-size');
            sideBText.setAttribute('font-size', originalFontSize);
            
            hidePosterInfo();
        });

        // Add text for side B showing easel ID with dynamic sizing
        const sideBText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        sideBText.setAttribute('x', offsetB.x);
        sideBText.setAttribute('y', offsetB.y + 1); // Slight vertical offset for better centering
        sideBText.setAttribute('text-anchor', 'middle');
        sideBText.setAttribute('dominant-baseline', 'central');
        sideBText.setAttribute('font-family', 'Arial, sans-serif');
        
        // Dynamic font sizing based on text length
        const sideBEaselBoard = config.sideB.easelBoard || '';
        const sideBFontSize = this.calculateFontSize(sideBEaselBoard);
        sideBText.setAttribute('font-size', sideBFontSize);
        
        // Store original font size for hover effect
        sideBText.setAttribute('data-original-font-size', sideBFontSize);
        
        sideBText.setAttribute('font-weight', 'bold');
        // Use dynamic text color based on background color for better contrast
        const sideBBackgroundColor = this.getColorByEaselBoardId(config.sideB.easelBoard);
        const sideBTextColor = this.getTextColorForBackground(sideBBackgroundColor);
        sideBText.setAttribute('fill', sideBTextColor);
        sideBText.setAttribute('pointer-events', 'none'); // Make text non-interactive to prevent hover conflicts
        sideBText.style.transition = 'font-size 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)';
        sideBText.textContent = sideBEaselBoard;
        
        // Add invisible touch area for easier mobile interaction
        const sideBTouchArea = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        sideBTouchArea.setAttribute('cx', offsetB.x);
        sideBTouchArea.setAttribute('cy', offsetB.y);
        sideBTouchArea.setAttribute('r', 26); // Slightly larger to accommodate expanded circle
        sideBTouchArea.setAttribute('fill', 'transparent');
        sideBTouchArea.style.cursor = 'pointer';
        sideBTouchArea.setAttribute('data-side', 'B');

        // Add hover handlers for both sides

        // Create a shared timer for all markers on this mount to prevent conflicts
        if (!window.posterInfoTimer) {
            window.posterInfoTimer = null;
        }
        
        // Mouse velocity tracking to disable tooltips during fast movement
        if (!window.mouseVelocityTracker) {
            window.mouseVelocityTracker = {
                lastX: 0,
                lastY: 0,
                lastTime: 0,
                velocity: 0,
                updateVelocity: function(x, y) {
                    const now = Date.now();
                    const deltaTime = now - this.lastTime;
                    
                    if (deltaTime > 0 && this.lastTime > 0) {
                        const deltaX = x - this.lastX;
                        const deltaY = y - this.lastY;
                        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
                        this.velocity = distance / deltaTime; // pixels per millisecond
                    }
                    
                    this.lastX = x;
                    this.lastY = y;
                    this.lastTime = now;
                }
            };
            
            // Global mouse move tracking
            document.addEventListener('mousemove', (e) => {
                window.mouseVelocityTracker.updateVelocity(e.clientX, e.clientY);
            });
        }
        
        const showPosterInfo = (side) => {
            // Always cancel any pending hide timer first
            if (window.posterInfoTimer) {
                clearTimeout(window.posterInfoTimer);
                window.posterInfoTimer = null;
            }
            
            const poster = side === 'A' ? config.sideA : config.sideB;
            const markerElement = side === 'A' ? sideAIndicator : sideBIndicator;
            
            // Reduced delay for faster switching between markers
            const showDelay = 50; // Reduced from 150ms to 50ms
            window.posterInfoTimer = setTimeout(() => {
                // Only check velocity if mouse is moving very fast (increased threshold)
                const velocityThreshold = 2.0; // Increased from 0.8 to 2.0
                if (window.mouseVelocityTracker && window.mouseVelocityTracker.velocity > velocityThreshold) {
                    return; // Only skip if moving extremely fast
                }
                
                if (window.posterMap) {
                    const easel = poster.easelBoard || poster.session || 'N/A';
                    const title = poster.title || 'Poster Information';
                    const bgColor = window.layout?.getColorByEaselBoardId?.(easel) || '#404040';
                    const textColor = window.layout?.getTextColorForBackground?.(bgColor) || 'white';
                    const fontSize = easel.length <= 2 ? 12 : easel.length <= 4 ? 10 : easel.length <= 6 ? 9 : 8;
                    window.posterMap.infoTitle.innerHTML = `
                        <span class="easel-pill" data-easel="${easel}">
                            <svg class="easel-pill__svg" viewBox="0 0 36 36" role="presentation">
                                <circle cx="18" cy="18" r="16" fill="${bgColor}" stroke="white" stroke-width="2"></circle>
                                <text x="18" y="18" fill="${textColor}" font-size="${fontSize}" dominant-baseline="middle" text-anchor="middle">${easel}</text>
                            </svg>
                        </span>
                        <span class="title-text">${title}</span>
                    `;
                    window.posterMap.infoDescription.innerHTML = `
                        <p><strong>Student(s):</strong> ${poster.students || poster.authors || 'N/A'}</p>
                        <p><strong>Faculty/Mentor:</strong> ${poster.facultyMentor || 'N/A'}</p>
                        <p><strong>Poster Category:</strong> ${poster.category || 'N/A'}</p>
                    `;
                    
                    // Position based on marker location and content length
                    positionInfoPanelSmart(markerElement, poster);
                    
                    window.posterMap.infoPanel.classList.add('active');
                }
                window.posterInfoTimer = null;
            }, showDelay);
        };
        
        const positionInfoPanelSmart = (markerElement, poster) => {
            const panel = window.posterMap.infoPanel;
            
            // Calculate content length to determine tooltip size
            const totalContentLength = (poster.title || '').length + 
                                     (poster.students || poster.authors || '').length + 
                                     (poster.facultyMentor || '').length + 
                                     (poster.category || '').length;
            
            // Dynamic sizing based on content length
            const isMobile = window.innerWidth <= 768;
            const basePanelWidth = isMobile ? 220 : 280;
            const basePanelHeight = isMobile ? 120 : 160;
            
            // Adjust dimensions for longer content
            const contentFactor = Math.min(totalContentLength / 200, 1.5); // Cap at 1.5x size
            const panelWidth = Math.floor(basePanelWidth * (1 + contentFactor * 0.3)); // Up to 30% wider
            const panelHeight = Math.floor(basePanelHeight * (1 + contentFactor * 0.4)); // Up to 40% taller
            
            // Calculate dynamic arrow size early for use in positioning
            const baseArrowSize = isMobile ? 9 : 12;
            const sizeMultiplier = Math.min(contentFactor, 1.3); // Cap multiplier
            const dynamicArrowSize = Math.floor(baseArrowSize * (1 + sizeMultiplier * 0.4)); // Up to 40% larger
            
            // Dynamic gap based on tooltip size - keep close while preserving hover buffer
            const baseGap = isMobile ? 22 : 30;
            const hoverBuffer = dynamicArrowSize + (isMobile ? 6 : 10);
            const dynamicGap = baseGap + Math.max(panelHeight - basePanelHeight, 0) * 0.18;
            const gap = Math.max(hoverBuffer, Math.floor(dynamicGap));
            const margin = isMobile ? 15 : 20;
            
            // Get marker position relative to viewport
            const markerRect = markerElement.getBoundingClientRect();
            const markerCenterX = markerRect.left + markerRect.width / 2;
            const markerCenterY = markerRect.top + markerRect.height / 2;
            
            // Check if marker is actually visible in viewport
            if (markerRect.left < -50 || markerRect.top < -50 || 
                markerRect.left > window.innerWidth + 50 || 
                markerRect.top > window.innerHeight + 50) {
                // Marker is off-screen, use fallback positioning
                panel.style.position = 'fixed';
                panel.style.top = '80px';
                panel.style.right = '20px';
                panel.style.left = 'auto';
                panel.style.bottom = 'auto';
                panel.style.removeProperty('--arrow-side');
                panel.style.removeProperty('--arrow-position');
                return;
            }
            
            const viewWidth = window.innerWidth;
            const viewHeight = window.innerHeight;
            
            let panelX, panelY, arrowSide, arrowPosition;
            
            // Adjust zones based on zoom level for better positioning when zoomed in
            const currentZoom = window.posterMap ? window.posterMap.currentZoom : 1;
            const zoomFactor = Math.min(currentZoom / 4, 1); // Reduce zone sensitivity when zoomed in
            
            // More conservative zones when zoomed in to prevent tooltips going off-screen
            const topZone = viewHeight * (0.25 + 0.1 * zoomFactor);
            const bottomZone = viewHeight * (0.75 - 0.1 * zoomFactor);
            const leftZone = viewWidth * (0.4 + 0.1 * zoomFactor);
            const rightZone = viewWidth * (0.6 - 0.1 * zoomFactor);
            
            if (markerCenterY < topZone) {
                // Top zone - position below marker
                panelX = Math.max(margin, Math.min(viewWidth - panelWidth - margin, markerCenterX - panelWidth/2));
                panelY = Math.min(viewHeight - panelHeight - margin, markerCenterY + gap);
                arrowSide = 'top';
                // Better arrow position constraints - ensure arrow stays well within bounds
                const arrowBuffer = dynamicArrowSize + 5; // Extra buffer based on arrow size
                arrowPosition = Math.max(arrowBuffer, Math.min(panelWidth - arrowBuffer, markerCenterX - panelX));
                
            } else if (markerCenterY > bottomZone) {
                // Bottom zone - position well above marker
                panelX = Math.max(margin, Math.min(viewWidth - panelWidth - margin, markerCenterX - panelWidth/2));
                panelY = Math.max(margin, markerCenterY - panelHeight - gap - 50); // Much larger buffer
                arrowSide = 'bottom';
                // Better arrow position constraints - ensure arrow stays well within bounds
                const arrowBuffer = dynamicArrowSize + 5; // Extra buffer based on arrow size
                arrowPosition = Math.max(arrowBuffer, Math.min(panelWidth - arrowBuffer, markerCenterX - panelX));
                
            } else {
                // Middle zone - position to the side, but check space available
                const spaceLeft = markerCenterX - margin;
                const spaceRight = viewWidth - markerCenterX - margin;
                const spaceTop = markerCenterY - margin;
                const spaceBottom = viewHeight - markerCenterY - margin;
                
                // Choose the side with more space, preferring horizontal positioning
                if (spaceRight > panelWidth + gap && spaceRight > spaceLeft) {
                    // Position to the right
                    panelX = Math.min(viewWidth - panelWidth - margin, markerCenterX + gap);
                    panelY = Math.max(margin, Math.min(viewHeight - panelHeight - margin, markerCenterY - panelHeight/2));
                    arrowSide = 'left';
                    // Better arrow position constraints for vertical arrows
                    const arrowBuffer = dynamicArrowSize + 5;
                    arrowPosition = Math.max(arrowBuffer, Math.min(panelHeight - arrowBuffer, markerCenterY - panelY));
                } else if (spaceLeft > panelWidth + gap) {
                    // Position to the left
                    panelX = Math.max(margin, markerCenterX - panelWidth - gap);
                    panelY = Math.max(margin, Math.min(viewHeight - panelHeight - margin, markerCenterY - panelHeight/2));
                    arrowSide = 'right';
                    // Better arrow position constraints for vertical arrows
                    const arrowBuffer = dynamicArrowSize + 5;
                    arrowPosition = Math.max(arrowBuffer, Math.min(panelHeight - arrowBuffer, markerCenterY - panelY));
                } else if (spaceBottom > panelHeight + gap) {
                    // Fall back to below
                    panelX = Math.max(margin, Math.min(viewWidth - panelWidth - margin, markerCenterX - panelWidth/2));
                    panelY = Math.min(viewHeight - panelHeight - margin, markerCenterY + gap);
                    arrowSide = 'top';
                    const arrowBuffer = dynamicArrowSize + 5;
                    arrowPosition = Math.max(arrowBuffer, Math.min(panelWidth - arrowBuffer, markerCenterX - panelX));
                } else {
                    // Fall back to above (tooltip should be clearly above marker)
                    panelX = Math.max(margin, Math.min(viewWidth - panelWidth - margin, markerCenterX - panelWidth/2));
                    panelY = Math.max(margin, markerCenterY - panelHeight - gap - 50); // Much larger buffer
                    arrowSide = 'bottom';
                    const arrowBuffer = dynamicArrowSize + 5;
                    arrowPosition = Math.max(arrowBuffer, Math.min(panelWidth - arrowBuffer, markerCenterX - panelX));
                }
            }
            
            // Apply positioning and dynamic sizing
            panel.style.position = 'fixed';
            panel.style.left = `${panelX}px`;
            panel.style.top = `${panelY}px`;
            panel.style.right = 'auto';
            panel.style.bottom = 'auto';
            panel.style.width = `${panelWidth}px`;
            panel.style.height = 'auto'; // Let height adjust to content
            panel.style.minHeight = `${panelHeight}px`;
            
            // Set arrow properties
            panel.style.setProperty('--arrow-side', arrowSide);
            panel.style.setProperty('--arrow-position', `${arrowPosition}px`);
            panel.style.setProperty('--arrow-size', `${dynamicArrowSize}px`);
        };

        const hidePosterInfo = () => {
            // Use the global timer to prevent conflicts between markers
            if (window.posterInfoTimer) {
                clearTimeout(window.posterInfoTimer);
            }
            
            window.posterInfoTimer = setTimeout(() => {
                if (window.posterMap && window.posterMap.infoPanel) {
                    window.posterMap.infoPanel.classList.remove('active');
                }
                window.posterInfoTimer = null;
            }, 200); // Increased delay to prevent flickering
        };

        // Combined hover effects for balloon animation and info display

        // Touch events
        sideAIndicator.addEventListener('touchstart', (e) => {
            e.preventDefault();
            showPosterInfo('A');
        });
        sideBIndicator.addEventListener('touchstart', (e) => {
            e.preventDefault();
            showPosterInfo('B');
        });

        // Keyboard support (only on visible indicators)
        [sideAIndicator, sideBIndicator].forEach(indicator => {
            indicator.addEventListener('focus', () => {
                showPosterInfo(indicator.getAttribute('data-side'));
            });
            
            indicator.addEventListener('blur', () => {
                hidePosterInfo();
            });

            indicator.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    showPosterInfo(indicator.getAttribute('data-side'));
                }
            });
        });

        // Append all elements
        group.appendChild(mount);
        group.appendChild(sideAIndicator);
        group.appendChild(sideAText);
        group.appendChild(sideBIndicator);
        group.appendChild(sideBText);

        return group;
    }

    /**
     * Load posters from TSV file and create poster mounts
     * @param {string} tsvUrl - URL to the TSV file
     * @param {Object} layoutConfig - Configuration for poster layout
     */
    async loadPostersFromTSV(posterTsvUrl, mountTsvUrl = 'Mounts.tsv', layoutConfig = {}) {
        try {
            // Load both TSV files
            const [posterResponse, mountResponse] = await Promise.all([
                fetch(posterTsvUrl),
                fetch(mountTsvUrl)
            ]);
            
            const posterTsvText = await posterResponse.text();
            const mountTsvText = await mountResponse.text();
            
            const posters = this.parsePosterTSV(posterTsvText);
            const mounts = this.parseMountTSV(mountTsvText);
            
            console.log(`Loaded ${posters.length} posters and ${mounts.length} mounts from TSV files`);
            
            // Create poster mounts from the combined data
            this.createPosterMountsFromSeparateData(posters, mounts, layoutConfig);
            
        } catch (error) {
            console.error('Error loading TSV files:', error);
        }
    }

    /**
     * Parse poster TSV data into poster objects
     */
    parsePosterTSV(tsvText) {
        const lines = tsvText.split('\n');
        const headers = lines[0].split('\t').map(h => h.trim());
        const posters = [];
        
        // Find column indices for poster data
        const categoryIndex = headers.indexOf('Poster Category') || 0;
        const easelBoardIndex = headers.indexOf('Easel Board') || 1;
        const titleIndex = headers.indexOf('Poster Title') || 2;
        const studentsIndex = headers.indexOf('Student(s)') || 3;
        const mentorIndex = headers.indexOf('Faculty/Mentor') || 4;
        const mountIdIndex = headers.indexOf('Mount ID');
        const sideIndex = headers.indexOf('Side');
        
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            const values = line.split('\t');
            if (values.length >= 5) {
                const poster = {
                    category: values[categoryIndex],
                    easelBoard: values[easelBoardIndex],
                    title: values[titleIndex],
                    students: values[studentsIndex],
                    facultyMentor: values[mentorIndex]
                };
                
                // Add mount and side data if columns exist
                if (mountIdIndex >= 0 && values[mountIdIndex]) {
                    poster.mountId = values[mountIdIndex].trim();
                }
                if (sideIndex >= 0 && values[sideIndex]) {
                    poster.side = values[sideIndex].trim();
                }
                
                posters.push(poster);
            }
        }
        
        return posters;
    }

    /**
     * Parse mount TSV data into mount objects
     */
    parseMountTSV(tsvText) {
        const lines = tsvText.split('\n');
        const headers = lines[0].split('\t').map(h => h.trim());
        const mounts = [];
        
        // Find column indices for mount data
        const mountIdIndex = headers.indexOf('Mount ID') || 0;
        const xCoordIndex = headers.indexOf('X Coordinate') || 1;
        const yCoordIndex = headers.indexOf('Y Coordinate') || 2;
        const orientationIndex = headers.indexOf('Orientation') || 3;
        
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            const values = line.split('\t');
            if (values.length >= 4) {
                const mount = {
                    mountId: values[mountIdIndex]?.trim(),
                    xCoord: parseFloat(values[xCoordIndex]) || 0,
                    yCoord: parseFloat(values[yCoordIndex]) || 0,
                    orientation: values[orientationIndex]?.trim().toLowerCase() || 'vertical'
                };
                
                mounts.push(mount);
            }
        }
        
        return mounts;
    }

    /**
     * Create poster mounts from separate poster and mount data
     */
    createPosterMountsFromSeparateData(posters, mounts, layoutConfig) {
        // Create a map of mount data by mount ID for easy lookup
        const mountMap = new Map();
        mounts.forEach(mount => {
            mountMap.set(mount.mountId, mount);
        });

        // Group posters by mount ID
        const mountGroups = new Map();
        
        posters.forEach(poster => {
            if (poster.mountId && mountMap.has(poster.mountId)) {
                if (!mountGroups.has(poster.mountId)) {
                    mountGroups.set(poster.mountId, []);
                }
                mountGroups.get(poster.mountId).push(poster);
            }
        });
        
        // Create poster mounts for each group
        mountGroups.forEach((mountPosters, mountId) => {
            const mountData = mountMap.get(mountId);
            if (!mountData) return;
            
            const lonePoster = mountPosters.find(poster => this.isLoneMarkerBoard(poster.easelBoard));
            if (lonePoster && mountPosters.length === 1) {
                this.addLoneMarker({
                    id: `lone-marker-${lonePoster.easelBoard}`,
                    position: { x: mountData.xCoord, y: mountData.yCoord },
                    orientation: mountData.orientation,
                    poster: {
                        title: lonePoster.title,
                        students: lonePoster.students,
                        facultyMentor: lonePoster.facultyMentor,
                        category: lonePoster.category,
                        easelBoard: lonePoster.easelBoard
                    }
                });
                return;
            }
            
            const orientation = mountData.orientation || 'vertical';
            const position = { x: mountData.xCoord, y: mountData.yCoord };
            
            // Sort posters by their designated side
            let sideAPosters = [];
            let sideBPosters = [];
            
            mountPosters.forEach(poster => {
                const side = poster.side;
                if (orientation === 'horizontal') {
                    // For horizontal: North goes to A, South goes to B
                    if (side === 'North') {
                        sideAPosters.push(poster);
                    } else if (side === 'South') {
                        sideBPosters.push(poster);
                    } else {
                        // Default assignment if no side specified
                        if (sideAPosters.length === 0) {
                            sideAPosters.push(poster);
                        } else {
                            sideBPosters.push(poster);
                        }
                    }
                } else {
                    // For vertical: West goes to A, East goes to B
                    if (side === 'West') {
                        sideAPosters.push(poster);
                    } else if (side === 'East') {
                        sideBPosters.push(poster);
                    } else {
                        // Default assignment if no side specified
                        if (sideAPosters.length === 0) {
                            sideAPosters.push(poster);
                        } else {
                            sideBPosters.push(poster);
                        }
                    }
                }
            });
            
            const sideAPoster = sideAPosters[0] || null;
            const sideBPoster = sideBPosters[0] || null;
            
            this.addPosterMount({
                id: mountId,
                position: position,
                orientation: orientation,
                sideA: sideAPoster ? {
                    title: sideAPoster.title,
                    students: sideAPoster.students,
                    facultyMentor: sideAPoster.facultyMentor,
                    category: sideAPoster.category,
                    easelBoard: sideAPoster.easelBoard
                } : {
                    title: 'Available Space',
                    students: 'No poster assigned',
                    facultyMentor: 'N/A',
                    category: 'Available',
                    easelBoard: 'Unassigned'
                },
                sideB: sideBPoster ? {
                    title: sideBPoster.title,
                    students: sideBPoster.students,
                    facultyMentor: sideBPoster.facultyMentor,
                    category: sideBPoster.category,
                    easelBoard: sideBPoster.easelBoard
                } : {
                    title: 'Available Space',
                    students: 'No poster assigned',
                    facultyMentor: 'N/A',
                    category: 'Available',
                    easelBoard: 'Unassigned'
                }
            });
        });
    }

    /**
     * Create poster mounts from poster data (legacy method)
     */
    createPosterMounts(posters, layoutConfig) {
        const {
            startX = 300,
            startY = 200,
            spacing = 60,
            postersPerRow = 10,
            alternateOrientation = true
        } = layoutConfig;

        // First, check if we have positioning data in the TSV
        const hasPositioningData = posters.some(p => p.mountId || (p.xCoord !== undefined && p.yCoord !== undefined));
        
        if (hasPositioningData) {
            // Use positioning data from TSV
            this.createPositionedMounts(posters);
        } else {
            // Fall back to grid layout
            this.createGridMounts(posters, layoutConfig);
        }
    }
    
    /**
     * Create mounts based on specific positioning data from TSV
     */
    createPositionedMounts(posters) {
        const mountGroups = new Map();
        
        // Group posters by mount ID or create individual mounts
        posters.forEach(poster => {
            if (poster.mountId) {
                // Group by mount ID
                if (!mountGroups.has(poster.mountId)) {
                    mountGroups.set(poster.mountId, []);
                }
                mountGroups.get(poster.mountId).push(poster);
            } else if (poster.xCoord !== undefined && poster.yCoord !== undefined) {
                // Create individual mount with coordinates
                const mountId = `mount-${poster.easelBoard || Math.random().toString(36).substr(2, 9)}`;
                mountGroups.set(mountId, [poster]);
            }
        });
        
        // Create poster mounts for each group
        mountGroups.forEach((mountPosters, mountId) => {
            const primaryPoster = mountPosters[0];
            const orientation = primaryPoster.orientation || 'vertical';
            
            // Determine position from first poster with coordinates
            let position = { x: 400, y: 400 }; // default
            if (primaryPoster.xCoord !== undefined && primaryPoster.yCoord !== undefined) {
                position = { x: primaryPoster.xCoord, y: primaryPoster.yCoord };
            }
            
            // Sort posters by their designated side
            let sideAPosters = [];
            let sideBPosters = [];
            
            mountPosters.forEach(poster => {
                const side = poster.side;
                if (orientation === 'horizontal') {
                    // For horizontal: North goes to A, South goes to B
                    if (side === 'North') {
                        sideAPosters.push(poster);
                    } else if (side === 'South') {
                        sideBPosters.push(poster);
                    } else {
                        // Default assignment if no side specified
                        if (sideAPosters.length === 0) {
                            sideAPosters.push(poster);
                        } else {
                            sideBPosters.push(poster);
                        }
                    }
                } else {
                    // For vertical: West goes to A, East goes to B
                    if (side === 'West') {
                        sideAPosters.push(poster);
                    } else if (side === 'East') {
                        sideBPosters.push(poster);
                    } else {
                        // Default assignment if no side specified
                        if (sideAPosters.length === 0) {
                            sideAPosters.push(poster);
                        } else {
                            sideBPosters.push(poster);
                        }
                    }
                }
            });
            
            const sideAPoster = sideAPosters[0] || null;
            const sideBPoster = sideBPosters[0] || null;
            
            this.addPosterMount({
                id: mountId,
                position: position,
                orientation: orientation,
                sideA: sideAPoster ? {
                    title: sideAPoster.title,
                    students: sideAPoster.students,
                    facultyMentor: sideAPoster.facultyMentor,
                    category: sideAPoster.category,
                    easelBoard: sideAPoster.easelBoard
                } : {
                    title: 'Available Space',
                    students: 'No poster assigned',
                    facultyMentor: 'N/A',
                    category: 'Available',
                    easelBoard: 'Unassigned'
                },
                sideB: sideBPoster ? {
                    title: sideBPoster.title,
                    students: sideBPoster.students,
                    facultyMentor: sideBPoster.facultyMentor,
                    category: sideBPoster.category,
                    easelBoard: sideBPoster.easelBoard
                } : {
                    title: 'Available Space',
                    students: 'No poster assigned',
                    facultyMentor: 'N/A',
                    category: 'Available',
                    easelBoard: 'Unassigned'
                }
            });
        });
    }
    
    /**
     * Create mounts in grid layout (fallback)
     */
    createGridMounts(posters, layoutConfig) {
        const {
            startX = 300,
            startY = 200,
            spacing = 60,
            postersPerRow = 10,
            alternateOrientation = true
        } = layoutConfig;

        // Group posters in pairs for two-sided mounts
        for (let i = 0; i < posters.length; i += 2) {
            const posterA = posters[i];
            const posterB = posters[i + 1] || null;

            const mountIndex = Math.floor(i / 2);
            const row = Math.floor(mountIndex / postersPerRow);
            const col = mountIndex % postersPerRow;
            
            const x = startX + (col * spacing);
            const y = startY + (row * spacing);
            const orientation = alternateOrientation && mountIndex % 2 === 0 ? 'vertical' : 'horizontal';

            this.addPosterMount({
                id: `poster-mount-${mountIndex + 1}`,
                position: { x, y },
                orientation: orientation,
                sideA: {
                    title: posterA.title,
                    students: posterA.students,
                    facultyMentor: posterA.facultyMentor,
                    category: posterA.category,
                    easelBoard: posterA.easelBoard
                },
                sideB: posterB ? {
                    title: posterB.title,
                    students: posterB.students,
                    facultyMentor: posterB.facultyMentor,
                    category: posterB.category,
                    easelBoard: posterB.easelBoard
                } : {
                    title: 'Available Space',
                    students: 'No poster assigned',
                    facultyMentor: 'N/A',
                    category: 'Available',
                    easelBoard: 'Unassigned'
                }
            });
        }
    }

    /**
     * Clear all elements
     */
    clear() {
        this.layoutElements.forEach((_, id) => this.removeElement(id));
        this.layoutElements.clear();
    }
}

// Make LayoutAPI available globally
window.LayoutAPI = LayoutAPI;

// Extend the main PosterSessionMap class with layout capabilities
function extendPosterSessionMap() {
    if (typeof window !== 'undefined' && window.PosterSessionMap) {
        window.PosterSessionMap.prototype.initializeLayoutAPI = function() {
            this.layout = new LayoutAPI(this);
            return this.layout;
        };
        return true;
    }
    return false;
}

// Try to extend immediately
if (!extendPosterSessionMap()) {
    // If PosterSessionMap isn't ready, wait for it
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            if (!extendPosterSessionMap()) {
                console.error('PosterSessionMap class not found - Layout API cannot initialize');
            }
        }, 50);
    });
}
