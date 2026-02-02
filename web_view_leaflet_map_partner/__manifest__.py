# Copyright (C) 2022 - Today: GRAP (http://www.grap.coop)
# Copyright (C) 2025 KMEE (https://kmee.com.br)
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl.html).

{
    "name": "Leaflet Map View for Partners (OpenStreetMap)",
    "summary": "Add a leaflet map view for partners with auto-geocoding support.",
    "version": "18.0.1.1.0",
    "author": "GRAP, KMEE, Odoo Community Association (OCA)",
    "website": "https://github.com/OCA/geospatial",
    "license": "AGPL-3",
    "category": "Extra Tools",
    "depends": [
        "web_view_leaflet_map",
        "contacts",
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
        "mileo",
    ],
}
