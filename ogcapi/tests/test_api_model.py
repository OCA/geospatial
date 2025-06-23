from odoo.tests.common import TransactionCase

class TestOgcapiApiModel(TransactionCase):

    def setUp(self):
        super().setUp()
        self.partner = self.env['res.partner'].create({
            'name': 'Test Contact',
            'email': 'test@example.com',
            'website': 'https://test.com',
            'phone': '+900000000'
        })
        self.keyword1 = self.env['ogcapi.keyword'].create({'name': 'kw1'})
        self.keyword2 = self.env['ogcapi.keyword'].create({'name': 'kw2'})
        self.api = self.env['ogcapi.api'].create({
            'name': 'testapi',
            'title': 'Test API',
            'description': 'Test API Description',
            'contact_id': self.partner.id,
            'keywords': [(6, 0, [self.keyword1.id, self.keyword2.id])]
        })
        self.model = self.env['ir.model'].search([('model', '=', 'res.partner')], limit=1)
        self.collection = self.env['ogcapi.collection'].create({
            'name': 'testcoll',
            'title': 'Test Collection',
            'description': 'Test Collection Desc',
            'api_id': self.api.id,
            'model_id': self.model.id,
            'extent': '[1,2,3,4]',
            'keywords': [(6, 0, [self.keyword1.id])]
        })

    def test_fields(self):
        self.assertEqual(self.api.name, 'testapi')
        self.assertEqual(self.api.title, 'Test API')
        self.assertEqual(self.api.description, 'Test API Description')
        self.assertEqual(self.api.contact_id, self.partner)
        self.assertIn(self.keyword1, self.api.keywords)
        self.assertIn(self.keyword2, self.api.keywords)

    def test_action_api_collections(self):
        action = self.api.action_api_collections()
        self.assertEqual(action['res_model'], 'ogcapi.collection')
        self.assertIn('tree', action['view_mode'])
        self.assertEqual(action['domain'], [('api_id', '=', self.api.id)])

    def test__get_contact_info(self):
        info = self.api._get_contact_info()
        self.assertEqual(info['name'], 'Test Contact')
        self.assertEqual(info['email'], 'test@example.com')
        self.assertEqual(info['url'], 'https://test.com')
        self.assertEqual(info['phone'], '+900000000')

    def test__get_license_info(self):
        lic = self.api._get_license_info()
        self.assertIn('name', lic)
        self.assertIn('url', lic)

    def test__get_server_info(self):
        server = self.api._get_server_info()
        self.assertIn('/ogcapi/testapi', server['url'])
        self.assertEqual(server['description'], self.api.title)

    def test_get_landing_page(self):
        landing = self.api.get_landing_page()
        self.assertEqual(landing['name'], self.api.name)
        self.assertEqual(landing['title'], self.api.title)
        self.assertIn('links', landing)
        self.assertTrue(any(l['rel'] == 'self' for l in landing['links']))

    def test_get_conformance(self):
        conf = self.api.get_conformance()
        self.assertIn('conformsTo', conf)
        self.assertIn('links', conf)
        self.assertIn('timestamp', conf)

    def test_get_open_api(self):
        openapi = self.api.get_open_api()
        self.assertIn('info', openapi)
        self.assertIn('paths', openapi)
        self.assertIn('components', openapi)
        self.assertIn('schemas', openapi['components'])
        self.assertIn('parameters', openapi['components'])
        self.assertIn('responses', openapi['components'])
        self.assertIn('servers', openapi)
        self.assertIn('tags', openapi)

    def test_get_collections(self):
        result = self.api.get_collections()
        self.assertIn('collections', result)
        self.assertEqual(len(result['collections']), 1)
        coll = result['collections'][0]
        self.assertEqual(coll['id'], self.collection.name)
        self.assertIn('links', coll)
        self.assertIn('extent', coll)
        self.assertIn('keywords', coll)
        self.assertIn('links', result)
        self.assertTrue(any(l['rel'] == 'self' for l in result['links']))

    def test_get_collections_empty(self):
        self.collection.unlink()
        result = self.api.get_collections()
        self.assertEqual(result['collections'], [])
        self.assertIn('links', result)

    def test_get_collections_invalid_extent(self):
        # Coverage: extent alanı bozuk JSON ise except branch'ı çalışır
        self.collection.extent = 'notjson'
        result = self.api.get_collections()
        self.assertIn('collections', result)
        self.assertEqual(result['collections'][0]['id'], self.collection.name)
        # extent alanı eklenmemeli (parse edilemediği için)
        self.assertNotIn('extent', result['collections'][0])

    def test_get_collections_with_keywords(self):
        # Coverage: keywords alanı boşsa eklenmemeli, doluysa eklenmeli
        self.collection.keywords = [(5, 0, 0)]
        result = self.api.get_collections()
        self.assertIn('collections', result)
        self.assertNotIn('keywords', result['collections'][0])
        self.collection.keywords = [(6, 0, [self.keyword1.id])]
        result = self.api.get_collections()
        self.assertIn('keywords', result['collections'][0])

    def test_get_collections_with_extent(self):
        # Coverage: extent alanı doğru formatta ise eklenmeli
        self.collection.extent = '[10,20,30,40]'
        result = self.api.get_collections()
        self.assertIn('extent', result['collections'][0])
        self.assertIn('spatial', result['collections'][0]['extent'])

    def test_get_collections_with_invalid_bbox(self):
        # Coverage: bbox parse edilemiyorsa except branch'ı çalışır
        self.collection.extent = 'invalid'
        result = self.api.get_collections()
        self.assertIn('collections', result)
        self.assertNotIn('extent', result['collections'][0])

    def test_get_collections_keywords_and_extent_none(self):
        # Coverage: hem keywords hem extent yoksa
        self.collection.keywords = [(5, 0, 0)]
        self.collection.extent = None
        result = self.api.get_collections()
        self.assertIn('collections', result)
        self.assertNotIn('keywords', result['collections'][0])
        self.assertNotIn('extent', result['collections'][0])

    def test_get_collections_keywords_and_extent_empty(self):
        # Coverage: hem keywords hem extent boş string
        self.collection.keywords = [(5, 0, 0)]
        self.collection.extent = ''
        result = self.api.get_collections()
        self.assertIn('collections', result)
        self.assertNotIn('keywords', result['collections'][0])
        self.assertNotIn('extent', result['collections'][0])

    def test_get_collections_keywords_and_extent_invalid(self):
        # Coverage: hem keywords hem extent bozuk json
        self.collection.keywords = [(5, 0, 0)]
        self.collection.extent = 'invalid'
        result = self.api.get_collections()
        self.assertIn('collections', result)
        self.assertNotIn('keywords', result['collections'][0])
        self.assertNotIn('extent', result['collections'][0])
