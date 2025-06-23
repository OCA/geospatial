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
