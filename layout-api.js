// Layout API for SVG Placement and Management
class LayoutAPI {
    constructor(mapInstance) {
        this.map = mapInstance;
        this.layoutElements = new Map();
        this.svgCache = new Map();
        
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
            case "BHC":
                color = "#FFA500"; // orange (Biology, Hixon Center - follows Biology color)
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
            case "HSA":
                color = "#008080"; // teal (HSA-1)
                break;
            case "HSAM":
                color = "#FFA500"; // orange (HSAM-1)
                break;
            case "M":
                color = "#FF8C00"; // deep orange (M-1 through M-5)
                break;
            case "P":
                color = "#800080"; // purple (P-1 through P-13)
                break;
            // Legacy cases for backward compatibility
            case "BC":
                color = "#56B4E9"; // light blue (legacy)
                break;
            case "BE":
                color = "#F0E442"; // light yellow (legacy)
                break;
            case "CSN":
                color = "#009E73"; // teal (legacy)
                break;
            case "EM":
                color = "#FF4500"; // orange-red (legacy)
                break;
            case "O":
                color = "#CC79A7"; // pink (legacy)
                break;
            case "SSEF":
                color = "#E69F00"; // yellow-orange (legacy)
                break;
            default:
                color = "#404040"; // gray for unrecognized easelBoardId
        }

        return color;
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
        if (layoutElement.type === 'poster-mount') {
            // Poster mounts always go to the top layer
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
        const offsetA = isVertical ? { x: -width/2.5, y: -height/3 } : { x: -width/3, y: -height/2.5 };
        sideAIndicator.setAttribute('cx', offsetA.x);
        sideAIndicator.setAttribute('cy', offsetA.y);
        sideAIndicator.setAttribute('r', 12); // Made slightly larger to accommodate text
        sideAIndicator.setAttribute('fill', this.getColorByEaselBoardId(config.sideA.easelBoard));
        sideAIndicator.setAttribute('stroke', 'white');
        sideAIndicator.setAttribute('stroke-width', 2);
        sideAIndicator.style.cursor = 'pointer';
        sideAIndicator.setAttribute('data-side', 'A');
        sideAIndicator.setAttribute('tabindex', '0');
        sideAIndicator.setAttribute('role', 'button');
        sideAIndicator.setAttribute('aria-label', `Poster A: ${config.sideA.title}`);

        // Add text for side A showing easel ID
        const sideAText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        sideAText.setAttribute('x', offsetA.x);
        sideAText.setAttribute('y', offsetA.y + 1); // Slight vertical offset for better centering
        sideAText.setAttribute('text-anchor', 'middle');
        sideAText.setAttribute('dominant-baseline', 'central');
        sideAText.setAttribute('font-family', 'Arial, sans-serif');
        sideAText.setAttribute('font-size', '8');
        sideAText.setAttribute('font-weight', 'bold');
        sideAText.setAttribute('fill', 'white');
        sideAText.setAttribute('pointer-events', 'none'); // Make text non-interactive
        sideAText.textContent = config.sideA.easelBoard || '';
        
        // Add invisible touch area for easier mobile interaction
        const sideATouchArea = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        sideATouchArea.setAttribute('cx', offsetA.x);
        sideATouchArea.setAttribute('cy', offsetA.y);
        sideATouchArea.setAttribute('r', 24); // Slightly larger touch area to match bigger circles
        sideATouchArea.setAttribute('fill', 'transparent');
        sideATouchArea.style.cursor = 'pointer';
        sideATouchArea.setAttribute('data-side', 'A');

        // Create side B indicator (right or bottom side) - Mobile-friendly touch target
        const sideBIndicator = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        const offsetB = isVertical ? { x: width/2.5, y: height/3 } : { x: width/3, y: height/2.5 };
        sideBIndicator.setAttribute('cx', offsetB.x);
        sideBIndicator.setAttribute('cy', offsetB.y);
        sideBIndicator.setAttribute('r', 12); // Made slightly larger to accommodate text
        sideBIndicator.setAttribute('fill', this.getColorByEaselBoardId(config.sideB.easelBoard));
        sideBIndicator.setAttribute('stroke', 'white');
        sideBIndicator.setAttribute('stroke-width', 2);
        sideBIndicator.style.cursor = 'pointer';
        sideBIndicator.setAttribute('data-side', 'B');
        sideBIndicator.setAttribute('tabindex', '0');
        sideBIndicator.setAttribute('role', 'button');
        sideBIndicator.setAttribute('aria-label', `Poster B: ${config.sideB.title}`);

        // Add text for side B showing easel ID
        const sideBText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        sideBText.setAttribute('x', offsetB.x);
        sideBText.setAttribute('y', offsetB.y + 1); // Slight vertical offset for better centering
        sideBText.setAttribute('text-anchor', 'middle');
        sideBText.setAttribute('dominant-baseline', 'central');
        sideBText.setAttribute('font-family', 'Arial, sans-serif');
        sideBText.setAttribute('font-size', '8');
        sideBText.setAttribute('font-weight', 'bold');
        sideBText.setAttribute('fill', 'white');
        sideBText.setAttribute('pointer-events', 'none'); // Make text non-interactive
        sideBText.textContent = config.sideB.easelBoard || '';
        
        // Add invisible touch area for easier mobile interaction
        const sideBTouchArea = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        sideBTouchArea.setAttribute('cx', offsetB.x);
        sideBTouchArea.setAttribute('cy', offsetB.y);
        sideBTouchArea.setAttribute('r', 24); // Slightly larger touch area to match bigger circles
        sideBTouchArea.setAttribute('fill', 'transparent');
        sideBTouchArea.style.cursor = 'pointer';
        sideBTouchArea.setAttribute('data-side', 'B');

        // Add click handlers for both sides
        const showPosterInfo = (side) => {
            const poster = side === 'A' ? config.sideA : config.sideB;
            const sideLabel = side === 'A' ? 'Side A' : 'Side B';
            
            if (window.posterMap) {
                window.posterMap.infoTitle.textContent = `${poster.title || 'Poster Information'} (${sideLabel})`;
                window.posterMap.infoDescription.innerHTML = `
                    <p><strong>Student(s):</strong> ${poster.students || poster.authors || 'N/A'}</p>
                    <p><strong>Faculty/Mentor:</strong> ${poster.facultyMentor || 'N/A'}</p>
                    <p><strong>Poster Category:</strong> ${poster.category || 'N/A'}</p>
                    <p><strong>Easel Board:</strong> ${poster.easelBoard || poster.session || 'N/A'}</p>
                `;
                window.posterMap.infoPanel.classList.add('active');
                
                // Clear any existing auto-hide timer
                if (window.posterMap.infoTimer) {
                    clearTimeout(window.posterMap.infoTimer);
                }
                
                // Auto-hide after 8 seconds for mobile UX
                window.posterMap.infoTimer = setTimeout(() => {
                    window.posterMap.infoPanel.classList.remove('active');
                }, 8000);
            }
        };

        // Add event handlers to both visible indicators and invisible touch areas
        const addEventHandlers = (element, side) => {
            element.addEventListener('click', () => showPosterInfo(side));
            element.addEventListener('touchend', (e) => {
                e.preventDefault();
                showPosterInfo(side);
            });
        };

        addEventHandlers(sideAIndicator, 'A');
        addEventHandlers(sideATouchArea, 'A');
        addEventHandlers(sideBIndicator, 'B');
        addEventHandlers(sideBTouchArea, 'B');

        // Keyboard support (only on visible indicators)
        [sideAIndicator, sideBIndicator].forEach(indicator => {
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
        group.appendChild(sideATouchArea);
        group.appendChild(sideBIndicator);
        group.appendChild(sideBText);
        group.appendChild(sideBTouchArea);

        return group;
    }

    /**
     * Load posters from TSV file and create poster mounts
     * @param {string} tsvUrl - URL to the TSV file
     * @param {Object} layoutConfig - Configuration for poster layout
     */
    async loadPostersFromTSV(tsvUrl, layoutConfig = {}) {
        try {
            const response = await fetch(tsvUrl);
            const tsvText = await response.text();
            const posters = this.parseTSV(tsvText);
            
            console.log(`Loaded ${posters.length} posters from TSV`);
            
            // Create poster mounts from the data
            this.createPosterMounts(posters, layoutConfig);
            
        } catch (error) {
            console.error('Error loading TSV:', error);
        }
    }

    /**
     * Parse TSV data into poster objects
     */
    parseTSV(tsvText) {
        const lines = tsvText.split('\n');
        const headers = lines[0].split('\t').map(h => h.trim());
        const posters = [];
        
        // Find column indices for positioning data (if they exist)
        const categoryIndex = headers.indexOf('Poster Category') || 0;
        const easelBoardIndex = headers.indexOf('Easel Board') || 1;
        const titleIndex = headers.indexOf('Poster Title') || 2;
        const studentsIndex = headers.indexOf('Student(s)') || 3;
        const mentorIndex = headers.indexOf('Faculty/Mentor') || 4;
        const mountIdIndex = headers.indexOf('Mount ID');
        const xCoordIndex = headers.indexOf('X Coordinate');
        const yCoordIndex = headers.indexOf('Y Coordinate');
        const orientationIndex = headers.indexOf('Orientation');
        
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
                
                // Add positioning data if columns exist
                if (mountIdIndex >= 0 && values[mountIdIndex]) {
                    poster.mountId = values[mountIdIndex].trim();
                }
                if (xCoordIndex >= 0 && values[xCoordIndex]) {
                    poster.xCoord = parseFloat(values[xCoordIndex]);
                }
                if (yCoordIndex >= 0 && values[yCoordIndex]) {
                    poster.yCoord = parseFloat(values[yCoordIndex]);
                }
                if (orientationIndex >= 0 && values[orientationIndex]) {
                    poster.orientation = values[orientationIndex].trim().toLowerCase();
                }
                
                posters.push(poster);
            }
        }
        
        return posters;
    }

    /**
     * Create poster mounts from poster data
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
            const secondaryPoster = mountPosters[1] || null;
            
            // Determine position from first poster with coordinates
            let position = { x: 400, y: 400 }; // default
            if (primaryPoster.xCoord !== undefined && primaryPoster.yCoord !== undefined) {
                position = { x: primaryPoster.xCoord, y: primaryPoster.yCoord };
            }
            
            // Determine orientation
            const orientation = primaryPoster.orientation || 'vertical';
            
            this.addPosterMount({
                id: mountId,
                position: position,
                orientation: orientation,
                sideA: {
                    title: primaryPoster.title,
                    students: primaryPoster.students,
                    facultyMentor: primaryPoster.facultyMentor,
                    category: primaryPoster.category,
                    easelBoard: primaryPoster.easelBoard
                },
                sideB: secondaryPoster ? {
                    title: secondaryPoster.title,
                    students: secondaryPoster.students,
                    facultyMentor: secondaryPoster.facultyMentor,
                    category: secondaryPoster.category,
                    easelBoard: secondaryPoster.easelBoard
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
