# Copyright 2011-2012 Nicolas Bessi (Camptocamp SA)
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl.html).
from odoo import api, fields, models


class NPA(models.Model):

    """GEO OSV SAMPLE"""

    _name = "dummy.zip"

    priority = fields.Integer('Priority', default=100)
    name = fields.Char('ZIP', size=64, index=True, required=True)
    city = fields.Char('City', size=64, index=True, required=True)
    the_geom = fields.GeoMultiPolygon('NPA Shape')
    total_sales = fields.Float(
        compute='_get_ZIP_total_sales',
        string='Spatial! Total Sales',
    )
    retail_machine_ids = fields.One2many(
        string='Retail machines',
        comodel_name='geoengine.demo.automatic.retailing.machine',
        inverse_name='zip_id',
    )

    @api.multi
    def _get_ZIP_total_sales(self):
        """Return the total of the invoiced sales for this npa"""
        mach_obj = self.env['geoengine.demo.automatic.retailing.machine']
        for rec in self:
            res = mach_obj.geo_search(
                domain=[],
                geo_domain=[
                    ('the_point',
                     'geo_intersect',
                     {'dummy.zip.the_geom': [('id', '=', rec.id)]})])

            cursor = self.env.cr
            if res:
                cursor.execute("SELECT sum(total_sales) from"
                               " geoengine_demo_automatic_retailing_machine "
                               "where id in %s;",
                               (tuple(res),))
                res = cursor.fetchone()
                if res:
                    rec.total_sales = res[0] or 0.0
                else:
                    rec.total_sales = 0.0
            else:
                rec.total_sales = 0.0

    def name_get(self):
        res = []
        for rec in self:
            res.append((rec.id, "%s %s" % (rec.name, rec.city)))
        return res
