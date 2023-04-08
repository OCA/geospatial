# Copyright (C) 2022 - Today: GRAP (http://www.grap.coop)
# @author: Sylvain LE GAL (https://twitter.com/legalsylvain)
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl.html).
{
    "name": "Base Geolocalize Company",
    "summary": """
        Add latitude and longitude fields on company model""",
    "version": "16.0.1.0.1",
    "license": "AGPL-3",
    "author": "GRAP, Odoo Community Association (OCA)",
    "maintainers": ["legalsylvain"],
    "website": "https://github.com/OCA/geospatial",
    "depends": [
        "base_geolocalize",
    ],
    "data": [
        "views/view_res_company.xml",
    ],
    "demo": [
        "demo/res_company.xml",
    ],
}
