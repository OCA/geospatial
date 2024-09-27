# Copyright 2011-2012 Nicolas Bessi (Camptocamp SA)
# Copyright 2016-2023 Yannick Payot (Camptocamp SA)
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).
from odoo import fields, models


class IrUIView(models.Model):
    _inherit = "ir.ui.view"

    type = fields.Selection(
        selection_add=[("geoengine", "GeoEngine")],
        ondelete={"geoengine": "cascade"},
    )

    raster_layer_ids = fields.One2many(
        "geoengine.raster.layer", "view_id", "Raster layers", required=False
    )

    vector_layer_ids = fields.One2many(
        "geoengine.vector.layer", "view_id", "Vector layers", required=True
    )

    projection = fields.Char(default="EPSG:3857", required=True)
    default_extent = fields.Char(
        "Default map extent",
        default="-123164.85222423, 5574694.9538936, 1578017.6490538,"
        " 6186191.1800898",
    )
    default_zoom = fields.Integer("Default map zoom")
    restricted_extent = fields.Char("Restricted map extent")

    def _is_qweb_based_view(self, view_type):
        if view_type == "geoengine":
            return True
        return super()._is_qweb_based_view(view_type)
