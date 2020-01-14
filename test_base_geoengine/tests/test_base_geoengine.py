# Copyright 2015 Laurent Mignon Acsone SA/NV (http://www.acsone.eu)
# Copyright 2019 Camptocamp SA
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import logging
from io import StringIO

import geojson
import mock
import simplejson
from shapely.geometry import MultiPolygon, Polygon
from shapely.geometry.linestring import LineString
from shapely.geometry.point import Point
from shapely.wkt import loads as wktloads

import odoo.tests.common as common
from odoo import exceptions, fields

from .data import (
    EXPECTED_GEO_COLUMN_MULTIPOLYGON,
    FORM_VIEW,
    GEO_VIEW,
    GEOLINE_1,
    MULTIPOLYGON_1,
)

_logger = logging.getLogger(__name__)


class TestBaseGeoengine(common.SavepointCase):
    def setUp(self):
        super().setUp()

        # mock commit since it"s called in the _auto_init method
        self.cr.commit = mock.MagicMock()
        self.dummy = self.env["test.dummy"].create(
            {"name": "test dummy", "geo_multipolygon": wktloads(MULTIPOLYGON_1)}
        )

    def _compare_view(self, view_type, expected_result, paths):
        values = self.dummy.fields_view_get(
            view_id=None, view_type=view_type, toolbar=False, submenu=False
        )

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
        expected_json = simplejson.dumps(expected_result, sort_keys=True, indent=4)
        #  diff can be very long...Set self.maxDiff to None to see it
        self.maxDiff = None
        self.assertEqual(expected_json, pprint_value.getvalue())

    def test_field(self):
        _logger.info("Tests fields")
        self.assertAlmostEqual(8250285.406718118, self.dummy.geo_multipolygon.area)
        tmp1 = Polygon([(0, 0), (1, 1), (1, 0)])
        tmp2 = Polygon([(3, 0), (4, 1), (4, 0)])
        shape_b = MultiPolygon([tmp1, tmp2])
        self.dummy.write({"geo_multipolygon": shape_b})
        self.dummy.refresh()
        self.assertIsInstance(self.dummy.geo_multipolygon, MultiPolygon)
        self.assertEqual(
            "MULTIPOLYGON (((0 0, 1 1, 1 0, 0 0)), ((3 0, 4 1, 4 0, 3 0)))",
            self.dummy.geo_multipolygon.wkt,
        )

        tmp1 = Polygon([(0, 1), (1, 1), (1, 0)])
        tmp2 = Polygon([(3, 1), (4, 1), (4, 0)])
        shape_c = MultiPolygon([tmp1, tmp2])
        self.dummy.write({"geo_multipolygon": geojson.dumps(shape_c)})
        self.dummy.refresh()
        self.assertIsInstance(self.dummy.geo_multipolygon, MultiPolygon)
        self.assertEqual(
            "MULTIPOLYGON (((0 1, 1 1, 1 0, 0 1)), ((3 1, 4 1, 4 0, 3 1)))",
            self.dummy.geo_multipolygon.wkt,
        )

    def test_view(self):
        _logger.info("Tests view")
        self._compare_view(
            "geoengine", GEO_VIEW, ["geoengine_layers", "type", "model", "name"]
        )
        self._compare_view(
            "form",
            FORM_VIEW,
            [
                "type",
                "model",
                "name",
                "fields.geo_multipolygon.geo_type",
                "fields.geo_multipolygon.required",
                "fields.geo_multipolygon.searchable",
                "fields.geo_multipolygon.sortable",
                "fields.geo_multipolygon.store",
                "fields.geo_multipolygon.string",
                "fields.geo_multipolygon.type",
            ],
        )

    def test_search(self):
        _logger.info("Tests search")
        ids = self.dummy.geo_search(
            domain=[],
            geo_domain=[
                ("geo_multipolygon", "geo_greater", Polygon([(3, 0), (4, 1), (4, 0)]))
            ],
        )
        self.assertListEqual([self.dummy.id], ids)

        ids = self.dummy.geo_search(
            domain=[],
            geo_domain=[
                ("geo_multipolygon", "geo_lesser", Polygon([(3, 0), (4, 1), (4, 0)]))
            ],
        )
        self.assertListEqual([], ids)

    def test_search_geo_contains(self):
        _logger.info("Tests search geo_contains")
        self.dummy.write(
            {"geo_multipolygon": wktloads("MULTIPOLYGON (((0 0, 2 0, 2 2, 0 2, 0 0)))")}
        )
        self.dummy.flush()
        self.dummy.invalidate_cache()
        ids = self.dummy.geo_search(
            domain=[], geo_domain=[("geo_multipolygon", "geo_contains", "POINT(1 1)")]
        )
        self.assertListEqual([self.dummy.id], ids)

    def test_get_edit_info_for_geo_column(self):
        # the field doesn't exists
        with self.assertRaises(ValueError):
            self.dummy.get_edit_info_for_geo_column("not_exist")
        # no raster layer is defined
        with self.assertRaises(exceptions.MissingError):
            self.dummy.get_edit_info_for_geo_column("geo_multipolygon")
        # define a raster layer
        raster_obj = self.env["geoengine.raster.layer"]
        vals = {
            "raster_type": "osm",
            "name": "test dummy OSM",
            "overlay": 0,
            "view_id": self.dummy._get_geo_view().id,
        }
        raster_obj.create(vals)
        res = self.dummy.get_edit_info_for_geo_column("geo_multipolygon")
        expect = EXPECTED_GEO_COLUMN_MULTIPOLYGON
        g = "geo_type"
        s = "srid"
        de = "default_extent"
        self.assertEqual(res[g], expect[g], "Should be the same geo_type")
        self.assertEqual(res[s], expect[s], "Should be the same srid")
        self.assertEqual(res[de], expect[de], "Should be the same default_extend")

        # With the new API, non stored field doesn't have an associated column
        # definition
        vals = {
            "raster_type": "osm",
            "name": "test dummy related OSM",
            "overlay": 0,
            "view_id": self.env["test.dummy.related"]._get_geo_view().id,
        }
        raster_obj.create(vals)
        res = self.env["test.dummy.related"].get_edit_info_for_geo_column(
            "dummy_geo_multipolygon"
        )
        self.assertEqual(res[g], expect[g], "Should be the same geo_type")
        self.assertEqual(res[s], expect[s], "Should be the same srid")
        self.assertEqual(res[de], expect[de], "Should be the same default_extend")

    def test_assign_geopoint(self):
        geo_point_1 = Point(0.0, 0.0)
        geo_point_2 = Point(1.0, 1.0)

        self.dummy.geo_point = geo_point_1
        self.assertTrue(self.dummy.geo_point.equals(geo_point_1))
        self.assertTrue(isinstance(self.dummy.geo_point, Point))

        geo_point_read = self.dummy.read(["geo_point"])[0]
        expected_result = geojson.dumps(geo_point_1)
        self.assertEqual(expected_result, geo_point_read["geo_point"])

        self.dummy.write({"geo_point": geojson.dumps(geo_point_2)})
        self.assertTrue(self.dummy.geo_point.equals(geo_point_2))

    def test_create_line_from_points(self):
        geo_point_1 = Point(0.0, 0.0)
        geo_point_2 = Point(1.0, 1.0)
        expected_line = LineString([[0.0, 0.0], [1.0, 1.0]])

        geo_line = fields.GeoLine.from_points(self.env.cr, geo_point_1, geo_point_2)
        self.assertEqual(geo_line, expected_line)

    def test_abstractmodel(self):
        _logger.info("Tests search geo_contains")
        dummy = self.env["test.dummy.from_abstract"].create(
            {"name": "test dummy", "geo_line": wktloads(GEOLINE_1)}
        )
        dummy.write({"geo_line": wktloads("LINESTRING (0 0, 2 0, 2 2, 0 2, 0 0)")})
