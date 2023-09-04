# Copyright (C) 2022 - Today: GRAP (http://www.grap.coop)
# @author: Sylvain LE GAL (https://twitter.com/legalsylvain)
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl.html).

{
    "name": "Leaflet Map View (OpenStreetMap)",
    "summary": "Integrate leaflet.js librairy with odoo"
    " and add new 'leaflet_map' view, to display markers.",
    "version": "12.0.1.0.2",
    "development_status": "Alpha",
    "author": "GRAP, Odoo Community Association (OCA)",
    "maintainers": ["legalsylvain"],
    "website": "https://github.com/OCA/geospatial",
    "license": "AGPL-3",
    "category": "Extra Tools",
    "depends": [
        "base_geolocalize",
    ],
    "data": [
        "data/ir_config_parameter.xml",
        "views/templates.xml",
    ],
    "demo": [
        "demo/ir_config_parameter.xml",
    ],
    "installable": True,
    "uninstall_hook": "uninstall_hook",
}
