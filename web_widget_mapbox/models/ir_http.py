# Copyright 2026 Cetmix OÜ
# License LGPL-3.0 or later (https://www.gnu.org/licenses/lgpl-3.0).

from odoo import models


class IrHttp(models.AbstractModel):
    _inherit = "ir.http"

    def session_info(self):
        result = super().session_info()
        if self.env.user._is_internal():
            result["mapbox_token"] = (
                self.env["ir.config_parameter"]
                .sudo()
                .get_param("web_widget_mapbox.token", False)
            )
        return result
