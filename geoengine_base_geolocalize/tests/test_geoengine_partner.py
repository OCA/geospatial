# -*- coding: utf-8 -*-
# Copyright 2015-2017 ACSONE SA/NV (<http://acsone.eu>)
# License AGPL-3.0 or later (https://www.gnu.org/licenses/agpl.html).
import odoo.tests.common as common


class TestGeoenginePartner(common.TransactionCase):

    def test_get_geo_point(self):
        partner_id = self.env.ref('base.user_root').partner_id
        partner_id.partner_longitude = False
        partner_id.partner_latitude = False
        self.assertFalse(
            partner_id.geo_point, 'Should not have geo_point with no latlon')
        partner_id.partner_latitude = 20
        self.assertFalse(
            partner_id.geo_point, 'Should not have geo_point with no latlon')
        partner_id.partner_longitude = 20
        self.assertTrue(
            partner_id.geo_point, 'Should have geo_point')

    def test_geo_localize(self):
        vals = {
            'name': 'Partner Project',
            'street': 'Rue au bois la dame',
            'country_id': self.env.ref('base.be').id,
            'zip': '6800',
        }
        partner_id = self.env['res.partner'].create(vals)
        partner_id.name = 'Other Partner'
        partner_id.geo_localize()
        self.assertAlmostEqual(
            partner_id.partner_latitude, 49.95353, 5,
            'Latitude Should be equals')
        self.assertAlmostEqual(
            partner_id.partner_longitude, 5.40539, 5,
            'Longitude Should be equals')
        domain = [('id', '=', partner_id.id)]
        partner_id.unlink()
        self.assertFalse(
            self.env['res.partner'].search(domain),
            'Should not have this partner anymore')
