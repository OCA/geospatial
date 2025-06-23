from odoo.tests.common import TransactionCase

class TestOgcapiOpenapiMixin(TransactionCase):

    def setUp(self):
        super().setUp()
        # Use a real model that inherits the mixin for testing
        self.partner = self.env['res.partner'].create({'name': 'Test Partner'})

    def test_get_static_schemas(self):
        mixin = self.env['ogcapi.api']
        schemas = mixin._get_static_schemas()
        self.assertIsInstance(schemas, dict)
        self.assertIn('LandingPage', schemas)

    def test_get_oas_parameters(self):
        mixin = self.env['ogcapi.api']
        params = mixin._get_oas_parameters()
        self.assertIsInstance(params, dict)
        self.assertIn('f', params)
        self.assertIn('limit', params)
        # Tek bir parametre anahtarı ile
        f_param = mixin._get_oas_parameters('f')
        self.assertIsInstance(f_param, dict)
        self.assertEqual(f_param['name'], 'f')

    def test_get_oas_responses_schema(self):
        mixin = self.env['ogcapi.api']
        responses = mixin._get_oas_responses_schema()
        self.assertIn('NotFound', responses)
        self.assertIn('InternalServerError', responses)
        self.assertIn('Success', responses)

    def test_get_base_openapi_data(self):
        mixin = self.env['ogcapi.api']
        data = mixin._get_base_openapi_data()
        self.assertIn('openapi', data)
        self.assertIn('info', data)
        self.assertIn('servers', data)
        self.assertIn('components', data)
        self.assertIn('paths', data)
        self.assertIn('tags', data)

    def test_get_base_feature_schema(self):
        mixin = self.env['ogcapi.api']
        schema = mixin._get_base_feature_schema()
        self.assertIn('type', schema)
        self.assertIn('properties', schema)
        self.assertIn('geometry', schema['properties'])

    def test_get_base_feature_collection_schema(self):
        mixin = self.env['ogcapi.api']
        schema = mixin._get_base_feature_collection_schema()
        self.assertIn('type', schema)
        self.assertIn('properties', schema)
        self.assertIn('features', schema['properties'])

    def test_get_response_errors_schema(self):
        mixin = self.env['ogcapi.api']
        errors = mixin._get_response_errors_schema()
        self.assertIn('404', errors)
        self.assertIn('500', errors)
