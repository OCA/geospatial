# Copyright (C) 2022 - Today: GRAP (http://www.grap.coop)
# @author: Sylvain LE GAL (https://twitter.com/legalsylvain)
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl.html).

from odoo import api, models


class IrConfigParameter(models.Model):
    _inherit = "ir.config_parameter"

    @api.model
    def get_leaflet_config(self):
        """Returns leaflet configuration for the map view."""
        return {
            "tile_url": self.sudo().get_param("leaflet.tile_url", default=""),
            "copyright": self.sudo().get_param("leaflet.copyright", default=""),
        }
