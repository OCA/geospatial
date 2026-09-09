# Copyright 2026 Cetmix OÜ
# License LGPL-3.0 or later (https://www.gnu.org/licenses/lgpl-3.0).

import math

from odoo import api, fields, models
from odoo.exceptions import UserError

_MAP_MARKER_COLOR_CURRENT = "#FFDD00"
_MAP_MARKER_COLOR_CHILD = "#C9A227"


class ResPartner(models.Model):
    _inherit = "res.partner"

    map_data = fields.Json(
        compute="_compute_map_data",
        inverse="_inverse_map_data",
    )

    def _mapbox_has_coordinates(self):
        """Return whether this partner has a usable geolocation.

        ``base_geolocalize`` treats latitude and longitude both equal to
        ``0.0`` as "not localized" (the Geolocalization buttons on the
        partner form). The Float default is ``0.0``, not a real pin.
        Coordinates must also be finite and inside the Mapbox widget
        bounds (latitude ``[-90, 90]``, longitude ``[-180, 180]``).

        :return: ``True`` when both coordinates are in range and at least
            one is non-zero.
        :rtype: bool
        """
        self.ensure_one()
        lat = self.partner_latitude
        lon = self.partner_longitude
        if not (lat or lon):
            return False
        return (
            math.isfinite(lat)
            and math.isfinite(lon)
            and -90 <= lat <= 90
            and -180 <= lon <= 180
        )

    @api.depends(
        "partner_latitude",
        "partner_longitude",
        "child_ids.partner_latitude",
        "child_ids.partner_longitude",
    )
    def _compute_map_data(self):
        """Build the Mapbox widget payload for the partner form Mapbox tab.

        The current partner is ``elements[0]`` when it has usable
        coordinates: a draggable star, not clickable. Child partners with
        usable coordinates follow as clickable, non-draggable user icons.
        Without usable coords the field is ``False`` (placeholder).

        :rtype: None
        """
        for partner in self:
            if not partner._mapbox_has_coordinates():
                partner.map_data = False
                continue
            lat = partner.partner_latitude
            lon = partner.partner_longitude
            elements = [
                {
                    "lat": lat,
                    "lon": lon,
                    "editable": True,
                    "icon": "star",
                    "size": 32,
                    "color": _MAP_MARKER_COLOR_CURRENT,
                }
            ]
            for child in partner.child_ids:
                if not child._mapbox_has_coordinates():
                    continue
                element = {
                    "lat": child.partner_latitude,
                    "lon": child.partner_longitude,
                    "icon": "user",
                    "size": 20,
                    "color": _MAP_MARKER_COLOR_CHILD,
                }
                child_id = child._origin.id
                if child_id:
                    element["clickable"] = True
                    element["rec_model"] = "res.partner"
                    element["rec_id"] = child_id
                elements.append(element)
            partner.map_data = {
                "elements": elements,
                "default_center": {"lat": lat, "lon": lon},
            }

    def _inverse_map_data(self):
        """Write dropped Mapbox pin coordinates onto the partner.

        Only ``updated`` items with ``index == 0`` are applied (the
        current partner's star). Child markers are not editable.

        :raises UserError: when the dropped coordinates are invalid.
        :rtype: None
        """
        for partner in self:
            payload = partner.map_data
            if not isinstance(payload, dict):
                continue
            updated = payload.get("updated")
            if not isinstance(updated, list):
                continue
            item = next(
                (
                    entry
                    for entry in updated
                    if isinstance(entry, dict) and entry.get("index") == 0
                ),
                None,
            )
            if not item:
                continue
            try:
                lat = float(item.get("lat"))
                lon = float(item.get("lon"))
            except (TypeError, ValueError):
                lat = lon = float("nan")
            if (
                not math.isfinite(lat)
                or not math.isfinite(lon)
                or not -90 <= lat <= 90
                or not -180 <= lon <= 180
            ):
                raise UserError(
                    self.env._("The dropped map pin has invalid coordinates.")
                )
            partner.write(
                {
                    "partner_latitude": lat,
                    "partner_longitude": lon,
                }
            )
