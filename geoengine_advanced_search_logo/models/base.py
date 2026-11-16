# Copyright 2026 mytime.click
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).
from odoo import api, models

# Image fields shown in the value tags of a geo condition, in order of
# preference: a logo first, then the standard image fields.
IMAGE_FIELD_NAMES = ("logo", "image_128", "avatar_128")


class Base(models.AbstractModel):
    _inherit = "base"

    @api.model
    def get_geo_reference_models(self):
        result = super().get_geo_reference_models()
        for info in result:
            model = self.env[info["model"]]
            info["image_field"] = False
            for field_name in IMAGE_FIELD_NAMES:
                field = model._fields.get(field_name)
                if field and field.type == "binary":
                    info["image_field"] = field_name
                    break
        return result
