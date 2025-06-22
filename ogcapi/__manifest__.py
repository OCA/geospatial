# -*- coding: utf-8 -*-
#############################################################################
#
#    Odoo OGC API
#
#    Copyright (C) 2025-TODAY Geon Information Technologies Inc. (<https://www.geonbt.com.tr>)
#    Copyright (C) 2025-TODAY Nezih Gülesanlar (<postanezih@gmail.com>)
#
#    This program is free software: you can redistribute it and/or modify
#    it under the terms of the GNU Affero General Public License as
#    published by the Free Software Foundation, either version 3 of the
#    License, or (at your option) any later version.
#
#    This program is distributed in the hope that it will be useful,
#    but WITHOUT ANY WARRANTY; without even the implied warranty of
#    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
#    GNU Affero General Public License for more details.
#
#    You should have received a copy of the GNU Affero General Public License
#    along with this program.  If not, see <http://www.gnu.org/licenses/>.
#
#############################################################################

{
    "name": "OGC API",
    "description": """The OGC API for Odoo 16""",
    "summary": """This app helps to interact with odoo
     backend with help of OGC api requests""",
    "category": "GeoBI",
    "version": "16.0.1.0.1",
    'author': 'Geon IT Solutions',
    'company': 'Geon IT Solutions',
    'maintainer': 'Geon IT Solutions',
    'website': "https://www.geonbt.com.tr",
    "depends": ['base', 'web','portal','base_geoengine'],
    "data": [
        "security/ir.model.access.csv",
        "views/ogcapi_api_views.xml",
        "views/ogcapi_collection_views.xml",
        "views/ogcapi_keyword_views.xml",
        "views/ogcapi_crs_views.xml",
        "views/ogcapi_menuitem.xml",
        "views/ogcapi_portal_templates.xml",
    ],
    'assets': {},
    'images': [],
    'license': 'AGPL-3',
    'installable': True,
    'application': True,
    'auto_install': False,
}
