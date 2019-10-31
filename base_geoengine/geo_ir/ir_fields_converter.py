# Copyright 2019 Onestein
from odoo import api, models


class IrFieldsConverter(models.AbstractModel):
    _inherit = 'ir.fields.converter'

    @api.model
    def _str_to_geo_polygon(self, model, field, value):
        return value, []

    _str_to_geo_point = _str_to_geo_polygon
    _str_to_geo_line = _str_to_geo_polygon
    _str_to_geo_multi_line = _str_to_geo_polygon
    _str_to_geo_multi_point = _str_to_geo_polygon
    _str_to_geo_multi_polygon = _str_to_geo_polygon
