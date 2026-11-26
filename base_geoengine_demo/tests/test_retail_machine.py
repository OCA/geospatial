# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

from odoo.exceptions import ValidationError
from odoo.tests.common import TransactionCase


class TestRetailMachine(TransactionCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.zip_a_id = cls.env["dummy.zip"].create(
            {
                "name": "9991",
                "city": "Square A",
                "the_geom": "MULTIPOLYGON (((0 0, 1000 0, 1000 1000, 0 1000, 0 0)))",
            }
        )
        cls.zip_b_id = cls.env["dummy.zip"].create(
            {
                "name": "9992",
                "city": "Square B",
                "the_geom": "MULTIPOLYGON (((2000 0, 3000 0, 3000 1000, 2000 1000, "
                "2000 0)))",
            }
        )
        cls.machine_model = cls.env["geoengine.demo.automatic.retailing.machine"]

    def test_compute_zip_from_point(self):
        machine_id = self.machine_model.create(
            {"name": "M-1", "the_point": "POINT (500 500)", "total_sales": 10.0}
        )
        self.assertEqual(machine_id.zip_id, self.zip_a_id)
        machine_id.the_point = "POINT (2500 500)"
        self.assertEqual(machine_id.zip_id, self.zip_b_id)

    def test_compute_zip_without_point(self):
        machine_id = self.machine_model.create(
            {"name": "M-7", "the_point": "POINT (500 500)"}
        )
        self.assertEqual(machine_id.zip_id, self.zip_a_id)
        machine_id.the_point = False
        self.assertFalse(machine_id.zip_id)

    def test_compute_zip_point_outside_zips(self):
        machine_id = self.machine_model.create(
            {"name": "M-8", "the_point": "POINT (5000 5000)"}
        )
        self.assertFalse(machine_id.zip_id)

    def test_zip_total_sales(self):
        self.machine_model.create(
            [
                {"name": "M-2", "the_point": "POINT (100 100)", "total_sales": 10.0},
                {"name": "M-3", "the_point": "POINT (900 900)", "total_sales": 5.5},
            ]
        )
        self.assertAlmostEqual(self.zip_a_id.total_sales, 15.5)
        self.assertAlmostEqual(self.zip_b_id.total_sales, 0.0)

    def test_point_outside_zip_raises(self):
        with self.assertRaises(ValidationError):
            self.machine_model.create(
                {
                    "name": "M-4",
                    "the_point": "POINT (500 500)",
                    "zip_id": self.zip_b_id.id,
                }
            )

    def test_constraint_multi_records(self):
        machine_ids = self.machine_model.create(
            [
                {"name": "M-5", "the_point": "POINT (500 500)"},
                {"name": "M-6", "the_point": "POINT (2500 500)"},
            ]
        )
        self.assertEqual(machine_ids.zip_id, self.zip_a_id | self.zip_b_id)
        with self.assertRaises(ValidationError):
            machine_ids.write({"zip_id": self.zip_a_id.id})

    def test_display_name(self):
        self.assertEqual(self.zip_a_id.display_name, "9991 Square A")
