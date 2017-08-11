# -*- coding: utf-8 -*-
# Copryight 2017 Laslabs Inc.
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl.html).

from odoo.tests.common import TransactionCase


class TestResBetterZip(TransactionCase):

    def setUp(self):
        super(TestResBetterZip, self).setUp()
        self.zip_1 = self.env.ref(
            'geoengine_location.demo_res_better_zip_1'
        )

    def test_compute_geo_point(self):
        """ It should auto compute geo_point field """
        self.assertEquals(
            self.zip_1.geo_point,
            'test',
        )

    # def test_inverse_geo_point(self):
    #     """ It should allow writes to geo_point field """
