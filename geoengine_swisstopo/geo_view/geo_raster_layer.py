# Copyright 2019 Camptocamp SA
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

from odoo import fields, models


class GeoRasterLayer(models.Model):
    _inherit = "geoengine.raster.layer"

    raster_type = fields.Selection(selection_add=[("swisstopo", "Swisstopo")])
    layername = fields.Char("Layer Machine Name")
    time = fields.Char("Time Dimension")
