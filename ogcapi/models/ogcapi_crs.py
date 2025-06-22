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

from odoo import _, api, fields, models



class OgcapiCrs(models.Model):
    _name = "ogcapi.crs"
    _description = "OGC API CRS Definitions Model"

    name = fields.Char(string="Name", required=True)
    authority = fields.Selection(
        selection=[
            ("EPSG", "EPSG"),
            ("OGC", "OGC"),
        ],
        string="CRS Authority",
        required=True,
        default= "EPSG"
    )
    version = fields.Char(string="Version", default='0', required=True)
    code = fields.Char(string="Code", required=True)
    crs_uri = fields.Char(
        string="CRS URI",
        compute="_compute_crs_uri",
        store=True
    )

    @api.depends('authority', 'version', 'code')
    def _compute_crs_uri(self):
        for rec in self:
            if rec.authority and rec.version and rec.code:
                rec.crs_uri = f"http://www.opengis.net/def/crs/{rec.authority}/{rec.version}/{rec.code}"
            else:
                rec.crs_uri = False

