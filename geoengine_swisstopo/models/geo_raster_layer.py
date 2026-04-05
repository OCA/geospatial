# Copyright 2024 Camptocamp SA, Caravanes Treyvaud S.A.
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

from odoo import api, fields, models


class GeoRasterLayer(models.Model):
    _inherit = "geoengine.raster.layer"

    raster_type = fields.Selection(
        selection_add=[("swisstopo", "Swisstopo WMTS")],
        ondelete={"swisstopo": "set default"},
    )

    swisstopo_layer_name = fields.Selection(
        [
            ("ch.swisstopo.pixelkarte-farbe", "Carte nationale couleur"),
            ("ch.swisstopo.swissimage", "Orthophoto (Swissimage)"),
            ("ch.swisstopo.pixelkarte-grau", "Carte nationale grise"),
            ("ch.swisstopo.landeskarte-grau", "Landeskarte grise"),
        ],
        string="Couche Swisstopo",
    )

    is_swisstopo = fields.Boolean(compute="_compute_is_swisstopo")

    @api.depends("raster_type")
    def _compute_is_swisstopo(self):
        for rec in self:
            rec.is_swisstopo = rec.raster_type == "swisstopo"

    @api.model
    def action_add_swisstopo_layers(self, view_id):
        """Create two Swisstopo raster layers for the given geoengine view."""
        view = self.env["ir.ui.view"].browse(view_id)
        if not view.exists():
            return []
        vals_list = [
            {
                "name": "Swisstopo Carte",
                "raster_type": "swisstopo",
                "swisstopo_layer_name": "ch.swisstopo.pixelkarte-farbe",
                "view_id": view_id,
                "sequence": 1,
                "overlay": False,
                "opacity": 1.0,
            },
            {
                "name": "Swisstopo Orthophoto",
                "raster_type": "swisstopo",
                "swisstopo_layer_name": "ch.swisstopo.swissimage",
                "view_id": view_id,
                "sequence": 2,
                "overlay": False,
                "opacity": 1.0,
            },
        ]
        records = self.create(vals_list)
        return records.ids
