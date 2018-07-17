# -*- coding: utf-8 -*-
# Copryight 2017 Laslabs Inc.
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl.html).

from odoo import api, models, fields

from odoo.addons.base_geoengine import fields as geo_fields


class ResBetterZip(models.Model):

    _inherit = 'res.better.zip'

    geo_point = geo_fields.GeoPoint(
        string='UTM Coordinate Point',
    )

    # @api.multi
    # @api.depends('latitude, longitude')
    # def _compute_geo_point(self):
    #     for record in self:
    #         record.geo_point = fields.GeoPoint.from_latlon(
    #             self.env.cr, record.latitude, record.longitude,
    #         )

    # @api.multi
    # def _inverse_geo_point(self):
    #     return
