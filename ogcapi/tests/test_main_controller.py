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

    def _call_authenticate_decorator(self, **kw):
        # Directly call the authenticate decorator for full branch coverage
        from odoo.addons.ogcapi.controllers import main as ogcapi_main
        from unittest.mock import patch, MagicMock
        # Patch request object with all possible attributes
        class DummyRequest:
            def __init__(self, session_uid=None, lang=None, db='test', headers=None):
                self.session = MagicMock()
                self.session.uid = session_uid
                self.db = db
                self.env = MagicMock()
                self.httprequest = MagicMock()
                self.httprequest.headers = headers or {}
                self._context_updated = None
            def update_context(self, **ctx):
                self._context_updated = ctx
        # 1. session.uid branch
        req = DummyRequest(session_uid=1)
        with patch('odoo.http.request', req):
            result = ogcapi_main.authenticate(lambda **k: 'ok')()
            assert result == 'ok'
        # 2. lang branch
        req = DummyRequest(session_uid=None)
        with patch('odoo.http.request', req):
            ogcapi_main.authenticate(lambda **k: 'ok')(lang='tr-TR')
            assert req._context_updated and req._context_updated['lang'] == 'tr-TR'
        # 3. Authorization header missing
        req = DummyRequest(session_uid=None, headers={})
        with patch('odoo.http.request', req):
            resp = ogcapi_main.authenticate(lambda **k: 'ok')()
            assert hasattr(resp, 'status_code') and resp.status_code == 400
        # 4. Authorization header invalid
        req = DummyRequest(session_uid=None, headers={'Authorization': 'Invalid xyz'})
        with patch('odoo.http.request', req):
            resp = ogcapi_main.authenticate(lambda **k: 'ok')()
            assert hasattr(resp, 'status_code') and resp.status_code == 400
        # 5. Basic auth, no db
        req = DummyRequest(session_uid=None, db=None, headers={'Authorization': 'Basic dGVzdDp0ZXN0'})
        with patch('odoo.http.request', req):
            resp = ogcapi_main.authenticate(lambda **k: 'ok')()
            assert hasattr(resp, 'status_code') and resp.status_code == 500
        # 6. Basic auth, decode error
        req = DummyRequest(session_uid=None, headers={'Authorization': 'Basic !!!notbase64!!!'})
        with patch('odoo.http.request', req):
            resp = ogcapi_main.authenticate(lambda **k: 'ok')()
            assert hasattr(resp, 'status_code')
        # 7. Basic auth, split error
        import base64
        cred = "testuser"
        b64 = base64.b64encode(cred.encode('utf-8')).decode('utf-8')
        req = DummyRequest(session_uid=None, headers={'Authorization': f'Basic {b64}'})
        with patch('odoo.http.request', req):
            resp = ogcapi_main.authenticate(lambda **k: 'ok')()
            assert hasattr(resp, 'status_code')
        # 8. Bearer auth, _check_credentials returns None
        req = DummyRequest(session_uid=None, headers={'Authorization': 'Bearer faketoken'})
        with patch('odoo.http.request', req), patch.object(req.env['res.users.apikeys'], '_check_credentials', return_value=None):
            resp = ogcapi_main.authenticate(lambda **k: 'ok')()
            assert hasattr(resp, 'status_code') and resp.status_code == 400
        # 9. Bearer auth, _check_credentials raises Exception
        req = DummyRequest(session_uid=None, headers={'Authorization': 'Bearer faketoken'})
        with patch('odoo.http.request', req), patch.object(req.env['res.users.apikeys'], '_check_credentials', side_effect=Exception("fail")):
            resp = ogcapi_main.authenticate(lambda **k: 'ok')()
            assert hasattr(resp, 'status_code')
        # 10. Authorization header with unknown prefix
        req = DummyRequest(session_uid=None, headers={'Authorization': 'Digest something'})
        with patch('odoo.http.request', req):
            resp = ogcapi_main.authenticate(lambda **k: 'ok')()
            assert hasattr(resp, 'status_code') and resp.status_code == 400

    def test_authenticate_decorator_all_branches(self):
        # This covers all branches of the authenticate decorator
        self._call_authenticate_decorator()

    def test_all_controller_endpoints(self):
        # Covers all controller endpoints and error branches
        urls = [
            (f'/ogcapi/{self.api.name}', 200),
            (f'/ogcapi/{self.api.name}?lang=tr-TR', 200),
            (f'/ogcapi/{self.api.name}/conformance', 200),
            (f'/ogcapi/{self.api.name}/collections', 200),
            (f'/ogcapi/{self.api.name}/api', 200),
            (f'/ogcapi/{self.api.name}/api?f=html', 200),
            (f'/ogcapi/{self.api.name}/api?f=invalid', 200),
            (f'/ogcapi/{self.api.name}/collections/{self.collection.name}', 200),
            (f'/ogcapi/{self.api.name}/collections/{self.collection.name}/items', 200),
            (f'/ogcapi/{self.api.name}/collections/{self.collection.name}/items?offset=0&limit=1&skipGeometry=true', 200),
            (f'/ogcapi/{self.api.name}/collections/{self.collection.name}/schema', 200),
            (f'/ogcapi/doesnotexist', 404),
            (f'/ogcapi/doesnotexist/conformance', 404),
            (f'/ogcapi/doesnotexist/collections', 404),
            (f'/ogcapi/doesnotexist/api', 404),
            (f'/ogcapi/{self.api.name}/collections/doesnotexist', 404),
            (f'/ogcapi/{self.api.name}/collections/doesnotexist/items', 404),
            (f'/ogcapi/{self.api.name}/collections/doesnotexist/schema', 404),
            (f'/ogcapi//collections/{self.collection.name}/items', 400),
            (f'/ogcapi//collections//items/', 400),
            (f'/ogcapi//collections//schema', 400),
            (f'/ogcapi//collections//', 400),
        ]
        for url, expected_code in urls:
            resp = self.url_open(url, headers=self._auth_headers())
            self.assertEqual(resp.code, expected_code)

    def test_error_response(self):
        from odoo.addons.ogcapi.controllers import main as ogcapi_main
        resp = ogcapi_main.ogcapi_error_response('TestCode', 'TestDesc', status=418)
        self.assertEqual(resp.status_code, 418)
        self.assertIn(b'TestCode', resp.data)
        self.assertIn(b'TestDesc', resp.data)
        self.assertEqual(resp.content_type, 'application/json')

    def test_portal_routes(self):
        # /ogcapi and /my/ogcapi
        resp = self.url_open('/ogcapi', headers=self._auth_headers())
        self.assertEqual(resp.code, 200)
        self.assertIn(b'ogcapi_list', resp.read())
        resp2 = self.url_open('/my/ogcapi', headers=self._auth_headers())
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
