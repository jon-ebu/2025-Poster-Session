# Table
[] Incorporate Sort by category toggle
[] Fix vertical scroll on mobile (continuously having problems)
[] Include an option to view table full screen (table becomes a footer that can be reopened)
[] When selecting a row, have map pan so that marker is centered.

# Map
[X] Click within map to hide info pane/unselect row
[X] Restrict Zoom on scroll and - button to whatever the default zoom is
[X] Make panning feel less stiff
[] Show a "Zoom in!" window on load with a little pinching animation
[X] Change map controls to be brand colors

# Tooltips
[] Change tooltips to be brand colors (header primarily)
[X] Ensure Tooltips are on Z-index over Controls.
[] Increase length of tooltip arrow and have it look good (don't look disjointed, look like it's organically coming from tooltip bubble)
[X] Update Easel Board in Tooltip to be in a colored pill like how the markers are 

# Markers
[X] When marker is focused on, fade the marker it shares the mount with
[X] Fix bug when marker is focused on it stays in an increased size when unfocused/unselected. It should return to normal size after some point.
[] See if slightly increasing the size of the markers across the board helps with readability
[X] Change BHC-1 to Gold
[X] Update Lone Markers to still have board
[X] p14 - remove and keep p13 north
[X] HC-1 - add easel board icon

# Search
[] When there is only one result, automatically highlight the result after a small buffer window

Some restrictions:
- Mobile first app. Text should be relatively easy to read on mobile.
- Map should stay fixed location
- The only thing that should scroll is the table.
- Colors in circles in table should be consistent with map markers
- Search should be in a fixed location. Table headers should be frozen.
- Header on top should be fixed.