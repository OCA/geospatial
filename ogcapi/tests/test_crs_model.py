from odoo.tests.common import TransactionCase

class TestOgcapiCrsModel(TransactionCase):

    def test_fields_and_compute(self):
        crs = self.env['ogcapi.crs'].create({
            'name': 'WGS 84 / Pseudo-Mercator',
            'authority': 'EPSG',
            'version': '0',
            'code': '3857'
        })
        self.assertEqual(crs.name, 'WGS 84 / Pseudo-Mercator')
        self.assertEqual(crs.authority, 'EPSG')
        self.assertEqual(crs.version, '0')
        self.assertEqual(crs.code, '3857')
        self.assertEqual(
            crs.crs_uri,
            'http://www.opengis.net/def/crs/EPSG/0/3857'
        )

    def test_compute_crs_uri_missing_fields(self):
        crs = self.env['ogcapi.crs'].create({
            'name': 'Test CRS',
            'authority': False,
            'version': False,
            'code': False
        })
        crs._compute_crs_uri()
        self.assertFalse(crs.crs_uri)

    def test_compute_crs_uri_ogc(self):
        crs = self.env['ogcapi.crs'].create({
            'name': 'OGC CRS',
            'authority': 'OGC',
            'version': '1.3',
            'code': 'CRS84'
        })
        self.assertEqual(
            crs.crs_uri,
            'http://www.opengis.net/def/crs/OGC/1.3/CRS84'
        )

    def test_crs_uri_recompute_on_change(self):
        # Coverage: crs_uri değişimi ve recompute
        crs = self.env['ogcapi.crs'].create({
            'name': 'Dynamic CRS',
            'authority': 'EPSG',
            'version': '0',
            'code': '4326'
        })
        self.assertEqual(crs.crs_uri, 'http://www.opengis.net/def/crs/EPSG/0/4326')
        crs.code = '3857'
        crs._compute_crs_uri()
        self.assertEqual(crs.crs_uri, 'http://www.opengis.net/def/crs/EPSG/0/3857')
        crs.authority = None
        crs._compute_crs_uri()
        self.assertFalse(crs.crs_uri)
