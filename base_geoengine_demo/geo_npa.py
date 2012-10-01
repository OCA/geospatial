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
from osv import fields, osv

from shapely.wkt import dumps as wktdumps, loads as  wktloads
from shapely.geometry import Polygon, MultiPolygon
from shapely.geometry import asShape
import geojson

from base_geoengine import geo_model

class NPA(geo_model.GeoModel):
    """GEO OSV SAMPLE"""
    def _get_ZIP_total_sales(self, cursor, uid, ids, name, args, context=None):
        """Return the total of the invoiced sales for this npa"""
        to_return = {}
        if not ids:
            return {}
        if not isinstance(ids, list):
            ids = [ids]
        inv_obj = self.pool.get('account.invoice')
        mach_obj = self.pool.get('geoengine.demo.automatic.retailing.machine')
        for zip_id in ids:
            res = mach_obj.geo_search(cursor,
                                      uid,
                                      domain=[],
                                      geo_domain=[('the_point', 'geo_intersect', {'dummy.zip.the_geom': [('id', '=', zip_id)]})])

            if res:
                cursor.execute("SELECT sum(total_sales) from"
                               " geoengine_demo_automatic_retailing_machine where id in %s;",
                               (tuple(res),))
                res = cursor.fetchone()
                if res :
                    to_return[zip_id] = res[0] or 0.0
                else:
                    to_return[zip_id] =  0.0
            else:
                to_return[zip_id] = 0.0
        return  to_return

    _name = "dummy.zip"
    _columns = {
        'priority':fields.integer('Priority'),
        'name':fields.char('ZIP', size=64, required=True),
        'city':fields.char('City', size=64, required=True),
        'the_geom' : fields.geo_multi_polygon('NPA Shape'),
        'total_sales': fields.function(
                                 _get_ZIP_total_sales,
                                 method=True, string='Spatial! Total Sales',
                                 type='float'),
    }
    
    _defaults = {
        'priority':lambda *x:100
    }
    
    def name_get(self, cursor, uid, ids, context=None) :
        res = []
        for r in self.browse(cursor, uid, ids) :
            res.append((r.id, u"%s %s" %(r.name, r.city)))
        return res

    def test_func(self, cursor, uid, ids):
        """Test function only use for devel. TO DELETE"""
        print 'a = self.browse(cursor, uid, 1)'
        a = self.browse(cursor, uid, 1)
        print 'print a.name'
        print a.name
        print 'a.the_geom.area'
        print a.the_geom.area
        print 'shape_a = wktloads(a.the_geom.wkt)'
        shape_a = wktloads(a.the_geom.wkt)
        print 'tmp1 = Polygon([(0, 0), (1, 1), (1, 0)])'
        tmp1 = Polygon([(0, 0), (1, 1), (1, 0)])
        print 'Polygon([(3, 0), (4, 1), (4, 0)])'
        tmp2 = Polygon([(3, 0), (4, 1), (4, 0)])
        print 'shape_b = MultiPolygon([tmp1, tmp2])'
        shape_b = MultiPolygon([tmp1, tmp2])
        print "a.write({'the_geom':shape_b})"
        a.write({'the_geom':shape_b})
        print "self.browse(cursor, uid, 1)"
        a = self.browse(cursor, uid, 1)
        print "print a.the_geom.wkt"
        print a.the_geom.wkt
        print "a.write({'the_geom':shape_b})"
        a.write({'the_geom':shape_b})
        print "a = self.browse(cursor, uid, 1)"
        a = self.browse(cursor, uid, 1)
        print "print a.the_geom"
        print a.the_geom
        print "a.write({'the_geom':shape_b.wkt})"
        a.write({'the_geom':shape_b.wkt})
        print "a = self.browse(cursor, uid, 1)"
        a = self.browse(cursor, uid, 1)
        print "print a.the_geom.wkt"
        print a.the_geom.wkt
        print "a.write({'the_geom':geojson.dumps(shape_a)})"
        a.write({'the_geom':geojson.dumps(shape_a)})
        print "a = self.browse(cursor, uid, 1)"
        a = self.browse(cursor, uid, 1)
        print "print a.the_geom.wkt"
        print a.the_geom.wkt
        b = self.create(cursor, uid, {'name':'1100', 'city': 'lausanne', 'the_geom': a.the_geom})
        b = self.browse(cursor, uid, b)
        #self.unlink(cursor, uid, [b.id])
        view_id = self.pool.get('ir.ui.view').search(cursor, uid,[('model', '=', 'dummy.zip'), ('type', '=', 'geoengine')])[0]
        import pprint; pprint.pprint(self.fields_view_get(cursor, uid, view_id=view_id, view_type='geoengine', context=None, toolbar=False, submenu=False))
        import pprint; pprint.pprint(self.fields_view_get(cursor, uid, view_id=False, view_type='geoengine', context=None, toolbar=False, submenu=False))
        print self.geo_search(cursor, uid, domain=[('name', 'ilike', 'Lausanne')], geo_domain=[('the_geom', 'geo_greater', Polygon([(3, 0), (4, 1), (4, 0)]))])
        print self.geo_search(cursor, uid, domain=[('name', 'ilike', 'Lausanne')], geo_domain=[('the_geom', 'geo_greater', 0)])
        print self.geo_search(cursor, uid, domain=[('name', 'ilike', 'Lausanne')], geo_domain=[('the_geom', 'geo_intersect', {'geoengine.demo.automatic.retailing.machine.the_point': []})])
        print self.geo_search(cursor, uid, domain=[('name', 'ilike', 'Lausanne')], geo_domain=[('the_geom', 'geo_intersect', {'geoengine.demo.automatic.retailing.machine.the_point': [('name','!=','Vallorbe')]})])
        return True
NPA()
