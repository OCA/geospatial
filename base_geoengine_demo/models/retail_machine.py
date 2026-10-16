# Copyright 2011-2016 Camptocamp SA
# Copyright 2023 ACSONE SA/NV
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

from odoo import _, api, fields, models
from odoo.exceptions import ValidationError


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
    zip_id = fields.Many2one(
        "dummy.zip", compute="_compute_zip_id", store=True, readonly=False
    )

    @api.constrains("the_point", "zip_id")
    def _check_the_point(self):
        """Check if the point is place in the corresponding area."""
        if self.the_point and self.zip_id:
            for rec in self:
                zip_match = (
                    self.env["dummy.zip"]
                    .search(
                        [
                            ("id", "=", self.zip_id.id),
                            ("the_geom", "geo_contains", rec.the_point),
                        ],
                        limit=1,
                    )
                    .ids
                )
                if not zip_match:
                    raise ValidationError(
                        _(
                            "The point must be placed in the corresponding "
                            + "area. (serial number: %s).",
                            rec.name,
                        )
                    )

    @api.depends("the_point")
    def _compute_zip_id(self):
        """Exemple of on change on the point
        Lookup in zips if the code is within an area.
        Change the zip_id field accordingly
        """
        for rec in self:
            if rec.the_point:
                zip_match = (
                    self.env["dummy.zip"]
                    .search([("the_geom", "geo_contains", rec.the_point)], limit=1)
                    .ids
                )
                if zip_match:
                    rec.zip_id = zip_match[0]
            else:
                rec.zip_id = 0
