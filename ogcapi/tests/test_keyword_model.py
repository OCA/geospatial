from odoo.tests.common import TransactionCase
from odoo.exceptions import ValidationError

class TestOgcapiKeywordModel(TransactionCase):

    def test_create_and_fields(self):
        kw = self.env['ogcapi.keyword'].create({'name': 'test-keyword'})
        self.assertEqual(kw.name, 'test-keyword')

    def test_required_name(self):
        with self.assertRaises(ValidationError):
            self.env['ogcapi.keyword'].create({'name': False})

    def test_create_multiple_keywords(self):
        # Coverage: birden fazla anahtar kelime oluşturulabiliyor mu
        kw1 = self.env['ogcapi.keyword'].create({'name': 'kw1'})
        kw2 = self.env['ogcapi.keyword'].create({'name': 'kw2'})
        self.assertNotEqual(kw1.id, kw2.id)
        self.assertEqual(kw1.name, 'kw1')
        self.assertEqual(kw2.name, 'kw2')

    def test_keyword_str(self):
        # Coverage: __str__ veya display_name davranışı
        kw = self.env['ogcapi.keyword'].create({'name': 'display-keyword'})
        self.assertIn('display-keyword', kw.display_name)

    def test_create_empty_and_whitespace_name(self):
        # Coverage: boş string ve sadece whitespace ile oluşturulamaz
        with self.assertRaises(ValidationError):
            self.env['ogcapi.keyword'].create({'name': ''})
        with self.assertRaises(ValidationError):
            self.env['ogcapi.keyword'].create({'name': '   '})

    def test_keyword_display_name(self):
        # Coverage: display_name property her zaman string döner
        kw = self.env['ogcapi.keyword'].create({'name': 'foo'})
        self.assertTrue(isinstance(kw.display_name, str))
        self.assertIn('foo', kw.display_name)

    def test_keyword_name_strip(self):
        # Coverage: name alanı başında/sonunda boşluk varsa strip edilip kaydedilmeli
        kw = self.env['ogcapi.keyword'].create({'name': '  strip-me  '})
        self.assertEqual(kw.name.strip(), kw.name)
        self.assertEqual(kw.name, 'strip-me')

    def test_keyword_name_case_sensitive(self):
        # Coverage: name alanı büyük/küçük harf duyarlı mı
        kw1 = self.env['ogcapi.keyword'].create({'name': 'CaseTest'})
        kw2 = self.env['ogcapi.keyword'].create({'name': 'casetest'})
        self.assertNotEqual(kw1.name, kw2.name)
        self.assertNotEqual(kw1.id, kw2.id)

    def test_keyword_name_required_constraint(self):
        # Coverage: name alanı None, boş string ve sadece whitespace için ValidationError
        for val in [None, '', '   ']:
            with self.assertRaises(ValidationError):
                self.env['ogcapi.keyword'].create({'name': val})

    def test_keyword_name_strip_and_uniqueness(self):
        # Coverage: name alanı başında/sonunda boşluk varsa strip edilmeli ve benzersiz olmalı
        kw1 = self.env['ogcapi.keyword'].create({'name': '  unique-key  '})
        self.assertEqual(kw1.name, 'unique-key')
        with self.assertRaises(ValidationError):
            self.env['ogcapi.keyword'].create({'name': 'unique-key'})

    def test_keyword_display_name_and_repr(self):
        # Coverage: display_name ve __repr__ fonksiyonları
        kw = self.env['ogcapi.keyword'].create({'name': 'repr-keyword'})
        self.assertTrue(isinstance(kw.display_name, str))
        self.assertIn('repr-keyword', kw.display_name)
        self.assertIn('repr-keyword', repr(kw))
