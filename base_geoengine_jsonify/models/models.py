# Copyright 2020 ACSONE SA/NV.
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import geojson

from odoo import models
from  odoo.addons.base_geoengine.fields import GeoField


class Base(models.AbstractModel):
    _inherit = "base"

    def _jsonify_value(self, field, value):
        """Adds support for geo_point fields."""
        res = super(Base, self)._jsonify_value(field, value)
        if res and isinstance(field, GeoField):
            # we eval it as dumps gives a str, we need a point for json.dumps
            res = geojson.loads(geojson.dumps(res))
        return res
