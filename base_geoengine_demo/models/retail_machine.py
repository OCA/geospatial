# -*- coding: utf-8 -*-
# Copyright 2011-2012 Nicolas Bessi (Camptocamp SA)
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl.html).
from openerp import fields
from openerp.addons.base_geoengine import geo_model
from openerp.addons.base_geoengine import fields as geo_fields


class RetailMachine(geo_model.GeoModel):
    """GEO OSV SAMPLE"""

    _name = "geoengine.demo.automatic.retailing.machine"

    the_point = geo_fields.GeoPoint('Coordinate')
    the_line = geo_fields.GeoLine('Power supply line', index=True)
    total_sales = fields.Float('Total sale', index=True)
    money_level = fields.Char('Money level', size=32, index=True)
    state = fields.Selection([('hs', 'HS'),
                              ('ok', 'OK')],
                             'State',
                             index=True)
    name = fields.Char('Serial number', size=64, required=True)
