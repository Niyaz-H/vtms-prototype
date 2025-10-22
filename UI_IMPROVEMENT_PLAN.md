# UI Improvement Plan

This document outlines the identified UI issues in the VTMS frontend and a plan to address them.

## Identified UI Issues

Based on the analysis of the application running at `http://localhost:3000`, the following issues have been identified:

1.  **Persistent Loading State:** The main dashboard area is stuck on "Loading dashboard...". This is due to a failed WebSocket connection, as seen in the browser's console logs.
2.  **Conflicting Status Indicators:** The header displays both "Disconnected" and "System Healthy" simultaneously, which is contradictory and confusing for the user.
3.  **Poor Error Feedback:** The UI indicates a "Disconnected" state but fails to provide a clear error message or guidance, leaving the user with an unresponsive interface.
4.  **Redundant Status Displays:** The "Disconnected" status is shown in both the header and footer areas, which is unnecessary.
5.  **WebSocket Reconnection Bug:** The console error `Connection already in progress` suggests a flaw in the WebSocket service's reconnection logic.
6.  **Overlapping Header Elements:** The status indicators in the top-right corner ("Disconnected", "System Healthy") overlap the notification and settings buttons, rendering them inaccessible.
7.  **Poor Navbar Contrast:** The active navigation link in the sidebar is styled with white text, making it invisible against the light background of the page content area.
8.  **Blank Map View:** The Map View page is completely blank and does not display the expected map interface. This is likely due to a missing or misconfigured map component or missing CSS.

## Proposed Plan for UI Improvements

To address these issues, the following steps are proposed:

### Phase 1: UI Error Handling & Component Creation

1.  **Create a `StatusBar` Component:**
    *   Develop a new, unified `StatusBar` component to be located at `frontend/src/components/StatusBar.tsx`.
    *   This component will display the connection status, vessel count, and active alert count in a single, consistent location.

2.  **Improve Dashboard Error Handling:**
    *   Modify `frontend/src/pages/Dashboard.tsx` to display a clear and user-friendly error message when the WebSocket connection fails, replacing the current "Loading..." text.

### Phase 2: Integration & Refinement

1.  **Integrate the `StatusBar`:**
    *   Update the main layout file, `frontend/src/components/Layout.tsx`, to integrate the new `StatusBar` component.

2.  **Clean Up Old UI Elements:**
    *   Remove the redundant and conflicting status indicators from the header and footer areas within `frontend/src/components/Layout.tsx`.

### Phase 3: Bug Fixing

1.  **Fix WebSocket Reconnection Logic:**
    *   Investigate the `Connection already in progress` error.
    *   Modify `frontend/src/services/websocket.ts` to fix the reconnection logic, ensuring a more robust connection handling mechanism.

### Phase 4: Component-Specific Fixes

1.  **Fix Header Layout:**
    *   Adjust the CSS for the header component (`Header.tsx`) to ensure that the status indicators do not overlap with the action buttons. This might involve using Flexbox or Grid properties to properly align items.

2.  **Correct Navbar Styling:**
    *   Modify the CSS for the active navigation link in the `Sidebar.tsx` component to use a high-contrast color that is visible against the background.

3.  **Repair Map Component:**
    *   Investigate the `VesselMap.tsx` and `MapView.tsx` components.
    *   Ensure the Leaflet CSS is correctly imported in the project (e.g., in `main.tsx` or `index.html`).
    *   Verify that the map container has a defined height.
    *   Check for any JavaScript errors in the console when the map page is loaded.