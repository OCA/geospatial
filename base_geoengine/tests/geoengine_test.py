# -*- coding: utf-8 -*-
#
#
#    Authors: Laurent Mignon
#    Copyright (c) 2015 Acsone SA/NV (http://www.acsone.eu)
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
#
import openerp.tests.common as common
from shapely.wkt import loads as wktloads
from shapely.geometry import Polygon, MultiPolygon
import geojson
from openerp.osv import fields
from openerp.addons.base_geoengine.geo_model import GeoModel
from .data import MULTIPOLYGON_1, GEO_VIEW, FORM_VIEW
from openerp.modules.registry import RegistryManager
import mock
import simplejson
from cStringIO import StringIO


class geoengine_test(common.TransactionCase):

    def setUp(self):
        common.TransactionCase.setUp(self)
        pool = RegistryManager.get(common.DB)

        class DummyModel(GeoModel):
            _name = 'test.dummy'
            _columns = {
                'name': fields.char('ZIP', size=64, required=True),
                'the_geom': fields.geo_multi_polygon('NPA Shape'),
                }

        # mock commit since it"s called in the _auto_init method
        self.cr.commit = mock.MagicMock()
        self.test_model = DummyModel.create_instance(pool, self.cr)
        self.test_model._auto_init(self.cr, {'module': __name__})

        # create a view for our test.dummy model
        self.registry('ir.ui.view').create(
            self.cr, 1, {
                'model':  self.test_model._name,
                'name': 'test.dummy.geo_view',
                'arch': """<?xml version="1.0"?>
                    <geoengine  version="7.0">
                        <field name="name"/>
                    </geoengine> """
                })

        self.registry('ir.ui.view').create(
            self.cr, 1, {
                'model':  self.test_model._name,
                'name': 'test.dummy.form_view',
                'arch': """<?xml version="1.0"?>
                    <form string="Dummy">
                        <field name="name"/>
                        <notebook colspan="4">
                            <page string="Geometry">
                                <field name="the_geom" colspan="4"
                                       widget="geo_edit_map"/>
                            </page>
                        </notebook>
                    </form> """
                })

        self.dummy_id = self.test_model.create(
            self.cr, 1,
            {'name': 'test dummy',
             'the_geom': wktloads(MULTIPOLYGON_1)})

    def _compare_view(self, view_type, expected_result):
        cr, uid = self.cr, 1
        value = self.test_model.fields_view_get(
            cr, uid, view_id=None, view_type=view_type,
            context=None, toolbar=False, submenu=False)
        value['view_id'] = 'dummy_id'
        value['arch'] = 'dummy_arch'
        pprint_value = StringIO()
        simplejson.dump(value, pprint_value, sort_keys=True, indent=4)
        self.assertEqual(expected_result, pprint_value.getvalue())

    def test_field(self):
        cr = self.cr
        uid = 1
        dummy = self.test_model.browse(cr, uid, self.dummy_id)
        self.assertAlmostEqual(8250285.406718118, dummy.the_geom.area)
        tmp1 = Polygon([(0, 0), (1, 1), (1, 0)])
        tmp2 = Polygon([(3, 0), (4, 1), (4, 0)])
        shape_b = MultiPolygon([tmp1, tmp2])
        dummy.write({'the_geom': shape_b})
        dummy.refresh()
        self.assertEqual(
            'MULTIPOLYGON (((0 0, 1 1, 1 0, 0 0)), ((3 0, 4 1, 4 0, 3 0)))',
            dummy.the_geom.wkt)

        tmp1 = Polygon([(0, 1), (1, 1), (1, 0)])
        tmp2 = Polygon([(3, 1), (4, 1), (4, 0)])
        shape_c = MultiPolygon([tmp1, tmp2])
        dummy.write({'the_geom': geojson.dumps(shape_c)})
        dummy.refresh()
        self.assertEqual(
            'MULTIPOLYGON (((0 1, 1 1, 1 0, 0 1)), ((3 1, 4 1, 4 0, 3 1)))',
            dummy.the_geom.wkt)

    def test_view(self):
        self._compare_view('geoengine', GEO_VIEW)
        self._compare_view('form', FORM_VIEW)

    def test_search(self):
        cr, uid = self.cr, 1
        ids = self.test_model.geo_search(
            cr, uid, domain=[],
            geo_domain=[
                ('the_geom',
                 'geo_greater',
                 Polygon([(3, 0), (4, 1), (4, 0)]))])
        self.assertListEqual([self.dummy_id], ids)

        ids = self.test_model.geo_search(
            cr, uid, domain=[],
            geo_domain=[
                ('the_geom',
                 'geo_lesser',
                 Polygon([(3, 0), (4, 1), (4, 0)]))])
        self.assertListEqual([], ids)
