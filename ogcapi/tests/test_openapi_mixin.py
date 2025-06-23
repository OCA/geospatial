from odoo.tests.common import TransactionCase

class TestOgcapiOpenapiMixin(TransactionCase):

    def setUp(self):
        super().setUp()
        # Use ogcapi.api for mixin tests (it inherits the mixin)
        self.partner = self.env['res.partner'].create({'name': 'Test Partner'})
        self.api = self.env['ogcapi.api'].create({
            'name': 'testapi',
            'title': 'Test API',
            'description': 'desc',
            'contact_id': self.partner.id,
        })

    def test_get_static_schemas(self):
        schemas = self.api._get_static_schemas()
        self.assertIsInstance(schemas, dict)
        self.assertIn('LandingPage', schemas)

    def test_get_oas_parameters(self):
        params = self.api._get_oas_parameters()
        self.assertIsInstance(params, dict)
        self.assertIn('f', params)
        self.assertIn('limit', params)
        # Tek bir parametre anahtarı ile
        f_param = self.api._get_oas_parameters('f')
        self.assertIsInstance(f_param, dict)
        self.assertEqual(f_param['name'], 'f')
        # Coverage: olmayan parametre anahtarı
        none_param = self.api._get_oas_parameters('notexist')
        self.assertEqual(none_param, {})

    def test_get_oas_responses_schema(self):
        responses = self.api._get_oas_responses_schema()
        self.assertIn('NotFound', responses)
        self.assertIn('InternalServerError', responses)
        self.assertIn('Success', responses)

    def test_get_base_openapi_data(self):
        data = self.api._get_base_openapi_data()
        self.assertIn('openapi', data)
        self.assertIn('info', data)
        self.assertIn('servers', data)
        self.assertIn('components', data)
        self.assertIn('paths', data)
        self.assertIn('tags', data)

    def test_get_base_feature_schema(self):
        schema = self.api._get_base_feature_schema()
        self.assertIn('type', schema)
        self.assertIn('properties', schema)
        self.assertIn('geometry', schema['properties'])

    def test_get_base_feature_collection_schema(self):
        schema = self.api._get_base_feature_collection_schema()
        self.assertIn('type', schema)
        self.assertIn('properties', schema)
        self.assertIn('features', schema['properties'])

    def test_get_response_errors_schema(self):
        errors = self.api._get_response_errors_schema()
        self.assertIn('404', errors)
        self.assertIn('500', errors)

    def test_get_feature_props_schema(self):
        # Coverage: feature_fields boş ise
        props = self.api._get_feature_props_schema()
        self.assertIsInstance(props, dict)
        self.assertIn('properties', props)
        self.assertIn('required', props)

    def test_get_landing_page_schema(self):
        # Coverage: _get_landing_page_schema fonksiyonu
        path, schema = self.api._get_landing_page_schema()
        self.assertIsInstance(path, dict)
        self.assertIsInstance(schema, dict)
        self.assertIn('/', path)

    def test_get_collections_schema(self):
        # Coverage: _get_collections_schema fonksiyonu
        path, schema = self.api._get_collections_schema()
        self.assertIsInstance(path, dict)
        self.assertIsInstance(schema, dict)
        self.assertIn('/collections', path)

    def test_get_conformance_schema(self):
        # Coverage: _get_conformance_schema fonksiyonu
        path, schema = self.api._get_conformance_schema()
        self.assertIsInstance(path, dict)
        self.assertIsInstance(schema, dict)
        self.assertIn('/conformance', path)

    def test_get_open_api_schema(self):
        # Coverage: _get_open_api_schema fonksiyonu
        path, schema = self.api._get_open_api_schema()
        self.assertIsInstance(path, dict)
        self.assertIsInstance(schema, dict)
        self.assertIn('/api', path)

    def test_get_collection_schema(self):
        # Coverage: _get_collection_schema fonksiyonu
        # Sahte bir koleksiyon nesnesi ile coverage
        collection = self.env['ogcapi.collection'].create({
            'name': 'testcoll',
            'title': 'Test Collection',
            'api_id': self.api.id,
            'model_id': self.env['ir.model'].search([('model', '=', 'res.partner')], limit=1).id,
        })
        path, schema = collection._get_collection_schema()
        self.assertIsInstance(path, dict)
        self.assertIsInstance(schema, dict)
        self.assertIn('/collections/testcoll', path)

    def test_get_item_schema(self):
        # Coverage: _get_item_schema fonksiyonu
        collection = self.env['ogcapi.collection'].create({
            'name': 'testcoll2',
            'title': 'Test Collection 2',
            'api_id': self.api.id,
            'model_id': self.env['ir.model'].search([('model', '=', 'res.partner')], limit=1).id,
        })
        path, schema = collection._get_item_schema()
        self.assertIsInstance(path, dict)
        self.assertIsInstance(schema, dict)
        self.assertIn('/collections/testcoll2/items/{feature_id}', path)

    def test_get_items_schema(self):
        # Coverage: _get_items_schema fonksiyonu
        collection = self.env['ogcapi.collection'].create({
            'name': 'testcoll3',
            'title': 'Test Collection 3',
            'api_id': self.api.id,
            'model_id': self.env['ir.model'].search([('model', '=', 'res.partner')], limit=1).id,
        })
        path, schema = collection._get_items_schema()
        self.assertIsInstance(path, dict)
        self.assertIsInstance(schema, dict)
        self.assertIn('/collections/testcoll3/items', path)

    def test_get_collection_api_schema(self):
        # Coverage: _get_collection_api_schema fonksiyonu
        collection = self.env['ogcapi.collection'].create({
            'name': 'testcoll4',
            'title': 'Test Collection 4',
            'api_id': self.api.id,
            'model_id': self.env['ir.model'].search([('model', '=', 'res.partner')], limit=1).id,
        })
        path, schema = collection._get_collection_api_schema()
        self.assertIsInstance(path, dict)
        self.assertIsInstance(schema, dict)
        self.assertIn('/collections/testcoll4/schema', path)

    def test_get_oas_parameters_all_keys(self):
        # Coverage: tüm parametre anahtarı için _get_oas_parameters
        keys = [
            'f', 'lang', 'skipGeometry', 'crs', 'bbox', 'bbox-crs', 'bbox-crs-epsg',
            'offset', 'vendorSpecificParameters', 'limit', 'feature_id'
        ]
        for key in keys:
            param = self.api._get_oas_parameters(key)
            self.assertIsInstance(param, dict)
            if key in ['f', 'lang', 'limit', 'feature_id']:
                self.assertIn('name', param)

    def test_get_oas_parameters_invalid_key(self):
        # Coverage: olmayan anahtar için boş dict
        param = self.api._get_oas_parameters('invalid_key')
        self.assertEqual(param, {})

    def test_get_oas_responses_schema_keys(self):
        # Coverage: tüm response anahtarı
        responses = self.api._get_oas_responses_schema()
        self.assertIn('NotFound', responses)
        self.assertIn('InternalServerError', responses)
        self.assertIn('Success', responses)
        for key in ['NotFound', 'InternalServerError', 'Success']:
            self.assertIn('description', responses[key])

    def test_get_response_errors_schema_keys(self):
        # Coverage: _get_response_errors_schema anahtarları
        errors = self.api._get_response_errors_schema()
        self.assertIn('404', errors)
        self.assertIn('500', errors)
        self.assertEqual(errors['404']['$ref'], '#/components/responses/NotFound')
        self.assertEqual(errors['500']['$ref'], '#/components/responses/InternalServerError')

    def test_get_base_openapi_data_empty(self):
        # Coverage: _get_base_openapi_data returns empty structure if called directly
        data = type(self.api)._get_base_openapi_data(self.api)
        self.assertIsInstance(data, dict)
        self.assertIn('openapi', data)
        self.assertIn('info', data)
        self.assertIn('servers', data)
        self.assertIn('components', data)
        self.assertIn('paths', data)
        self.assertIn('tags', data)

    def test_get_feature_props_schema_types(self):
        # Coverage: _get_feature_props_schema with various field types
        model = self.env['ir.model'].search([('model', '=', 'res.partner')], limit=1)
        collection = self.env['ogcapi.collection'].create({
            'name': 'testprops',
            'title': 'Test Props',
            'api_id': self.api.id,
            'model_id': model.id,
            'geo_view_fields': '["name","active"]'
        })
        props = collection._get_feature_props_schema()
        self.assertIsInstance(props, dict)
        self.assertIn('properties', props)
        self.assertIn('name', props['properties'])
        self.assertIn('active', props['properties'])

    def test_get_feature_props_schema_required(self):
        # Coverage: _get_feature_props_schema required alanı
        model = self.env['ir.model'].search([('model', '=', 'res.partner')], limit=1)
        # name alanı required, active değil
        collection = self.env['ogcapi.collection'].create({
            'name': 'testprops2',
            'title': 'Test Props2',
            'api_id': self.api.id,
            'model_id': model.id,
            'geo_view_fields': '["name","active"]'
        })
        props = collection._get_feature_props_schema()
        self.assertIn('required', props)
        self.assertIn('name', props['required'])
        self.assertNotIn('active', props['required'])

    def test_get_feature_props_schema_types_all(self):
        # Coverage: _get_feature_props_schema tüm tipler
        model = self.env['ir.model'].search([('model', '=', 'res.partner')], limit=1)
        # name: char, active: boolean, create_date: datetime, id: integer
        collection = self.env['ogcapi.collection'].create({
            'name': 'testprops3',
            'title': 'Test Props3',
            'api_id': self.api.id,
            'model_id': model.id,
            'geo_view_fields': '["name","active","create_date","id"]'
        })
        props = collection._get_feature_props_schema()
        self.assertEqual(props['properties']['name']['type'], 'string')
        self.assertEqual(props['properties']['active']['type'], 'boolean')
        self.assertEqual(props['properties']['create_date']['type'], 'string')
        self.assertEqual(props['properties']['create_date']['format'], 'date-time')
        self.assertEqual(props['properties']['id']['type'], 'integer')

    def test_get_feature_props_schema_float(self):
        # Coverage: float ve monetary tipleri
        model = self.env['ir.model'].search([('model', '=', 'res.partner')], limit=1)
        # credit_limit: float (if exists)
        fields = self.env['ir.model.fields'].search([
            ('model_id', '=', model.id), ('ttype', '=', 'float')
        ], limit=1)
        geo_view_fields = '["%s"]' % fields.name if fields else '[]'
        collection = self.env['ogcapi.collection'].create({
            'name': 'testprops4',
            'title': 'Test Props4',
            'api_id': self.api.id,
            'model_id': model.id,
            'geo_view_fields': geo_view_fields
        })
        props = collection._get_feature_props_schema()
        if fields:
            self.assertEqual(props['properties'][fields.name]['type'], 'number')

    def test_get_feature_props_schema_date(self):
        # Coverage: date tipleri
        model = self.env['ir.model'].search([('model', '=', 'res.partner')], limit=1)
        fields = self.env['ir.model.fields'].search([
            ('model_id', '=', model.id), ('ttype', '=', 'date')
        ], limit=1)
        geo_view_fields = '["%s"]' % fields.name if fields else '[]'
        collection = self.env['ogcapi.collection'].create({
            'name': 'testprops5',
            'title': 'Test Props5',
            'api_id': self.api.id,
            'model_id': model.id,
            'geo_view_fields': geo_view_fields
        })
        props = collection._get_feature_props_schema()
        if fields:
            self.assertEqual(props['properties'][fields.name]['type'], 'string')
            self.assertEqual(props['properties'][fields.name]['format'], 'date')

    def test_get_feature_props_schema_unknown_type(self):
        # Coverage: _get_feature_props_schema bilinmeyen bir field type için
        model = self.env['ir.model'].search([('model', '=', 'res.partner')], limit=1)
        # Sahte bir field ekle (ör: ttype='unknown')
        field = self.env['ir.model.fields'].create({
            'name': 'x_unknown_type',
            'model_id': model.id,
            'ttype': 'unknown',
            'field_description': 'Unknown Type',
        })
        collection = self.env['ogcapi.collection'].create({
            'name': 'testprops6',
            'title': 'Test Props6',
            'api_id': self.api.id,
            'model_id': model.id,
            'geo_view_fields': '["x_unknown_type"]'
        })
        props = collection._get_feature_props_schema()
        # unknown type eklenmemeli veya boş dict olmalı
        self.assertIn('properties', props)
        self.assertIn('x_unknown_type', props['properties'])
        # type anahtarı olmayabilir, bu da coverage sağlar
        self.assertTrue(isinstance(props['properties']['x_unknown_type'], dict))

    def test_get_oas_parameters_all_variants(self):
        # Coverage: _get_oas_parameters tüm parametre anahtarları ve tipleri
        keys = [
            'f', 'lang', 'skipGeometry', 'crs', 'bbox', 'bbox-crs', 'bbox-crs-epsg',
            'offset', 'vendorSpecificParameters', 'limit', 'feature_id'
        ]
        for key in keys:
            param = self.api._get_oas_parameters(key)
            self.assertIsInstance(param, dict)
            # Her parametre için tip ve anahtarlar kontrolü
            if key == 'f':
                self.assertEqual(param['name'], 'f')
                self.assertEqual(param['schema']['type'], 'string')
            if key == 'lang':
                self.assertEqual(param['name'], 'lang')
                self.assertIn('enum', param['schema'])
            if key == 'skipGeometry':
                self.assertEqual(param['name'], 'skipGeometry')
                self.assertEqual(param['schema']['type'], 'boolean')
            if key == 'crs':
                self.assertEqual(param['name'], 'crs')
                self.assertEqual(param['schema']['type'], 'string')
            if key == 'bbox':
                self.assertEqual(param['name'], 'bbox')
                self.assertEqual(param['schema']['type'], 'array')
            if key == 'bbox-crs':
                self.assertEqual(param['name'], 'bbox-crs')
                self.assertEqual(param['schema']['type'], 'string')
            if key == 'bbox-crs-epsg':
                self.assertEqual(param['name'], 'bbox-crs')
                self.assertEqual(param['schema']['type'], 'integer')
            if key == 'offset':
                self.assertEqual(param['name'], 'offset')
                self.assertEqual(param['schema']['type'], 'integer')
            if key == 'vendorSpecificParameters':
                self.assertEqual(param['name'], 'vendorSpecificParameters')
                self.assertEqual(param['schema']['type'], 'object')
            if key == 'limit':
                self.assertEqual(param['name'], 'limit')
                self.assertEqual(param['schema']['type'], 'integer')
            if key == 'feature_id':
                self.assertEqual(param['name'], 'feature_id')
                self.assertEqual(param['schema']['type'], 'string')

    def test_get_oas_parameters_none(self):
        # Coverage: _get_oas_parameters param_key=None dönerse tüm parametreler gelir
        params = self.api._get_oas_parameters(None)
        self.assertIsInstance(params, dict)
        self.assertIn('f', params)
        self.assertIn('lang', params)
        self.assertIn('feature_id', params)
