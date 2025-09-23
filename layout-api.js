// Layout API for SVG Placement and Management
class LayoutAPI {
    constructor(mapInstance) {
        this.map = mapInstance;
        this.layoutElements = new Map();
        this.svgCache = new Map();
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

        // Determine which group to add to based on z-index or type
        let targetGroup;
        if (layoutElement.zIndex && layoutElement.zIndex > 100) {
            targetGroup = this.map.markersGroup;
        } else {
            targetGroup = this.map.posterAreasGroup;
        }

        targetGroup.appendChild(layoutElement.element);
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
