# Copyright 2026 Cetmix OÜ
# License LGPL-3.0 or later (https://www.gnu.org/licenses/lgpl-3.0).

from odoo.exceptions import UserError
from odoo.tests import tagged

from odoo.addons.base.tests.common import BaseCommon


@tagged("post_install", "-at_install")
class TestResPartnerMapData(BaseCommon):
    """Compute and inverse for the partner form Mapbox payload."""

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.base_lat = 47.986667
        cls.base_lon = 10.181111
        cls.company = cls.env["res.partner"].create(
            {
                "name": "Mapbox Demo Company",
                "is_company": True,
                "partner_latitude": cls.base_lat,
                "partner_longitude": cls.base_lon,
            }
        )

    def _updated_payload(self, lat, lon, index=0):
        return {
            "elements": [],
            "updated": [{"index": index, "lat": lat, "lon": lon}],
        }

    def test_compute_star_pin_and_camera(self):
        """Usable coords yield a draggable star and camera on this partner."""
        payload = self.company.map_data
        self.assertTrue(payload)
        current = payload["elements"][0]
        self.assertAlmostEqual(current["lat"], self.base_lat, places=5)
        self.assertAlmostEqual(current["lon"], self.base_lon, places=5)
        self.assertTrue(current["editable"])
        self.assertFalse(current.get("clickable"))
        self.assertEqual(current["icon"], "star")
        self.assertEqual(current["size"], 32)
        self.assertEqual(current["color"], "#FFDD00")
        self.assertNotIn("rec_model", current)
        self.assertNotIn("rec_id", current)
        self.assertAlmostEqual(
            payload["default_center"]["lat"], self.base_lat, places=5
        )
        self.assertAlmostEqual(
            payload["default_center"]["lon"], self.base_lon, places=5
        )

    def test_xml_contact_create_resets_coordinates(self):
        """XML load of type=contact children zeros coords; a later write restores them.

        ``res.partner._load_records_create`` copies the parent address onto
        contacts with ``write()``. ``base_geolocalize`` then sets lat/lon to
        ``0.0`` because the address write omits those fields. Regular
        ``create()`` does not hit that path (it uses ``update_address`` /
        ``super().write``). Demo data re-writes coordinates afterwards.
        """
        germany = self.env.ref("base.de")
        company = self.env["res.partner"].create(
            {
                "name": "Mapbox Demo XML Company",
                "is_company": True,
                "street": "Marktplatz 1",
                "city": "Memmingen",
                "zip": "87700",
                "country_id": germany.id,
                "partner_latitude": self.base_lat,
                "partner_longitude": self.base_lon,
            }
        )
        child_lat = self.base_lat + 0.002
        child = self.env["res.partner"]._load_records_create(
            [
                {
                    "name": "Mapbox Demo XML Contact",
                    "parent_id": company.id,
                    "partner_latitude": child_lat,
                    "partner_longitude": self.base_lon,
                }
            ]
        )
        self.assertFalse(child._mapbox_has_coordinates())
        self.assertEqual(len(company.map_data["elements"]), 1)
        child.write(
            {
                "partner_latitude": child_lat,
                "partner_longitude": self.base_lon,
            }
        )
        self.assertTrue(child._mapbox_has_coordinates())
        self.assertEqual(len(company.map_data["elements"]), 2)

    def test_compute_child_markers(self):
        """Child partners with coords follow as clickable, non-draggable icons."""
        child = self.env["res.partner"].create(
            {
                "name": "Mapbox Demo Contact",
                "parent_id": self.company.id,
                "partner_latitude": self.base_lat + 0.002,
                "partner_longitude": self.base_lon,
            }
        )
        payload = self.company.map_data
        self.assertEqual(len(payload["elements"]), 2)
        marker = payload["elements"][1]
        self.assertAlmostEqual(marker["lat"], child.partner_latitude, places=5)
        self.assertAlmostEqual(marker["lon"], child.partner_longitude, places=5)
        self.assertTrue(marker["clickable"])
        self.assertFalse(marker.get("editable"))
        self.assertEqual(marker["rec_model"], "res.partner")
        self.assertEqual(marker["rec_id"], child.id)
        self.assertEqual(marker["icon"], "user")
        self.assertEqual(marker["size"], 20)
        self.assertEqual(marker["color"], "#C9A227")

    def test_compute_skips_child_without_coordinates(self):
        """A child at 0, 0 is omitted from the payload."""
        self.env["res.partner"].create(
            {
                "name": "Mapbox Demo No Geo",
                "parent_id": self.company.id,
            }
        )
        payload = self.company.map_data
        self.assertEqual(len(payload["elements"]), 1)
        self.assertEqual(payload["elements"][0]["icon"], "star")

    def test_compute_zero_coordinates_is_false(self):
        """Both coordinates 0.0 (not localized) yield the placeholder."""
        partner = self.env["res.partner"].create({"name": "Mapbox Demo Empty"})
        self.assertIs(partner.map_data, False)

    def test_compute_invalid_parent_coordinates_is_false(self):
        """Out-of-range stored coords on the current partner yield no map."""
        partner = self.env["res.partner"].create(
            {
                "name": "Mapbox Demo Invalid Parent",
                "partner_latitude": 91.0,
                "partner_longitude": 10.0,
            }
        )
        self.assertIs(partner.map_data, False)
        partner.write({"partner_latitude": 48.0, "partner_longitude": 181.0})
        self.assertIs(partner.map_data, False)

    def test_compute_skips_child_with_invalid_coordinates(self):
        """A child with out-of-range coords is omitted from the payload."""
        self.env["res.partner"].create(
            {
                "name": "Mapbox Demo Invalid Child",
                "parent_id": self.company.id,
                "partner_latitude": 91.0,
                "partner_longitude": self.base_lon,
            }
        )
        payload = self.company.map_data
        self.assertEqual(len(payload["elements"]), 1)
        self.assertEqual(payload["elements"][0]["icon"], "star")

    def test_compute_follows_coordinate_writes(self):
        """Changing stored coordinates updates the Mapbox payload."""
        self.company.write({"partner_latitude": 48.1, "partner_longitude": 10.2})
        payload = self.company.map_data
        current = payload["elements"][0]
        self.assertAlmostEqual(current["lat"], 48.1, places=5)
        self.assertAlmostEqual(current["lon"], 10.2, places=5)

    def test_inverse_map_data_writes_coordinates(self):
        """Dropped pin writes latitude and longitude."""
        self.company.write({"map_data": self._updated_payload(48.1234, 10.5678)})
        self.assertAlmostEqual(self.company.partner_latitude, 48.1234, places=5)
        self.assertAlmostEqual(self.company.partner_longitude, 10.5678, places=5)

    def test_inverse_map_data_invalid_coords_user_error(self):
        """Out-of-range or non-numeric dropped coords raise and keep the pin."""
        with self.assertRaises(UserError):
            self.company.write({"map_data": self._updated_payload(91.0, 10.0)})
        self.assertAlmostEqual(self.company.partner_latitude, self.base_lat, places=5)
        with self.assertRaises(UserError):
            self.company.write({"map_data": self._updated_payload("bad", 10.0)})
        self.assertAlmostEqual(self.company.partner_latitude, self.base_lat, places=5)

    def test_inverse_map_data_empty_updated_noop(self):
        """Missing or empty ``updated`` leaves coordinates unchanged."""
        self.company.write({"map_data": {"elements": [], "updated": []}})
        self.assertAlmostEqual(self.company.partner_latitude, self.base_lat, places=5)
        self.company.write({"map_data": {"elements": []}})
        self.assertAlmostEqual(self.company.partner_latitude, self.base_lat, places=5)

    def test_inverse_map_data_non_list_updated_noop(self):
        """A truthy non-list ``updated`` value is ignored (no TypeError)."""
        self.company.write({"map_data": {"elements": [], "updated": 1}})
        self.assertAlmostEqual(self.company.partner_latitude, self.base_lat, places=5)
        self.assertAlmostEqual(self.company.partner_longitude, self.base_lon, places=5)

    def test_inverse_ignores_non_current_index(self):
        """Only the star (index 0) is applied; other updated indexes are ignored."""
        self.company.write({"map_data": self._updated_payload(1.0, 2.0, index=1)})
        self.assertAlmostEqual(self.company.partner_latitude, self.base_lat, places=5)
        self.assertAlmostEqual(self.company.partner_longitude, self.base_lon, places=5)
