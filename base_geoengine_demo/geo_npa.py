#-*- coding: utf-8 -*-
##############################################################################
#
# Copyright (c) 2010 Camptocamp SA (http://www.camptocamp.com)
# All Right Reserved
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
        """Return the total of the invoiced sales for this npa
        TODO CREATE AND USE GEO search ORM"""
        to_return = {}
        if not ids:
            return {}
        if not isinstance(ids, list):
            ids = [ids]
        inv_obj = self.pool.get('account.invoice')
        for zip_id in ids :
            cursor.execute(("select geoengine_demo_automatic_retailing_machine.id from"
                            " geoengine_demo_automatic_retailing_machine, res_better_zip"
                            " where res_better_zip.id = %s and"
                            " st_intersects(res_better_zip.the_geom, geoengine_demo_automatic_retailing_machine.the_point)"),
                            (zip_id,))
            res = cursor.fetchall()
            if res:
                mach_ids = [x[0] for x in res]
                cursor.execute("SELECT sum(total_sales) from"
                               " geoengine_demo_automatic_retailing_machine where id in %s;",
                               (tuple(mach_ids),))
                res = cursor.fetchone()
                if res :
                    to_return[zip_id] = res[0] or 0.0
                else:
                    to_return[zip_id] =  0.0
            else:
                to_return[zip_id] = 0.0
        return  to_return

    _inherit = "res.better.zip"
    _name = "res.better.zip"
    _columns = {
        'the_geom' : fields.geo_multi_polygon('NPA Shape'),
        'total_sales': fields.function(
                                 _get_ZIP_total_sales,
                                 method=True, string='Spatial! Total Sales',
                                 type='float',
        ),
    }

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
        view_id = self.pool.get('ir.ui.view').search(cursor, uid,[('model', '=', 'res.better.zip'), ('type', '=', 'geoengine')])[0]
        import pprint; pprint.pprint(self.fields_view_get(cursor, uid, view_id=view_id, view_type='geoengine', context=None, toolbar=False, submenu=False))
        import pprint; pprint.pprint(self.fields_view_get(cursor, uid, view_id=False, view_type='geoengine', context=None, toolbar=False, submenu=False))
        return True
NPA()
