# Copyright (C) 2020 Brian McMaster
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

from odoo import api, fields, models


class ResConfigSettings(models.TransientModel):
    _inherit = "res.config.settings"

    google_distance_matrix_api_key = fields.Char(
        string="Google Distance Matrix Api Key",
    )

    @api.model
    def get_values(self):
        res = super(ResConfigSettings, self).get_values()
        ICPSudo = self.env["ir.config_parameter"].sudo()
        res.update(
            {
                "google_distance_matrix_api_key": ICPSudo.get_param(
                    "google.api_key_distance_matrix", default=""
                ),
            }
        )
        return res

    @api.multi
    def set_values(self):
        super(ResConfigSettings, self).set_values()
        ICPSudo = self.env["ir.config_parameter"].sudo()
        ICPSudo.set_param(
            "google.api_key_distance_matrix", self.google_distance_matrix_api_key
        )
