{
    "name": "Leaflet Map View for Partners (OpenStreetMap)",
    "summary": "Interactive map view for partners with rich popup information",
    "description": """
Enhanced Partner Map View
=========================

This module adds an interactive Leaflet map view for partners (contacts) with:

**Popup Features:**
- Partner type badges (Company/Individual, Customer, Vendor)
- Category/Tag display
- Full address with map marker icon
- Clickable phone, mobile, and email links
- Website link
- Salesperson information
- Total invoiced amount for customers
- "Get Directions" button linking to Google Maps

**Map Features:**
- Partner avatar as map marker
- Marker clustering for better performance
- Click to open partner form
- Search and filter integration

The map view is accessible from the Contacts menu.
    """,
    "version": "19.0.1.1.0",
    "author": "GRAP, Odoo Community Association (OCA), OSOOL",
    "website": "https://github.com/OCA/geospatial",
    "license": "AGPL-3",
    "category": "Extra Tools",
    "depends": [
        "web_view_leaflet_map",
        "contacts",
        "base_geolocalize",
    ],
    "data": [
        "views/res_partner.xml",
    ],
    "demo": [
        "demo/res_partner.xml",
    ],
    "installable": True,
    "maintainers": [
        "legalsylvain",
    ],
}
