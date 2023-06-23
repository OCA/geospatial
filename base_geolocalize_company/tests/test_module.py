# Copyright (C) 2014-Today GRAP (http://www.grap.coop)
# @author: Sylvain LE GAL (https://twitter.com/legalsylvain)
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl.html).

import odoo.tests
from odoo.tests.common import TransactionCase


@odoo.tests.tagged("external", "-standard")
class Tests(TransactionCase):
    def setUp(self):
        super().setUp()
        self.main_company = self.env.ref("base.main_company")

    def test_geolocalize(self):
        self.main_company.write(
            {
                "partner_latitude": 0.0,
                "partner_longitude": 0.0,
                "street": "3 grande rue des Feuillants",
                "city": "Lyon",
                "country_id": self.env.ref("base.fr").id,
            }
        )
        self.main_company.geo_localize()
        self.assertTrue(self.main_company.partner_latitude)
        self.assertTrue(self.main_company.partner_longitude)
