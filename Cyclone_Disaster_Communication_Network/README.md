# CycloneNet — Cyclone Disaster Communication & Emergency Network

A front-end Computer Networks project demonstration simulating a rapidly deployable emergency mobile communication network.

## Features

- Professional emergency-management dashboard and login
- Leaflet interactive disaster-zone map
- Cell on Wheels (COW) deployment and telemetry
- Mobile IP: Home Agent, Foreign Agent, Care-of Address, registration, packet flow and handoff
- Ad-Hoc AODV: RREQ/RREP route discovery, hop count, delay and partition handling
- Rescue vehicle network handoff
- FDMA / TDMA / CDMA / OFDMA comparison
- 2G → 5G evolution and emergency suitability
- Network partition and recovery simulation
- Emergency event/alert center
- Chart.js performance analysis
- Live simulation controls for nodes, load, distance, packet loss, battery and backhaul
- One-click complete disaster scenario
- Operational report generation

## Run

No build step is required.

1. Extract the ZIP.
2. Open `index.html` in a modern browser.
3. Internet access is recommended because Leaflet map tiles, Leaflet.js, Chart.js and Google Fonts are loaded from CDNs.

Demo login:
- Operator ID: `admin`
- Password: `admin123`

## Project demonstration flow

Use **START DISASTER SIMULATION** on the Command Overview page. It demonstrates:
1. Cyclone damages fixed infrastructure.
2. Villages lose connectivity.
3. COW is deployed.
4. Users reconnect.
5. Mobile IP registration occurs.
6. Rescue vehicle moves and hands off.
7. Network partition occurs.
8. AODV recovery/alternate routing is demonstrated.
9. Relief camp Ad-Hoc connectivity is restored.
10. Network recovers.

This is a browser-based simulation for academic demonstration; it does not control real telecom equipment.
