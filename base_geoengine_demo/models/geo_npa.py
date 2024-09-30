# Copyright 2011-2012 Nicolas Bessi (Camptocamp SA)
# Copyright 2023 ACSONE SA/NV
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl.html).
from odoo import fields, models


class NPA(models.Model):

    """GEO OSV SAMPLE"""

    _name = "dummy.zip"
    _description = "Geoengine demo ZIP"

    priority = fields.Integer(default=100)
    name = fields.Char("ZIP", index=True, required=True)
    city = fields.Char(index=True, required=True)
    the_geom = fields.GeoMultiPolygon("NPA Shape")
    # the_geom_poly = fields.GeoPolygon()
    # the_geom_multiLine = fields.GeoMultiLine()
    # the_geom_multipoint = fields.GeoMultiPoint()
    total_sales = fields.Float(
        compute="_compute_ZIP_total_sales",
        string="Spatial! Total Sales",
    )
    retail_machine_ids = fields.One2many(
        "geoengine.demo.automatic.retailing.machine",
        string="Retail machines",
        inverse_name="zip_id",
    )

    def _compute_ZIP_total_sales(self):
        """Return the total of the invoiced sales for this npa"""
        mach_obj = self.env["geoengine.demo.automatic.retailing.machine"]
        for rec in self:
            res = mach_obj.search(
                [
                    (
                        "the_point",
                        "geo_intersect",
                        {"dummy.zip.the_geom": [("id", "=", rec.id)]},
                    )
                ]
            )
            cursor = self.env.cr
            if res.ids:
                cursor.execute(
                    "SELECT sum(total_sales) from"
                    " geoengine_demo_automatic_retailing_machine "
                    "where id in %s;",
                    (tuple(res.ids),),
                )
                res = cursor.fetchone()
                if res:
                    rec.total_sales = res[0] or 0.0
                else:
                    rec.total_sales = 0.0
            else:
                rec.total_sales = 0.0

    def _compute_display_name(self):
        for rec in self:
            rec.display_name = f"{rec.name} {rec.city}"
