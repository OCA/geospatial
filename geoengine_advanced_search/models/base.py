# Copyright 2023 ACSONE SA/NV
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).
from odoo import api, models

from odoo.addons.base_geoengine import fields as geo_fields


class Base(models.AbstractModel):
    _inherit = "base"

    @api.model
    def get_geo_reference_models(self):
        """Return the readable models having stored geo fields, used by the
        domain editor to build indirect geo conditions like
        ``('geo_point', 'geo_within', {'res.partner.the_geom': [...]})``."""
        result = []
        for model_name in self.env.registry:
            model = self.env[model_name]
            if model._abstract or model._transient or not model.has_access("read"):
                continue
            geo_field_ids = [
                field
                for field in model._fields.values()
                if isinstance(field, geo_fields.GeoField) and field.store
            ]
            if not geo_field_ids:
                continue
            result.append(
                {
                    "model": model_name,
                    "name": self.env["ir.model"].sudo()._get(model_name).name
                    or model._description,
                    "fields": [
                        [field.name, field._description_string(self.env)]
                        for field in geo_field_ids
                    ],
                }
            )
        return sorted(result, key=lambda info: info["name"])
