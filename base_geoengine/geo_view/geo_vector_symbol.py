# Copyright 2016 Yannick Vaucher (Camptocamp SA)
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).
from odoo import fields, models


class GeoVectorSymbol(models.Model):
    _name = "geoengine.vector.symbol"
    _description = "Vector Layer Symbol"

    vector_layer_id = fields.Many2one("geoengine.vector.layer")
    fieldname = fields.Char(
        "Category field",
        help="Name of the char field or selection field used for comparison",
    )
    value = fields.Char(help="All object equal to this value will use this symbol")
    img = fields.Char(
        help="URL of the image to use. You can put an image in your module "
        "in static folder e.g. 'base_geoengine/static/img/map-marker.png'"
    )
