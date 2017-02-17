# -*- coding: utf-8 -*-
# Copyright 2011-2017 Camptocamp SA
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl)

from openerp.addons.base_geoengine import geo_model
from openerp.addons.base_geoengine import fields


class ResPartner(geo_model.GeoModel):
    """Add geo_point to partner using a function filed"""
    _inherit = "res.partner"

    geo_point = fields.GeoPoint("Address coordinates")
