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

    def test_crs_uri_epsg(self):
        # Coverage: EPSG authority, default version, numeric code
        crs = self.env['ogcapi.crs'].create({
            'name': 'EPSG CRS',
            'authority': 'EPSG',
            'version': '0',
            'code': '4326'
        })
        self.assertEqual(crs.crs_uri, 'http://www.opengis.net/def/crs/EPSG/0/4326')

    def test_crs_uri_ogc(self):
        # Coverage: OGC authority, version, string code
        crs = self.env['ogcapi.crs'].create({
            'name': 'OGC CRS',
            'authority': 'OGC',
            'version': '1.3',
            'code': 'CRS84'
        })
        self.assertEqual(crs.crs_uri, 'http://www.opengis.net/def/crs/OGC/1.3/CRS84')

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

    def test_crs_uri_with_partial_fields(self):
        # Coverage: Sadece bazı alanlar doluysa crs_uri False olmalı
        crs = self.env['ogcapi.crs'].create({
            'name': 'Partial CRS',
            'authority': 'EPSG',
            'version': False,
            'code': '4326'
        })
        crs._compute_crs_uri()
        self.assertFalse(crs.crs_uri)
        crs.version = '0'
        crs.code = False
        crs._compute_crs_uri()
        self.assertFalse(crs.crs_uri)
        crs.version = False
        crs.code = '3857'
        crs._compute_crs_uri()
        self.assertFalse(crs.crs_uri)

    def test_crs_uri_with_empty_fields(self):
        # Coverage: Tüm alanlar boşsa crs_uri False olmalı
        crs = self.env['ogcapi.crs'].create({
            'name': 'Empty CRS',
            'authority': False,
            'version': False,
            'code': False
        })
        crs._compute_crs_uri()
        self.assertFalse(crs.crs_uri)

    def test_crs_uri_with_authority_only(self):
        # Coverage: Sadece authority doluysa crs_uri False olmalı
        crs = self.env['ogcapi.crs'].create({
            'name': 'Authority Only',
            'authority': 'EPSG',
            'version': False,
            'code': False
        })
        crs._compute_crs_uri()
        self.assertFalse(crs.crs_uri)

    def test_crs_uri_with_version_only(self):
        # Coverage: Sadece version doluysa crs_uri False olmalı
        crs = self.env['ogcapi.crs'].create({
            'name': 'Version Only',
            'authority': False,
            'version': '0',
            'code': False
        })
        crs._compute_crs_uri()
        self.assertFalse(crs.crs_uri)

    def test_crs_uri_with_code_only(self):
        # Coverage: Sadece code doluysa crs_uri False olmalı
        crs = self.env['ogcapi.crs'].create({
            'name': 'Code Only',
            'authority': False,
            'version': False,
            'code': '3857'
        })
        crs._compute_crs_uri()
        self.assertFalse(crs.crs_uri)

    def test_crs_uri_missing_authority(self):
        # Coverage: authority yoksa crs_uri False
        crs = self.env['ogcapi.crs'].create({
            'name': 'No Authority',
            'authority': False,
            'version': '0',
            'code': '4326'
        })
        crs._compute_crs_uri()
        self.assertFalse(crs.crs_uri)

    def test_crs_uri_missing_version(self):
        # Coverage: version yoksa crs_uri False
        crs = self.env['ogcapi.crs'].create({
            'name': 'No Version',
            'authority': 'EPSG',
            'version': False,
            'code': '4326'
        })
        crs._compute_crs_uri()
        self.assertFalse(crs.crs_uri)

    def test_crs_uri_missing_code(self):
        # Coverage: code yoksa crs_uri False
        crs = self.env['ogcapi.crs'].create({
            'name': 'No Code',
            'authority': 'EPSG',
            'version': '0',
            'code': False
        })
        crs._compute_crs_uri()
        self.assertFalse(crs.crs_uri)
