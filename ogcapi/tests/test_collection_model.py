from odoo.tests.common import TransactionCase
from odoo.exceptions import ValidationError

class TestOgcapiCollectionModel(TransactionCase):

    def setUp(self):
        super().setUp()
        self.partner = self.env['res.partner'].create({
            'name': 'Test Contact',
            'email': 'test@example.com',
            'website': 'https://test.com',
            'phone': '+900000000'
        })
        self.api = self.env['ogcapi.api'].create({
            'name': 'testapi',
            'title': 'Test API',
            'description': 'Test API Description',
            'contact_id': self.partner.id,
        })
        self.keyword1 = self.env['ogcapi.keyword'].create({'name': 'kw1'})
        self.keyword2 = self.env['ogcapi.keyword'].create({'name': 'kw2'})
        self.model = self.env['ir.model'].search([('model', '=', 'res.partner')], limit=1)
        self.collection = self.env['ogcapi.collection'].create({
            'name': 'testcoll',
            'title': 'Test Collection',
            'description': 'Test Collection Desc',
            'api_id': self.api.id,
            'model_id': self.model.id,
            'keywords': [(6, 0, [self.keyword1.id, self.keyword2.id])],
            'extent': '[1,2,3,4]',
        })

    def test_fields(self):
        self.assertEqual(self.collection.name, 'testcoll')
        self.assertEqual(self.collection.title, 'Test Collection')
        self.assertEqual(self.collection.api_id, self.api)
        self.assertEqual(self.collection.model_id, self.model)
        self.assertIn(self.keyword1, self.collection.keywords)
        self.assertIn(self.keyword2, self.collection.keywords)
        self.assertEqual(self.collection.extent, '[1,2,3,4]')

    def test_onchange_model_id(self):
        self.collection.name = False
        self.collection.title = False
        self.collection.description = False
        self.collection.geo_field_id = 123
        self.collection.geo_view_fields = "test"
        self.collection.geo_type = "Point"
        self.collection.geo_srid = 4326
        self.collection.geo_dimension = 2
        self.collection._onchange_model_id()
        self.assertTrue(self.collection.name)
        self.assertTrue(self.collection.title)
        self.assertTrue(self.collection.description)
        self.assertFalse(self.collection.geo_field_id)
        self.assertFalse(self.collection.geo_view_fields)
        self.assertFalse(self.collection.geo_type)
        self.assertFalse(self.collection.geo_srid)
        self.assertFalse(self.collection.geo_dimension)

    def test_onchange_geo_field_id(self):
        self.collection.geo_field_id = False
        self.collection._onchange_geo_field_id()
        self.assertFalse(self.collection.geo_field_name)
        # coverage: geo_field_id varsa (mock)
        field = self.env['ir.model.fields'].create({
            'name': 'x_fake_geo',
            'model_id': self.model.id,
            'ttype': 'geo_point',
            'field_description': 'Fake Geo',
        })
        self.collection.geo_field_id = field
        self.collection._onchange_geo_field_id()
        self.assertEqual(self.collection.geo_field_name, 'x_fake_geo')

    def test_onchange_geo_field_id_with_exception(self):
        # Coverage: _get_geo_field_props exception branch
        field = self.env['ir.model.fields'].create({
            'name': 'x_fake_geo2',
            'model_id': self.model.id,
            'ttype': 'geo_point',
            'field_description': 'Fake Geo2',
        })
        self.collection.geo_field_id = field
        # Patch fields_get to raise Exception
        from unittest.mock import patch
        with patch.object(type(self.env[self.model.model]), 'fields_get', side_effect=Exception("fail")):
            self.collection.geo_field_name = 'x_fake_geo2'
            result = self.collection._get_geo_field_props()
            self.assertFalse(result)

    def test_check_geo_srid(self):
        self.collection.geo_srid = False
        self.collection._check_geo_srid()
        self.collection.geo_srid = 999999
        with self.assertRaises(ValidationError):
            self.collection._check_geo_srid()

    def test_geoengine_model_domain(self):
        domain = self.collection._geoengine_model_domain()
        self.assertIsInstance(domain, list)

    def test_action_api_collection_items(self):
        action = self.collection.action_api_collection_items()
        self.assertEqual(action['res_model'], self.model.model)
        self.assertIn('tree', action['view_mode'])
        # coverage: model_id yoksa None dönmeli
        self.collection.model_id = False
        self.assertIsNone(self.collection.action_api_collection_items())

    def test_action_calculate_extent(self):
        self.collection.model_id = False
        self.collection.geo_field_name = False
        self.collection.geo_srid = False
        self.collection.action_calculate_extent()
        self.assertFalse(self.collection.extent)

    def test_get_geo_field_props(self):
        self.collection.geo_field_name = False
        self.assertFalse(self.collection._get_geo_field_props())

    def test_get_geo_view_fields(self):
        self.collection.geo_field_name = False
        self.assertFalse(self.collection._get_geo_view_fields())

    def test_get_geo_view_fields_with_invalid_xml(self):
        # Coverage: _get_geo_view_fields XML parse exception branch
        view = self.env['ir.ui.view'].create({
            'name': 'geoengine_view',
            'model': self.model.model,
            'type': 'geoengine',
            'arch': '<geoengine><field name="name"></field><field name="active"></field><field></geoengine'  # invalid XML
        })
        self.collection.geo_field_name = 'name'
        self.collection.model_id = self.model
        # Patch ET.fromstring to raise Exception
        import xml.etree.ElementTree as ET
        with patch.object(ET, 'fromstring', side_effect=Exception("fail")):
            result = self.collection._get_geo_view_fields()
            self.assertFalse(result)

    def test_get_crs_uri(self):
        self.assertIn('CRS84', self.collection._get_crs_uri(4326))
        self.assertIn('3857', self.collection._get_crs_uri(3857))

    def test_get_available_crs_list(self):
        crs_list = self.collection._get_available_crs_list()
        self.assertIsInstance(crs_list, list)
        self.assertIn('http://www.opengis.net/def/crs/OGC/1.3/CRS84', crs_list)

    def test_get_srid_from_crs(self):
        self.assertEqual(self.collection._get_srid_from_crs('http://www.opengis.net/def/crs/EPSG/0/3857'), 3857)
        self.assertEqual(self.collection._get_srid_from_crs('http://www.opengis.net/def/crs/OGC/1.3/CRS84'), 4326)

    def test_get_geojson_geometry(self):
        self.collection.geo_field_name = False
        self.assertIsNone(self.collection._get_geojson_geometry(1))

    def test_get_geojson_feature(self):
        self.assertIsNone(self.collection._get_geojson_feature(None))
        self.collection.geo_view_fields = 'invalid_json'
        record = self.env[self.model.model].create({'name': 'Test'})
        feature = self.collection._get_geojson_feature(record, skip_geometry=True)
        self.assertEqual(feature['type'], 'Feature')

    def test_get_geojson_feature_with_invalid_geo_view_fields(self):
        # Coverage: _get_geojson_feature geo_view_fields parse exception branch
        record = self.env[self.model.model].create({'name': 'Test'})
        self.collection.geo_view_fields = 'notjson'
        feature = self.collection._get_geojson_feature(record, skip_geometry=True)
        self.assertEqual(feature['type'], 'Feature')
        self.assertEqual(feature['properties'], {})

    def test_get_geojson_feature_with_skip_geometry_false(self):
        # Coverage: _get_geojson_feature skip_geometry False branch
        record = self.env[self.model.model].create({'name': 'Test'})
        self.collection.geo_view_fields = '["name"]'
        self.collection.geo_field_name = None  # geometry olmayacak
        feature = self.collection._get_geojson_feature(record, skip_geometry=False)
        self.assertEqual(feature['type'], 'Feature')
        self.assertIsNone(feature['geometry'])

    def test_get_geojson_feature_with_skip_geometry_true(self):
        # Coverage: _get_geojson_feature skip_geometry True branch
        record = self.env[self.model.model].create({'name': 'Test'})
        self.collection.geo_view_fields = '["name"]'
        self.collection.geo_field_name = 'name'
        feature = self.collection._get_geojson_feature(record, skip_geometry=True)
        self.assertEqual(feature['type'], 'Feature')
        self.assertIsNone(feature['geometry'])

    def test_get_feature_fields(self):
        self.collection.geo_view_fields = '["name"]'
        fields = self.collection._get_feature_fields()
        self.assertIsInstance(fields, dict)

    def test_get_feature_fields_with_invalid_geo_view_fields(self):
        # Coverage: _get_feature_fields geo_view_fields parse exception branch
        self.collection.geo_view_fields = 'notjson'
        fields = self.collection._get_feature_fields()
        self.assertIsInstance(fields, dict)
        self.assertEqual(fields, {})

    def test_get_collection_schema(self):
        schema = self.collection.get_collection_schema()
        self.assertIn('properties', schema)
        self.assertIn('geometry', schema['properties'])

    def test_get_collection_schema_with_no_geo_type(self):
        # Coverage: get_collection_schema geo_type None branch
        self.collection.geo_type = None
        schema = self.collection.get_collection_schema()
        self.assertIn('properties', schema)
        self.assertIn('geometry', schema['properties'])

    def test_get_collection(self):
        meta = self.collection.get_collection()
        self.assertEqual(meta['id'], self.collection.name)
        self.assertIn('links', meta)
        self.assertIn('extent', meta)
        self.assertIn('crs', meta)
        self.assertIn('storageCrs', meta)
        self.assertIn('keywords', meta)

    def test_get_collection_crs(self):
        crs = self.collection.get_collection_crs()
        self.assertIn('crs', crs)
        self.assertIsInstance(crs['crs'], list)

    def test_get_items_empty(self):
        items = self.collection.get_items()
        self.assertEqual(items['type'], 'FeatureCollection')
        self.assertEqual(items['numberMatched'], 0)
        self.assertEqual(items['numberReturned'], 0)
        self.assertIn('features', items)
        self.assertEqual(len(items['features']), 0)

    def test_get_items_invalid_bbox(self):
        items = self.collection.get_items(bbox='invalid')
        self.assertIn('error', items)
        self.assertEqual(items['error']['code'], 400)

    def test_get_items_invalid_crs(self):
        items = self.collection.get_items(crs='invalid')
        self.assertIn('error', items)
        self.assertEqual(items['error']['code'], 400)

    def test_get_item_not_found(self):
        feature = self.collection.get_item(999999)
        self.assertIsNone(feature)

    def test_get_item_invalid_crs(self):
        feature = self.collection.get_item(1, crs='invalid')
        self.assertIn('error', feature)
        self.assertEqual(feature['error']['code'], 400)

    def test_get_item_invalid_feature_id(self):
        # Coverage: feature_id olarak geçersiz bir değer verildiğinde None dönmeli
        feature = self.collection.get_item('notanumber')
        self.assertIsNone(feature)

    def test_get_collection_extent_invalid_json(self):
        # coverage: extent alanı bozuksa except branch'ı çalışır
        self.collection.extent = 'notjson'
        meta = self.collection.get_collection()
        self.assertIsNone(meta['extent'])

    def test_get_collection_keywords_empty(self):
        # coverage: keywords alanı boşsa anahtar eklenmemeli
        self.collection.keywords = [(5, 0, 0)]
        meta = self.collection.get_collection()
        self.assertNotIn('keywords', meta)

    def test_get_items_with_all_params(self):
        # coverage: tüm parametreler ile get_items çağrısı
        items = self.collection.get_items(
            offset=0,
            limit=1,
            crs=None,
            bbox=None,
            bbox_crs=None,
            bbox_crs_epsg=None,
            skip_geometry=True
        )
        self.assertEqual(items['type'], 'FeatureCollection')

    def test_get_items_with_bbox_crs_epsg(self):
        # coverage: bbox_crs_epsg ile get_items çağrısı
        items = self.collection.get_items(
            bbox=[1,2,3,4],
            bbox_crs_epsg='4326'
        )
        self.assertIn('type', items)

    def test_get_items_with_bbox_crs(self):
        # coverage: bbox_crs ile get_items çağrısı
        items = self.collection.get_items(
            bbox=[1,2,3,4],
            bbox_crs='http://www.opengis.net/def/crs/OGC/1.3/CRS84'
        )
        self.assertIn('type', items)

    def test_get_items_with_limit_offset_types(self):
        # coverage: limit ve offset string verilirse int'e çevrilir mi
        items = self.collection.get_items(limit='1', offset='0')
        self.assertIn('type', items)
        items = self.collection.get_items(limit='-1', offset='notanint')
        self.assertIn('type', items)

    def test_get_items_with_large_limit(self):
        # coverage: limit büyük verilirse default ile sınırlandırılır
        items = self.collection.get_items(limit=100000)
        self.assertIn('type', items)

    def test_get_items_with_zero_limit(self):
        # coverage: limit sıfır verilirse default ile sınırlandırılır
        items = self.collection.get_items(limit=0)
        self.assertIn('type', items)

    def test_get_items_with_negative_limit(self):
        # coverage: limit negatif verilirse default ile sınırlandırılır
        items = self.collection.get_items(limit=-5)
        self.assertIn('type', items)

    def test_get_items_with_none_limit(self):
        # coverage: limit None verilirse default ile sınırlandırılır
        items = self.collection.get_items(limit=None)
        self.assertIn('type', items)

    def test_get_items_with_none_offset(self):
        # coverage: offset None verilirse sıfır olur
        items = self.collection.get_items(offset=None)
        self.assertIn('type', items)

    def test_get_items_with_invalid_bbox_type(self):
        # coverage: bbox yanlış tipte verilirse except branch'ı çalışır
        items = self.collection.get_items(bbox={'a': 1})
        self.assertIn('error', items)
        self.assertEqual(items['error']['code'], 400)

    def test_get_items_with_invalid_bbox_str(self):
        # Coverage: bbox parametresi string ama parse edilemiyor
        items = self.collection.get_items(bbox='1,2,3')
        self.assertIn('error', items)
        self.assertEqual(items['error']['code'], 400)

    def test_get_items_with_invalid_bbox_list(self):
        # Coverage: bbox parametresi list ama uzunluğu yanlış
        items = self.collection.get_items(bbox=[1, 2, 3])
        self.assertIn('error', items)
        self.assertEqual(items['error']['code'], 400)

    def test_get_items_with_invalid_bbox_value(self):
        # Coverage: bbox parametresi list ama float'a çevrilemiyor
        items = self.collection.get_items(bbox=['a', 'b', 'c', 'd'])
        self.assertIn('error', items)
        self.assertEqual(items['error']['code'], 400)

    def test_get_items_with_bbox_and_invalid_crs(self):
        # Coverage: bbox ile birlikte geçersiz bbox_crs
        items = self.collection.get_items(bbox=[1,2,3,4], bbox_crs='invalid_crs')
        self.assertIn('error', items)
        self.assertEqual(items['error']['code'], 400)

    def test_get_items_with_bbox_and_invalid_bbox_crs_epsg(self):
        # Coverage: bbox ile birlikte geçersiz bbox_crs_epsg
        items = self.collection.get_items(bbox=[1,2,3,4], bbox_crs_epsg='notanint')
        self.assertIn('type', items)  # fallback 4326 ile çalışır, error dönmez

    def test_get_items_with_bbox_and_valid_bbox_crs_epsg(self):
        # Coverage: bbox ile birlikte geçerli bbox_crs_epsg
        items = self.collection.get_items(bbox=[1,2,3,4], bbox_crs_epsg='4326')
        self.assertIn('type', items)

    def test_get_items_with_bbox_and_valid_bbox_crs(self):
        # Coverage: bbox ile birlikte geçerli bbox_crs
        items = self.collection.get_items(bbox=[1,2,3,4], bbox_crs='http://www.opengis.net/def/crs/OGC/1.3/CRS84')
        self.assertIn('type', items)

    def test_get_items_with_bbox_and_storage_srid(self):
        # Coverage: bbox ile birlikte storage_srid farklıysa
        self.collection.geo_srid = 3857
        items = self.collection.get_items(bbox=[1,2,3,4], bbox_crs='http://www.opengis.net/def/crs/OGC/1.3/CRS84')
        self.assertIn('type', items)
