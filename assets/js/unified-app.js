// Unified Poster Session App - No iframes, direct communication
// Combines map and table functionality in a single page

// Import functions (we'll copy the essential parts to avoid module issues)
import { geojsonFeature_BUILDINGS } from "./buildingPolygons.js";
import { geojsonFeature_FLOOR } from "./floorPolygons.js";
import { getCustomIcon, getColorByEaselBoardId } from "./markerIcons.js";

// Global variables
let map;
let markers = [];
let markerObjs = [];
let hiddenMarkers = [];
let openPopUp = null;
let isFullscreen = false;

// Make map globally accessible for dev.js
window.map = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeMap();
    initializeTable();
    loadData();
});

// Initialize the map
function initializeMap() {
    console.log('Initializing map...');
    
    var defaultLayer = L.tileLayer(
        "http://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}",
        {
            minZoom: 18,
            maxZoom: 22,
            subdomains: ["mt0", "mt1", "mt2", "mt3"],
        }
    );

    // Initialize map with HMC coordinates
    map = L.map("map", {
        center: [34.1061046, -117.7119814],
        zoom: 19,
        maxZoom: 22,
        minZoom: 18,
        zoomDelta: 1,
        zoomSnap: 1,
        editable: false,
        layers: [defaultLayer],
        attributionControl: false, // Disable attribution control
    });

    var bounds = [
        [34.1054531, -117.7130985], // Southwest corner
        [34.1068478, -117.7111942], // Northeast corner
    ];

    map.setMaxBounds(bounds);

    // Add floor and building layers
    var floorLayer = L.geoJSON(geojsonFeature_FLOOR, {
        style: function (feature) {
            return {
                color: "#000000",
                weight: 1,
                opacity: 1,
                fillColor: "#eadab8",
                fillOpacity: 0.5,
            };
        },
    });

    var buildingLayer = L.geoJSON(geojsonFeature_BUILDINGS, {
        style: function (feature) {
            return {
                color: "#000000",
                weight: 2,
                opacity: 1,
                fillColor: "#aaaaaa",
                fillOpacity: 1,
            };
        },
    });

    buildingLayer.addTo(map);
    floorLayer.addTo(map);
    map.removeLayer(defaultLayer);

    var baseLayers = {
        "2D View": buildingLayer,
        "Satellite View": defaultLayer,
    };

    floorLayer.setZIndex(0);
    buildingLayer.setZIndex(1);

    map.on("baselayerchange", function (e) {
        if (e.name === "2D View") {
            map.addLayer(floorLayer);
        } else {
            map.removeLayer(floorLayer);
        }
    });

    L.control.layers(baseLayers).addTo(map);

    // Add fullscreen control
    addFullscreenControl();

    // Add zoom event listeners
    map.on("zoomend", () => {
        adjustMarkerSize();
        toggleTooltips();
        adjustTooltipSize();
    });

    // Add click event to restore hidden markers
    map.on("click", () => {
        restoreHiddenMarkers();
    });

    console.log('Map initialized successfully');
    
    // Make map available globally for dev.js
    window.map = map;
}

// Add fullscreen control
function addFullscreenControl() {
    L.Control.Fullscreen = L.Control.extend({
        onAdd: function(map) {
            var container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-fullscreen');
            
            this._button = L.DomUtil.create('a', 'leaflet-control-fullscreen-button', container);
            this._button.href = '#';
            this._button.title = 'Toggle Fullscreen';
            this._button.setAttribute('role', 'button');
            this._button.setAttribute('aria-label', 'Toggle Fullscreen');
            this._button.innerHTML = '<span class="fullscreen-icon">⛶</span>';
            
            L.DomEvent.on(this._button, 'click', this._toggleFullscreen, this);
            L.DomEvent.disableClickPropagation(container);
            
            return container;
        },
        
        _toggleFullscreen: function(e) {
            L.DomEvent.preventDefault(e);
            
            const appContainer = document.querySelector('.app-container');
            const fullscreenIcon = this._button.querySelector('.fullscreen-icon');
            
            if (!isFullscreen) {
                // Enter fullscreen
                appContainer.classList.add('fullscreen-active');
                fullscreenIcon.textContent = '⛉';
                isFullscreen = true;
                
                // Use browser fullscreen API
                if (document.body.requestFullscreen) {
                    document.body.requestFullscreen();
                } else if (document.body.webkitRequestFullscreen) {
                    document.body.webkitRequestFullscreen();
                } else if (document.body.msRequestFullscreen) {
                    document.body.msRequestFullscreen();
                } else if (document.body.mozRequestFullScreen) {
                    document.body.mozRequestFullScreen();
                }
            } else {
                // Exit fullscreen
                appContainer.classList.remove('fullscreen-active');
                fullscreenIcon.textContent = '⛶';
                isFullscreen = false;
                
                // Exit browser fullscreen
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                } else if (document.webkitExitFullscreen) {
                    document.webkitExitFullscreen();
                } else if (document.msExitFullscreen) {
                    document.msExitFullscreen();
                } else if (document.mozCancelFullScreen) {
                    document.mozCancelFullScreen();
                }
            }
            
            // Trigger map resize
            setTimeout(() => {
                map.invalidateSize();
            }, 100);
        }
    });
    
    L.control.fullscreen = function(opts) {
        return new L.Control.Fullscreen(opts);
    };
    
    var fullscreenControl = L.control.fullscreen({ position: 'topleft' });
    fullscreenControl.addTo(map);
    
    // Listen for fullscreen changes
    document.addEventListener('fullscreenchange', function() {
        if (!document.fullscreenElement && isFullscreen) {
            const appContainer = document.querySelector('.app-container');
            const fullscreenIcon = document.querySelector('.fullscreen-icon');
            appContainer.classList.remove('fullscreen-active');
            fullscreenIcon.textContent = '⛶';
            isFullscreen = false;
            setTimeout(() => {
                map.invalidateSize();
            }, 100);
        }
    });
}

// Add marker to map
function addMarker(lat, lng, popupText, easelBoardId, tooltipText, tooltipDirection = "top") {
    try {
        // Debug logging for test markers
        if (easelBoardId === "E-13" || easelBoardId === "E-14") {
            console.log(`DEBUG: Creating marker ${easelBoardId} with getCustomIcon...`);
        }
        
        var customIcon = getCustomIcon(easelBoardId, 40);
        
        if (easelBoardId === "E-13" || easelBoardId === "E-14") {
            console.log(`DEBUG: Custom icon created for ${easelBoardId}:`, customIcon);
        }
        
        var marker = L.marker([lat, lng], {
            icon: customIcon,
            riseOnHover: true,
        });

        // Create enhanced popup content with just easel and title
        const enhancedPopupText = `
            <div class="marker-popup">
                <div class="easel-number">${easelBoardId}</div>
                <div class="poster-title-popup">${popupText}</div>
            </div>
        `;
        
        marker.bindPopup(enhancedPopupText);
        
        marker.on("mouseover", function (e) {
            console.log(`Hovering over marker: ${easelBoardId}`);
            fadeOtherMarkers(this);
            this.openPopup();
        });
        
        marker.on("mouseout", function (e) {
            console.log(`Mouse left marker: ${easelBoardId}`);
            restoreMarkerOpacity();
            this.closePopup();
        });

        // Store tooltip direction for later restoration
        marker._tooltipDirection = tooltipDirection;
        marker._tooltipText = tooltipText;
        
        marker.bindTooltip(tooltipText, {
            permanent: true,
            direction: tooltipDirection,
            minZoom: 21,
        });

        marker.on("tooltipopen", function () {
            var tooltipElement = document.querySelector(".leaflet-tooltip");
            if (tooltipElement) {
                tooltipElement.addEventListener("mouseover", function () {
                    marker.openPopup();
                });
            }
        });

        // DIRECT COMMUNICATION - No iframes!
        marker.on('click', function () {
            const lat = marker.getLatLng().lat;
            const lng = marker.getLatLng().lng;
            console.log(`Marker clicked: lat=${lat}, lng=${lng}`);
            
            // Clear any existing highlights first
            removeMarkerHighlights();
            
            // Focus on the corresponding row
            focusRow(lat, lng); // Direct function call!
        });

        marker.addTo(map);
        markerObjs.push(marker);
        markers.push({ marker, easelBoardId });
        
        // Debug logging for test markers after adding to map
        if (easelBoardId === "E-13" || easelBoardId === "E-14") {
            console.log(`DEBUG: Marker ${easelBoardId} successfully added to map`);
            console.log(`DEBUG: Total markers now: ${markerObjs.length}`);
        }
        
        adjustMarkerSize();
    } catch (error) {
        console.error("Error adding marker:", error);
        
        // Extra logging for test markers if they fail
        if (easelBoardId === "E-13" || easelBoardId === "E-14") {
            console.error(`DEBUG: Failed to add test marker ${easelBoardId}:`, error);
        }
    }
}

// Marker utility functions
function adjustMarkerSize() {
    const zoomLevel = map.getZoom();
    const newSize = zoomLevel <= 20 ? 14 : zoomLevel <= 21 ? 22 : 40;
    markers.forEach(({ marker, easelBoardId }) => {
        const newIcon = getCustomIcon(easelBoardId, newSize);
        marker.setIcon(newIcon);
    });
}

function toggleTooltips() {
    const zoomLevel = map.getZoom();
    markers.forEach(({ marker }) => {
        if (zoomLevel <= 19) {
            marker.closeTooltip();
        } else {
            marker.openTooltip();
        }
    });
}

function adjustTooltipSize() {
    const zoomLevel = map.getZoom();
    const newFontSize = zoomLevel <= 20 ? "12px" : zoomLevel <= 21 ? "13px" : "14px";
    const tooltips = document.querySelectorAll(".leaflet-tooltip");
    tooltips.forEach((tooltip) => {
        tooltip.style.fontSize = newFontSize;
    });
}

// Focus on specific marker
function focusOnMarker(lat, lng) {
    console.log(`Focusing on marker: lat=${lat}, lng=${lng}`);
    hiddenMarkers = [];
    markerObjs.forEach(marker => {
        if (marker.getLatLng().lat === lat && marker.getLatLng().lng === lng) {
            marker.addTo(map);
            map.zoomLevel = 21;
            map.panTo([lat, lng], {animate: true, duration: 2.0, easeLinearity: 2.0});
            marker.openPopup();
            openPopUp = marker.getPopup();
        } else {
            map.removeLayer(marker);
            hiddenMarkers.push(marker);
        }
    });
}

function restoreHiddenMarkers() {
    hiddenMarkers.forEach(marker => marker.addTo(map));
    hiddenMarkers = [];
    
    // Only restore tooltips if we're not currently in a hover state
    const isHovering = document.body.classList.contains('marker-hover-active');
    if (!isHovering) {
        toggleTooltips();
    }
    
    if (openPopUp) {
        map.closePopup(openPopUp);
        openPopUp = null;
    }
}

// Highlight a specific marker when row is clicked (without hiding others)
function highlightMarker(lat, lng) {
    console.log(`Highlighting marker: lat=${lat}, lng=${lng}`);
    
    // First remove any existing highlights
    removeMarkerHighlights();
    
    // Find the matching marker
    let targetMarker = null;
    markerObjs.forEach(marker => {
        const markerLat = parseFloat(marker.getLatLng().lat.toFixed(7));
        const markerLng = parseFloat(marker.getLatLng().lng.toFixed(7));
        const searchLat = parseFloat(lat.toFixed(7));
        const searchLng = parseFloat(lng.toFixed(7));
        
        if (markerLat === searchLat && markerLng === searchLng) {
            targetMarker = marker;
        }
    });
    
    if (targetMarker) {
        console.log('Marker found, highlighting');
        
        // Add highlight class to marker
        const markerElement = targetMarker.getElement();
        if (markerElement) {
            markerElement.classList.add('marker-highlight');
        }
        
        // Pan to marker and show popup briefly
        map.panTo([lat, lng], {animate: true, duration: 1.0});
        targetMarker.openPopup();
        
        // Auto-close popup after 2 seconds
        setTimeout(() => {
            targetMarker.closePopup();
        }, 2000);
        
        // Remove highlight after 4 seconds
        setTimeout(() => {
            if (markerElement) {
                markerElement.classList.remove('marker-highlight');
            }
        }, 4000);
    } else {
        console.error(`Marker not found for coordinates lat: ${lat}, lng: ${lng}`);
    }
}

// Remove all marker highlights
function removeMarkerHighlights() {
    document.querySelectorAll('.marker-highlight').forEach(element => {
        element.classList.remove('marker-highlight');
    });
}

// Fade out all markers except the hovered one
function fadeOtherMarkers(hoveredMarker) {
    console.log('fadeOtherMarkers called, total markers:', markerObjs.length);
    
    // Add a class to body to indicate hover state
    document.body.classList.add('marker-hover-active');
    
    let fadedCount = 0;
    let focusedCount = 0;
    
    markerObjs.forEach(marker => {
        const markerElement = marker.getElement();
        if (markerElement && marker !== hoveredMarker) {
            markerElement.classList.add('marker-faded');
            fadedCount++;
            // Force close tooltip and hide it
            marker.closeTooltip();
        } else if (markerElement && marker === hoveredMarker) {
            markerElement.classList.add('marker-focused');
            focusedCount++;
            // Force close tooltip for focused marker too
            marker.closeTooltip();
        }
    });
    
    console.log(`Applied marker-faded to ${fadedCount} markers, marker-focused to ${focusedCount} markers`);
}

// Restore opacity to all markers
function restoreMarkerOpacity() {
    // Remove hover state indicator
    document.body.classList.remove('marker-hover-active');
    
    markerObjs.forEach(marker => {
        const markerElement = marker.getElement();
        if (markerElement) {
            // Force a reflow to ensure the faded state is rendered
            markerElement.offsetHeight;
            
            // Add fade-in class while keeping faded class momentarily
            markerElement.classList.add('marker-fade-in');
            
            // Remove faded/focused classes after a tiny delay to trigger transition
            requestAnimationFrame(() => {
                markerElement.classList.remove('marker-faded');
                markerElement.classList.remove('marker-focused');
                
                // Clean up fade-in class after animation
                setTimeout(() => {
                    markerElement.classList.remove('marker-fade-in');
                }, 1200);
            });
        }
    });
    
    // Restore tooltips based on current zoom level with a longer delay
    setTimeout(() => {
        toggleTooltips();
        adjustTooltipSize(); // Ensure correct font size is applied
    }, 600);
}


// Initialize table
function initializeTable() {
    console.log('Initializing table...');
    // Table initialization will happen when data is loaded
}

// Create color icon for table
function createColorIcon(easelId) {
    const color = getColorByEaselBoardId(easelId);
    return `<svg width="16" height="16" viewBox="0 0 24 24" style="display: inline-block; margin-right: 8px; vertical-align: middle;">
              <circle cx="12" cy="12" r="10" fill="${color}"/>
            </svg>`;
}

// Display table
function displayTable(tableData) {
    const table = document.getElementById("tsvTable");
    table.innerHTML = "";

    // Generate headers
    let headerRow = "<thead><tr>";
    tableData[0].slice(3).forEach((header) => {
        if (header === "Easel") {
            headerRow += `<th>${header}</th>`;
        } else if (header === "Poster Title") {
            headerRow += `<th class="poster-title">${header}</th>`;
        } else {
            headerRow += `<th data-breakpoints="xs">${header}</th>`;
        }
    });
    headerRow += "</tr></thead>";
    table.innerHTML += headerRow;

    // Generate rows
    let bodyRows = "<tbody>";
    for (let i = 1; i < tableData.length; i++) {
        const lat = tableData[i][0];
        const lng = tableData[i][1];
        let row = `<tr data-lat="${lat}" data-lng="${lng}">`;
        tableData[i].slice(3).forEach((cell, index) => {
            const headerName = tableData[0][index + 3];
            if (headerName === "Poster Title") {
                row += `<td class="poster-title">${cell}</td>`;
            } else if (headerName === "Easel") {
                const colorIcon = createColorIcon(cell);
                row += `<td class="easel-cell">${colorIcon}${cell}</td>`;
            } else {
                row += `<td>${cell}</td>`;
            }
        });
        row += "</tr>";
        bodyRows += row;
    }
    bodyRows += "</tbody>";
    table.innerHTML += bodyRows;

    // Initialize FooTable
    $("#tsvTable").footable({
        sorting: { enabled: true },
        filtering: { enabled: false },
        toggle: true,
        paging: { enabled: false, limit: 1000 },
        'on': {
            'postinit.ft.table': function (e, ft) {
                const easelColumnIndex = 6; 
                ft.sort(easelColumnIndex, 'asc');
                // Initialize quick search after table is ready
                initializeQuickSearch();
            }
        }
    });

    // Add table event listeners
    $("#tsvTable").on("footable_toggle", function (e) {
        var $currentToggle = $(e.target).closest("tr");
        if ($currentToggle.attr("data-expanded") === "true") {
            $("#tsvTable")
                .find('tr[data-expanded="true"]')
                .not($currentToggle)
                .each(function () {
                    $(this).removeAttr("data-expanded");
                });
        } else {
            $currentToggle.attr("data-expanded", "true");
        }
    });

    // Add click listeners to table rows for marker highlighting
    $("#tsvTable tbody").on("click", "tr", function(e) {
        // Don't trigger if clicking on the toggle button itself
        if ($(e.target).closest('.footable-toggle').length) {
            return;
        }
        
        const lat = parseFloat($(this).data("lat"));
        const lng = parseFloat($(this).data("lng"));
        
        if (lat && lng) {
            console.log(`Row clicked, highlighting marker: lat=${lat}, lng=${lng}`);
            highlightMarker(lat, lng);
        }
    });

    // Bind table events
    $("#tsvTable").bind({
        "collapse.ft.row": function () {
            restoreHiddenMarkers();
            removeMarkerHighlights(); // Also remove any highlights when collapsing
        },
        "expand.ft.row": function (e, ft, row) {
            // Collapse other rows
            $('#tsvTable tbody tr[data-expanded="true"]').each(function () {
                if (this !== row) {
                    $(this).find(".footable-toggle").click();
                }
            });

            // Get coordinates and just highlight the marker (don't hide others)
            const lat = parseFloat($(row).data("lat"));
            const lng = parseFloat($(row).data("lng"));
            
            if (lat && lng) {
                console.log(`Row expanded, highlighting marker: lat=${lat}, lng=${lng}`);
                highlightMarker(lat, lng); // Use highlight instead of focus
            }
        },
    });

    console.log('Table initialized successfully');
}

// Focus on table row (called by marker clicks)
function focusRow(lat, lng) {
    console.log(`Focusing on table row: lat=${lat}, lng=${lng}`);
    
    // Try exact match first
    let row = document.querySelector(`#tsvTable tbody tr[data-lat="${lat}"][data-lng="${lng}"]`);
    
    // If exact match fails, try with rounded coordinates
    if (!row) {
        const roundedLat = parseFloat(lat).toFixed(7);
        const roundedLng = parseFloat(lng).toFixed(7);
        
        const rows = document.querySelectorAll('#tsvTable tbody tr[data-lat][data-lng]');
        for (const r of rows) {
            const rowLat = parseFloat(r.getAttribute('data-lat')).toFixed(7);
            const rowLng = parseFloat(r.getAttribute('data-lng')).toFixed(7);
            
            if (rowLat === roundedLat && rowLng === roundedLng) {
                row = r;
                break;
            }
        }
    }
    
    if (row) {
        console.log('Row found, highlighting and expanding');
        
        // Collapse other expanded rows
        $('#tsvTable tbody tr[data-expanded="true"]').each(function () {
            if (this !== row) {
                $(this).find(".footable-toggle").click();
            }
        });
        
        // Highlight and expand
        row.classList.add("highlight");
        $(row).find(".footable-toggle").click();
        setTimeout(() => row.classList.remove("highlight"), 3000);
        row.scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
        console.error(`Row not found for coordinates lat: ${lat}, lng: ${lng}`);
    }
}

// Initialize quick search functionality
function initializeQuickSearch() {
    const searchInput = document.getElementById('quickSearch');
    const table = document.getElementById('tsvTable');
    
    if (!searchInput || !table) return;
    
    searchInput.addEventListener('keyup', function() {
        const searchTerm = this.value.toLowerCase().trim();
        const rows = table.querySelectorAll('tbody tr');
        
        rows.forEach(row => {
            if (searchTerm === '') {
                row.style.display = '';
                return;
            }
            
            // Get all text content from the row (excluding toggle buttons)
            const rowText = row.textContent.toLowerCase();
            
            if (rowText.includes(searchTerm)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    });
    
    console.log('Quick search initialized');
}

// Load data and initialize everything
function loadData() {
    console.log('Loading data...');
    
    Papa.parse("data/2025-poster-session-data.tsv", {
        download: true,
        header: true,
        complete: function (results) {
            console.log(`Data loaded: ${results.data.length} rows`);
            
            // Process data for table
            const tableData = [Object.keys(results.data[0])];
            results.data.forEach(row => {
                if (row.Latitude && row.Longitude) {
                    tableData.push(Object.values(row));
                }
            });
            
            // Initialize table
            displayTable(tableData);
            
            // Add markers
            results.data.forEach(function (row) {
                if (row.Latitude && row.Longitude) {
                    var lat = parseFloat(row.Latitude);
                    var lng = parseFloat(row.Longitude);
                    var easelBoardId = row["Easel"];
                    var tooltipDirection = row["Tooltip Direction"];
                    var title = row["Poster Title"];
                    var students = row["Students"];
                    var faculty = row["Faculty"];
                    var department = row["Poster Category"];
                    
                    // Debug logging for test markers
                    if (easelBoardId === "E-13" || easelBoardId === "E-14") {
                        console.log(`DEBUG: Processing test marker ${easelBoardId}:`);
                        console.log(`  Latitude: ${row.Latitude} -> ${lat}`);
                        console.log(`  Longitude: ${row.Longitude} -> ${lng}`);
                        console.log(`  Title: ${title}`);
                        console.log(`  Department: ${department}`);
                    }
                    
                    if (!isNaN(lat) && !isNaN(lng)) {
                        addMarker(lat, lng, title, easelBoardId, easelBoardId, tooltipDirection);
                        
                        // Debug logging for test markers after creation
                        if (easelBoardId === "E-13" || easelBoardId === "E-14") {
                            console.log(`DEBUG: Added marker ${easelBoardId} at ${lat}, ${lng}`);
                        }
                    } else {
                        console.warn("Invalid coordinates:", row);
                    }
                } else {
                    console.warn("Missing coordinates:", row);
                }
            });
            
            toggleTooltips();
            console.log('Application fully loaded!');
        },
        error: function(error) {
            console.error('Error loading data:', error);
        }
    });
}
