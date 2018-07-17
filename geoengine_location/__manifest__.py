# -*- coding: utf-8 -*-
# Copryight 2017 Laslabs Inc.
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl.html).

{
    "name": "Geoengine Location",
    "summary": "Map partner locations to geopoints.",
    "version": "10.0.1.0.0",
    "category": "GeoBI",
    "website": "https://github.com/OCA/geospatial",
    "author": "LasLabs, Odoo Community Association (OCA)",
    "license": "AGPL-3",
    "application": False,
    "installable": True,
    "auto-install": True,
    # "post_init_hook": "_update_records_with_geopoint",
    "depends": [
        "base_geoengine",
        "base_location",
    ],
    "demo": [
        "demo/res_better_zip_demo.xml",
    ],
}
