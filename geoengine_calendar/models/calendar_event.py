# -*- coding: utf-8 -*-
# Copyright 2018 KMEE INFORMATICA LTDA
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

from odoo.addons.base_geoengine import geo_model
from odoo.addons.base_geoengine import fields as geo_fields


class CalendarEvent(geo_model.GeoModel):

    _inherit = 'calendar.event'

    the_point = geo_fields.GeoPoint('Coordinate')
