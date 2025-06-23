from odoo.tests.common import HttpCase, tagged
from odoo.http import Response

@tagged('post_install', '-at_install')
class TestOgcapiMainController(HttpCase):

    def setUp(self):
        super().setUp()
        self.user = self.env['res.users'].create({
            'name': 'Test User',
            'login': 'testuser',
            'password': 'testpass',
            'email': 'testuser@example.com'
        })
        self.partner = self.env['res.partner'].create({'name': 'Test Partner'})
        self.api = self.env['ogcapi.api'].create({
            'name': 'testapi',
            'title': 'Test API',
            'description': 'Test API Description',
            'contact_id': self.partner.id,
        })
        self.model = self.env['ir.model'].search([('model', '=', 'res.partner')], limit=1)
        self.collection = self.env['ogcapi.collection'].create({
            'name': 'testcoll',
            'title': 'Test Collection',
            'description': 'Test Collection Desc',
            'api_id': self.api.id,
            'model_id': self.model.id,
            'extent': '[1,2,3,4]',
        })

    def _auth_headers(self, password='testpass'):
        import base64
        cred = f"{self.user.login}:{password}"
        b64 = base64.b64encode(cred.encode('utf-8')).decode('utf-8')
        return {'Authorization': f'Basic {b64}'}

    def test_landing_page_json(self):
        url = f'/ogcapi/{self.api.name}'
        resp = self.url_open(url, headers=self._auth_headers())
        self.assertEqual(resp.code, 200)
        self.assertIn(b'"name": "testapi"', resp.read())

    def test_conformance(self):
        url = f'/ogcapi/{self.api.name}/conformance'
        resp = self.url_open(url, headers=self._auth_headers())
        self.assertEqual(resp.code, 200)
        self.assertIn(b'"conformsTo"', resp.read())

    def test_collections(self):
        url = f'/ogcapi/{self.api.name}/collections'
        resp = self.url_open(url, headers=self._auth_headers())
        self.assertEqual(resp.code, 200)
        self.assertIn(b'"collections"', resp.read())

    def test_openapi_json(self):
        url = f'/ogcapi/{self.api.name}/api'
        resp = self.url_open(url, headers=self._auth_headers())
        self.assertEqual(resp.code, 200)
        self.assertIn(b'"openapi"', resp.read())

    def test_collection(self):
        url = f'/ogcapi/{self.api.name}/collections/{self.collection.name}'
        resp = self.url_open(url, headers=self._auth_headers())
        self.assertEqual(resp.code, 200)
        self.assertIn(b'"id": "testcoll"', resp.read())

    def test_collection_items(self):
        url = f'/ogcapi/{self.api.name}/collections/{self.collection.name}/items'
        resp = self.url_open(url, headers=self._auth_headers())
        self.assertEqual(resp.code, 200)
        self.assertIn(b'"FeatureCollection"', resp.read())

    def test_collection_schema(self):
        url = f'/ogcapi/{self.api.name}/collections/{self.collection.name}/schema'
        resp = self.url_open(url, headers=self._auth_headers())
        self.assertEqual(resp.code, 200)
        self.assertIn(b'"properties"', resp.read())

    def test_collection_item_not_found(self):
        url = f'/ogcapi/{self.api.name}/collections/{self.collection.name}/items/999999'
        resp = self.url_open(url, headers=self._auth_headers())
        self.assertEqual(resp.code, 404)
        self.assertIn(b'Feature with ID', resp.read())

    def test_collection_not_found(self):
        url = f'/ogcapi/{self.api.name}/collections/doesnotexist'
        resp = self.url_open(url, headers=self._auth_headers())
        self.assertEqual(resp.code, 404)
        self.assertIn(b'not found', resp.read())

    def test_api_not_found(self):
        url = '/ogcapi/doesnotexist'
        resp = self.url_open(url, headers=self._auth_headers())
        self.assertEqual(resp.code, 404)
        self.assertIn(b"not found", resp.read())

    # --- Coverage for all authenticate decorator branches ---

    def test_auth_missing_header(self):
        url = f'/ogcapi/{self.api.name}'
        resp = self.url_open(url, headers={})
        self.assertEqual(resp.code, 400)
        self.assertIn(b'Authorization header missing', resp.read())

    def test_auth_invalid_header(self):
        url = f'/ogcapi/{self.api.name}'
        resp = self.url_open(url, headers={'Authorization': 'Invalid xyz'})
        self.assertEqual(resp.code, 400)
        self.assertIn(b'Authorization header invalid', resp.read())

    def test_auth_basic_wrong_password(self):
        url = f'/ogcapi/{self.api.name}'
        resp = self.url_open(url, headers=self._auth_headers(password='wrongpass'))
        self.assertEqual(resp.code, 401)
        self.assertIn(b'error', resp.read())

    def test_auth_bearer_invalid_token(self):
        url = f'/ogcapi/{self.api.name}'
        resp = self.url_open(url, headers={'Authorization': 'Bearer invalidtoken'})
        self.assertEqual(resp.code, 400)
        self.assertIn(b'Access token invalid', resp.read())

    def test_auth_basic_no_db(self):
        import base64
        cred = f"{self.user.login}:testpass"
        b64 = base64.b64encode(cred.encode('utf-8')).decode('utf-8')
        url = f'/ogcapi/{self.api.name}'
        from unittest.mock import patch
        with patch('odoo.http.request.db', new=None):
            resp = self.url_open(url, headers={'Authorization': f'Basic {b64}'})
            self.assertEqual(resp.code, 500)
            self.assertIn(b"Could not select database", resp.read())

    def test_collection_items_missing_params(self):
        # coverage: eksik api_name veya collection_name parametresi
        url = f'/ogcapi//collections/{self.collection.name}/items'
        resp = self.url_open(url, headers=self._auth_headers())
        self.assertEqual(resp.code, 400)
        self.assertIn(b'Missing api_name', resp.read())

    def test_collection_item_missing_params(self):
        # coverage: eksik api_name, collection_name veya feature_id parametresi
        url = f'/ogcapi//collections//items/'
        resp = self.url_open(url, headers=self._auth_headers())
        self.assertEqual(resp.code, 400)
        self.assertIn(b'Missing api_name', resp.read())

    def test_collection_schema_missing_params(self):
        url = f'/ogcapi//collections//schema'
        resp = self.url_open(url, headers=self._auth_headers())
        self.assertEqual(resp.code, 400)
        self.assertIn(b'Missing api_name', resp.read())
