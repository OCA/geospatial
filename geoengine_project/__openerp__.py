# -*- coding: utf-8 -*-
##############################################################################
#
#     This file is part of geoengine_project,
#     an Odoo module.
#
#     Copyright (c) 2015 ACSONE SA/NV (<http://acsone.eu>)
#
#     geoengine_project is free software:
#     you can redistribute it and/or modify it under the terms of the GNU
#     Affero General Public License as published by the Free Software
#     Foundation,either version 3 of the License, or (at your option) any
#     later version.
#
#     geoengine_project is distributed
#     in the hope that it will be useful, but WITHOUT ANY WARRANTY; without
#     even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR
#     PURPOSE.  See the GNU Affero General Public License for more details.
#
#     You should have received a copy of the GNU Affero General Public License
#     along with geoengine_project.
#     If not, see <http://www.gnu.org/licenses/>.
#
##############################################################################
{'name': 'Geospatial support for projects',
 'version': '8.0.0.1.0',
 'category': 'GeoBI',
 'author': "ACSONE SA/NV,Odoo Community Association (OCA)",
 'license': 'AGPL-3',
 'website': 'http://www.acsone.eu',
 'depends': [
     'base',
     'geoengine_partner',
     'project'
 ],
 'data': [
     'views/geo_project_view.xml'
 ],
 'installable': True,
 'application': True,
 'active': False,
 }
