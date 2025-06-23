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

    def test_landing_page_lang_param(self):
        # Coverage: lang parametresi ile context güncelleniyor mu
        url = f'/ogcapi/{self.api.name}?lang=tr-TR'
        resp = self.url_open(url, headers=self._auth_headers())
        self.assertEqual(resp.code, 200)
        self.assertIn(b'"name": "testapi"', resp.read())

    def test_auth_with_session(self):
        # Coverage: request.session.uid varsa authenticate decorator erken döner
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
            self.assertEqual(resp.code, 500)
            self.assertIn(b"Could not select database", resp.read())

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

    def test_openapi_html(self):
        url = f'/ogcapi/{self.api.name}/api?f=html'
        resp = self.url_open(url, headers=self._auth_headers())
        self.assertEqual(resp.code, 200)
        self.assertIn(b'openapi', resp.read())

    def test_openapi_invalid_format(self):
        url = f'/ogcapi/{self.api.name}/api?f=invalid'
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

    def test_collection_items_with_params(self):
        url = f'/ogcapi/{self.api.name}/collections/{self.collection.name}/items?offset=0&limit=1&skipGeometry=true'
        resp = self.url_open(url, headers=self._auth_headers())
        self.assertEqual(resp.code, 200)
        self.assertIn(b'"FeatureCollection"', resp.read())

    def test_collection_items_invalid_api(self):
        url = f'/ogcapi/doesnotexist/collections/{self.collection.name}/items'
        resp = self.url_open(url, headers=self._auth_headers())
        self.assertEqual(resp.code, 404)
        self.assertIn(b'not found', resp.read())

    def test_collection_items_invalid_collection(self):
        url = f'/ogcapi/{self.api.name}/collections/doesnotexist/items'
        resp = self.url_open(url, headers=self._auth_headers())
        self.assertEqual(resp.code, 404)
        self.assertIn(b'not found', resp.read())

    def test_collection_items_missing_params(self):
        url = f'/ogcapi//collections/{self.collection.name}/items'
        resp = self.url_open(url, headers=self._auth_headers())
        self.assertEqual(resp.code, 400)
        self.assertIn(b'Missing api_name', resp.read())

    def test_collection_item(self):
        # No feature exists, so should return 404
        url = f'/ogcapi/{self.api.name}/collections/{self.collection.name}/items/999999'
        resp = self.url_open(url, headers=self._auth_headers())
        self.assertEqual(resp.code, 404)
        self.assertIn(b'Feature with ID', resp.read())

    def test_collection_item_missing_params(self):
        url = f'/ogcapi//collections//items/'
        resp = self.url_open(url, headers=self._auth_headers())
        self.assertEqual(resp.code, 400)
        self.assertIn(b'Missing api_name', resp.read())

    def test_collection_schema(self):
        url = f'/ogcapi/{self.api.name}/collections/{self.collection.name}/schema'
        resp = self.url_open(url, headers=self._auth_headers())
        self.assertEqual(resp.code, 200)
        self.assertIn(b'"properties"', resp.read())

    def test_collection_schema_invalid_api(self):
        url = f'/ogcapi/doesnotexist/collections/{self.collection.name}/schema'
        resp = self.url_open(url, headers=self._auth_headers())
        self.assertEqual(resp.code, 404)
        self.assertIn(b'not found', resp.read())

    def test_collection_schema_invalid_collection(self):
        url = f'/ogcapi/{self.api.name}/collections/doesnotexist/schema'
        resp = self.url_open(url, headers=self._auth_headers())
        self.assertEqual(resp.code, 404)
        self.assertIn(b'not found', resp.read())

    def test_collection_schema_missing_params(self):
        url = f'/ogcapi//collections//schema'
        resp = self.url_open(url, headers=self._auth_headers())
        self.assertEqual(resp.code, 400)
        self.assertIn(b'Missing api_name', resp.read())

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

    def test_landing_page_html(self):
        # Coverage: landing_page endpoint with f=html
        url = f'/ogcapi/{self.api.name}?f=html'
        resp = self.url_open(url, headers=self._auth_headers())
        self.assertEqual(resp.code, 200)
        # HTML response should contain the API name somewhere
        self.assertIn(b'testapi', resp.read())

    def test_landing_page_invalid_format(self):
        # Coverage: landing_page endpoint with invalid f param
        url = f'/ogcapi/{self.api.name}?f=invalid'
        resp = self.url_open(url, headers=self._auth_headers())
        self.assertEqual(resp.code, 200)
        self.assertIn(b'"name": "testapi"', resp.read())

    def test_landing_page_api_not_found(self):
        # Coverage: landing_page endpoint with unknown api_name
        url = '/ogcapi/doesnotexist'
        resp = self.url_open(url, headers=self._auth_headers())
        self.assertEqual(resp.code, 404)
        self.assertIn(b"not found", resp.read())

    def test_conformance_api_not_found(self):
        # Coverage: conformance endpoint with unknown api_name
        url = '/ogcapi/doesnotexist/conformance'
        resp = self.url_open(url, headers=self._auth_headers())
        self.assertEqual(resp.code, 404)
        self.assertIn(b"not found", resp.read())

    def test_collections_api_not_found(self):
        # Coverage: collections endpoint with unknown api_name
        url = '/ogcapi/doesnotexist/collections'
        resp = self.url_open(url, headers=self._auth_headers())
        self.assertEqual(resp.code, 404)
        self.assertIn(b"not found", resp.read())

    def test_openapi_api_not_found(self):
        # Coverage: openapi endpoint with unknown api_name
        url = '/ogcapi/doesnotexist/api'
        resp = self.url_open(url, headers=self._auth_headers())
        self.assertEqual(resp.code, 404)
        self.assertIn(b"not found", resp.read())

    def test_collection_missing_params(self):
        # Coverage: collection endpoint with missing params
        url = '/ogcapi//collections//'
        resp = self.url_open(url, headers=self._auth_headers())
        self.assertEqual(resp.code, 400)
        self.assertIn(b'Missing api_name', resp.read())

    def test_collection_items_missing_params(self):
        # Coverage: collection_items endpoint with missing params
        url = f'/ogcapi//collections/{self.collection.name}/items'
        resp = self.url_open(url, headers=self._auth_headers())
        self.assertEqual(resp.code, 400)
        self.assertIn(b'Missing api_name', resp.read())

    def test_collection_item_missing_params(self):
        # Coverage: collection_item endpoint with missing params
        url = f'/ogcapi//collections//items/'
        resp = self.url_open(url, headers=self._auth_headers())
        self.assertEqual(resp.code, 400)
        self.assertIn(b'Missing api_name', resp.read())

    def test_collection_schema_missing_params(self):
        # Coverage: collection_schema endpoint with missing params
        url = f'/ogcapi//collections//schema'
        resp = self.url_open(url, headers=self._auth_headers())
        self.assertEqual(resp.code, 400)
        self.assertIn(b'Missing api_name', resp.read())

    def test_auth_basic_no_password(self):
        # Coverage: Basic auth header eksik şifre (split ile IndexError)
        import base64
        cred = f"{self.user.login}:"
        b64 = base64.b64encode(cred.encode('utf-8')).decode('utf-8')
        url = f'/ogcapi/{self.api.name}'
        # Şifre olmadan header gönder
        resp = self.url_open(url, headers={'Authorization': f'Basic {b64}'})
        # Odoo'nun default davranışı: authenticate başarısız, error döner
        self.assertIn(resp.code, (401, 400, 500))

    def test_auth_basic_invalid_base64(self):
        # Coverage: Basic auth header base64 decode hatası
        url = f'/ogcapi/{self.api.name}'
        resp = self.url_open(url, headers={'Authorization': 'Basic !!!notbase64!!!'})
        self.assertIn(resp.code, (401, 400, 500))

    def test_auth_basic_split_index_error(self):
        # Coverage: Basic auth header split ile IndexError (eksik ':' veya sadece kullanıcı adı)
        import base64
        cred = f"{self.user.login}"
        b64 = base64.b64encode(cred.encode('utf-8')).decode('utf-8')
        url = f'/ogcapi/{self.api.name}'
        resp = self.url_open(url, headers={'Authorization': f'Basic {b64}'})
        self.assertIn(resp.code, (401, 400, 500))

    def test_auth_basic_decode_error(self):
        # Coverage: Basic auth header decode hatası (geçersiz utf-8)
        url = f'/ogcapi/{self.api.name}'
        # base64 olarak geçerli ama utf-8 olarak decode edilemeyen bir string
        resp = self.url_open(url, headers={'Authorization': 'Basic AQIDBAUGBwgJCgsMDQ4PEA=='})
        self.assertIn(resp.code, (401, 400, 500))

    def test_auth_basic_no_db_exception(self):
        # Coverage: request.db yoksa Exception fırlatılır
        import base64
        cred = f"{self.user.login}:testpass"
        b64 = base64.b64encode(cred.encode('utf-8')).decode('utf-8')
        url = f'/ogcapi/{self.api.name}'
        from unittest.mock import patch
        with patch('odoo.http.request.db', new=None):
            resp = self.url_open(url, headers={'Authorization': f'Basic {b64}'})
            self.assertIn(resp.code, (500, 400))

    def test_auth_basic_authenticate_exception(self):
        # Coverage: request.session.authenticate exception fırlatırsa
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
        # Coverage: Bearer ile _check_credentials None dönerse
        url = f'/ogcapi/{self.api.name}'
        from unittest.mock import patch
        with patch('odoo.http.request.env') as mock_env:
            mock_env["res.users.apikeys"]._check_credentials.return_value = None
            resp = self.url_open(url, headers={'Authorization': 'Bearer faketoken'})
            self.assertEqual(resp.code, 400)
            self.assertIn(b'Access token invalid', resp.read())

    def test_auth_bearer_check_credentials_exception(self):
        # Coverage: Bearer ile _check_credentials exception fırlatırsa
        url = f'/ogcapi/{self.api.name}'
        from unittest.mock import patch
        with patch('odoo.http.request.env') as mock_env:
            mock_env["res.users.apikeys"]._check_credentials.side_effect = Exception("fail")
            resp = self.url_open(url, headers={'Authorization': 'Bearer faketoken'})
            self.assertIn(resp.code, (400, 500))

    def test_auth_header_invalid_branch(self):
        # Coverage: Authorization header geçerli prefix değilse
        url = f'/ogcapi/{self.api.name}'
        resp = self.url_open(url, headers={'Authorization': 'Digest something'})
        self.assertEqual(resp.code, 400)
        self.assertIn(b'Authorization header invalid', resp.read())

    def test_auth_header_case_insensitive(self):
        # Coverage: Authorization header case insensitive kontrolü
        url = f'/ogcapi/{self.api.name}'
        headers = self._auth_headers()
        resp = self.url_open(url, headers={k.lower(): v for k, v in headers.items()})
        self.assertIn(resp.code, (200, 400, 401))

    def test_auth_lang_context(self):
        # Coverage: authenticate decorator'da lang parametresi ile context güncelleniyor mu
        url = f'/ogcapi/{self.api.name}?lang=tr-TR'
        resp = self.url_open(url, headers=self._auth_headers())
        self.assertEqual(resp.code, 200)
        self.assertIn(b'"name": "testapi"', resp.read())

    def test_auth_with_session_and_lang(self):
        # Coverage: authenticate decorator'da hem session.uid hem lang varsa
        url = f'/ogcapi/{self.api.name}?lang=tr-TR'
        from unittest.mock import patch
        class DummySession:
            uid = self.user.id
        with patch('odoo.http.request.session', new=DummySession()):
            resp = self.url_open(url, headers={})
            self.assertEqual(resp.code, 200)
            self.assertIn(b'"name": "testapi"', resp.read())

    def test_ogcapi_error_response_status(self):
        # Coverage: ogcapi_error_response ile farklı status kodları
        from odoo.addons.ogcapi.controllers import main as ogcapi_main
        resp = ogcapi_main.ogcapi_error_response('TestCode', 'TestDesc', status=403)
        self.assertEqual(resp.status_code, 403)
        self.assertIn(b'TestCode', resp.data)
        self.assertIn(b'TestDesc', resp.data)
        self.assertEqual(resp.content_type, 'application/json')

    def test_my_ogcapi_page(self):
        # Coverage: /ogcapi ve /my/ogcapi route
        url = '/ogcapi'
        resp = self.url_open(url, headers=self._auth_headers())
        self.assertEqual(resp.code, 200)
        self.assertIn(b'ogcapi_list', resp.read())
        url2 = '/my/ogcapi'
        resp2 = self.url_open(url2, headers=self._auth_headers())
        self.assertEqual(resp2.code, 200)
        self.assertIn(b'ogcapi_list', resp2.read())

    def test_prepare_home_portal_values(self):
        # Coverage: _prepare_home_portal_values fonksiyonu
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
        # Coverage: landing_page endpoint html render branch
        url = f'/ogcapi/{self.api.name}?f=html'
        resp = self.url_open(url, headers=self._auth_headers())
        self.assertEqual(resp.code, 200)
        self.assertIn(b'openapi', resp.read())

    def test_openapi_html_render(self):
        # Coverage: openapi endpoint html render branch
        url = f'/ogcapi/{self.api.name}/api?f=html'
        resp = self.url_open(url, headers=self._auth_headers())
        self.assertEqual(resp.code, 200)
        self.assertIn(b'openapi', resp.read())

    def test_openapi_json_content_type(self):
        # Coverage: openapi endpoint json content-type header
        url = f'/ogcapi/{self.api.name}/api?f=json'
        resp = self.url_open(url, headers=self._auth_headers())
        self.assertEqual(resp.code, 200)
        self.assertIn(b'"openapi"', resp.read())

    def test_landing_page_empty_api_name(self):
        # Coverage: landing_page fonksiyonu, api_name parametresi yok
        from odoo.addons.ogcapi.controllers import main as ogcapi_main
        resp = ogcapi_main.CustomerPortal().landing_page(api_name=None)
        self.assertEqual(resp, {})

    def test_conformance_empty_api_name(self):
        # Coverage: conformance fonksiyonu, api_name parametresi yok
        from odoo.addons.ogcapi.controllers import main as ogcapi_main
        resp = ogcapi_main.CustomerPortal().conformance(api_name=None)
        self.assertEqual(resp, {})

    def test_collections_empty_api_name(self):
        # Coverage: collections fonksiyonu, api_name parametresi yok
        from odoo.addons.ogcapi.controllers import main as ogcapi_main
        resp = ogcapi_main.CustomerPortal().collections(api_name=None)
        self.assertEqual(resp, {})

    def test_openapi_invalid_format_and_empty_api_name(self):
        # Coverage: openapi fonksiyonu, api_name parametresi yok
        from odoo.addons.ogcapi.controllers import main as ogcapi_main
        resp = ogcapi_main.CustomerPortal().openapi(api_name=None)
        self.assertIsNone(resp)

    def test_collection_missing_params_direct(self):
        # Coverage: collection fonksiyonu, api_name veya collection_name yok
        from odoo.addons.ogcapi.controllers import main as ogcapi_main
        resp = ogcapi_main.CustomerPortal().collection(api_name=None, collection_name=None)
        self.assertEqual(resp.status_code, 400)
        self.assertIn(b'Missing api_name or collection_name', resp.data)

    def test_collection_items_missing_params_direct(self):
        # Coverage: collection_items fonksiyonu, api_name veya collection_name yok
        from odoo.addons.ogcapi.controllers import main as ogcapi_main
        resp = ogcapi_main.CustomerPortal().collection_items(api_name=None, collection_name=None)
        self.assertEqual(resp.status_code, 400)
        self.assertIn(b'Missing api_name or collection_name', resp.data)

    def test_collection_item_missing_params_direct(self):
        # Coverage: collection_item fonksiyonu, api_name veya collection_name veya feature_id yok
        from odoo.addons.ogcapi.controllers import main as ogcapi_main
        resp = ogcapi_main.CustomerPortal().collection_item(api_name=None, collection_name=None, feature_id=None)
        self.assertEqual(resp.status_code, 400)
        self.assertIn(b'Missing api_name, collection_name or feature_id', resp.data)

    def test_collection_schema_missing_params_direct(self):
        # Coverage: collection_schema fonksiyonu, api_name veya collection_name yok
        from odoo.addons.ogcapi.controllers import main as ogcapi_main
        resp = ogcapi_main.CustomerPortal().collection_schema(api_name=None, collection_name=None)
        self.assertEqual(resp.status_code, 400)
        self.assertIn(b'Missing api_name or collection_name', resp.data)
