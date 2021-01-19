# Copyright 2020 ACSONE SA/NV.
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

from odoo import api, fields, models


class TestGeo(models.Model):

    _name = "test.geo"
    _description = "Test class with a geopoint"

    @api.depends("lat", "lon")
    def _compute_geo_point(self):
        for rec in self:
            if not (rec.lat and rec.lon):
                rec.geo_point = False
            else:
                gp = fields.GeoPoint.from_latlon(rec.env.cr, rec.lat, rec.lon)
                rec.geo_point = gp

    lat = fields.Float('Geo Latitude', digits=(16, 5))
    lon = fields.Float('Geo Longitude', digits=(16, 5))
    geo_point = fields.GeoPoint(readonly=True, store=True, compute="_compute_geo_point")
