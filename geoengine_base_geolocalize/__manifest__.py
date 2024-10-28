# Copyright 2015-2017 ACSONE SA/NV (<http://acsone.eu>)
# License AGPL-3.0 or later (https://www.gnu.org/licenses/agpl.html).
{
    "name": "Geospatial support for base_geolocalize",
    "version": "17.0.1.0.0",
    "category": "GeoBI",
    "author": "ACSONE SA/NV, Odoo Community Association (OCA)",
    "license": "AGPL-3",
    "website": "https://github.com/OCA/geospatial",
    "depends": ["base", "geoengine_partner", "base_geolocalize"],
    "external_dependencies": {"python": ["requests"]},
    "data": ["views/res_partner_view.xml"],
    "application": True,
    "autoinstall": True,
}
