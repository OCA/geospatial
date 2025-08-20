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
    "summary": (
        "This app helps to interact with odoo backend with help of "
        "Open Geospatial Consortium (OGC) api requests"
    ),
    "category": "GeoSpatial",
    "version": "16.0.1.0.0",
    "author": (
        "Nezih Gülesanlar, Geon IT Solutions, " "Odoo Community Association (OCA)"
    ),
    "website": "https://github.com/OCA/geospatial",
    "depends": ["base", "web", "base_geoengine"],
    "data": [
        "security/ir.model.access.csv",
        "views/ogcapi_workspace_views.xml",
        "views/ogcapi_collection_views.xml",
        "views/ogcapi_api_views.xml",
        "views/ogcapi_api_path_views.xml",
        "views/ogcapi_component_parameter_views.xml",
        "views/ogcapi_component_schema_views.xml",
        "views/ogcapi_component_response_views.xml",
        "views/ogcapi_menuitem.xml",
        "views/ogcapi_test_feature_views.xml",
        "data/ogcapi_config_data.xml",
    ],
    "assets": {},
    "external_dependencies": {"python": ["jsonschema"]},
    "images": [],
    "license": "AGPL-3",
    "installable": True,
    "application": True,
    "auto_install": False,
}
