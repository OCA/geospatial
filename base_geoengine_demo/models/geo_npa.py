# -*- coding: utf-8 -*-
# Copyright 2011-2012 Nicolas Bessi (Camptocamp SA)
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl.html).
from openerp import fields, api

from openerp.addons.base_geoengine import geo_model
from openerp.addons.base_geoengine import fields as geo_fields


class NPA(geo_model.GeoModel):

    """GEO OSV SAMPLE"""

    _name = "dummy.zip"

    priority = fields.Integer('Priority', default=100)
    name = fields.Char('ZIP', size=64, index=True, required=True)
    city = fields.Char('City', size=64, index=True, required=True)
    the_geom = geo_fields.GeoMultiPolygon('NPA Shape')
    total_sales = fields.Float(
        compute='_get_ZIP_total_sales',
        string='Spatial! Total Sales',
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
            res.append((rec.id, u"%s %s" % (rec.name, rec.city)))
        return res
