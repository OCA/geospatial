# Copyright 2011-2016 Camptocamp SA
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

from odoo import api, fields, models


class RetailMachine(models.Model):
    """GEO OSV SAMPLE"""

    _name = "geoengine.demo.automatic.retailing.machine"
    _description = "Geoengine demo retailing machine"

    the_point = fields.GeoPoint("Coordinate")
    the_line = fields.GeoLine("Power supply line", index=True)
    total_sales = fields.Float("Total sale", index=True)
    money_level = fields.Char(index=True)
    state = fields.Selection([("hs", "HS"), ("ok", "OK")], index=True)
    name = fields.Char("Serial number", required=True)
    zip_id = fields.Many2one("dummy.zip", compute="_compute_zip_id", readonly=False)

    @api.depends("the_point")
    def _compute_zip_id(self):
        """Exemple of on change on the point
        Lookup in zips if the code is within an area.
        Change the zip_id field accordingly
        """
        for rec in self:
            if rec.the_point:
                zip_match = self.env["dummy.zip"].geo_search(
                    geo_domain=[("the_geom", "geo_contains", rec.the_point)], limit=1
                )
                if zip_match:
                    rec.zip_id = zip_match[0]
