# Copyright (C) 2022 - Today: GRAP (http://www.grap.coop)
# @author: Sylvain LE GAL (https://twitter.com/legalsylvain)
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl.html).

from odoo import fields, models


class ResCompany(models.Model):
    _inherit = "res.company"

    partner_latitude = fields.Float(
        string="Geo Latitude",
        readonly=False,
        related="partner_id.partner_latitude",
        digits=(16, 5),
        store=True,
    )
    partner_longitude = fields.Float(
        string="Geo Longitude",
        readonly=False,
        related="partner_id.partner_longitude",
        digits=(16, 5),
        store=True,
    )
    date_localization = fields.Date(
        string="Geolocation Date",
        readonly=False,
        related="partner_id.date_localization",
        store=True,
    )

    def geo_localize(self):
        self.mapped("partner_id").geo_localize()
