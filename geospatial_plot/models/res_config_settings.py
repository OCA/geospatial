# Copyright 2025 Advance Insight
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl.html).
from odoo import api, fields, models


class ResConfigSettings(models.TransientModel):
    _inherit = "res.config.settings"

    @api.model
    def _get_default_plot_uom_id(self):
        rcp = self.create({})
        return rcp.plot_uom_id

    @api.model
    def _get_plot_uom_id_domain(self):
        return [
            ("category_id.id", "=", self.env.ref("uom.uom_categ_surface").id),
            ("uom_type", "in", ("reference", "bigger")),  # At least square meter.
        ]

    plot_uom_id = fields.Many2one(
        "uom.uom",
        string="Default Plot Unit of Measure",
        config_parameter="geospatial_plot.plot_uom_id",
        domain=lambda self: self._get_plot_uom_id_domain(),
        default=lambda self: self.env.ref(
            "geospatial_plot.uom_surface_acre", raise_if_not_found=False
        ),
    )
