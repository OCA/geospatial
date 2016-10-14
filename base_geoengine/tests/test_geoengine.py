# -*- coding: utf-8 -*-
# Copyright 2015 Laurent Mignon Acsone SA/NV (http://www.acsone.eu)
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).
import mock
import simplejson
from cStringIO import StringIO
import logging
from shapely.wkt import loads as wktloads
from shapely.geometry import Polygon, MultiPolygon
import geojson

import openerp.tests.common as common
from openerp import fields
from openerp.osv import fields as old_fields
from openerp.tools import SUPERUSER_ID
from openerp.modules.registry import RegistryManager
from openerp.exceptions import MissingError

from openerp.addons.base_geoengine.geo_model import GeoModel
from openerp.addons.base_geoengine import fields as geo_fields
from .data import MULTIPOLYGON_1, GEO_VIEW, FORM_VIEW
from .data import EXPECTED_GEO_COLUMN_MULTIPOLYGON

_logger = logging.getLogger(__name__)


class TestGeoengine(common.TransactionCase):

    def setUp(self):
        common.TransactionCase.setUp(self)

        class DummyModel(GeoModel):
            _name = 'test.dummy'
            _columns = {
                'name': old_fields.char('ZIP', size=64, required=True),
                'the_geom': old_fields.geo_multi_polygon('NPA Shape'),
                }

        class DummyModelRelated(GeoModel):
            _name = 'test.dummy.related'

            dummy_test_id = fields.Many2one(
                String='dummy_test', comodel_name='test.dummy')
            the_geom_related = geo_fields.GeoMultiPolygon(
                'related', related='dummy_test_id.the_geom')

        # mock commit since it"s called in the _auto_init method
        self.cr.commit = mock.MagicMock()
        self.test_model = self._init_test_model(DummyModel)
        self.test_model_related = self._init_test_model(DummyModelRelated)

        # create a view for our test.dummy model
        self.registry('ir.ui.view').create(
            self.cr, 1, {
                'model':  self.test_model._name,
                'name': 'test.dummy.geo_view',
                'arch': """<?xml version="1.0"?>
                    <geoengine>
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

        self.registry('ir.ui.view').create(
            self.cr, 1, {
                'model':  self.test_model_related._name,
                'name': 'test.dummy.related.geo_view',
                'arch': """<?xml version="1.0"?>
                    <geoengine>
                        <field name="dummy_test_id"/>
                    </geoengine> """
                })

    def _init_test_model(self, cls):
        pool = RegistryManager.get(common.DB)
        inst = cls._build_model(pool, self.cr)
        inst._prepare_setup(self.cr, SUPERUSER_ID)
        inst._setup_base(self.cr, SUPERUSER_ID, partial=False)
        inst._setup_fields(self.cr, SUPERUSER_ID, partial=False)
        inst._setup_complete(self.cr, SUPERUSER_ID)
        inst._auto_init(self.cr, {'module': __name__})
        return inst

    def _compare_view(self, view_type, expected_result, paths):
        cr, uid = self.cr, 1
        values = self.test_model.fields_view_get(
            cr, uid, view_id=None, view_type=view_type,
            context=None, toolbar=False, submenu=False)

        def set_value_path(origin, target, path):
            parts = path.split(".")
            for idx, key in enumerate(parts):
                origin = origin[key]
                if idx == len(parts) - 1:
                    target[key] = origin
                else:
                    target = target.setdefault(key, {})
        values_reduced = {}
        for path in paths:
            set_value_path(values, values_reduced, path)
        pprint_value = StringIO()
        simplejson.dump(values_reduced, pprint_value, sort_keys=True, indent=4)
        expected_json = simplejson.dumps(
            expected_result, sort_keys=True, indent=4)
        #  diff can be very long...Set self.maxDiff to None to see it
        self.maxDiff = None
        self.assertEqual(expected_json, pprint_value.getvalue())

    def test_field(self):
        _logger.info("Tests fields")
        cr = self.cr
        uid = 1
        dummy = self.test_model.browse(cr, uid, self.dummy_id)
        self.assertAlmostEqual(8250285.406718118, dummy.the_geom.area)
        tmp1 = Polygon([(0, 0), (1, 1), (1, 0)])
        tmp2 = Polygon([(3, 0), (4, 1), (4, 0)])
        shape_b = MultiPolygon([tmp1, tmp2])
        dummy.write({'the_geom': shape_b})
        dummy.refresh()
        self.assertIsInstance(dummy.the_geom, MultiPolygon)
        self.assertEqual(
            'MULTIPOLYGON (((0 0, 1 1, 1 0, 0 0)), ((3 0, 4 1, 4 0, 3 0)))',
            dummy.the_geom.wkt)

        tmp1 = Polygon([(0, 1), (1, 1), (1, 0)])
        tmp2 = Polygon([(3, 1), (4, 1), (4, 0)])
        shape_c = MultiPolygon([tmp1, tmp2])
        dummy.write({'the_geom': geojson.dumps(shape_c)})
        dummy.refresh()
        self.assertIsInstance(dummy.the_geom, MultiPolygon)
        self.assertEqual(
            'MULTIPOLYGON (((0 1, 1 1, 1 0, 0 1)), ((3 1, 4 1, 4 0, 3 1)))',
            dummy.the_geom.wkt)

    def test_view(self):
        _logger.info("Tests view")
        self._compare_view(
            'geoengine', GEO_VIEW,
            ['geoengine_layers', 'type', 'model', 'name'])
        self._compare_view(
            'form', FORM_VIEW,
            ['type', 'model', 'name', 'fields.the_geom.geo_type',
             'fields.the_geom.required', 'fields.the_geom.searchable',
             'fields.the_geom.sortable', 'fields.the_geom.store',
             'fields.the_geom.string', 'fields.the_geom.type'])

    def test_search(self):
        _logger.info("Tests search")
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

    def test_search_geo_contains(self):
        _logger.info("Tests search geo_contains")
        cr, uid = self.cr, 1
        dummy = self.test_model.browse(cr, uid, self.dummy_id)
        dummy.write({'the_geom': 'MULTIPOLYGON (((0 0, 2 0, 2 2, 0 2, 0 0)))'})
        ids = self.test_model.geo_search(
            cr, uid, domain=[],
            geo_domain=[
                ('the_geom',
                 'geo_contains',
                 'POINT(1 1)'
                 )
            ])
        self.assertListEqual([self.dummy_id], ids)

    def test_get_edit_info_for_geo_column(self):
        cr, uid = self.cr, SUPERUSER_ID
        context = self.registry['res.users'].context_get(cr, uid)
        # the field doesn't exists
        with self.assertRaises(ValueError):
            self.test_model.get_edit_info_for_geo_column(
                cr, uid, 'not_exist', context=context)
        # no raster layer is defined
        with self.assertRaises(MissingError):
            self.test_model.get_edit_info_for_geo_column(
                cr, uid, 'the_geom', context=context)
        # define a raster layer
        raster_obj = self.env['geoengine.raster.layer']
        vals = {
            "raster_type": "osm",
            "name": "test dummy OSM",
            "overlay": 0,
            "view_id": self.test_model._get_geo_view(cr, uid).id
        }
        raster_obj.create(vals)
        res = self.test_model.get_edit_info_for_geo_column(
            cr, uid, 'the_geom', context=context)
        expect = EXPECTED_GEO_COLUMN_MULTIPOLYGON
        g = 'geo_type'
        s = 'srid'
        de = 'default_extent'
        self.assertEqual(
            res[g], expect[g], 'Should be the same geo_type')
        self.assertEqual(
            res[s], expect[s], 'Should be the same srid')
        self.assertEqual(
            res[de], expect[de], 'Should be the same default_extend')

        # With the new API, non stored field doesn't have an associated column
        # definition
        vals = {
            "raster_type": "osm",
            "name": "test dummy related OSM",
            "overlay": 0,
            "view_id": self.test_model_related._get_geo_view(cr, uid).id
        }
        raster_obj.create(vals)
        res = self.test_model_related.get_edit_info_for_geo_column(
            cr, uid, 'the_geom_related', context=context)
        self.assertEqual(
            res[g], expect[g], 'Should be the same geo_type')
        self.assertEqual(
            res[s], expect[s], 'Should be the same srid')
        self.assertEqual(
            res[de], expect[de], 'Should be the same default_extend')
