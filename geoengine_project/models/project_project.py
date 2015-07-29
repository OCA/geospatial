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

from openerp.addons.base_geoengine import geo_model, fields


class ProjectProject(geo_model.GeoModel):
    """Add geo_point to project.project"""

    _inherit = 'project.project'

    geo_point = fields.GeoPoint(
        'Addresses coordinate', related='partner_id.geo_point')
