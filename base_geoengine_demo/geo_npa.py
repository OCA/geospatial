# -*- coding: utf-8 -*-
##############################################################################
#
#    Author: Nicolas Bessi
#    Copyright 2011-2012 Camptocamp SA
#
#    This program is free software: you can redistribute it and/or modify
#    it under the terms of the GNU Affero General Public License as
#    published by the Free Software Foundation, either version 3 of the
#    License, or (at your option) any later version.
#
#    This program is distributed in the hope that it will be useful,
#    but WITHOUT ANY WARRANTY; without even the implied warranty of
#    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
#    GNU Affero General Public License for more details.
#
#    You should have received a copy of the GNU Affero General Public License
#    along with this program.  If not, see <http://www.gnu.org/licenses/>.
#
##############################################################################
from openerp.osv import fields

from openerp.addons.base_geoengine import geo_model


class NPA(geo_model.GeoModel):

    """GEO OSV SAMPLE"""

    def _get_ZIP_total_sales(self, cursor, uid, ids, name, args, context=None):
        """Return the total of the invoiced sales for this npa"""
        to_return = {}
        if not ids:
            return {}
        if not isinstance(ids, list):
            ids = [ids]
        mach_obj = self.pool['geoengine.demo.automatic.retailing.machine']
        for zip_id in ids:
            res = mach_obj.geo_search(
                cursor, uid, domain=[],
                geo_domain=[
                    ('the_point',
                     'geo_intersect',
                     {'dummy.zip.the_geom': [('id', '=', zip_id)]})])

            if res:
                cursor.execute("SELECT sum(total_sales) from"
                               " geoengine_demo_automatic_retailing_machine "
                               "where id in %s;",
                               (tuple(res),))
                res = cursor.fetchone()
                if res:
                    to_return[zip_id] = res[0] or 0.0
                else:
                    to_return[zip_id] = 0.0
            else:
                to_return[zip_id] = 0.0
        return to_return

    _name = "dummy.zip"
    _columns = {
        'priority': fields.integer('Priority'),
        'name': fields.char('ZIP', size=64, required=True),
        'city': fields.char('City', size=64, required=True),
        'the_geom': fields.geo_multi_polygon('NPA Shape'),
        'total_sales': fields.function(
            _get_ZIP_total_sales,
            method=True, string='Spatial! Total Sales',
            type='float'),
    }

    _defaults = {
        'priority': lambda *x: 100
    }

    def name_get(self, cursor, uid, ids, context=None):
        res = []
        for r in self.browse(cursor, uid, ids):
            res.append((r.id, u"%s %s" % (r.name, r.city)))
        return res
