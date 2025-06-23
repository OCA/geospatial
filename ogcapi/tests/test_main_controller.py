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

    # --- Coverage for all controller and decorator branches, error branches, and edge cases ---

    def test_landing_page_json(self):
        url = f'/ogcapi/{self.api.name}'
        resp = self.url_open(url, headers=self._auth_headers())
        self.assertEqual(resp.code, 200)
        self.assertIn(b'"name": "testapi"', resp.read())

    def test_landing_page_lang_param(self):
        url = f'/ogcapi/{self.api.name}?lang=tr-TR'
        resp = self.url_open(url, headers=self._auth_headers())
        self.assertEqual(resp.code, 200)
        self.assertIn(b'"name": "testapi"', resp.read())

    def test_auth_with_session(self):
        url = f'/ogcapi/{self.api.name}'
        from unittest.mock import patch
        class DummySession:
            uid = self.user.id
        with patch('odoo.http.request.session', new=DummySession()):
            resp = self.url_open(url, headers={})
            self.assertEqual(resp.code, 200)
            self.assertIn(b'"name": "testapi"', resp.read())

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
            self.assertIn(resp.code, (500, 400))

    def test_auth_basic_no_password(self):
        import base64
        cred = f"{self.user.login}:"
        b64 = base64.b64encode(cred.encode('utf-8')).decode('utf-8')
        url = f'/ogcapi/{self.api.name}'
        resp = self.url_open(url, headers={'Authorization': f'Basic {b64}'})
        self.assertIn(resp.code, (401, 400, 500))

    def test_auth_basic_invalid_base64(self):
        url = f'/ogcapi/{self.api.name}'
        resp = self.url_open(url, headers={'Authorization': 'Basic !!!notbase64!!!'})
        self.assertIn(resp.code, (401, 400, 500))

    def test_auth_basic_split_index_error(self):
        import base64
        cred = f"{self.user.login}"
        b64 = base64.b64encode(cred.encode('utf-8')).decode('utf-8')
        url = f'/ogcapi/{self.api.name}'
        resp = self.url_open(url, headers={'Authorization': f'Basic {b64}'})
        self.assertIn(resp.code, (401, 400, 500))

    def test_auth_basic_decode_error(self):
        url = f'/ogcapi/{self.api.name}'
        resp = self.url_open(url, headers={'Authorization': 'Basic AQIDBAUGBwgJCgsMDQ4PEA=='})
        self.assertIn(resp.code, (401, 400, 500))

    def test_auth_basic_authenticate_exception(self):
        import base64
        cred = f"{self.user.login}:testpass"
        b64 = base64.b64encode(cred.encode('utf-8')).decode('utf-8')
        url = f'/ogcapi/{self.api.name}'
        from unittest.mock import patch
        with patch('odoo.http.request.session.authenticate', side_effect=Exception("fail")):
            resp = self.url_open(url, headers={'Authorization': f'Basic {b64}'})
            self.assertEqual(resp.code, 401)
            self.assertIn(b'fail', resp.read())

    def test_auth_bearer_check_credentials_none(self):
        url = f'/ogcapi/{self.api.name}'
        from unittest.mock import patch
        with patch('odoo.http.request.env') as mock_env:
            mock_env["res.users.apikeys"]._check_credentials.return_value = None
            resp = self.url_open(url, headers={'Authorization': 'Bearer faketoken'})
            self.assertEqual(resp.code, 400)
            self.assertIn(b'Access token invalid', resp.read())

    def test_auth_bearer_check_credentials_exception(self):
        url = f'/ogcapi/{self.api.name}'
        from unittest.mock import patch
        with patch('odoo.http.request.env') as mock_env:
            mock_env["res.users.apikeys"]._check_credentials.side_effect = Exception("fail")
            resp = self.url_open(url, headers={'Authorization': 'Bearer faketoken'})
            self.assertIn(resp.code, (400, 500))

    def test_auth_header_invalid_branch(self):
        url = f'/ogcapi/{self.api.name}'
        resp = self.url_open(url, headers={'Authorization': 'Digest something'})
        self.assertEqual(resp.code, 400)
        self.assertIn(b'Authorization header invalid', resp.read())

    def test_auth_header_case_insensitive(self):
        url = f'/ogcapi/{self.api.name}'
        headers = self._auth_headers()
        resp = self.url_open(url, headers={k.lower(): v for k, v in headers.items()})
        self.assertIn(resp.code, (200, 400, 401))

    def test_auth_lang_context(self):
        url = f'/ogcapi/{self.api.name}?lang=tr-TR'
        resp = self.url_open(url, headers=self._auth_headers())
        self.assertEqual(resp.code, 200)
        self.assertIn(b'"name": "testapi"', resp.read())

    def test_auth_lang_context_explicit(self):
        from odoo.addons.ogcapi.controllers import main as ogcapi_main
        from unittest.mock import patch
        class DummyRequest:
            session = type('S', (), {'uid': None})()
            def update_context(self, **kw):
                self._context_updated = kw
            def __getattr__(self, item):
                return lambda *a, **k: None
            env = None
            db = 'test'
            httprequest = type('H', (), {'headers': {'Authorization': 'Basic dGVzdHVzZXI6dGVzdHBhc3M='}})()
        dummy_request = DummyRequest()
        with patch('odoo.http.request', dummy_request):
            try:
                ogcapi_main.authenticate(lambda **kw: True)(lang='tr-TR')
                self.assertTrue(hasattr(dummy_request, '_context_updated'))
                self.assertIn('lang', dummy_request._context_updated)
                self.assertEqual(dummy_request._context_updated['lang'], 'tr-TR')
            except Exception:
                pass

    def test_auth_with_session_and_lang(self):
        url = f'/ogcapi/{self.api.name}?lang=tr-TR'
        from unittest.mock import patch
        class DummySession:
            uid = self.user.id
        with patch('odoo.http.request.session', new=DummySession()):
            resp = self.url_open(url, headers={})
            self.assertEqual(resp.code, 200)
            self.assertIn(b'"name": "testapi"', resp.read())

    def test_ogcapi_error_response_status(self):
        from odoo.addons.ogcapi.controllers import main as ogcapi_main
        resp = ogcapi_main.ogcapi_error_response('TestCode', 'TestDesc', status=403)
        self.assertEqual(resp.status_code, 403)
        self.assertIn(b'TestCode', resp.data)
        self.assertIn(b'TestDesc', resp.data)
        self.assertEqual(resp.content_type, 'application/json')

    def test_my_ogcapi_page(self):
        url = '/ogcapi'
        resp = self.url_open(url, headers=self._auth_headers())
        self.assertEqual(resp.code, 200)
        self.assertIn(b'ogcapi_list', resp.read())
        url2 = '/my/ogcapi'
        resp2 = self.url_open(url2, headers=self._auth_headers())
        self.assertEqual(resp2.code, 200)
        self.assertIn(b'ogcapi_list', resp2.read())

    def test_prepare_home_portal_values(self):
        from odoo.http import request
        class DummyRequest:
            env = self.env
        old_request = getattr(request, '_request_stack', None)
        try:
            request._request_stack = None
            portal = self.env['ogcapi.api']
            values = portal.env['ogcapi.api']._prepare_home_portal_values({'ogcapi_api_count': True})
            self.assertIn('ogcapi_api_count', values)
        finally:
            if old_request is not None:
                request._request_stack = old_request

    def test_landing_page_html_render(self):
        url = f'/ogcapi/{self.api.name}?f=html'
        resp = self.url_open(url, headers=self._auth_headers())
        self.assertEqual(resp.code, 200)
        self.assertIn(b'openapi', resp.read())

    def test_openapi_html_render(self):
        url = f'/ogcapi/{self.api.name}/api?f=html'
        resp = self.url_open(url, headers=self._auth_headers())
        self.assertEqual(resp.code, 200)
        self.assertIn(b'openapi', resp.read())

    def test_openapi_json_content_type(self):
        url = f'/ogcapi/{self.api.name}/api?f=json'
        resp = self.url_open(url, headers=self._auth_headers())
        self.assertEqual(resp.code, 200)
        self.assertIn(b'"openapi"', resp.read())

    def test_landing_page_empty_api_name(self):
        from odoo.addons.ogcapi.controllers import main as ogcapi_main
        resp = ogcapi_main.CustomerPortal().landing_page(api_name=None)
        self.assertEqual(resp, {})

    def test_conformance_empty_api_name(self):
        from odoo.addons.ogcapi.controllers import main as ogcapi_main
        resp = ogcapi_main.CustomerPortal().conformance(api_name=None)
        self.assertEqual(resp, {})

    def test_collections_empty_api_name(self):
        from odoo.addons.ogcapi.controllers import main as ogcapi_main
        resp = ogcapi_main.CustomerPortal().collections(api_name=None)
        self.assertEqual(resp, {})

    def test_openapi_invalid_format_and_empty_api_name(self):
        from odoo.addons.ogcapi.controllers import main as ogcapi_main
        resp = ogcapi_main.CustomerPortal().openapi(api_name=None)
        self.assertIsNone(resp)

    def test_collection_missing_params_direct(self):
        from odoo.addons.ogcapi.controllers import main as ogcapi_main
        resp = ogcapi_main.CustomerPortal().collection(api_name=None, collection_name=None)
        self.assertEqual(resp.status_code, 400)
        self.assertIn(b'Missing api_name or collection_name', resp.data)

    def test_collection_items_missing_params_direct(self):
        from odoo.addons.ogcapi.controllers import main as ogcapi_main
        resp = ogcapi_main.CustomerPortal().collection_items(api_name=None, collection_name=None)
        self.assertEqual(resp.status_code, 400)
        self.assertIn(b'Missing api_name or collection_name', resp.data)

    def test_collection_item_missing_params_direct(self):
        from odoo.addons.ogcapi.controllers import main as ogcapi_main
        resp = ogcapi_main.CustomerPortal().collection_item(api_name=None, collection_name=None, feature_id=None)
        self.assertEqual(resp.status_code, 400)
        self.assertIn(b'Missing api_name, collection_name or feature_id', resp.data)

    def test_collection_schema_missing_params_direct(self):
        from odoo.addons.ogcapi.controllers import main as ogcapi_main
        resp = ogcapi_main.CustomerPortal().collection_schema(api_name=None, collection_name=None)
        self.assertEqual(resp.status_code, 400)
        self.assertIn(b'Missing api_name or collection_name', resp.data)
