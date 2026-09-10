# Copyright 2026 Cetmix OÜ
# License LGPL-3.0 or later (https://www.gnu.org/licenses/lgpl-3.0).

from odoo import fields, models


class ResConfigSettings(models.TransientModel):
    _inherit = "res.config.settings"

    mapbox_token = fields.Char(
        help="Public Mapbox access token used by the Mapbox form widget. "
        "Create a token at https://account.mapbox.com/.",
        config_parameter="web_widget_mapbox.token",
    )
