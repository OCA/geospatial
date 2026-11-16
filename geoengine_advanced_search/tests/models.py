# Copyright 2026 mytime.click
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).
from odoo import fields, models


class GeoAdvancedSearchTest(models.Model):
    _name = "geoengine.advanced.search.test"
    _description = "Geoengine Advanced Search Test"

    name = fields.Char()
    the_geom = fields.GeoMultiPolygon("Geom Boundaries")
