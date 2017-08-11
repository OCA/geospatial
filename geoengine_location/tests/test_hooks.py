# -*- coding: utf-8 -*-
# Copryight 2017 Laslabs Inc.
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl.html).

from odoo.tests.common import TransactionCase


class TestHooks(TransactionCase):

    def setUp(self):
        super(TestHooks, self).setUp()
        self.zip_1 = self.env.ref(
            'geoengine_location.demo_res_better_zip_1'
        )

    def test_update_records_with_geopoint(self):
        """ It should populate geo_point field """
        self.assertTrue(
            self.zip_1.geo_point,
        )
