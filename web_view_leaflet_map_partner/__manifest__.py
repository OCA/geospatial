{
    "name": "Leaflet Map View for Partners (OpenStreetMap)",
    "summary": "Interactive map view for partners with rich popup information",
    "version": "19.0.1.1.0",
    "author": "GRAP, Odoo Community Association (OCA)",
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
