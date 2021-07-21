# Copyright 2020 ACSONE SA/NV.
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).


from .common import TestGeoJsonify
from shapely.geometry import shape


class TestGeoJsonifyExport(TestGeoJsonify):
    def test_export(self):
        # when
        parser = self.export.get_json_parser()
        json = self.test_record.jsonify(parser, one=True)
        geojson = json["geo_point"]

        # then
        self.assertEqual(geojson["type"], "Point")
        self.assertEqual(geojson["coordinates"][0], self.test_record.geo_point.x)
        self.assertEqual(geojson["coordinates"][1], self.test_record.geo_point.y)
        # transformation is invertible
        self.assertEqual(shape(geojson), self.test_record.geo_point)
