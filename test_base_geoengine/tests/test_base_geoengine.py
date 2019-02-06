# Copyright 2015 Laurent Mignon Acsone SA/NV (http://www.acsone.eu)
# Copyright 2019 Camptocamp SA
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

from io import StringIO
import logging
import geojson
import mock
import simplejson

from shapely.wkt import loads as wktloads
from shapely.geometry import Polygon, MultiPolygon
from shapely.geometry.linestring import LineString
from shapely.geometry.point import Point

import odoo.tests.common as common
from odoo.exceptions import MissingError

from odoo.addons.base_geoengine import fields as geo_fields

from .data import MULTIPOLYGON_1, GEO_VIEW, FORM_VIEW
from .data import EXPECTED_GEO_COLUMN_MULTIPOLYGON

_logger = logging.getLogger(__name__)


class TestBaseGeoengine(common.TransactionCase):

    def setUp(self):
        super().setUp()

        # mock commit since it"s called in the _auto_init method
        self.cr.commit = mock.MagicMock()

        self.dummy = self.env['test.dummy'].create({
            'name': 'test dummy',
            'the_geom': wktloads(MULTIPOLYGON_1)
        })
        self.dummy_id = self.dummy.id

    def _compare_view(self, view_type, expected_result, paths):
        values = self.dummy.fields_view_get(
            view_id=None, view_type=view_type,
            toolbar=False, submenu=False)

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
        self.assertAlmostEqual(8250285.406718118, self.dummy.the_geom.area)
        tmp1 = Polygon([(0, 0), (1, 1), (1, 0)])
        tmp2 = Polygon([(3, 0), (4, 1), (4, 0)])
        shape_b = MultiPolygon([tmp1, tmp2])
        self.dummy.write({'the_geom': shape_b})
        self.dummy.refresh()
        self.assertIsInstance(self.dummy.the_geom, MultiPolygon)
        self.assertEqual(
            'MULTIPOLYGON (((0 0, 1 1, 1 0, 0 0)), ((3 0, 4 1, 4 0, 3 0)))',
            self.dummy.the_geom.wkt)

        tmp1 = Polygon([(0, 1), (1, 1), (1, 0)])
        tmp2 = Polygon([(3, 1), (4, 1), (4, 0)])
        shape_c = MultiPolygon([tmp1, tmp2])
        self.dummy.write({'the_geom': geojson.dumps(shape_c)})
        self.dummy.refresh()
        self.assertIsInstance(self.dummy.the_geom, MultiPolygon)
        self.assertEqual(
            'MULTIPOLYGON (((0 1, 1 1, 1 0, 0 1)), ((3 1, 4 1, 4 0, 3 1)))',
            self.dummy.the_geom.wkt)

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
        ids = self.dummy.geo_search(
            domain=[],
            geo_domain=[
                ('the_geom',
                 'geo_greater',
                 Polygon([(3, 0), (4, 1), (4, 0)]))])
        self.assertListEqual([self.dummy_id], ids)

        ids = self.dummy.geo_search(
            domain=[],
            geo_domain=[
                ('the_geom',
                 'geo_lesser',
                 Polygon([(3, 0), (4, 1), (4, 0)]))])
        self.assertListEqual([], ids)

    def test_search_geo_contains(self):
        _logger.info("Tests search geo_contains")
        self.dummy.write({
            'the_geom': 'MULTIPOLYGON (((0 0, 2 0, 2 2, 0 2, 0 0)))',
        })
        ids = self.dummy.geo_search(
            domain=[],
            geo_domain=[
                ('the_geom', 'geo_contains', 'POINT(1 1)')
            ])
        self.assertListEqual([self.dummy_id], ids)

    def test_get_edit_info_for_geo_column(self):
        # the field doesn't exists
        with self.assertRaises(ValueError):
            self.dummy.get_edit_info_for_geo_column(
                'not_exist')
        # no raster layer is defined
        with self.assertRaises(MissingError):
            self.dummy.get_edit_info_for_geo_column(
                'the_geom')
        # define a raster layer
        raster_obj = self.env['geoengine.raster.layer']
        vals = {
            "raster_type": "osm",
            "name": "test dummy OSM",
            "overlay": 0,
            "view_id": self.dummy._get_geo_view().id
        }
        raster_obj.create(vals)
        res = self.dummy.get_edit_info_for_geo_column(
            'the_geom')
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
            "view_id": self.env['test.dummy.related']._get_geo_view().id
        }
        raster_obj.create(vals)
        res = self.env['test.dummy.related'].get_edit_info_for_geo_column(
            'the_geom_related')
        self.assertEqual(
            res[g], expect[g], 'Should be the same geo_type')
        self.assertEqual(
            res[s], expect[s], 'Should be the same srid')
        self.assertEqual(
            res[de], expect[de], 'Should be the same default_extend')

    def test_assign_geopoint(self):
        geo_point_1 = Point(0.0, 0.0)
        geo_point_2 = Point(1.0, 1.0)

        self.dummy.geo_point = geo_point_1
        self.assertEqual(self.dummy.geo_point, geo_point_1)
        self.assertTrue(isinstance(self.dummy.geo_point, Point))

        geo_point_read = self.dummy.read(['geo_point'])[0]
        expected_result = geojson.dumps(geo_point_1)
        self.assertEqual(expected_result, geo_point_read['geo_point'])

        self.dummy.write({
            'geo_point': geojson.dumps(geo_point_2),
        })
        self.assertEqual(self.dummy.geo_point, geo_point_2)

    def test_create_line_from_points(self):
        geo_point_1 = Point(0.0, 0.0)
        geo_point_2 = Point(1.0, 1.0)
        expected_line = LineString([
            [0.0, 0.0],
            [1.0, 1.0],
        ])

        geo_line = geo_fields.GeoLine.from_points(
            self.env.cr, geo_point_1, geo_point_2)
        self.assertEqual(geo_line, expected_line)
