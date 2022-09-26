# Copyright 2017 ACSONE SA/NV
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

{
    "name": "Base Geolocalize Openstreetmap",
    "summary": """
        Open street map API call to geolocalize an address""",
    "version": "12.0.1.0.2",
    "license": "AGPL-3",
    "author": "ACSONE SA/NV, Odoo Community Association (OCA)",
    "website": "https://github.com/OCA/geospatial",
    "depends": [
        "base_geolocalize",
    ],
    "external_dependencies": {
        "python": ["requests", "responses"],
    },
}
